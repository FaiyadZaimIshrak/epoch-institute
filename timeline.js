// timeline.js - the world timeline (/timeline): every state of the register as a bar from its founding to its end, in
// lanes by region (the 94 great empires first); gold bars have a profile. Data: maps/atlas-data.js (ATLAS rows: id, name,
// start, end, x, y, flags, kind, region, lng, lat, profile url). The panel scrolls a spacer while the canvas stays in
// place and draws only the rows in view. Time zooms and pans on its own: drag sideways, pinch, Ctrl/Cmd + wheel (a
// trackpad pinch), the buttons, or the keys; a plain wheel or a vertical swipe scrolls the lanes.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var panel = $('tl-panel'), cv = $('tl-canvas'), spacer = $('tl-spacer'), tip = $('tl-tip'), box = $('tl-box');
  if (typeof ATLAS === 'undefined' || !panel || !cv || !cv.getContext) return;
  var A = ATLAS, ctx = cv.getContext('2d');
  var YMIN = Math.max(-3500, A.first), YMAX = A.year, PADL = 120, PADR = 40;
  var AXIS = 30, HEAD = 24, ROW = { p: 16, a: 4 }, BAR = { p: 12, a: 3 };
  var items = A.rows.map(function (r) {
    return { id: r[0], n: r[1], s: r[2], e: r[3] === null ? YMAX : r[3], live: r[3] === null, p: (r[6] & 1) === 1, g: r[8], url: r[11] || '/state/' + r[0] };
  });
  var mode = 'p', hidden = {}, lanes = [], total = 0, v0 = YMIN, v1 = YMAX, W = 300, H = 300, dpr = 1, raf = null, flash = null;
  var C = {}, FONT = 'sans-serif';

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fold(s) { return typeof searchFold === 'function' ? searchFold(s) : String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function fmt(y) { y = Math.round(y); return y < 0 ? (-y) + ' BCE' : y === 0 ? '1 CE' : y < 1000 ? y + ' CE' : String(y); }
  function laneLabel(g) { return g < 0 ? 'Great empires' : A.regions[g]; }

  // ── lanes: each region's states packed into rows (a state goes into the first row free before it begins) ──
  function layout() {
    var byG = {};
    items.forEach(function (it) { it.lane = -1; if (mode === 'p' && !it.p) return; (byG[it.g] = byG[it.g] || []).push(it); });
    var order = [-1].concat(A.regions.map(function (_, i) { return i; })), y = 0;
    lanes = [];
    order.forEach(function (g) {
      var list = byG[g]; if (!list || hidden[g]) return;
      list.sort(function (a, b) { return a.s - b.s || b.e - a.e; });
      var rows = [], ends = [];
      list.forEach(function (it) {
        var k = 0; while (k < ends.length && ends[k] >= it.s) k++;
        if (k === ends.length) { rows.push([]); ends.push(0); }
        rows[k].push(it); ends[k] = it.e; it.row = k; it.lane = lanes.length;
      });
      var h = HEAD + rows.length * ROW[mode] + 8;
      lanes.push({ g: g, label: laneLabel(g), n: list.length, y0: y, h: h, rows: rows });
      y += h;
    });
    total = y;
    var n = 0; lanes.forEach(function (l) { n += l.n; });
    $('tl-status').textContent = n.toLocaleString('en-GB') + (mode === 'p' ? ' profiles' : ' states') + ' in ' + lanes.length + (lanes.length === 1 ? ' lane' : ' lanes');
    size();
  }

  // ── size: the canvas fills the panel; the spacer makes the panel as tall as all the lanes ──
  function size() {
    W = Math.max(260, panel.clientWidth); H = Math.max(200, panel.clientHeight);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    spacer.style.height = Math.max(0, AXIS + total - H) + 'px';
    draw(true);
  }
  function colours() {
    var cs = getComputedStyle(document.documentElement);
    ['--gold', '--gold-light', '--text', '--muted', '--border', '--surface', '--bg'].forEach(function (k) { C[k] = cs.getPropertyValue(k).trim() || '#888'; });
    FONT = (cs.getPropertyValue('--font-ui').trim() || 'sans-serif');
  }

  // ── the view: years v0..v1 across the width ──
  function sx(y) { return (y - v0) / (v1 - v0) * W; }
  function yearAt(px) { return v0 + px / W * (v1 - v0); }
  function setView(a, b) {
    var lo = YMIN - PADL, hi = YMAX + PADR, span = b - a;
    if (span < 12) { var c = (a + b) / 2; a = c - 6; b = c + 6; span = 12; }
    if (span > hi - lo) { a = lo; b = hi; }
    if (a < lo) { b += lo - a; a = lo; }
    if (b > hi) { a -= b - hi; b = hi; }
    v0 = a; v1 = b; draw(); saveUrl();
  }
  function zoomAt(f, k) { var c = v0 + f * (v1 - v0), span = (v1 - v0) * k; setView(c - f * span, c + (1 - f) * span); }
  function ticks() {
    var raw = (v1 - v0) / Math.max(2, W / 110), p = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), m = raw / p;
    var step = Math.max(1, (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p), out = [];
    for (var t = Math.ceil(v0 / step) * step; t <= v1; t += step) out.push(t);
    return out;
  }

  // ── drawing: only the rows in view ──
  function draw(now) {
    if (!now) { if (!raf) raf = requestAnimationFrame(function () { raf = null; draw(true); }); return; }
    var top = panel.scrollTop, rh = ROW[mode], bh = BAR[mode], tk = ticks();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = C['--border'];
    tk.forEach(function (t) { var x = Math.round(sx(t)) + 0.5; ctx.beginPath(); ctx.moveTo(x, AXIS); ctx.lineTo(x, H); ctx.stroke(); });
    ctx.textBaseline = 'middle';
    var topLane = null;
    for (var li = 0; li < lanes.length; li++) {
      var ln = lanes[li], ly = AXIS + ln.y0 - top;
      if (ly > H || ly + ln.h < AXIS) continue;
      if (ly <= AXIS + 2) topLane = ln;
      ctx.globalAlpha = 1; ctx.fillStyle = C['--gold']; ctx.font = '600 11px ' + FONT;
      ctx.fillText(ln.label.toUpperCase() + '  ·  ' + ln.n, 8, ly + 13);
      ctx.fillStyle = C['--border']; ctx.fillRect(0, ly + 0.5, W, 1);
      for (var k = 0; k < ln.rows.length; k++) {
        var ry = ly + HEAD + k * rh;
        if (ry > H || ry + rh < AXIS) continue;
        var row = ln.rows[k];
        for (var i = 0; i < row.length; i++) {
          var it = row[i], x0 = sx(it.s), x1 = sx(it.e);
          if (x1 < 0 || x0 > W) continue;
          var w = Math.max(mode === 'p' ? 2 : 1.5, x1 - x0);
          ctx.globalAlpha = it.p ? 0.9 : 0.5; ctx.fillStyle = it.p ? C['--gold'] : C['--muted'];
          ctx.fillRect(x0, ry, w, bh);
          if (mode === 'p') {
            var vx0 = Math.max(x0, 0), vw = Math.min(x1, W) - vx0;
            if (vw > 34) {
              ctx.globalAlpha = 1; ctx.fillStyle = C['--bg']; ctx.font = '600 10.5px ' + FONT;
              var txt = it.n, max = vw - 8;
              if (ctx.measureText(txt).width > max) { while (txt.length > 2 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1); txt += '…'; }
              if (txt.length > 2) ctx.fillText(txt, vx0 + 4, ry + bh / 2 + 0.5);
            }
          }
        }
      }
    }
    // the state found by the search: a ring that fades
    if (flash) {
      var age = Date.now() - flash.t, f = flash.it;
      if (age < 2600 && f.lane >= 0) {
        var fl = lanes[f.lane], fy = AXIS + fl.y0 - top + HEAD + f.row * rh;
        ctx.globalAlpha = 1 - age / 2600; ctx.strokeStyle = C['--gold-light']; ctx.lineWidth = 2;
        ctx.strokeRect(sx(f.s) - 3, fy - 3, Math.max(4, sx(f.e) - sx(f.s)) + 6, bh + 6); ctx.lineWidth = 1;
        draw();
      } else flash = null;
    }
    ctx.globalAlpha = 1;
    // the axis, and the name of the lane under it
    ctx.fillStyle = C['--surface']; ctx.fillRect(0, 0, W, AXIS);
    ctx.fillStyle = C['--border']; ctx.fillRect(0, AXIS - 1, W, 1);
    ctx.fillStyle = C['--muted']; ctx.font = '600 11px ' + FONT; ctx.textAlign = 'center';
    tk.forEach(function (t) { var x = sx(t); if (x > 18 && x < W - 18) ctx.fillText(fmt(t), x, AXIS / 2); });
    ctx.textAlign = 'left';
    if (topLane && AXIS + topLane.y0 - top < AXIS - 4) {
      var lbl = topLane.label.toUpperCase(); ctx.font = '600 11px ' + FONT;
      var lw = ctx.measureText(lbl).width + 16;
      ctx.fillStyle = C['--surface']; ctx.globalAlpha = 0.92; ctx.fillRect(0, AXIS, lw, 18); ctx.globalAlpha = 1;
      ctx.fillStyle = C['--gold']; ctx.fillText(lbl, 8, AXIS + 9.5);
    }
    var mid = Math.round((v0 + v1) / 2), at = $('tl-atlas');
    if (at) { var my = Math.min(YMAX, Math.max(YMIN, mid === 0 ? 1 : mid)); at.href = '/atlas?year=' + my; at.textContent = 'Open the atlas at ' + fmt(my) + ' →'; }
  }

  // ── what is under the pointer ──
  function hit(px, py) {
    if (py < AXIS) return null;
    var cy = py - AXIS + panel.scrollTop, rh = ROW[mode];
    for (var li = 0; li < lanes.length; li++) {
      var ln = lanes[li];
      if (cy < ln.y0 || cy >= ln.y0 + ln.h) continue;
      var k = Math.floor((cy - ln.y0 - HEAD) / rh); if (k < 0 || k >= ln.rows.length) return null;
      var y = yearAt(px), tol = (v1 - v0) / W * 3, row = ln.rows[k];
      for (var i = 0; i < row.length; i++) if (row[i].s - tol <= y && y <= row[i].e + tol) return row[i];
      return null;
    }
    return null;
  }
  function showTip(it, px, py, withLink) {
    tip.innerHTML = '<p class="atl-tip-n">' + esc(it.n) + '</p><p class="atl-tip-y">' + fmt(it.s) + ' – ' + (it.live ? 'today' : fmt(it.e)) + '</p><p class="atl-tip-k">' + esc(laneLabel(it.g)) + (it.p ? ' · <b>profile</b>' : '') + '</p>' +
      (withLink ? '<a class="atl-tip-go" href="' + esc(it.url) + '">' + (it.p ? 'Read the profile' : 'Open the state') + ' &rarr;</a>' : '');
    tip.hidden = false;
    var bw = box.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight, x = px + 14, y = py + 14;
    if (x + tw > bw - 6) x = Math.max(6, px - tw - 14);
    if (y + th > H - 6) y = Math.max(AXIS, py - th - 14);
    tip.style.left = (x + panel.offsetLeft) + 'px'; tip.style.top = (y + panel.offsetTop) + 'px';   // the box holds the zoom strip above the panel on phones
  }
  function hideTip() { tip.hidden = true; }

  // ── pointer: drag sideways to pan, two fingers to zoom, a click or tap opens (a tap first shows the name) ──
  var ptrs = {}, drag = null, pinch = null, moved = false, tipFor = null;
  function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', function (e) {
    ptrs[e.pointerId] = e.clientX;
    var ids = Object.keys(ptrs);
    if (ids.length === 1) { drag = { x: e.clientX, v0: v0, v1: v1 }; moved = false; }
    else if (ids.length === 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], r = cv.getBoundingClientRect(), f = ((a + b) / 2 - r.left) / W;
      pinch = { d: Math.max(20, Math.abs(a - b)), c: v0 + f * (v1 - v0), v0: v0, v1: v1 }; drag = null; moved = true;
    }
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId in ptrs) ptrs[e.pointerId] = e.clientX;
    var ids = Object.keys(ptrs);
    if (pinch && ids.length >= 2) {
      var a = ptrs[ids[0]], b = ptrs[ids[1]], r = cv.getBoundingClientRect(), f = ((a + b) / 2 - r.left) / W;
      var span = (pinch.v1 - pinch.v0) * pinch.d / Math.max(20, Math.abs(a - b));
      setView(pinch.c - f * span, pinch.c + (1 - f) * span); hideTip(); return;
    }
    if (drag) {
      var dx = e.clientX - drag.x;
      if (!moved && Math.abs(dx) > 5) { moved = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} hideTip(); }
      if (moved) { var d = (drag.v1 - drag.v0) * dx / W; setView(drag.v0 - d, drag.v1 - d); }
      return;
    }
    if (e.pointerType === 'mouse') {
      var p = local(e), it = hit(p[0], p[1]);
      cv.style.cursor = it ? 'pointer' : 'grab';
      if (it) showTip(it, p[0], p[1], false); else hideTip();
    }
  });
  function release(e) { delete ptrs[e.pointerId]; if (Object.keys(ptrs).length < 2) pinch = null; if (!Object.keys(ptrs).length) drag = null; }
  cv.addEventListener('pointerup', function (e) {
    var wasMoved = moved; release(e);
    if (wasMoved || Object.keys(ptrs).length) return;
    var p = local(e), it = hit(p[0], p[1]);
    if (!it) { hideTip(); tipFor = null; return; }
    if (e.pointerType === 'mouse' || tipFor === it) { location.href = it.url; return; }
    tipFor = it; showTip(it, p[0], p[1], true);
  });
  cv.addEventListener('pointercancel', function (e) { release(e); moved = false; });
  cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !drag) hideTip(); });
  cv.addEventListener('wheel', function (e) {
    var p = local(e);
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(p[0] / W, Math.exp(Math.max(-60, Math.min(60, e.deltaY)) * 0.01)); hideTip(); return; }
    var dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (dx && Math.abs(dx) >= Math.abs(e.deltaY) * (e.shiftKey ? 0 : 1)) { e.preventDefault(); var d = (v1 - v0) * dx / W; setView(v0 + d, v1 + d); hideTip(); }
  }, { passive: false });
  cv.addEventListener('keydown', function (e) {
    var span = v1 - v0, k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); var d = span * 0.12 * (k === 'ArrowLeft' ? -1 : 1); setView(v0 + d, v1 + d); }
    else if (k === '+' || k === '=') { e.preventDefault(); zoomAt(0.5, 0.7); }
    else if (k === '-' || k === '_') { e.preventDefault(); zoomAt(0.5, 1 / 0.7); }
    else if (k === '0' || k === 'Home') { e.preventDefault(); setView(YMIN, YMAX); }
  });
  panel.addEventListener('scroll', function () { hideTip(); draw(); }, { passive: true });
  $('tl-zin').addEventListener('click', function () { zoomAt(0.5, 0.6); });
  $('tl-zout').addEventListener('click', function () { zoomAt(0.5, 1 / 0.6); });
  $('tl-zreset').addEventListener('click', function () { setView(YMIN, YMAX); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-era]'), function (b) {
    b.addEventListener('click', function () { var r = b.getAttribute('data-era').split(':'); setView(Math.max(YMIN, +r[0]), Math.min(YMAX, +r[1])); });
  });

  // ── profiles or all states ──
  function setMode(m) {
    if (m === mode) return;
    mode = m; $('tl-m-p').setAttribute('aria-pressed', String(m === 'p')); $('tl-m-a').setAttribute('aria-pressed', String(m === 'a'));
    hideTip(); layout(); saveUrl();
  }
  $('tl-m-p').addEventListener('click', function () { setMode('p'); });
  $('tl-m-a').addEventListener('click', function () { setMode('a'); });

  // ── regions shown ──
  var regBox = $('tl-regions');
  function regionButtons() {
    var groups = [-1].concat(A.regions.map(function (_, i) { return i; }));
    regBox.innerHTML = '<button type="button" data-g="all">All</button><button type="button" data-g="none">None</button>' +
      groups.map(function (g) { return '<button type="button" data-g="' + g + '" aria-pressed="' + (!hidden[g]) + '">' + esc(laneLabel(g)) + '</button>'; }).join('');
    var nOff = groups.filter(function (g) { return hidden[g]; }).length;
    $('tl-reg-n').textContent = nOff ? '(' + (groups.length - nOff) + ' of ' + groups.length + ')' : '(all ' + groups.length + ')';
  }
  regBox.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var g = b.getAttribute('data-g');
    if (g === 'all') hidden = {};
    else if (g === 'none') { hidden = {}; [-1].concat(A.regions.map(function (_, i) { return i; })).forEach(function (x) { hidden[x] = true; }); }
    else { g = +g; if (hidden[g]) delete hidden[g]; else hidden[g] = true; }
    regionButtons(); layout(); saveUrl();
  });

  // ── find a state ──
  var q = $('tl-q'), sugg = $('tl-sugg'), found = [], cur = -1;
  var index = items.map(function (it) { return fold(it.n); });
  function suggest() {
    var s = fold(q.value.trim()); found = []; cur = -1;
    if (s.length < 2) { sugg.hidden = true; return; }
    var starts = [], has = [];
    for (var i = 0; i < items.length && starts.length < 8; i++) { var k = index[i].indexOf(s); if (k === 0) starts.push(items[i]); else if (k > 0 && has.length < 8) has.push(items[i]); }
    found = starts.concat(has).slice(0, 8);
    sugg.innerHTML = found.map(function (it, j) { return '<li role="option" id="tl-o' + j + '" data-i="' + j + '">' + esc(it.n) + ' <span>' + fmt(it.s) + ' – ' + (it.live ? 'today' : fmt(it.e)) + '</span></li>'; }).join('');
    sugg.hidden = !found.length;
  }
  function choose(it) {
    sugg.hidden = true; q.value = it.n;
    if (!it.p && mode === 'p') { mode = 'a'; $('tl-m-p').setAttribute('aria-pressed', 'false'); $('tl-m-a').setAttribute('aria-pressed', 'true'); }
    if (hidden[it.g]) { delete hidden[it.g]; regionButtons(); }
    layout();
    var pad = Math.max(40, (it.e - it.s) * 0.5);
    setView(it.s - pad, it.e + pad);
    if (it.lane >= 0) { var ln = lanes[it.lane]; panel.scrollTop = Math.max(0, ln.y0 + HEAD + it.row * ROW[mode] - H / 3); }
    flash = { it: it, t: Date.now() }; draw();
    $('tl-status').textContent = it.n + ': ' + fmt(it.s) + ' – ' + (it.live ? 'today' : fmt(it.e));
  }
  q.addEventListener('input', suggest);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!found.length) return; e.preventDefault(); cur = (cur + (e.key === 'ArrowDown' ? 1 : found.length - 1)) % found.length; Array.prototype.forEach.call(sugg.children, function (li, j) { li.classList.toggle('on', j === cur); }); q.setAttribute('aria-activedescendant', 'tl-o' + cur); }
    else if (e.key === 'Enter') { e.preventDefault(); if (found.length) choose(found[cur < 0 ? 0 : cur]); }
    else if (e.key === 'Escape') sugg.hidden = true;
  });
  sugg.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); choose(found[+li.getAttribute('data-i')]); } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.atl-search')) sugg.hidden = true; });

  // ── the address keeps the view: ?from=&to=&all=1&hide=<regions> ──
  var urlTimer = null;
  function saveUrl() {
    clearTimeout(urlTimer);
    urlTimer = setTimeout(function () {
      var u = new URLSearchParams(); u.set('from', String(Math.round(v0))); u.set('to', String(Math.round(v1)));
      if (mode === 'a') u.set('all', '1');
      var off = Object.keys(hidden); if (off.length) u.set('hide', off.join(','));
      try { history.replaceState(null, '', location.pathname + '?' + u.toString()); } catch (x) {}
    }, 400);
  }
  var qs = new URLSearchParams(location.search);
  if (qs.get('all') === '1') { mode = 'a'; $('tl-m-p').setAttribute('aria-pressed', 'false'); $('tl-m-a').setAttribute('aria-pressed', 'true'); }
  (qs.get('hide') || '').split(',').forEach(function (g) { if (g !== '' && !isNaN(+g)) hidden[+g] = true; });
  var f0 = parseInt(qs.get('from'), 10), t0 = parseInt(qs.get('to'), 10);
  if (!isNaN(f0) && !isNaN(t0) && t0 > f0) { v0 = f0; v1 = t0; }

  colours(); regionButtons(); layout(); setView(v0, v1);
  window.addEventListener('resize', function () { size(); });
  new MutationObserver(function () { colours(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-kids'] });
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: light)'); if (mq.addEventListener) mq.addEventListener('change', function () { colours(); draw(); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); });
  window.epochTimeline = { view: function () { return [v0, v1]; }, setView: setView, hit: hit, lanes: function () { return lanes; }, mode: function () { return mode; } };
})();
