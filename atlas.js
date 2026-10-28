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
      url: r[11] || '/state/' + r[0], ac: r[12] ? r[12].split('|') : null, el: null, fold: fold(r[1]) };
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
  function animateTo(k2, tx2, ty2, now) {   // now: no glide (the page opening on a place)
    var k0 = k, x0 = tx, y0 = ty, t0 = performance.now(), dur = reduced() || now ? 0 : 450;
    cancelAnimationFrame(anim);
    (function frame(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      k = k0 + (k2 - k0) * e; tx = x0 + (tx2 - x0) * e; ty = y0 + (ty2 - y0) * e; applyView();
      if (t < 1) anim = requestAnimationFrame(frame);
    })(t0);
  }
  function fitBox(x, y, w, h, now) { var k2 = Math.max(1, Math.min(KMAX, Math.min(W / w, H / h))); animateTo(k2, -x * k2 + (W - w * k2) / 2, -y * k2 + (H - h * k2) / 2, now); }
  function centreOn(x, y, k2, now) { animateTo(k2, W / 2 - x * k2, H / 2 - y * k2, now); }

  // flat wheel, drag, pinch
  svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = toMap(e.clientX, e.clientY); zoomAt(Math.pow(1.0018, -e.deltaY * (e.deltaMode === 1 ? 30 : 1)), p.x, p.y); }, { passive: false });
  var pointers = {}, drag = null, moved = false;
  svg.addEventListener('pointerdown', function (e) {
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; svg.setPointerCapture(e.pointerId); moved = false;
    var ids = Object.keys(pointers);
    pressStart(e, ids.length);
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
      if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; pressEnd(); }
      if (moved) { var s = W / svg.getBoundingClientRect().width; tx = drag.tx + dx * s; ty = drag.ty + dy * s; applyView(); hideTip(); }
    } else if (drag && drag.pinch && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), m = toMap((a.x + b.x) / 2, (a.y + b.y) / 2); moved = true;
      k = Math.max(1, Math.min(KMAX, drag.k * d / drag.pinch)); tx = m.x - drag.wx * k; ty = m.y - drag.wy * k; applyView(); hideTip(true);
    } else if (e.pointerType === 'mouse' && !ids.length) hover(e);
  });
  function endPointer(e) {
    var had = !!pointers[e.pointerId]; delete pointers[e.pointerId];
    var held = pressEnd();
    if (!Object.keys(pointers).length) {
      if (had && !moved && drag && !drag.pinch && !held) tap(e);
      drag = null;
    } else drag = null;
  }
  svg.addEventListener('pointerup', endPointer); svg.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; drag = null; pressEnd(); });
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
  // the buttons are in the page already (written by the builder), so the map does not move down when they arrive
  var presets = $('atl-presets'), given = presets.querySelectorAll('button');
  A.presets.forEach(function (p, i) {
    var b = given[i] || presets.appendChild(document.createElement('button')); b.type = 'button'; b.textContent = p[0];
    b.addEventListener('click', function () {
      if (isG()) { var g = A.presetsLL[i]; GL.rotateTo(g[0], g[1], i === 0 ? 1 : GL.kFor(g[2])); return; }
      if (p[0] === 'World') animateTo(1, 0, 0); else fitBox(p[1], p[2], p[3], p[4]);
    });
  });
  for (var gi = A.presets.length; gi < given.length; gi++) given[gi].remove();
  window.addEventListener('resize', function () { if (isG()) { GL.resize(); } else { sizeDots(); scheduleLabels(); } });

  // ── flat dots ──
  var visible = [];
  function px(n) { return n * Math.max(0.55, Math.min(1, mapBox.getBoundingClientRect().width / 900)); }   // smaller dots on a small map
  function dotR(r) { return px((r.f & 1) ? 4.4 : 2.7) / (ppu() * k); }
  function sizeDots() {
    var u = ppu() * k, rp = px(4.4) / u, rs = px(2.7) / u, sw = px(1.2) / u;
    visible.forEach(function (r) { if (!r.el) return; r.el.setAttribute('r', ((r.f & 1) ? rp : rs).toFixed(3)); if (r.f & 2) r.el.setAttribute('stroke-width', sw.toFixed(3)); });
    if (focused) { ring.setAttribute('r', (px(11) / u).toFixed(3)); ring.setAttribute('stroke-width', (2 / u).toFixed(3)); }
    if (hereDot) hereDot.setAttribute('r', (px(5) / u).toFixed(3));
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
    hereNow();
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
    if (hoverRaf || picking) return;
    var cx = e.clientX, cy = e.clientY;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = null; if (pinned) return;
      var r = nearest(cx, cy, 14); if (r) showTip(r, false); else hideTip();
      (isG() ? canvas : svg).style.cursor = r ? 'pointer' : '';
    });
  }
  function tap(e) {
    if (picking) { pickAt(e.clientX, e.clientY); setPicking(false); return; }
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
    year = clampYear(Math.round(y)); slider.value = year; yearOut.textContent = fmtYear(year); yearLink();
    if (now) { render(); return; }
    if (!renderRaf) renderRaf = requestAnimationFrame(function () { renderRaf = null; render(); });
    scheduleUrl();
  }
  // "What happened in <year>": shown when the year has a page of its own (data/years.json, its ?v= stamped by
  // scripts/build-pages.ps1)
  var yrLink = $('atl-yr'), yrSet = null;
  function yearLink() {
    if (!yrLink || !yrSet) return;
    var on = yrSet[year] === 1;
    yrLink.hidden = !on;
    if (on) { yrLink.href = '/years/' + (year < 0 ? (-year) + '-bce' : year); yrLink.textContent = 'What happened in ' + fmtYear(year) + ' →'; }
  }
  if (yrLink && window.fetch && typeof ATLAS_YEARS_SRC === 'string') {
    fetch(ATLAS_YEARS_SRC).then(function (r) { return r.text(); }).then(function (t) { yrSet = {}; JSON.parse(t).forEach(function (y) { yrSet[y] = 1; }); yearLink(); }).catch(function () {});
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
  function scheduleUrl() { clearTimeout(urlTimer); urlTimer = setTimeout(function () { if (!timer) history.replaceState(null, '', '/atlas?year=' + year + (mode === 'flat' ? '&view=flat' : '') + (HERE && !HERE.mine ? '&at=' + HERE.lat.toFixed(2) + ',' + HERE.lng.toFixed(2) : '')); }, 500); }   // never the reader's own location

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
    }).join('') : '<p class="atl-none">No recorded state matches these filters in ' + fmtYear(year) + '.</p>';
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
  function focusOn(r, moveYear, now) {
    if (moveYear && !(r.s <= year && r.e >= year)) setYear(Math.round((r.s + Math.min(r.e, MAXY)) / 2), true);
    if (profOnly && !(r.f & 1)) { profOnly = false; $('atl-prof').checked = false; render(true); }
    if (kind >= 0 && r.k !== kind) { kind = -1; kindSel.value = ''; render(true); }
    focused = r;
    if (isG()) {
      GL.rotateTo(r.lng, r.lat, Math.max(GL.k, 4), function () { showTip(r, true); GL.draw(); }, now);
      return;
    }
    ring.setAttribute('cx', r.x); ring.setAttribute('cy', r.y); ring.style.display = '';
    centreOn(r.x, r.y, Math.max(k, 6), now);
    setTimeout(function () { if (r.el) showTip(r, true); sizeDots(); }, 480);
  }

  // ════ the globe: d3 orthographic on a canvas; land from maps/globe-land.js ════
  var GL = (function () {
    var ready = false, failed = false, waiting = [];
    var proj = null, path = null, geo = null, grat = null, ctx = null;
    var ringsLL = [], ringBB = [], ctyArr = [], hi = null;   // hi: the arrival highlight {geo, t0, steady}
    var G = { k: 1, rot: [-10, -15] };   // rotate([-lng, -lat]) of the facing point; k: zoom 1..12
    var R = 100, dpr = 1, base = null, baseCtx = null, baseDirty = true, drawRaf = null;
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
        globeData(function (ok) { if (ok) init(); else fail(); });
      }
      function init() {
        try {
          // decode the rings (hundredths of a degree) and rewind any that d3 would read inside-out;
          // keep each ring, its box and its country slug for the arrival highlight
          ctyArr = window.ATLAS_GLOBE.cty || [];
          ringsLL = window.ATLAS_GLOBE.rings.map(function (fl) {
            var ring2 = []; for (var i = 0; i < fl.length; i += 2) ring2.push([fl[i] / 100, fl[i + 1] / 100]);
            return ring2;
          });
          ringBB = ringsLL.map(function (ring2) {
            var b = [Infinity, Infinity, -Infinity, -Infinity];
            for (var i = 0; i < ring2.length; i++) { var p = ring2[i]; if (p[0] < b[0]) b[0] = p[0]; if (p[1] < b[1]) b[1] = p[1]; if (p[0] > b[2]) b[2] = p[0]; if (p[1] > b[3]) b[3] = p[1]; }
            return b;
          });
          var polys = ringsLL.map(function (ring2) {
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
      var s = document.createElement('script'); s.src = '/d3-geo.js?v=1'; s.onload = step2; s.onerror = fail; document.head.appendChild(s);
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
      baseCtx.strokeStyle = 'rgba(' + c.g + ',0.45)'; baseCtx.lineWidth = 0.7 * dpr; baseCtx.lineJoin = 'round'; baseCtx.stroke();
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
        // the arrival highlight: the chosen country's border breathes gold for two seconds (steady under reduced motion)
        if (hi) {
          var tt = performance.now() - hi.t0;
          if (!hi.steady && tt > 2400) hi = null;
          else {
            var env = hi.steady ? 1 : Math.sin(Math.PI * Math.min(1, tt / 2400));
            var pul = hi.steady ? 1 : 0.4 + 0.6 * Math.pow(Math.sin(Math.PI * tt / 600), 2);
            var aH = Math.max(0, Math.min(1, env * pul));
            ctx.save();
            ctx.beginPath(); path(hi.geo);
            ctx.fillStyle = 'rgba(' + c.g + ',' + (0.22 * aH).toFixed(3) + ')'; ctx.fill();   // the country itself breathes
            ctx.shadowColor = 'rgba(' + c.g + ',' + (0.85 * aH).toFixed(3) + ')'; ctx.shadowBlur = 16 * dpr * aH;
            ctx.globalAlpha = 0.5 + 0.5 * aH;
            ctx.strokeStyle = c.goldL; ctx.lineJoin = 'round'; ctx.lineWidth = (1.2 + 2 * aH) * dpr;
            ctx.stroke(); ctx.restore(); ctx.globalAlpha = 1;
          }
        }
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
        if (HERE) {   // "What was here?": the place and the 250 km around it
          ctx.beginPath(); path(d3.geoCircle().center([HERE.lng, HERE.lat]).radius(HERE_KM / 111.195)());
          ctx.fillStyle = 'rgba(' + c.g + ',0.10)'; ctx.fill(); ctx.strokeStyle = c.goldL; ctx.lineWidth = 1.5 * dpr; ctx.stroke();
          if (front(HERE)) { p = proj([HERE.lng, HERE.lat]); if (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 5 * sc, 0, 6.2832); ctx.fillStyle = c.goldL; ctx.fill(); ctx.strokeStyle = c.bg; ctx.lineWidth = 2 * dpr; ctx.stroke(); } }
        }
        drawGlobeLabels(c, sc);
        if (pinned) { if (front(pinned) && shown(pinned)) showTip(pinned, true); else hideTip(true); }
        if (hi && !hi.steady) draw();   // keep the highlight breathing
      });
    }
    // which country's border to light up: all rings of a slug, or the (smallest) ring around a point
    function ringsFor(slug) { var out = [], i; for (i = 0; i < ctyArr.length; i++) if (ctyArr[i] === slug) out.push(i); return out; }
    function pip(lng, lat, ring2) {
      var inside = false;
      for (var i = 0, j = ring2.length - 1; i < ring2.length; j = i++) {
        var xi = ring2[i][0], yi = ring2[i][1], xj = ring2[j][0], yj = ring2[j][1];
        if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    function countryAt(lng, lat) {
      var best = -1, bestA = Infinity;
      for (var i = 0; i < ringsLL.length; i++) {
        var b = ringBB[i];
        if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
        if (!pip(lng, lat, ringsLL[i])) continue;
        var a = (b[2] - b[0]) * (b[3] - b[1]);   // the smallest ring wins (an enclave over its neighbour)
        if (a < bestA) { bestA = a; best = i; }
      }
      if (best < 0) return [];
      return ctyArr[best] ? ringsFor(ctyArr[best]) : [best];
    }
    function highlight(idxs) {
      if (!ready || !idxs.length) return;
      hi = { geo: { type: 'MultiPolygon', coordinates: idxs.map(function (i) { return [ringsLL[i]]; }) }, t0: performance.now(), steady: reduced() };
      draw();
      if (hi.steady) setTimeout(function () { hi = null; draw(); }, 1800);
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
    function rotateTo(lng, lat, k2, cb, now) {   // now: no turn (the page opening on a place: a slowed phone redrew all the land each frame)
      var r0 = [G.rot[0], G.rot[1]], k0 = G.k, t0 = performance.now(), dur = reduced() || now ? 0 : 650;
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
    function lngLatAt(clientX, clientY) {   // the place under a point of the globe, or null off its disc
      if (!ready) return null;
      var b = rect(), px2 = (clientX - b.left) * dpr, py2 = (clientY - b.top) * dpr, dx = px2 - canvas.width / 2, dy = py2 - canvas.height / 2;
      if (dx * dx + dy * dy > Math.pow(R * G.k * dpr, 2)) return null;
      apply(); var p = proj.invert([px2, py2]); return p && isFinite(p[0]) && isFinite(p[1]) ? p : null;
    }
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
      pressStart(e, ids.length);
      if (ids.length === 1) gdrag = { x: e.clientX, y: e.clientY, rot: [G.rot[0], G.rot[1]] };
      else if (ids.length === 2) { var a = gp[ids[0]], b = gp[ids[1]]; gdrag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: G.k }; }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (gp[e.pointerId]) gp[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(gp);
      if (gdrag && ids.length === 1 && !gdrag.pinch) {
        var dx = e.clientX - gdrag.x, dy = e.clientY - gdrag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) { gmoved = true; pressEnd(); }
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
      var held = pressEnd();
      if (!Object.keys(gp).length) { if (had && !gmoved && gdrag && !gdrag.pinch && !held) tap(e); gdrag = null; } else gdrag = null;
    }
    canvas.addEventListener('pointerup', endG); canvas.addEventListener('pointercancel', function (e) { delete gp[e.pointerId]; gdrag = null; pressEnd(); });
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
      highlight: highlight, ringsFor: ringsFor, countryAt: countryAt, lngLatAt: lngLatAt };
  })();

  // ════ What was here? A place picked on the map (the button, then a tap; or a long press anywhere; or the reader's
  // own location, which the browser asks for and which never leaves the page): the states whose seat lay within
  // 250 km, oldest first, those placed only by their present-day country apart, and that country's history. Seats,
  // not borders: a state's lands may have reached far wider. The address keeps ?at=<lat>,<lng>. ════
  var HERE = null, HERE_KM = 250, HERE_MAX = 60, picking = false, press = null, hereRows = [];
  var hereBox = $('atl-here'), hereBtn = $('atl-here-btn'), hereG = null, hereDot = null;
  var EE = (function () {   // Equal Earth, as scripts/lib/geo.cs, in the atlas's tenths of a unit (north pole at y = 0)
    var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2, PW = 1000;
    function raw(lng, lat) {
      var l = Math.asin(M * Math.sin(lat * D2R)), l2 = l * l, l6 = l2 * l2 * l2;
      return [lng * D2R * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))), l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))];
    }
    var XMAX = Math.PI / (M * A1), S = PW / (2 * XMAX), PH = 2 * raw(0, 90)[1] * S;
    return {
      fwd: function (lng, lat) { var r = raw(lng, lat); return [(PW / 2 + r[0] * S) * 10, (PH / 2 - r[1] * S) * 10]; },
      inv: function (x10, y10) {
        var x = (x10 / 10 - PW / 2) / S, y = (PH / 2 - y10 / 10) / S, l = y;
        for (var i = 0; i < 12; i++) { var l2 = l * l, l6 = l2 * l2 * l2, f = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)) - y; l -= f / (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)); if (Math.abs(f) < 1e-12) break; }
        var k2 = l * l, k6 = k2 * k2 * k2, sp = Math.max(-1, Math.min(1, Math.sin(l) / M));
        return [M * x * (A1 + 3 * A2 * k2 + k6 * (7 * A3 + 9 * A4 * k2)) / Math.cos(l) / D2R, Math.asin(sp) / D2R];
      }
    };
  })();
  function km(lng1, lat1, lng2, lat2) {
    var p1 = lat1 * D2R, p2 = lat2 * D2R, a = Math.pow(Math.sin((p2 - p1) / 2), 2) + Math.cos(p1) * Math.cos(p2) * Math.pow(Math.sin((lng2 - lng1) * D2R / 2), 2);
    return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  // the present-day country under a place: the smallest ring of maps/globe-land.js around it (fetched when needed;
  // its flat rings in hundredths of a degree are read as they are, only their boxes are worked out)
  var LAND = null;
  function landReady(cb) {
    if (LAND) return cb(LAND);
    function init() {
      var g = window.ATLAS_GLOBE; if (!g) return cb(null);
      LAND = { cty: g.cty || [], rings: g.rings, bb: [] };
      g.rings.forEach(function (fl) {
        var b = [Infinity, Infinity, -Infinity, -Infinity];
        for (var i = 0; i < fl.length; i += 2) { var x = fl[i], y = fl[i + 1]; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
        LAND.bb.push([b[0] / 100, b[1] / 100, b[2] / 100, b[3] / 100]);
      });
      cb(LAND);
    }
    globeData(function (ok) { if (ok) init(); else cb(null); });
  }
  // maps/globe-land.js, fetched once for the globe and the country lookup alike
  var globeWait = null;
  function globeData(cb) {
    if (window.ATLAS_GLOBE) return cb(true);
    if (globeWait) { globeWait.push(cb); return; }
    globeWait = [cb];
    var s = document.createElement('script'); s.src = window.ATLAS_GLOBE_SRC || '/maps/globe-land.js';
    s.onload = function () { var w = globeWait; globeWait = null; w.forEach(function (f) { f(!!window.ATLAS_GLOBE); }); };
    s.onerror = function () { var w = globeWait; globeWait = null; w.forEach(function (f) { f(false); }); };
    document.head.appendChild(s);
  }
  function countryOf(L, lng, lat) {
    var best = '', bestA = Infinity;
    for (var i = 0; i < L.rings.length; i++) {
      var b = L.bb[i], rr = L.rings[i], inside = false;
      if (lng < b[0] || lng > b[2] || lat < b[1] || lat > b[3]) continue;
      for (var j = 0, k2 = rr.length - 2; j < rr.length; k2 = j, j += 2) { var xi = rr[j] / 100, yi = rr[j + 1] / 100, xj = rr[k2] / 100, yj = rr[k2 + 1] / 100; if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside; }
      var a = (b[2] - b[0]) * (b[3] - b[1]);
      if (inside && a < bestA) { bestA = a; best = L.cty[i] || ''; }
    }
    if (bestA < Infinity) return best;
    // on a coast the simplified outlines can leave a city in the sea (Istanbul, on the Golden Horn): the nearest
    // outline within about 50 km
    var cl = Math.cos(lat * D2R), bd = 0.45 * 0.45;
    for (i = 0; i < L.rings.length; i++) {
      b = L.bb[i]; if (lng < b[0] - 0.6 || lng > b[2] + 0.6 || lat < b[1] - 0.6 || lat > b[3] + 0.6) continue;
      rr = L.rings[i];
      for (j = 0; j < rr.length; j += 2) { var dx = (rr[j] / 100 - lng) * cl, dy = rr[j + 1] / 100 - lat, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = L.cty[i] || ''; } }
    }
    return best;
  }
  function theCountry(m) { return /^(United |Bahamas|Central African|Comoros|Cook Islands|Czech|Democratic Republic|Dominican Republic|Gambia|Maldives|Marshall Islands|Netherlands|Philippines|Republic of)/.test(m) ? 'the ' + m : m; }
  function fmtLL(lat, lng) { return Math.abs(lat).toFixed(1) + '° ' + (lat < 0 ? 'S' : 'N') + ', ' + Math.abs(lng).toFixed(1) + '° ' + (lng < 0 ? 'W' : 'E'); }
  // picking: the button, then a tap or click; or a long press (550 ms without moving) in either view
  function setPicking(on) {
    picking = on; if (hereBtn) hereBtn.setAttribute('aria-pressed', String(on));
    mapBox.classList.toggle('is-picking', on); $('atl-here-hint').hidden = !on;
    if (on) hideTip(true);
  }
  if (hereBtn) hereBtn.addEventListener('click', function () { setPicking(!picking); });
  function pressStart(e, n) {
    pressEnd();
    if (n !== 1 || e.pointerType === 'mouse' || !hereBox) return;   // a mouse has the button
    var x = e.clientX, y = e.clientY;
    press = { fired: false, t: setTimeout(function () { press.fired = true; pickAt(x, y); setPicking(false); }, 550) };
  }
  function pressEnd() { if (!press) return false; clearTimeout(press.t); var f = press.fired; press = null; return f; }
  mapBox.addEventListener('contextmenu', function (e) { if (e.pointerType !== 'mouse' && press) e.preventDefault(); });
  function pickAt(clientX, clientY) {
    var ll;
    if (isG()) ll = GL.lngLatAt(clientX, clientY);
    else { var m = toMap(clientX, clientY); ll = EE.inv((m.x - tx) / k, (m.y - ty) / k); if (Math.abs(ll[0]) > 180 || ll[1] < -58) ll = null; }
    if (ll) here(ll[0], ll[1], false);
  }
  function here(lng, lat, mine, quiet) {   // quiet: the page opening on a place (no scrolling to the panel)
    HERE = { lng: lng, lat: lat, mine: !!mine };
    var cp = Math.cos(lat * D2R); HERE.vx = cp * Math.cos(lng * D2R); HERE.vy = cp * Math.sin(lng * D2R); HERE.vz = Math.sin(lat * D2R);   // for the globe's near side
    var near = [];
    rows.forEach(function (r) { if (r.f & 2) return; var d = km(lng, lat, r.lng, r.lat); if (d <= HERE_KM) near.push({ r: r, d: d }); });
    var total = near.length;
    if (total > HERE_MAX) near = near.sort(function (a, b) { return a.d - b.d; }).slice(0, HERE_MAX);
    near.sort(function (a, b) { return a.r.s - b.r.s || a.d - b.d; });
    markHere();
    paintHere(near, total, !quiet);   // at once; the country and the places known only by it follow (the panel never jumps in late)
    landReady(function (L) {
      if (!HERE || HERE.lng !== lng || HERE.lat !== lat) return;
      var slug = L ? countryOf(L, lng, lat) : '', cname = slug && A.countries[slug] ? A.countries[slug][0] : '';
      var approx = slug ? rows.filter(function (r) { return (r.f & 2) && r.ac && r.ac.indexOf(slug) >= 0; }).sort(function (a, b) { return a.s - b.s || a.n.localeCompare(b.n); }) : [];
      paintCountry(slug, cname, approx);
    });
    scheduleUrl();
  }
  function hereAt(slug, cname) {
    $('atl-here-at').innerHTML = (HERE.mine ? 'Your location: ' : 'Near ') + escHtml(fmtLL(HERE.lat, HERE.lng)) + (cname ? ', in present-day ' + escHtml(theCountry(cname)) : '') +
      (cname ? '. <a href="/countries/' + escHtml(slug) + '">The history of ' + escHtml(theCountry(cname)) + ' &rarr;</a>' : '.');
  }
  function paintCountry(slug, cname, approx) {
    hereAt(slug, cname);
    var more = $('atl-here-more'), show = approx.slice(0, 40);
    more.innerHTML = approx.length ? '<p class="atl-here-note">Placed only by their present-day country, with no known seat (' + approx.length + '):</p><p class="atl-here-chips">' +
      show.map(function (r) { return '<a href="' + escHtml(r.url) + '">' + escHtml(r.n) + ' <span>' + escHtml(span(r)) + '</span></a>'; }).join('') + (approx.length > show.length ? ' <span class="atl-here-and">and ' + (approx.length - show.length) + ' more in the country history</span>' : '') + '</p>' : '';
  }
  function paintHere(near, total, scroll) {
    var lo = near.length ? near[0].r.s : MINY, sp = Math.max(1, MAXY - lo);
    hereAt('', ''); $('atl-here-more').innerHTML = '';
    $('atl-here-n').innerHTML = total ? '<b>' + total.toLocaleString('en-GB') + '</b> recorded ' + (total === 1 ? 'state had its' : 'states had their') + ' seat within ' + HERE_KM + ' km of this place' +
      (total > HERE_MAX ? ' (the ' + HERE_MAX + ' nearest are listed)' : '') + ', oldest first. Gold: those that existed in <span id="atl-here-yr">' + fmtYear(year) + '</span>.' :
      'No recorded state had its seat within ' + HERE_KM + ' km of this place.';
    var list = $('atl-here-list');
    list.innerHTML = near.map(function (x, i) {
      var r = x.r, e = Math.min(r.e, MAXY), l = (r.s - lo) / sp * 100, w = Math.max(0.8, (e - r.s) / sp * 100), d = Math.round(x.d);
      return '<li data-i="' + i + '"><span class="atl-here-nm"><a class="atl-here-name" href="' + escHtml(r.url) + '">' + escHtml(r.n) + '</a>' + ((r.f & 1) ? ' <span class="atl-here-pf">profile</span>' : '') + '</span>' +
        '<button type="button" class="atl-here-y" data-id="' + escHtml(r.id) + '" title="Show it on the map in its middle year">' + escHtml(span(r)) + '</button>' +
        '<span class="atl-here-d">' + (d < 1 ? 'here' : d + ' km') + '</span><span class="atl-here-bar" aria-hidden="true"><i style="left:' + l.toFixed(2) + '%;width:' + w.toFixed(2) + '%"></i></span></li>';
    }).join('');
    hereRows = near.map(function (x) { return x.r; });
    hereBox.hidden = false; hereNow();
    var top = scroll ? hereBox.getBoundingClientRect().top : 0;
    if (top > innerHeight - 90) hereBox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
  }
  function hereNow() {   // the year moved: gold for the states alive in it
    if (!HERE || !hereBox || hereBox.hidden) return;
    var items = $('atl-here-list').children, yr = $('atl-here-yr');
    for (var i = 0; i < items.length; i++) { var r = hereRows[i]; if (r) items[i].classList.toggle('is-now', r.s <= year && r.e >= year); }
    if (yr) yr.textContent = fmtYear(year);
  }
  function markHere() {
    if (isG()) { GL.draw(); return; }
    if (!hereG) { hereG = document.createElementNS(NS, 'g'); hereG.setAttribute('class', 'atl-here-mark'); world.appendChild(hereG); }
    hereG.textContent = ''; hereDot = null;
    if (!HERE) return;
    // the 250 km circle, point by point (destinations from the place), projected like the map
    var d = '', dd = HERE_KM / 6371, p1 = HERE.lat * D2R, l1 = HERE.lng * D2R;
    for (var i = 0; i <= 72; i++) {
      var th = i / 72 * 2 * Math.PI, p2 = Math.asin(Math.sin(p1) * Math.cos(dd) + Math.cos(p1) * Math.sin(dd) * Math.cos(th));
      var l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(dd) * Math.cos(p1), Math.cos(dd) - Math.sin(p1) * Math.sin(p2)), q2 = EE.fwd(l2 / D2R, p2 / D2R);
      d += (i ? 'L' : 'M') + q2[0].toFixed(1) + ' ' + q2[1].toFixed(1);
    }
    var c = document.createElementNS(NS, 'path'); c.setAttribute('d', d + 'Z'); c.setAttribute('class', 'atl-here-c'); hereG.appendChild(c);
    var q = EE.fwd(HERE.lng, HERE.lat); hereDot = document.createElementNS(NS, 'circle'); hereDot.setAttribute('cx', q[0].toFixed(1)); hereDot.setAttribute('cy', q[1].toFixed(1)); hereDot.setAttribute('class', 'atl-here-p'); hereG.appendChild(hereDot);
    sizeDots();
  }
  function hereClose() { HERE = null; hereBox.hidden = true; hereRows = []; markHere(); if (isG()) GL.draw(); scheduleUrl(); }
  if (hereBox) $('atl-here-x').addEventListener('click', hereClose);
  if (hereBox) $('atl-here-list').addEventListener('click', function (e) { var b = e.target.closest('[data-id]'); if (b && byId[b.getAttribute('data-id')]) { stop(); focusOn(byId[b.getAttribute('data-id')], true); renderList(); mapBox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' }); } });
  var meBtn = $('atl-here-me');
  if (meBtn) {
    if (!navigator.geolocation) meBtn.hidden = true;
    meBtn.addEventListener('click', function () {
      var msg = $('atl-here-msg'); msg.textContent = 'Asking your browser where you are…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        msg.textContent = ''; setPicking(false);
        var lng = pos.coords.longitude, lat = pos.coords.latitude;
        here(lng, lat, true);
        if (isG()) GL.rotateTo(lng, lat, Math.max(GL.k, 4)); else { var q = EE.fwd(lng, lat); centreOn(q[0], q[1], Math.max(k, 6)); }
      }, function () { msg.textContent = 'Your location is not available: allow it in the browser, or tap a place on the map instead.'; }, { timeout: 12000, maximumAge: 600000 });
    });
  }
  window.epochAtlas = { here: here, pickAt: pickAt, EE: EE, km: km, state: function () { return { HERE: HERE, year: year, mode: mode, hereRows: hereRows }; } };

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
      render(true); applyView(); markHere();
    }
    scheduleUrl();
  }
  if (btnG) btnG.addEventListener('click', function () { setMode('globe'); });
  if (btnF) btnF.addEventListener('click', function () { setMode('flat'); });

  // ── start ──
  slider.value = year;
  function begin() {
    paintToggle();
    render(true);
    if (!isG()) applyView();
    var f = q.get('focus'), c = q.get('c'), at = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(q.get('at') || '');
    if (f && byId[f]) { var r0 = byId[f]; if (!q.get('year')) setYear(Math.round((r0.s + Math.min(r0.e, MAXY)) / 2), true); focusOn(r0, true, true); renderList(); }
    else if (c && A.countries[c]) {
      var cv = A.countries[c];
      if (isG() && A.countriesLL && A.countriesLL[c]) { var g = A.countriesLL[c]; GL.rotateTo(g[0], g[1], GL.kFor(Math.max(g[2] * 0.55, 7)), null, true); }   // the flat ?c box carries wide context; frame the country itself
      else fitBox(cv[1], cv[2], cv[3], cv[4], true);
      $('atl-place').textContent = ' · in the world; map centred on present-day ' + cv[0];
    }
    else if (at && hereBox && Math.abs(+at[1]) <= 90 && Math.abs(+at[2]) <= 180) {   // a place shared from What was here?
      var la = +at[1], ln = +at[2];   // (the panel is in place already: below)
      if (isG()) GL.rotateTo(ln, la, Math.max(GL.k, 3), null, true); else { var qq = EE.fwd(ln, la); centreOn(qq[0], qq[1], 4, true); }
    }
    // arriving from a state, country or profile page: once the turn has landed, that country's border breathes gold
    if (isG()) {
      var sel = (f && byId[f]) ? GL.countryAt(byId[f].lng, byId[f].lat) : (c && A.countries[c]) ? GL.ringsFor(c) : [];
      if (sel.length) setTimeout(function () { GL.highlight(sel); }, 800);
    }
  }
  // a place in the address: its panel before the first paint, so nothing moves when the map is ready
  var at0 = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(q.get('at') || '');
  if (at0 && hereBox && !q.get('focus') && !q.get('c') && Math.abs(+at0[1]) <= 90 && Math.abs(+at0[2]) <= 180) here(+at0[2], +at0[1], false, true);
  if (isG()) {
    GL.load(function (ok) {
      if (!ok) { mode = 'flat'; begin(); return; }
      svg.setAttribute('hidden', ''); canvas.removeAttribute('hidden');
      GL.resize(); begin();
    });
  } else begin();
})();
