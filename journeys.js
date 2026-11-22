// Journeys on the globe (/journeys): the route of one journey drawn stop by stop along great circles.
// The page holds every journey as an article (article.jr-j: legs, ol.jr-stops, li[data-ll="lat,lng"][data-by][data-y]),
// written by scripts/tools/make-journeys.js: this script shows one of them (?j=<slug>, &s=<stop>) beside a globe
// (d3-geo orthographic on a canvas over maps/globe-land.js, both loaded here; JR_GLOBE_SRC on the page holds the land's
// ?v=) or, where the globe cannot be drawn or the reader chooses it, a flat map (an SVG over /maps/world.svg in the
// atlas's Equal Earth plane). Play walks the stops; a leg by sea is dashed. window.epochJourneys for tests.
(function () {
  'use strict';
  var root = document.querySelector('.jr-page'); if (!root) return;
  var $ = function (s, r) { return (r || root).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || root).querySelectorAll(s)); };
  var D2R = Math.PI / 180, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var arts = $$('.jr-j'), cv = $('#jr-globe'), flat = $('#jr-flat'), nowEl = $('#jr-now'), msg = $('#jr-msg');
  var J = arts.map(function (a) {
    var stops = $$('.jr-stops > li', a).map(function (li, i) { var ll = li.getAttribute('data-ll').split(','); li.setAttribute('data-i', i);
      return { li: li, lat: +ll[0], lng: +ll[1], sea: li.getAttribute('data-by') === 'sea', place: $('.jr-place', li).textContent, date: ($('.jr-date', li) || {}).textContent || '', text: ($('p', li) || {}).textContent || '', href: ($('.jr-place a', li) || {}).href || '' }; });
    return { slug: a.id, el: a, title: $('h2', a).textContent, stops: stops, kids: a.getAttribute('data-kids') !== '0' };
  });
  var S = { j: null, i: 0, view: 'globe', playing: false, timer: 0 };
  try { if (localStorage.getItem('epoch-journey-view') === 'flat') S.view = 'flat'; } catch (e) {}

  // ---- the globe ----
  var G = null, lib = null;
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function globeLib() {
    if (!lib) lib = (window.d3 && d3.geoOrthographic ? Promise.resolve() : script('/d3-geo.js?v=1'))
      .then(function () { return window.ATLAS_GLOBE ? null : script(window.JR_GLOBE_SRC || '/maps/globe-land.js'); })
      .then(function () {
        return { land: { type: 'MultiPolygon', coordinates: ATLAS_GLOBE.rings.map(function (fl) {
          var ring = []; for (var i = 0; i < fl.length; i += 2) ring.push([fl[i] / 100, fl[i + 1] / 100]);
          if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring.reverse();
          return [ring]; }) }, grat: d3.geoGraticule().step([15, 15])() };
      }).catch(function (e) { lib = null; throw e; });
    return lib;
  }
  function colours() {
    var cs = getComputedStyle(document.documentElement), v = function (n, d) { return (cs.getPropertyValue(n) || '').trim() || d; };
    G.col = { g: v('--gold-rgb', '201,168,76'), text: v('--text', '#e8e0d0'), bg: v('--bg', '#0b0c10'), gold: v('--gold', '#c9a84c'), goldL: v('--gold-light', '#e8c97a'), muted: v('--muted', '#999'), font: v('--font-ui', 'sans-serif') };
    G.key = '';
  }
  function size() {
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return false;   // hidden: keep the last size
    G.dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = Math.round(w * G.dpr), ch = Math.round(h * G.dpr);
    if (cw !== cv.width || ch !== cv.height) { cv.width = cw; cv.height = ch; G.base.width = cw; G.base.height = ch; G.key = ''; }
    G.w = w; G.h = h; G.R = Math.min(w, h) / 2 - 10; return true;
  }
  function apply() { G.proj.scale(G.R * G.k * G.dpr).translate([cv.width / 2, cv.height / 2]).rotate([G.rot[0], G.rot[1], 0]); }
  function face(lng, lat) { var cl = -G.rot[0] * D2R, cp = -G.rot[1] * D2R, la = lat * D2R; return Math.cos(la) * Math.cos(cp) * Math.cos(lng * D2R - cl) + Math.sin(la) * Math.sin(cp); }
  function paintBase() {
    var b = G.base.getContext('2d'), c = G.col, d = G.dpr, p = d3.geoPath(G.proj, b);
    b.setTransform(1, 0, 0, 1, 0, 0); b.clearRect(0, 0, G.base.width, G.base.height);
    b.save(); b.shadowColor = 'rgba(' + c.g + ',0.35)'; b.shadowBlur = 16 * d;
    b.beginPath(); p({ type: 'Sphere' }); b.fillStyle = 'rgba(' + c.g + ',0.04)'; b.fill(); b.restore();
    b.beginPath(); p(G.lib.grat); b.strokeStyle = 'rgba(' + c.g + ',0.12)'; b.lineWidth = 0.6 * d; b.stroke();
    b.beginPath(); p(G.lib.land); b.fillStyle = 'rgba(' + c.g + ',0.13)'; b.fill();
    b.strokeStyle = 'rgba(' + c.g + ',0.42)'; b.lineWidth = 0.7 * d; b.lineJoin = 'round'; b.stroke();
    b.beginPath(); p({ type: 'Sphere' }); b.strokeStyle = 'rgba(' + c.g + ',0.4)'; b.lineWidth = d; b.stroke();
  }
  // the leg that ends at stop k, as points of its great circle, up to the share t of it
  function leg(k, t) { var st = S.j.stops, a = st[k - 1], b = st[k]; if (!b.ip) b.ip = d3.geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);
    var n = Math.max(8, Math.min(64, Math.round(d3.geoDistance([a.lng, a.lat], [b.lng, b.lat]) / D2R / 2))), pts = []; for (var i = 0; i <= n; i++) pts.push(b.ip(t * i / n)); return pts; }
  function render(now) {
    G.raf = 0; if (!S.j || S.view !== 'globe') return;
    if (!size()) return;
    if (isFinite(G.rot[0]) && isFinite(G.rot[1]) && isFinite(G.k)) G.good = [G.rot[0], G.rot[1], G.k]; else { G.rot = [G.good[0], G.good[1]]; G.k = G.good[2]; G.anim = null; }
    var busy = false;
    if (G.anim) { var u = Math.min(1, (now - G.anim.t0) / G.anim.ms), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, r = G.anim.ip(e);
      G.rot = [-r[0], -r[1]]; G.k = G.anim.k0 + (G.anim.k1 - G.anim.k0) * e; if (u >= 1) G.anim = null; else busy = true; }
    apply();
    var key = G.rot[0].toFixed(3) + ',' + G.rot[1].toFixed(3) + ',' + G.k.toFixed(4) + ',' + cv.width + ',' + cv.height;
    if (key !== G.key) { paintBase(); G.key = key; }
    var x = G.ctx, c = G.col, d = G.dpr, st = S.j.stops, i, q;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.clearRect(0, 0, cv.width, cv.height); x.drawImage(G.base, 0, 0);
    // the whole route, faint; then the part travelled, bright (the newest leg drawn out as it is reached)
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (i = 1; i < st.length; i++) { x.beginPath(); G.path({ type: 'LineString', coordinates: leg(i, 1) }); x.setLineDash(st[i].sea ? [5 * d, 5 * d] : []); x.strokeStyle = 'rgba(' + c.g + ',0.28)'; x.lineWidth = 1.2 * d; x.stroke(); }
    var t = 1; if (G.grow) { t = Math.min(1, (now - G.grow.t0) / G.grow.ms); if (t < 1) busy = true; else G.grow = null; t = 1 - Math.pow(1 - t, 3); }
    for (i = 1; i <= S.i; i++) { x.beginPath(); G.path({ type: 'LineString', coordinates: leg(i, i === S.i ? t : 1) }); x.setLineDash(st[i].sea ? [7 * d, 5 * d] : []); x.strokeStyle = c.goldL; x.lineWidth = 2.4 * d; x.stroke(); }
    x.setLineDash([]);
    // the stops: travelled ones filled, those to come hollow, the present one ringed and named
    G.dots = [];
    for (i = 0; i < st.length; i++) {
      if (face(st[i].lng, st[i].lat) <= 0.02) continue; q = G.proj([st[i].lng, st[i].lat]); if (!q) continue; G.dots.push([q[0] / d, q[1] / d, i]);
      x.beginPath(); x.arc(q[0], q[1], (i === S.i ? 5.5 : 3.6) * d, 0, 6.2832);
      if (i <= S.i) { x.fillStyle = c.goldL; x.fill(); x.lineWidth = 1.2 * d; x.strokeStyle = c.bg; x.stroke(); } else { x.fillStyle = c.bg; x.fill(); x.lineWidth = 1.4 * d; x.strokeStyle = 'rgba(' + c.g + ',0.8)'; x.stroke(); }
    }
    var cur = st[S.i];
    if (face(cur.lng, cur.lat) > 0.02 && (q = G.proj([cur.lng, cur.lat]))) {
      x.beginPath(); x.arc(q[0], q[1], 11 * d, 0, 6.2832); x.lineWidth = 1.6 * d; x.strokeStyle = c.goldL; x.stroke();
      x.font = '600 ' + (13 * d) + 'px ' + c.font; var tw = x.measureText(cur.place).width, lx = q[0] + 16 * d, ly = q[1] - 12 * d;
      if (lx + tw + 8 * d > cv.width) lx = q[0] - 16 * d - tw; if (ly < 18 * d) ly = q[1] + 26 * d;
      x.lineWidth = 4 * d; x.strokeStyle = c.bg; x.strokeText(cur.place, lx, ly); x.fillStyle = c.text; x.fillText(cur.place, lx, ly);
    }
    if (busy) kick();
  }
  function kick() { if (G && !G.raf) G.raf = requestAnimationFrame(render); }
  // the zoom that keeps the stops near the present one in view: the further the neighbours, the wider
  function zoomFor(i) { var st = S.j.stops, far = 0; [i - 1, i + 1].forEach(function (k) { if (st[k]) far = Math.max(far, d3.geoDistance([st[i].lng, st[i].lat], [st[k].lng, st[k].lat])); });
    far = Math.max(far, 11 * D2R); return Math.max(1, Math.min(3.4, 0.6 / Math.sin(Math.min(far, 80 * D2R)))); }
  function glide(i, quick) {
    var st = S.j.stops[i], k1 = zoomFor(i);
    if (reduce || quick) { G.rot = [-st.lng, -st.lat]; G.k = k1; G.anim = null; }
    else G.anim = { t0: performance.now(), ms: 900, ip: d3.geoInterpolate([-G.rot[0], -G.rot[1]], [st.lng, st.lat]), k0: G.k, k1: k1 };
    kick();
  }
  function wire() {
    var ptrs = {}, drag = null, pinch = null, moved = 0, focused = false;
    var pos = function (e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = pos(e); var ids = Object.keys(ptrs); moved = 0; G.anim = null;
      if (ids.length === 1) drag = { p: pos(e), rot: G.rot.slice() }; else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: G.k }; drag = null; } });
    cv.addEventListener('pointermove', function (e) { if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = pos(e); var ids = Object.keys(ptrs);
      if (ids.length === 2 && pinch) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; G.k = Math.max(0.8, Math.min(12, pinch.k * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); kick(); return; }
      if (!drag) return; var p = pos(e), dx = p[0] - drag.p[0], dy = p[1] - drag.p[1]; moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      var f = 180 / Math.PI / (G.R * G.k); G.rot = [drag.rot[0] + dx * f, Math.max(-89, Math.min(89, drag.rot[1] - dy * f))]; kick(); });
    var up = function (e) { if (!ptrs[e.pointerId]) return; var p = ptrs[e.pointerId]; delete ptrs[e.pointerId]; var ids = Object.keys(ptrs); pinch = null;
      if (ids.length === 1) { drag = { p: ptrs[ids[0]], rot: G.rot.slice() }; return; }   // a pinch that ends as one finger starts a fresh drag
      drag = null; if (e.type === 'pointerup' && moved < 6) { focused = true; var best = null; (G.dots || []).forEach(function (d) { var r = Math.hypot(d[0] - p[0], d[1] - p[1]); if (r < 16 && (!best || r < best[0])) best = [r, d[2]]; }); if (best) go(best[1], true); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', function () { focused = false; });
    cv.addEventListener('wheel', function (e) { if (!focused && !e.ctrlKey && !e.metaKey) return; e.preventDefault(); G.anim = null; G.k = Math.max(0.8, Math.min(12, G.k * Math.exp(-e.deltaY * 0.0015))); kick(); }, { passive: false });
    cv.addEventListener('dblclick', function () { G.k = Math.min(12, G.k * 1.6); kick(); });
    cv.addEventListener('keydown', function (e) { var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { go(S.i + 1, true); e.preventDefault(); } else if (k === 'ArrowLeft' || k === 'ArrowUp') { go(S.i - 1, true); e.preventDefault(); }
      else if (k === '+' || k === '=') { G.k = Math.min(12, G.k * 1.3); kick(); } else if (k === '-') { G.k = Math.max(0.8, G.k / 1.3); kick(); } else if (k === ' ') { play(!S.playing); e.preventDefault(); } });
    window.addEventListener('resize', kick);
    new MutationObserver(function () { colours(); kick(); if (S.view === 'flat') drawFlat(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-kids', 'data-skin'] });
  }
  function startGlobe() {
    return globeLib().then(function (l) {
      if (!G) { G = { lib: l, ctx: cv.getContext('2d'), proj: d3.geoOrthographic().clipAngle(90), rot: [-30, -25], k: 1, dpr: 1, R: 100, good: [-30, -25, 1], base: document.createElement('canvas'), key: '', raf: 0, dots: [] };
        if (!G.ctx) throw new Error('no canvas'); G.path = d3.geoPath(G.proj, G.ctx); colours(); wire(); }
      return G;
    });
  }

  // ---- the flat map: the atlas's Equal Earth plane (10000 x 4393), the whole route at once ----
  var EE = (function () { var A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2, PW = 1000;
    function raw(lng, lat) { var l = Math.asin(M * Math.sin(lat * D2R)), l2 = l * l, l6 = l2 * l2 * l2; return [lng * D2R * Math.cos(l) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))), l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2))]; }
    var XMAX = Math.PI / (M * A1), SC = PW / (2 * XMAX), PH = 2 * raw(0, 90)[1] * SC;
    return function (lng, lat) { var r = raw(lng, lat); return [(PW / 2 + r[0] * SC) * 10, (PH / 2 - r[1] * SC) * 10]; }; })();
  function drawFlat() {
    var NS = 'http://www.w3.org/2000/svg', st = S.j.stops, W = 10000, H = 4393, pts = st.map(function (s) { return EE(s.lng, Math.max(-57, s.lat)); });
    var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; }), x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs), y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, ys);
    var w = Math.max(x1 - x0, 1400), h = Math.max(y1 - y0, 800), ar = (flat.clientWidth || 600) / (flat.clientHeight || 420);
    w *= 1.25; h *= 1.3; if (w / h < ar) w = h * ar; else h = w / ar; if (w > W) { w = W; h = Math.min(H, w / ar); }
    var vx = Math.max(0, Math.min(W - w, (x0 + x1) / 2 - w / 2)), vy = Math.max(0, Math.min(H - h, (y0 + y1) / 2 - h / 2)), u = w / (flat.clientWidth || 600);   // u: plane units per pixel
    while (flat.firstChild) flat.removeChild(flat.firstChild);
    flat.setAttribute('viewBox', [vx, vy, w, h].map(function (n) { return n.toFixed(0); }).join(' '));
    var el = function (n, a, par) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (par || flat).appendChild(e); return e; };
    el('image', { href: '/maps/world.svg', x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' });
    for (var i = 1; i < st.length; i++) {   // a leg across the edge of the map leaves at one side and comes in at the other
      var a = pts[i - 1], b = pts[i], cross = Math.abs(st[i].lng - st[i - 1].lng) > 180, cls = 'jr-fl' + (i <= S.i ? ' is-done' : '') + (st[i].sea ? ' is-sea' : '');
      if (!cross) el('path', { 'class': cls, d: 'M' + a[0].toFixed(0) + ' ' + a[1].toFixed(0) + 'L' + b[0].toFixed(0) + ' ' + b[1].toFixed(0), 'stroke-width': (i <= S.i ? 2.4 : 1.2) * u, 'stroke-dasharray': st[i].sea ? (6 * u) + ' ' + (5 * u) : '' });
      else { var my = (a[1] + b[1]) / 2, ea = a[0] > W / 2 ? W : 0; [[a, [ea, my]], [[W - ea, my], b]].forEach(function (s) { el('path', { 'class': cls, d: 'M' + s[0][0].toFixed(0) + ' ' + s[0][1].toFixed(0) + 'L' + s[1][0].toFixed(0) + ' ' + s[1][1].toFixed(0), 'stroke-width': (i <= S.i ? 2.4 : 1.2) * u, 'stroke-dasharray': st[i].sea ? (6 * u) + ' ' + (5 * u) : '' }); }); }
    }
    pts.forEach(function (p, k) { var c = el('circle', { 'class': 'jr-fd' + (k <= S.i ? ' is-done' : '') + (k === S.i ? ' is-now' : ''), cx: p[0].toFixed(0), cy: p[1].toFixed(0), r: (k === S.i ? 6 : 4) * u, 'stroke-width': 1.3 * u, 'data-i': k });
      el('title', {}, c).textContent = st[k].place; });
    var p = pts[S.i], right = p[0] + 14 * u + st[S.i].place.length * 7.5 * u < vx + w;
    el('text', { 'class': 'jr-ft', x: (p[0] + (right ? 12 : -12) * u).toFixed(0), y: (p[1] - 10 * u).toFixed(0), 'font-size': 13 * u, 'stroke-width': 3.5 * u, 'text-anchor': right ? 'start' : 'end' }).textContent = st[S.i].place;
  }
  flat.addEventListener('click', function (e) { var c = e.target.closest ? e.target.closest('circle[data-i]') : null; if (c) go(+c.getAttribute('data-i'), true); });

  // ---- the page ----
  function setView(v, keep) {
    S.view = v; if (!keep) { try { localStorage.setItem('epoch-journey-view', v); } catch (e) {} }
    $$('.jr-views button').forEach(function (b) { var on = b.getAttribute('data-v') === v; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    cv.hidden = v !== 'globe'; if (v === 'globe') flat.setAttribute('hidden', ''); else flat.removeAttribute('hidden');   // an SVG element has no .hidden property
    $$('.jr-zoom').forEach(function (b) { b.hidden = v !== 'globe'; });
    if (!S.j) return;
    if (v === 'flat') drawFlat(); else { msg.hidden = false; startGlobe().then(function () { msg.hidden = true; if (S.view === 'globe') { size(); glide(S.i, true); } }).catch(function () { msg.hidden = true; var b = $('.jr-views [data-v="globe"]'); b.disabled = true; b.title = 'The globe could not be loaded'; setView('flat', true); }); }
  }
  function paintNow() {
    var st = S.j.stops, s = st[S.i];
    nowEl.innerHTML = '<p class="jr-now-k">Stop ' + (S.i + 1) + ' of ' + st.length + (s.date ? ' &#183; ' + esc(s.date) : '') + (S.i && s.sea ? ' &#183; by sea' : '') + '</p><h3 class="jr-now-p">' + (s.href ? '<a href="' + esc(s.href) + '">' + esc(s.place) + '</a>' : esc(s.place)) + '</h3><p class="jr-now-t">' + esc(s.text) + '</p>';
    st.forEach(function (x, k) { x.li.classList.toggle('is-now', k === S.i); x.li.classList.toggle('is-done', k < S.i); if (k === S.i) x.li.setAttribute('aria-current', 'step'); else x.li.removeAttribute('aria-current'); });
    $('#jr-prev').disabled = S.i === 0; $('#jr-next').disabled = S.i === st.length - 1;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function address() { try { history.replaceState(null, '', '?j=' + S.j.slug + (S.i ? '&s=' + (S.i + 1) : '')); } catch (e) {} }
  function go(i, user) {
    if (!S.j) return; var n = S.j.stops.length; i = Math.max(0, Math.min(n - 1, i)); if (user && S.playing) play(false);
    var step = i === S.i + 1; S.i = i; paintNow(); address();
    if (S.view === 'flat') drawFlat(); else if (G) { G.grow = step && !reduce ? { t0: performance.now() + (user ? 0 : 0), ms: 900 } : null; glide(i); }
    if (user) { var li = S.j.stops[i].li, r = li.getBoundingClientRect(), box = li.closest('.jr-list'); if (box && box.scrollHeight > box.clientHeight + 4) { var br = box.getBoundingClientRect(); if (r.top < br.top || r.bottom > br.bottom) box.scrollTop += r.top - br.top - box.clientHeight / 3; } }
  }
  function play(on) {
    S.playing = on; clearTimeout(S.timer); var b = $('#jr-play'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? 'Pause' : 'Play the journey';
    if (!on) return; if (S.i >= S.j.stops.length - 1) go(0);
    (function tick() { S.timer = setTimeout(function () { if (!S.playing) return; if (S.i >= S.j.stops.length - 1) { play(false); return; } go(S.i + 1); tick(); }, 2600); })();
  }
  function show(slug, i, quick) {
    var j = J.filter(function (x) { return x.slug === slug; })[0] || J[0]; play(false); S.j = j; S.i = Math.max(0, Math.min(j.stops.length - 1, i || 0));
    arts.forEach(function (a) { a.classList.toggle('is-on', a === j.el); });
    $$('.jr-pick a').forEach(function (a) { var on = a.getAttribute('data-j') === j.slug; a.classList.toggle('is-on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    cv.setAttribute('aria-label', 'Globe: the route of ' + j.title + '. The stops are listed beside it.');
    paintNow(); address(); setView(S.view, true);
  }
  root.addEventListener('click', function (e) {
    var t = e.target, a = t.closest('.jr-pick a'); if (a) { e.preventDefault(); show(a.getAttribute('data-j'), 0); var st = $('.jr-stage'); if (st.getBoundingClientRect().top < 0 || st.getBoundingClientRect().top > innerHeight * 0.6) st.scrollIntoView({ behavior: 'instant', block: 'start' }); return; }
    var li = t.closest('.jr-stops > li'); if (li && !t.closest('a') && S.j && li.closest('.jr-j') === S.j.el) { go(+li.getAttribute('data-i'), true); if (window.matchMedia('(max-width: 900px)').matches) $('.jr-map').scrollIntoView({ behavior: 'instant', block: 'start' }); return; }
    var b = t.closest('button'); if (!b) return;
    if (b.id === 'jr-prev') go(S.i - 1, true); else if (b.id === 'jr-next') go(S.i + 1, true); else if (b.id === 'jr-play') play(!S.playing);
    else if (b.getAttribute('data-v')) setView(b.getAttribute('data-v'));
    else if (b.classList.contains('jr-zoom') && G) { G.anim = null; G.k = Math.max(0.8, Math.min(12, G.k * (b.getAttribute('data-z') === 'in' ? 1.4 : 1 / 1.4))); kick(); }
  });
  root.addEventListener('keydown', function (e) { var li = e.target.closest && e.target.closest('.jr-stops > li'); if (li && (e.key === 'Enter' || e.key === ' ') && e.target === li) { e.preventDefault(); go(+li.getAttribute('data-i'), true); } });
  J.forEach(function (j) { j.stops.forEach(function (s) { s.li.tabIndex = 0; }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S.playing) play(false); });
  var q = new URLSearchParams(location.search), first = q.get('j') || (location.hash || '').slice(1);
  var kidsOn = function () { return document.documentElement.getAttribute('data-kids') === '1'; }, fits = function (j) { return j.kids || !kidsOn(); };   // Kids mode leaves out the journeys of war and conquest
  if (!J.some(function (j) { return j.slug === first && fits(j); })) first = (J.filter(fits)[0] || J[0]).slug;
  document.addEventListener('epoch:kids', function () { if (S.j && !fits(S.j)) show((J.filter(fits)[0] || J[0]).slug, 0); });
  show(first, (+q.get('s') || 1) - 1, true);
  window.epochJourneys = { journeys: J, state: function () { return { j: S.j.slug, i: S.i, view: S.view, playing: S.playing, rot: G ? G.rot.slice() : null, k: G ? G.k : null, dots: G ? G.dots.length : 0, ready: !!G }; }, go: go, show: show, play: play, setView: setView };
})();
