// atlas.js - the Atlas (/atlas): every state of the register in a chosen year, on a globe (default) or an
// Equal Earth map. Data: maps/atlas-data.js (ATLAS), maps/basemap.js (ATLAS_BASE) and, for the globe,
// maps/globe-land.js (ATLAS_GLOBE, loaded with d3 7 only when the globe is shown) - all written by
// scripts/build-pages.ps1. Address: ?year=1250, ?focus=<state id>, ?c=<country slug>, ?view=globe|flat.
(function () {
  'use strict';
  var A = window.ATLAS, B = window.ATLAS_BASE, svg = document.getElementById('atl-svg');
  if (!A || !B || !svg) return;
  var NS = 'http://www.w3.org/2000/svg', W = A.w, H = A.h, MINY = A.first, MAXY = A.year;
  function $(id) { return document.getElementById(id); }
  var world = $('atl-world'), dotsS = $('atl-dots-s'), dotsP = $('atl-dots-p'), labelsG = $('atl-labels'), ring = $('atl-ring');
  var tip = $('atl-tip'), mapBox = $('atl-map'), slider = $('atl-year'), yearOut = $('atl-year-out'), countOut = $('atl-count');
  var canvas = $('atl-globe');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  $('atl-edge').setAttribute('d', B.edge); $('atl-grat').setAttribute('d', B.grat); $('atl-land').setAttribute('d', B.land);

  var D2R = Math.PI / 180;
  var rows = A.rows.map(function (r) {
    var lng = r[9], lat = r[10], cp = Math.cos(lat * D2R);
    return { id: r[0], n: r[1], s: r[2], e: r[3] === null ? Infinity : r[3], open: r[3] === null, x: r[4], y: r[5], f: r[6], k: r[7], g: r[8],
      lng: lng, lat: lat, vx: cp * Math.cos(lng * D2R), vy: cp * Math.sin(lng * D2R), vz: Math.sin(lat * D2R),
      url: r[11] || '/state/' + r[0], el: null, fold: fold(r[1]) };
  });
  var byId = {}; rows.forEach(function (r) { byId[r.id] = r; });
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fmtYear(y) { return y < 0 ? (-y) + ' BCE' : y + ' CE'; }
  function span(r) { return fmtYear(r.s) + ' – ' + (r.open ? 'today' : fmtYear(r.e)); }
  function clampYear(y) { return Math.max(MINY, Math.min(MAXY, y)); }
  function reduced() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // ── filters and year ──
  var q = new URLSearchParams(location.search);
  var year = parseInt(q.get('year'), 10); year = isNaN(year) ? 1000 : clampYear(year);
  var profOnly = false, kind = -1;
  slider.min = MINY; slider.max = MAXY;
  var kindSel = $('atl-kind');
  A.kinds.forEach(function (label, i) { var o = document.createElement('option'); o.value = i; o.textContent = label; kindSel.appendChild(o); });
  kindSel.addEventListener('change', function () { kind = parseInt(kindSel.value, 10); if (isNaN(kind)) kind = -1; render(true); });
  $('atl-prof').addEventListener('change', function (e) { profOnly = e.target.checked; render(true); });
  function shown(r) { return r.s <= year && r.e >= year && (!profOnly || (r.f & 1)) && (kind < 0 || r.k === kind); }

  // ── the two views: 'globe' (default) and 'flat'. The globe loads d3 and its land on first use. ──
  var stored = null; try { stored = localStorage.getItem('epoch-atlas-view'); } catch (e) {}
  var mode = q.get('view') === 'flat' ? 'flat' : q.get('view') === 'globe' ? 'globe' : (stored === 'flat' ? 'flat' : 'globe');
  if (!canvas || !canvas.getContext) mode = 'flat';
  function isG() { return mode === 'globe'; }

  // ── flat view: translate(tx, ty) scale(k) on the world group; the viewBox stays the whole map ──
  var k = 1, tx = 0, ty = 0, KMAX = 48;
  function ppu() { return svg.getBoundingClientRect().width / W; }   // screen pixels per map unit at k = 1
  function clampView() {
    k = Math.max(1, Math.min(KMAX, k));
    tx = Math.min(0, Math.max(W - W * k, tx)); ty = Math.min(0, Math.max(H - H * k, ty));
  }
  function applyView() {
    clampView();
    world.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' ' + ty.toFixed(1) + ') scale(' + k.toFixed(4) + ')');
    sizeDots(); scheduleLabels();
  }
  function toMap(clientX, clientY) { var b = svg.getBoundingClientRect(); return { x: (clientX - b.left) * W / b.width, y: (clientY - b.top) * H / b.height }; }
  function zoomAt(f, px2, py2) { var wx = (px2 - tx) / k, wy = (py2 - ty) / k; k = Math.max(1, Math.min(KMAX, k * f)); tx = px2 - wx * k; ty = py2 - wy * k; applyView(); }
  var anim = null;
  function animateTo(k2, tx2, ty2) {
    var k0 = k, x0 = tx, y0 = ty, t0 = performance.now(), dur = reduced() ? 0 : 450;
    cancelAnimationFrame(anim);
    (function frame(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      k = k0 + (k2 - k0) * e; tx = x0 + (tx2 - x0) * e; ty = y0 + (ty2 - y0) * e; applyView();
      if (t < 1) anim = requestAnimationFrame(frame);
    })(t0);
  }
  function fitBox(x, y, w, h) { var k2 = Math.max(1, Math.min(KMAX, Math.min(W / w, H / h))); animateTo(k2, -x * k2 + (W - w * k2) / 2, -y * k2 + (H - h * k2) / 2); }
  function centreOn(x, y, k2) { animateTo(k2, W / 2 - x * k2, H / 2 - y * k2); }

  // flat wheel, drag, pinch
  svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = toMap(e.clientX, e.clientY); zoomAt(Math.pow(1.0018, -e.deltaY * (e.deltaMode === 1 ? 30 : 1)), p.x, p.y); }, { passive: false });
  var pointers = {}, drag = null, moved = false;
  svg.addEventListener('pointerdown', function (e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); moved = false;
    var ids = Object.keys(pointers);
    if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
    else if (ids.length === 2) {   // two fingers: zoom and pan around the point between them
      var a = pointers[ids[0]], b = pointers[ids[1]], m = toMap((a.x + b.x) / 2, (a.y + b.y) / 2);
      drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: k, wx: (m.x - tx) / k, wy: (m.y - ty) / k };
    }
  });
  svg.addEventListener('pointermove', function (e) {
    if (pointers[e.pointerId]) pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (drag && ids.length === 1 && !drag.pinch) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      if (moved) { var s = W / svg.getBoundingClientRect().width; tx = drag.tx + dx * s; ty = drag.ty + dy * s; applyView(); hideTip(); }
    } else if (drag && drag.pinch && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), m = toMap((a.x + b.x) / 2, (a.y + b.y) / 2); moved = true;
      k = Math.max(1, Math.min(KMAX, drag.k * d / drag.pinch)); tx = m.x - drag.wx * k; ty = m.y - drag.wy * k; applyView(); hideTip(true);
    } else if (e.pointerType === 'mouse' && !ids.length) hover(e);
  });
  function endPointer(e) {
    var had = !!pointers[e.pointerId]; delete pointers[e.pointerId];
    if (!Object.keys(pointers).length) {
      if (had && !moved && drag && !drag.pinch) tap(e);
      drag = null;
    } else drag = null;
  }
  svg.addEventListener('pointerup', endPointer); svg.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; drag = null; });
  svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !pinned) hideTip(); });
  $('atl-zin').addEventListener('click', function () { if (isG()) GL.zoomBy(1.8); else zoomAt(1.8, W / 2, H / 2); });
  $('atl-zout').addEventListener('click', function () { if (isG()) GL.zoomBy(1 / 1.8); else zoomAt(1 / 1.8, W / 2, H / 2); });
  $('atl-zreset').addEventListener('click', function () { if (isG()) GL.reset(); else animateTo(1, 0, 0); });
  svg.addEventListener('keydown', function (e) {
    var step = W * 0.08;
    if (e.key === '+' || e.key === '=') zoomAt(1.5, W / 2, H / 2); else if (e.key === '-') zoomAt(1 / 1.5, W / 2, H / 2);
    else if (e.key === 'ArrowLeft') { tx += step; applyView(); } else if (e.key === 'ArrowRight') { tx -= step; applyView(); }
    else if (e.key === 'ArrowUp') { ty += step; applyView(); } else if (e.key === 'ArrowDown') { ty -= step; applyView(); } else return;
    e.preventDefault();
  });
  var presets = $('atl-presets');
  A.presets.forEach(function (p, i) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p[0];
    b.addEventListener('click', function () {
      if (isG()) { var g = A.presetsLL[i]; GL.rotateTo(g[0], g[1], i === 0 ? 1 : GL.kFor(g[2])); return; }
      if (p[0] === 'World') animateTo(1, 0, 0); else fitBox(p[1], p[2], p[3], p[4]);
    });
    presets.appendChild(b);
  });
  window.addEventListener('resize', function () { if (isG()) { GL.resize(); } else { sizeDots(); scheduleLabels(); } });

  // ── flat dots ──
  var visible = [];
  function px(n) { return n * Math.max(0.55, Math.min(1, mapBox.getBoundingClientRect().width / 900)); }   // smaller dots on a small map
  function dotR(r) { return px((r.f & 1) ? 4.4 : 2.7) / (ppu() * k); }
  function sizeDots() {
    var u = ppu() * k, rp = px(4.4) / u, rs = px(2.7) / u, sw = px(1.2) / u;
    visible.forEach(function (r) { if (!r.el) return; r.el.setAttribute('r', ((r.f & 1) ? rp : rs).toFixed(3)); if (r.f & 2) r.el.setAttribute('stroke-width', sw.toFixed(3)); });
    if (focused) { ring.setAttribute('r', (px(11) / u).toFixed(3)); ring.setAttribute('stroke-width', (2 / u).toFixed(3)); }
  }
  function render(listNow) {
    var next = [];
    rows.forEach(function (r) {
      if (shown(r)) {
        if (!isG() && !r.el) {
          r.el = document.createElementNS(NS, 'circle'); r.el.setAttribute('cx', r.x); r.el.setAttribute('cy', r.y);
          r.el.setAttribute('class', (r.f & 1) ? 'd-p' : (r.f & 2) ? 'd-a' : 'd-s'); r.el.setAttribute('r', dotR(r).toFixed(3));
          if (r.f & 2) r.el.setAttribute('stroke-width', (px(1.2) / (ppu() * k)).toFixed(3));
          ((r.f & 1) ? dotsP : dotsS).appendChild(r.el);
        }
        next.push(r);
      } else if (r.el) { r.el.remove(); r.el = null; }
    });
    visible = next;
    var np = 0; visible.forEach(function (r) { if (r.f & 1) np++; });
    yearOut.textContent = fmtYear(year);
    countOut.textContent = visible.length.toLocaleString('en-GB') + (visible.length === 1 ? ' state' : ' states') + (np ? ' · ' + np + ' with a profile' : '');
    if (pinned && !shown(pinned)) hideTip(true);
    if (isG()) GL.draw(); else scheduleLabels();
    if (listNow) renderList(); else scheduleList();
  }

  // ── flat labels: profiles from 2.2x, every state from 7x; no overlaps ──
  var labelTimer = null;
  function scheduleLabels() { if (labelTimer) return; labelTimer = requestAnimationFrame(function () { labelTimer = null; drawLabels(); }); }
  function drawLabels() {
    while (labelsG.firstChild) labelsG.removeChild(labelsG.firstChild);
    if (isG() || k < 2.2) return;
    var u = ppu(), b = svg.getBoundingClientRect(), placed = [], fs = 11.5 / (u * k), out = 0;
    var cand = visible.filter(function (r) { return (r.f & 1) || k >= 7; })
      .sort(function (a, c) { return ((c.f & 1) - (a.f & 1)) || ((Math.min(c.e, MAXY) - c.s) - (Math.min(a.e, MAXY) - a.s)); });
    for (var i = 0; i < cand.length && out < 140; i++) {
      var r = cand[i], sx = (r.x * k + tx) * u, sy = (r.y * k + ty) * u, w = r.n.length * 6.3 + 8;
      if (sx < -10 || sy < -10 || sx > b.width + 10 || sy > b.height + 10) continue;
      var box = { x0: sx + 5, y0: sy - 8, x1: sx + 5 + w, y1: sy + 6 }, hit = false;
      for (var j = 0; j < placed.length && !hit; j++) { var p = placed[j]; hit = !(box.x1 < p.x0 || box.x0 > p.x1 || box.y1 < p.y0 || box.y0 > p.y1); }
      if (hit) continue;
      placed.push(box); out++;
      var t = document.createElementNS(NS, 'text'); t.setAttribute('x', (r.x + 6 / (u * k)).toFixed(1)); t.setAttribute('y', (r.y + 4 / (u * k)).toFixed(1));
      t.setAttribute('font-size', fs.toFixed(2)); t.setAttribute('class', (r.f & 1) ? 'l-p' : 'l-s'); t.textContent = r.n; labelsG.appendChild(t);
    }
  }

  // ── tooltip: nearest dot to the pointer (either view) ──
  var pinned = null, focused = null, hoverRaf = null;
  function nearest(clientX, clientY, maxPx) {
    if (isG()) return GL.nearest(clientX, clientY, maxPx);
    var b = svg.getBoundingClientRect(), u = b.width / W, best = null, bd = maxPx * maxPx;
    var px2 = clientX - b.left, py2 = clientY - b.top;
    visible.forEach(function (r) { var dx = (r.x * k + tx) * u - px2, dy = (r.y * k + ty) * u - py2, d = dx * dx + dy * dy - ((r.f & 1) ? 6 : 0); if (d < bd) { bd = d; best = r; } });
    return best;
  }
  function hover(e) {
    if (hoverRaf) return;
    var cx = e.clientX, cy = e.clientY;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = null; if (pinned) return;
      var r = nearest(cx, cy, 14); if (r) showTip(r, false); else hideTip();
      (isG() ? canvas : svg).style.cursor = r ? 'pointer' : '';
    });
  }
  function tap(e) {
    var r = nearest(e.clientX, e.clientY, e.pointerType === 'mouse' ? 14 : 24);
    if (!r) { hideTip(true); return; }
    if (e.pointerType === 'mouse') { location.href = r.url; return; }
    showTip(r, true);
  }
  function tipAnchor(r) {   // screen position of a state's dot, relative to the map box
    var mb = mapBox.getBoundingClientRect();
    if (isG()) { var p = GL.pointOf(r); return p ? { x: p[0] + GL.rect().left - mb.left, y: p[1] + GL.rect().top - mb.top } : null; }
    var b = svg.getBoundingClientRect(), u = b.width / W;
    return { x: (r.x * k + tx) * u + (b.left - mb.left), y: (r.y * k + ty) * u + (b.top - mb.top) };
  }
  function showTip(r, pin) {
    var at = tipAnchor(r); if (!at) { if (pin) hideTip(true); return; }
    if (pin) pinned = r;
    var kindLabel = A.kinds[r.k] || '', region = A.regions[r.g] || '';
    tip.innerHTML = '<p class="atl-tip-n">' + escHtml(r.n) + '</p><p class="atl-tip-y">' + span(r) + '</p>' +
      '<p class="atl-tip-k">' + escHtml(kindLabel.replace(/s and .*$|s$/, '')) + (region ? ' · ' + escHtml(region) : '') + ((r.f & 1) ? ' · <b>profile</b>' : '') + '</p>' +
      ((r.f & 2) ? '<p class="atl-tip-a">Place approximate: shown in its present-day country.</p>' : '') +
      '<a class="atl-tip-go" href="' + escHtml(r.url) + '">' + ((r.f & 1) ? 'Read the profile' : 'Read its history') + ' &rarr;</a>';
    tip.hidden = false;
    var mb = mapBox.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight, left = at.x + 14, top = at.y - th / 2;
    if (left + tw > mb.width - 8) left = at.x - tw - 14;
    tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, Math.min(mb.height - th - 8, top)) + 'px';
  }
  function hideTip(force) { if (pinned && !force) return; pinned = null; tip.hidden = true; }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(true); });

  // ── year: slider, play, jumps ──
  var renderRaf = null;
  function setYear(y, now) {
    year = clampYear(Math.round(y)); slider.value = year; yearOut.textContent = fmtYear(year);
    if (now) { render(); return; }
    if (!renderRaf) renderRaf = requestAnimationFrame(function () { renderRaf = null; render(); });
    scheduleUrl();
  }
  slider.addEventListener('input', function () { stop(); setYear(+slider.value); });
  var playBtn = $('atl-play'), timer = null;
  var randBtn = $('atl-rand');
  if (randBtn) randBtn.addEventListener('click', function () {   // half the leaps land in the crowded CE years
    stop();
    var y = Math.random() < 0.5 ? 1 + Math.random() * (MAXY - 1) : MINY + Math.random() * (1 - MINY);
    setYear(y); renderList();
  });
  function stop() { if (!timer) return; clearInterval(timer); timer = null; playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play through time'); scheduleList(); scheduleUrl(); }
  playBtn.addEventListener('click', function () {
    if (timer) { stop(); return; }
    if (year >= MAXY) setYear(MINY, true);
    playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pause');
    timer = setInterval(function () {
      var inc = year < -1000 ? 10 : year < 500 ? 5 : year < 1800 ? 3 : 1;
      setYear(year + inc); if (year >= MAXY) stop();
    }, 55);
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); stop(); setYear(parseInt(b.getAttribute('data-year'), 10)); renderList(); });
  });
  var urlTimer = null;
  function scheduleUrl() { clearTimeout(urlTimer); urlTimer = setTimeout(function () { if (!timer) history.replaceState(null, '', '/atlas?year=' + year + (mode === 'flat' ? '&view=flat' : '')); }, 500); }

  // ── the list of states shown (also the accessible view of the map) ──
  var listTimer = null, listEl = $('atl-list');
  function scheduleList() { clearTimeout(listTimer); listTimer = setTimeout(function () { if (!timer) renderList(); }, 300); }
  function renderList() {
    $('atl-list-year').textContent = fmtYear(year);
    var groups = {};
    visible.forEach(function (r) { var g = r.g < 0 ? '' : A.regions[r.g]; (groups[g] = groups[g] || []).push(r); });
    var order = A.regions.filter(function (g) { return groups[g]; }); if (groups['']) order.push('');
    listEl.innerHTML = order.length ? order.map(function (g) {
      var lst = groups[g].sort(function (a, b) { return a.n.localeCompare(b.n); });
      return '<section class="atl-group"><h3>' + escHtml(g || 'Elsewhere') + ' <span>' + lst.length + '</span></h3><p>' +
        lst.map(function (r) { return '<a href="' + escHtml(r.url) + '"' + ((r.f & 1) ? ' class="is-prof"' : '') + '>' + escHtml(r.n) + '</a>'; }).join('<span aria-hidden="true"> · </span>') + '</p></section>';
    }).join('') : '<p class="atl-none">No state of the register matches these filters in ' + fmtYear(year) + '.</p>';
  }

  // ── search ──
  var input = $('atl-q'), sugg = $('atl-sugg'), hits = [], active = -1;
  input.addEventListener('input', function () {
    var v = fold(input.value.trim()); active = -1;
    if (v.length < 2) { sugg.hidden = true; return; }
    hits = rows.filter(function (r) { return r.fold.indexOf(v) >= 0; })
      .sort(function (a, b) { return ((b.fold.indexOf(v) === 0) - (a.fold.indexOf(v) === 0)) || ((b.f & 1) - (a.f & 1)) || a.n.localeCompare(b.n); }).slice(0, 8);
    sugg.innerHTML = hits.map(function (r, i) { return '<li role="option" id="atl-s' + i + '" data-i="' + i + '"><b>' + escHtml(r.n) + '</b> <span>' + span(r) + '</span></li>'; }).join('') || '<li class="atl-none">No state of that name</li>';
    sugg.hidden = false;
  });
  input.addEventListener('keydown', function (e) {
    if (sugg.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length; Array.prototype.forEach.call(sugg.children, function (li, i) { li.classList.toggle('on', i === active); }); input.setAttribute('aria-activedescendant', 'atl-s' + active); }
    else if (e.key === 'Enter') { e.preventDefault(); var r = hits[active < 0 ? 0 : active]; if (r) choose(r); }
    else if (e.key === 'Escape') sugg.hidden = true;
  });
  sugg.addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(hits[+li.getAttribute('data-i')]); } });
  input.addEventListener('blur', function () { setTimeout(function () { sugg.hidden = true; }, 150); });
  function choose(r) { sugg.hidden = true; input.value = r.n; focusOn(r, true); }
  function focusOn(r, moveYear) {
    if (moveYear && !(r.s <= year && r.e >= year)) setYear(Math.round((r.s + Math.min(r.e, MAXY)) / 2), true);
    if (profOnly && !(r.f & 1)) { profOnly = false; $('atl-prof').checked = false; render(true); }
    if (kind >= 0 && r.k !== kind) { kind = -1; kindSel.value = ''; render(true); }
    focused = r;
    if (isG()) {
      GL.rotateTo(r.lng, r.lat, Math.max(GL.k, 4), function () { showTip(r, true); GL.draw(); });
      return;
    }
    ring.setAttribute('cx', r.x); ring.setAttribute('cy', r.y); ring.style.display = '';
    centreOn(r.x, r.y, Math.max(k, 6));
    setTimeout(function () { if (r.el) showTip(r, true); sizeDots(); }, 480);
  }

  // ════ the globe: d3 orthographic on a canvas; land from maps/globe-land.js ════
  var GL = (function () {
    var ready = false, failed = false, waiting = [];
    var proj = null, path = null, geo = null, grat = null, ctx = null;
    var G = { k: 1, rot: [-10, -15] };   // rotate([-lng, -lat]) of the facing point; k: zoom 1..12
    var R = 100, dpr = 1, base = null, baseCtx = null, baseDirty = true, drawRaf = null, flickOn = false;
    function kFor(spanDeg) { return Math.max(1, Math.min(12, 1.8 / (spanDeg * D2R))); }
    function rect() { return canvas.getBoundingClientRect(); }
    function colours() {
      var cs = getComputedStyle(document.documentElement);
      var g = (cs.getPropertyValue('--gold-rgb') || '201,168,76').trim();
      return { g: g, gold: (cs.getPropertyValue('--gold') || '#c9a84c').trim(), goldL: (cs.getPropertyValue('--gold-light') || '#e8c97a').trim(),
        text: (cs.getPropertyValue('--text') || '#e8e0d0').trim(), bg: (cs.getPropertyValue('--bg') || '#0b0c10').trim() };
    }
    function load(cb) {
      if (ready) return cb(true);
      if (failed) return cb(false);
      waiting.push(cb);
      if (waiting.length > 1) return;
      function fail() { failed = true; waiting.splice(0).forEach(function (f) { f(false); }); }
      function step2() {
        if (window.ATLAS_GLOBE) return init();
        var s = document.createElement('script'); s.src = window.ATLAS_GLOBE_SRC || '/maps/globe-land.js'; s.onload = init; s.onerror = fail; document.head.appendChild(s);
      }
      function init() {
        try {
          // decode the rings (hundredths of a degree) and rewind any that d3 would read inside-out
          var polys = window.ATLAS_GLOBE.rings.map(function (fl) {
            var ring2 = []; for (var i = 0; i < fl.length; i += 2) ring2.push([fl[i] / 100, fl[i + 1] / 100]);
            if (d3.geoArea({ type: 'Polygon', coordinates: [ring2] }) > 2 * Math.PI) ring2.reverse();
            return [ring2];
          });
          geo = { type: 'MultiPolygon', coordinates: polys };
          grat = d3.geoGraticule().step([15, 15])();
          proj = d3.geoOrthographic().clipAngle(90);
          ctx = canvas.getContext('2d');
          path = d3.geoPath(proj, ctx);
          base = document.createElement('canvas'); baseCtx = base.getContext('2d');
          ready = true; resize();
          waiting.splice(0).forEach(function (f) { f(true); });
        } catch (err) { fail(); }
      }
      if (window.d3 && d3.geoOrthographic) return step2();
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js'; s.onload = step2; s.onerror = fail; document.head.appendChild(s);
    }
    function resize() {
      if (!ready) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var w = mapBox.clientWidth, h = Math.round(w * (w < 640 ? 0.95 : 4393 / 10000));   // phones get a tall box, not a thin strip
      canvas.style.height = h + 'px';
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      base.width = canvas.width; base.height = canvas.height;
      R = Math.min(w, h) / 2 - 10;
      baseDirty = true; draw();
    }
    function apply() { proj.scale(R * G.k * dpr).translate([canvas.width / 2, canvas.height / 2]).rotate([G.rot[0], G.rot[1], 0]); }
    function drawBase() {
      var c = colours();
      apply();
      baseCtx.setTransform(1, 0, 0, 1, 0, 0);
      baseCtx.clearRect(0, 0, base.width, base.height);
      var p2 = d3.geoPath(proj, baseCtx);
      // the sphere, with a soft limb glow
      baseCtx.save();
      baseCtx.shadowColor = 'rgba(' + c.g + ',0.35)'; baseCtx.shadowBlur = 16 * dpr;
      baseCtx.beginPath(); p2({ type: 'Sphere' }); baseCtx.fillStyle = 'rgba(' + c.g + ',0.04)'; baseCtx.fill();
      baseCtx.restore();
      baseCtx.beginPath(); p2(grat); baseCtx.strokeStyle = 'rgba(' + c.g + ',0.14)'; baseCtx.lineWidth = 0.6 * dpr; baseCtx.stroke();
      baseCtx.beginPath(); p2(geo); baseCtx.fillStyle = 'rgba(' + c.g + ',0.13)'; baseCtx.fill();
      baseCtx.strokeStyle = flickOn ? c.goldL : 'rgba(' + c.g + ',0.45)'; baseCtx.lineWidth = (flickOn ? 1.4 : 0.7) * dpr; baseCtx.lineJoin = 'round'; baseCtx.stroke();
      baseCtx.beginPath(); p2({ type: 'Sphere' }); baseCtx.strokeStyle = 'rgba(' + c.g + ',0.4)'; baseCtx.lineWidth = 1 * dpr; baseCtx.stroke();
      baseDirty = false;
    }
    function front(r) {   // is this state on the visible hemisphere?
      var cl = -G.rot[0] * D2R, cp = -G.rot[1] * D2R, cosp = Math.cos(cp);
      return r.vx * cosp * Math.cos(cl) + r.vy * cosp * Math.sin(cl) + r.vz * Math.sin(cp) > 0.001;
    }
    function pointOf(r) {   // CSS pixels within the canvas, or null when on the far side
      if (!ready || !front(r)) return null;
      var p = proj([r.lng, r.lat]); if (!p) return null;
      return [p[0] / dpr, p[1] / dpr];
    }
    function draw() {
      if (!ready || drawRaf) return;
      drawRaf = requestAnimationFrame(function () {
        drawRaf = null;
        if (!isG()) return;
        apply();
        if (baseDirty) drawBase();
        var c = colours();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(base, 0, 0);
        // dots, in the flat map's language: states, approximate rings, profiles on top
        var sc = Math.max(0.55, Math.min(1, (canvas.width / dpr) / 900)) * dpr;
        var rp = 4.4 * sc, rs = 2.7 * sc, i, r, p;
        ctx.fillStyle = c.text; ctx.globalAlpha = 0.72; ctx.beginPath();
        for (i = 0; i < visible.length; i++) { r = visible[i]; if ((r.f & 3) || !front(r)) continue; p = proj([r.lng, r.lat]); if (!p) continue; ctx.moveTo(p[0] + rs, p[1]); ctx.arc(p[0], p[1], rs, 0, 6.2832); }
        ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.goldL; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.2 * sc; ctx.beginPath();
        for (i = 0; i < visible.length; i++) { r = visible[i]; if (!(r.f & 2) || (r.f & 1) || !front(r)) continue; p = proj([r.lng, r.lat]); if (!p) continue; ctx.moveTo(p[0] + rs, p[1]); ctx.arc(p[0], p[1], rs, 0, 6.2832); }
        ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = c.gold; ctx.beginPath();
        for (i = 0; i < visible.length; i++) { r = visible[i]; if (!(r.f & 1) || !front(r)) continue; p = proj([r.lng, r.lat]); if (!p) continue; ctx.moveTo(p[0] + rp, p[1]); ctx.arc(p[0], p[1], rp, 0, 6.2832); }
        ctx.fill();
        if (focused && shown(focused)) { p = front(focused) ? proj([focused.lng, focused.lat]) : null; if (p) { ctx.strokeStyle = c.goldL; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.arc(p[0], p[1], 11 * sc, 0, 6.2832); ctx.stroke(); } }
        drawGlobeLabels(c, sc);
        if (pinned) { if (front(pinned) && shown(pinned)) showTip(pinned, true); else hideTip(true); }
      });
    }
    function drawGlobeLabels(c, sc) {
      if (G.k < 2.2) return;
      var cand = visible.filter(function (r) { return ((r.f & 1) || G.k >= 7) && front(r); })
        .sort(function (a, b2) { return ((b2.f & 1) - (a.f & 1)) || ((Math.min(b2.e, MAXY) - b2.s) - (Math.min(a.e, MAXY) - a.s)); });
      var placed = [], out = 0, fs = 11.5 * dpr;
      ctx.font = '600 ' + fs + 'px "Source Sans 3", "Segoe UI", sans-serif'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = 3 * dpr; ctx.strokeStyle = c.bg;
      for (var i = 0; i < cand.length && out < 120; i++) {
        var r = cand[i], p = proj([r.lng, r.lat]); if (!p) continue;
        var w = r.n.length * fs * 0.55 + 8, box = { x0: p[0] + 5, y0: p[1] - fs * 0.7, x1: p[0] + 5 + w, y1: p[1] + fs * 0.7 }, hit = false;
        for (var j = 0; j < placed.length && !hit; j++) { var b2 = placed[j]; hit = !(box.x1 < b2.x0 || box.x0 > b2.x1 || box.y1 < b2.y0 || box.y0 > b2.y1); }
        if (hit) continue;
        placed.push(box); out++;
        ctx.strokeText(r.n, p[0] + 6 * dpr, p[1]);
        ctx.fillStyle = (r.f & 1) ? c.goldL : c.text;
        ctx.fillText(r.n, p[0] + 6 * dpr, p[1]);
      }
    }
    var ganim = null;
    function rotateTo(lng, lat, k2, cb) {
      var r0 = [G.rot[0], G.rot[1]], k0 = G.k, t0 = performance.now(), dur = reduced() ? 0 : 650;
      var dl = (-lng - r0[0]); while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
      var dp = Math.max(-88, Math.min(88, -lat)) - r0[1], dk = k2 - k0;
      cancelAnimationFrame(ganim);
      (function frame(now) {
        var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        G.rot[0] = r0[0] + dl * e; G.rot[1] = r0[1] + dp * e; G.k = k0 + dk * e;
        baseDirty = true; draw();
        if (t < 1) ganim = requestAnimationFrame(frame); else if (cb) cb();
      })(t0);
    }
    function zoomBy(f) { G.k = Math.max(1, Math.min(12, G.k * f)); baseDirty = true; draw(); }
    function reset() { rotateTo(10, 15, 1); hideTip(true); focused = null; }
    function nearestG(clientX, clientY, maxPx) {
      var b = rect(), px2 = (clientX - b.left) * dpr, py2 = (clientY - b.top) * dpr, best = null, bd = maxPx * dpr * maxPx * dpr;
      for (var i = 0; i < visible.length; i++) {
        var r = visible[i]; if (!front(r)) continue;
        var p = proj([r.lng, r.lat]); if (!p) continue;
        var dx = p[0] - px2, dy = p[1] - py2, d = dx * dx + dy * dy - ((r.f & 1) ? 6 * dpr : 0);
        if (d < bd) { bd = d; best = r; }
      }
      return best;
    }
    // drag to turn, wheel and pinch to zoom
    var gp = {}, gdrag = null, gmoved = false;
    function degPerPx() { return 57.296 / (R * G.k); }
    canvas.addEventListener('pointerdown', function (e) {
      gp[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      gmoved = false;
      var ids = Object.keys(gp);
      if (ids.length === 1) gdrag = { x: e.clientX, y: e.clientY, rot: [G.rot[0], G.rot[1]] };
      else if (ids.length === 2) { var a = gp[ids[0]], b = gp[ids[1]]; gdrag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: G.k }; }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (gp[e.pointerId]) gp[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(gp);
      if (gdrag && ids.length === 1 && !gdrag.pinch) {
        var dx = e.clientX - gdrag.x, dy = e.clientY - gdrag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) gmoved = true;
        if (gmoved) {
          var s = degPerPx();
          G.rot[0] = gdrag.rot[0] + dx * s; while (G.rot[0] > 180) G.rot[0] -= 360; while (G.rot[0] < -180) G.rot[0] += 360;
          G.rot[1] = Math.max(-88, Math.min(88, gdrag.rot[1] - dy * s));
          baseDirty = true; draw(); hideTip();
        }
      } else if (gdrag && gdrag.pinch && ids.length === 2) {
        var a = gp[ids[0]], b = gp[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y); gmoved = true;
        G.k = Math.max(1, Math.min(12, gdrag.k * d / gdrag.pinch)); baseDirty = true; draw(); hideTip(true);
      } else if (e.pointerType === 'mouse' && !ids.length) hover(e);
    });
    function endG(e) {
      var had = !!gp[e.pointerId]; delete gp[e.pointerId];
      if (!Object.keys(gp).length) { if (had && !gmoved && gdrag && !gdrag.pinch) tap(e); gdrag = null; } else gdrag = null;
    }
    canvas.addEventListener('pointerup', endG); canvas.addEventListener('pointercancel', function (e) { delete gp[e.pointerId]; gdrag = null; });
    canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !pinned) hideTip(); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = Math.pow(1.0018, -e.deltaY * (e.deltaMode === 1 ? 30 : 1));
      var b = rect(), mx = (e.clientX - b.left) * dpr, my = (e.clientY - b.top) * dpr;
      var p0 = proj.invert && proj.invert([mx, my]);
      G.k = Math.max(1, Math.min(12, G.k * f)); apply();
      if (p0 && isFinite(p0[0])) {   // keep the point under the pointer under the pointer
        var q2 = proj(p0);
        if (q2) {
          var s = degPerPx();
          G.rot[0] += (mx - q2[0]) / dpr * s; while (G.rot[0] > 180) G.rot[0] -= 360; while (G.rot[0] < -180) G.rot[0] += 360;
          G.rot[1] = Math.max(-88, Math.min(88, G.rot[1] - (my - q2[1]) / dpr * s));
        }
      }
      baseDirty = true; draw();
    }, { passive: false });
    canvas.addEventListener('keydown', function (e) {
      var s = 12 / G.k;
      if (e.key === '+' || e.key === '=') zoomBy(1.5); else if (e.key === '-') zoomBy(1 / 1.5);
      else if (e.key === 'ArrowLeft') { G.rot[0] -= s; baseDirty = true; draw(); } else if (e.key === 'ArrowRight') { G.rot[0] += s; baseDirty = true; draw(); }
      else if (e.key === 'ArrowUp') { G.rot[1] = Math.min(88, G.rot[1] + s); baseDirty = true; draw(); } else if (e.key === 'ArrowDown') { G.rot[1] = Math.max(-88, G.rot[1] - s); baseDirty = true; draw(); } else return;
      e.preventDefault();
    });
    // theme switches repaint the cached base
    new MutationObserver(function () { baseDirty = true; draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return { load: load, resize: resize, draw: draw, rotateTo: rotateTo, zoomBy: zoomBy, reset: reset, kFor: kFor,
      nearest: nearestG, pointOf: pointOf, rect: rect, get k() { return G.k; },
      flick: function (on) { flickOn = on; baseDirty = true; draw(); } };
  })();

  // ── the view toggle ──
  var btnG = $('atl-v-globe'), btnF = $('atl-v-flat');
  function paintToggle() {
    if (btnG) btnG.setAttribute('aria-pressed', String(isG()));
    if (btnF) btnF.setAttribute('aria-pressed', String(!isG()));
    $('atl-note-globe').hidden = !isG(); $('atl-note-flat').hidden = isG();
  }
  function setMode(m) {
    if (m === mode) return;
    hideTip(true);
    mode = m;
    try { localStorage.setItem('epoch-atlas-view', m); } catch (e) {}
    if (m === 'globe') {
      GL.load(function (ok) {
        if (!ok) { mode = 'flat'; paintToggle(); return; }
        svg.setAttribute('hidden', ''); canvas.removeAttribute('hidden'); paintToggle();   // an SVG element has no .hidden property
        GL.resize(); render(true);
      });
    } else {
      canvas.setAttribute('hidden', ''); svg.removeAttribute('hidden'); paintToggle();
      if (focused) { ring.setAttribute('cx', focused.x); ring.setAttribute('cy', focused.y); ring.style.display = ''; }
      render(true); applyView();
    }
    scheduleUrl();
  }
  if (btnG) btnG.addEventListener('click', function () { setMode('globe'); });
  if (btnF) btnF.addEventListener('click', function () { setMode('flat'); });

  // ── start ──
  slider.value = year;
  function flickBorders() {   // arriving from a state, country or profile page: the borders blink for two seconds
    if (reduced()) return;
    var n = 0, land = $('atl-land');
    var t = setInterval(function () {
      n++;
      var on = n % 2 === 1 && n < 8;
      if (isG()) GL.flick(on); else land.classList.toggle('atl-flick', on);
      if (n >= 8) clearInterval(t);
    }, 250);
  }
  function begin() {
    paintToggle();
    render(true);
    if (!isG()) applyView();
    var f = q.get('focus'), c = q.get('c');
    if (f && byId[f]) { var r0 = byId[f]; if (!q.get('year')) setYear(Math.round((r0.s + Math.min(r0.e, MAXY)) / 2), true); focusOn(r0, true); renderList(); }
    else if (c && A.countries[c]) {
      var cv = A.countries[c];
      if (isG() && A.countriesLL && A.countriesLL[c]) { var g = A.countriesLL[c]; GL.rotateTo(g[0], g[1], GL.kFor(Math.max(g[2] * 0.55, 7))); }   // the flat ?c box carries wide context; frame the country itself
      else fitBox(cv[1], cv[2], cv[3], cv[4]);
      $('atl-place').textContent = ' · in the world; map centred on present-day ' + cv[0];
    }
    if ((f && byId[f]) || (c && A.countries[c])) setTimeout(flickBorders, 750);   // once the turn has landed
  }
  if (isG()) {
    GL.load(function (ok) {
      if (!ok) { mode = 'flat'; begin(); return; }
      svg.setAttribute('hidden', ''); canvas.removeAttribute('hidden');
      GL.resize(); begin();
    });
  } else begin();
})();
