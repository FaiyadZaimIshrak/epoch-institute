// atlas.js - the Atlas (/atlas): every state of the register in a chosen year, on an Equal Earth map.
// Data: maps/atlas-data.js (ATLAS) and maps/basemap.js (ATLAS_BASE), written by scripts/build-pages.ps1.
// Address: ?year=1250, ?focus=<state id> (that state, in its middle year unless ?year is given), ?c=<country slug>.
(function () {
  'use strict';
  var A = window.ATLAS, B = window.ATLAS_BASE, svg = document.getElementById('atl-svg');
  if (!A || !B || !svg) return;
  var NS = 'http://www.w3.org/2000/svg', W = A.w, H = A.h, MINY = A.first, MAXY = A.year;
  function $(id) { return document.getElementById(id); }
  var world = $('atl-world'), dotsS = $('atl-dots-s'), dotsP = $('atl-dots-p'), labelsG = $('atl-labels'), ring = $('atl-ring');
  var tip = $('atl-tip'), mapBox = $('atl-map'), slider = $('atl-year'), yearOut = $('atl-year-out'), countOut = $('atl-count');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  $('atl-edge').setAttribute('d', B.edge); $('atl-grat').setAttribute('d', B.grat); $('atl-land').setAttribute('d', B.land);

  var rows = A.rows.map(function (r) {
    return { id: r[0], n: r[1], s: r[2], e: r[3] === null ? Infinity : r[3], open: r[3] === null, x: r[4], y: r[5], f: r[6], k: r[7], g: r[8], url: r[9] || '/state/' + r[0], el: null, fold: fold(r[1]) };
  });
  var byId = {}; rows.forEach(function (r) { byId[r.id] = r; });
  function fold(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fmtYear(y) { return y < 0 ? (-y) + ' BCE' : y + ' CE'; }
  function span(r) { return fmtYear(r.s) + ' – ' + (r.open ? 'today' : fmtYear(r.e)); }
  function clampYear(y) { return Math.max(MINY, Math.min(MAXY, y)); }

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

  // ── view: translate(tx, ty) scale(k) on the world group; the viewBox stays the whole map ──
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
  function zoomAt(f, px, py) { var wx = (px - tx) / k, wy = (py - ty) / k; k = Math.max(1, Math.min(KMAX, k * f)); tx = px - wx * k; ty = py - wy * k; applyView(); }
  var anim = null;
  function animateTo(k2, tx2, ty2) {
    var k0 = k, x0 = tx, y0 = ty, t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    cancelAnimationFrame(anim);
    (function frame(now) {
      var t = dur ? Math.min(1, (now - t0) / dur) : 1, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      k = k0 + (k2 - k0) * e; tx = x0 + (tx2 - x0) * e; ty = y0 + (ty2 - y0) * e; applyView();
      if (t < 1) anim = requestAnimationFrame(frame);
    })(t0);
  }
  function fitBox(x, y, w, h) { var k2 = Math.max(1, Math.min(KMAX, Math.min(W / w, H / h))); animateTo(k2, -x * k2 + (W - w * k2) / 2, -y * k2 + (H - h * k2) / 2); }
  function centreOn(x, y, k2) { animateTo(k2, W / 2 - x * k2, H / 2 - y * k2); }

  // wheel, drag, pinch
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
  $('atl-zin').addEventListener('click', function () { zoomAt(1.8, W / 2, H / 2); });
  $('atl-zout').addEventListener('click', function () { zoomAt(1 / 1.8, W / 2, H / 2); });
  $('atl-zreset').addEventListener('click', function () { animateTo(1, 0, 0); });
  svg.addEventListener('keydown', function (e) {
    var step = W * 0.08;
    if (e.key === '+' || e.key === '=') zoomAt(1.5, W / 2, H / 2); else if (e.key === '-') zoomAt(1 / 1.5, W / 2, H / 2);
    else if (e.key === 'ArrowLeft') { tx += step; applyView(); } else if (e.key === 'ArrowRight') { tx -= step; applyView(); }
    else if (e.key === 'ArrowUp') { ty += step; applyView(); } else if (e.key === 'ArrowDown') { ty -= step; applyView(); } else return;
    e.preventDefault();
  });
  var presets = $('atl-presets');
  A.presets.forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = p[0];
    b.addEventListener('click', function () { if (p[0] === 'World') animateTo(1, 0, 0); else fitBox(p[1], p[2], p[3], p[4]); });
    presets.appendChild(b);
  });
  window.addEventListener('resize', function () { sizeDots(); scheduleLabels(); });

  // ── dots ──
  var visible = [];
  function px(n) { return n * Math.max(0.55, Math.min(1, svg.getBoundingClientRect().width / 900)); }   // smaller dots on a small map
  function dotR(r) { return px((r.f & 1) ? 4.4 : 2.7) / (ppu() * k); }
  function sizeDots() {
    var u = ppu() * k, rp = px(4.4) / u, rs = px(2.7) / u, sw = px(1.2) / u;
    visible.forEach(function (r) { r.el.setAttribute('r', ((r.f & 1) ? rp : rs).toFixed(3)); if (r.f & 2) r.el.setAttribute('stroke-width', sw.toFixed(3)); });
    if (focused) { ring.setAttribute('r', (px(11) / u).toFixed(3)); ring.setAttribute('stroke-width', (2 / u).toFixed(3)); }
  }
  function render(listNow) {
    var next = [];
    rows.forEach(function (r) {
      if (shown(r)) {
        if (!r.el) {
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
    if (pinned && pinned.el === null) hideTip(true);
    scheduleLabels();
    if (listNow) renderList(); else scheduleList();
  }

  // ── labels: profiles from 2.2x, every state from 7x; no overlaps ──
  var labelTimer = null;
  function scheduleLabels() { if (labelTimer) return; labelTimer = requestAnimationFrame(function () { labelTimer = null; drawLabels(); }); }
  function drawLabels() {
    while (labelsG.firstChild) labelsG.removeChild(labelsG.firstChild);
    if (k < 2.2) return;
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

  // ── tooltip: nearest dot to the pointer ──
  var pinned = null, focused = null, hoverRaf = null;
  function nearest(clientX, clientY, maxPx) {
    var b = svg.getBoundingClientRect(), u = b.width / W, best = null, bd = maxPx * maxPx;
    var px = clientX - b.left, py = clientY - b.top;
    visible.forEach(function (r) { var dx = (r.x * k + tx) * u - px, dy = (r.y * k + ty) * u - py, d = dx * dx + dy * dy - ((r.f & 1) ? 6 : 0); if (d < bd) { bd = d; best = r; } });
    return best;
  }
  function hover(e) {
    if (hoverRaf) return;
    var cx = e.clientX, cy = e.clientY;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = null; if (pinned) return;
      var r = nearest(cx, cy, 14); if (r) showTip(r, false); else hideTip();
      svg.style.cursor = r ? 'pointer' : '';
    });
  }
  function tap(e) {
    var r = nearest(e.clientX, e.clientY, e.pointerType === 'mouse' ? 14 : 24);
    if (!r) { hideTip(true); return; }
    if (e.pointerType === 'mouse') { location.href = r.url; return; }
    showTip(r, true);
  }
  function showTip(r, pin) {
    if (pin) pinned = r;
    var kindLabel = A.kinds[r.k] || '', region = A.regions[r.g] || '';
    tip.innerHTML = '<p class="atl-tip-n">' + escHtml(r.n) + '</p><p class="atl-tip-y">' + span(r) + '</p>' +
      '<p class="atl-tip-k">' + escHtml(kindLabel.replace(/s and .*$|s$/, '')) + (region ? ' · ' + escHtml(region) : '') + ((r.f & 1) ? ' · <b>profile</b>' : '') + '</p>' +
      ((r.f & 2) ? '<p class="atl-tip-a">Place approximate: shown in its present-day country.</p>' : '') +
      '<a class="atl-tip-go" href="' + escHtml(r.url) + '">' + ((r.f & 1) ? 'Read the profile' : 'Read its history') + ' &rarr;</a>';
    tip.hidden = false;
    var b = svg.getBoundingClientRect(), mb = mapBox.getBoundingClientRect(), u = b.width / W;
    var sx = (r.x * k + tx) * u + (b.left - mb.left), sy = (r.y * k + ty) * u + (b.top - mb.top);
    var tw = tip.offsetWidth, th = tip.offsetHeight, left = sx + 14, top = sy - th / 2;
    if (left + tw > mb.width - 8) left = sx - tw - 14;
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
  function scheduleUrl() { clearTimeout(urlTimer); urlTimer = setTimeout(function () { if (!timer) history.replaceState(null, '', '/atlas?year=' + year); }, 500); }

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
    focused = r; ring.setAttribute('cx', r.x); ring.setAttribute('cy', r.y); ring.style.display = '';
    centreOn(r.x, r.y, Math.max(k, 6));
    setTimeout(function () { if (r.el) showTip(r, true); sizeDots(); }, 480);
  }

  // ── start ──
  slider.value = year;
  render(true); applyView();
  var f = q.get('focus'), c = q.get('c');
  if (f && byId[f]) { var r0 = byId[f]; if (!q.get('year')) setYear(Math.round((r0.s + Math.min(r0.e, MAXY)) / 2), true); focusOn(r0, true); renderList(); }
  else if (c && A.countries[c]) { var cv = A.countries[c]; fitBox(cv[1], cv[2], cv[3], cv[4]); $('atl-place').textContent = ' · in the world; map centred on present-day ' + cv[0]; }
})();
