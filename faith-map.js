// faith-map.js - the spread of a religion century by century, on the religion profiles (#faith-map) and /faiths: soft
// glows over the regions where it was a main faith (bright) or held communities (faint), the routes it spread by, where
// it began, its holy places and its last places. Two views, the choice kept in this browser (epoch-faith-view):
// - the globe (the default): d3 7 orthographic on a canvas over the present-day land of maps/globe-land.js, loaded on
//   first use. Drag to turn it (a flick lets it coast), pinch or + and - to zoom (the wheel once it has been clicked, or
//   with Ctrl), arrow keys; hover or tap a glow, a mark or a route for its note. It turns to each century's spread
//   until the reader turns it by hand ("Follow the spread" brings that back). Falls back to the flat map without d3.
// - the flat world map: an SVG over maps/world.svg that glides to fit each century.
// A century slider with Play, the century's caption, and the same century in words. On /faiths a second faith can be
// laid over the first (compare). Data: data/faiths/<slug>.json, built by scripts/build-pages.ps1 from
// scripts/faiths.tsv (it writes FAITHS_V and GLOBE_V). The profile pages load this file without ?v= (a 10-minute cache,
// .htaccess). Uses escHtml from shared-nav.js if present.
var FaithMap = (function () {
  'use strict';
  var FAITHS_V = '4574226297', GLOBE_V = '47369e946f';
  var W = 10000, H = 4393, NOW = 2026, NS = 'http://www.w3.org/2000/svg', uid = 0;
  var D3_SRC = '/d3-geo.js?v=1', D2R = Math.PI / 180;
  var KM = 4.0075 / 6371;   // an area's radius is given in tenths of a map unit (about 4 km each): this many radians
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var HOW = { globe: 'Drag to turn the globe; pinch, or click it and scroll, to zoom. Tap a glow, a mark or an arrow to read about it.',
    flat: 'Tap a glow or a mark to read about it.' };
  var KIND = { origin: 'Where it began', place: 'A holy place or centre', last: 'A last place' };
  function E(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
  var cache = {};
  function load(slug) {
    if (!cache[slug]) cache[slug] = fetch('/data/faiths/' + slug + '.json?v=' + FAITHS_V).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { delete cache[slug]; throw e; });
    return cache[slug];
  }
  // d3 and the land, loaded once, the first time a globe is shown; the rings come in hundredths of a degree, and a ring
  // d3 would read inside out (as the rest of the world) is turned round
  var lib = null;
  function script(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  function globeLib() {
    if (!lib) lib = (window.d3 && d3.geoOrthographic ? Promise.resolve() : script(D3_SRC))
      .then(function () { return window.ATLAS_GLOBE ? null : script('/maps/globe-land.js?v=' + GLOBE_V); })
      .then(function () {
        return { land: { type: 'MultiPolygon', coordinates: ATLAS_GLOBE.rings.map(function (fl) {
          var ring = []; for (var i = 0; i < fl.length; i += 2) ring.push([fl[i] / 100, fl[i + 1] / 100]);
          if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring.reverse();
          return [ring];
        }) }, grat: d3.geoGraticule().step([15, 15])() };
      })
      .catch(function (e) { lib = null; throw e; });
    return lib;
  }
  function rgbOf(s) {   // '#f0c24f' or 'rgb(240, 194, 79)' as '240,194,79'
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (m) { var h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1], n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','); }
    m = /rgba?\(([^)]+)\)/.exec(s); return m ? m[1].split(',').slice(0, 3).map(function (v) { return v.trim(); }).join(',') : '240,194,79';
  }

  // centuries as the site labels them: the 13th century is 1200-1299, the 5th century BCE 499-400 BCE
  function centOf(y) { return y >= 0 ? Math.floor(y / 100) + 1 : -(Math.floor(-y / 100) + 1); }
  function centStart(c) { return c > 0 ? (c - 1) * 100 : c * 100 + 1; }
  function centEnd(c) { return c === -1 ? 0 : centStart(c) + 100; }   // the first year after it
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function centName(c) { return c > 0 ? ord(c) + ' century' : ord(-c) + ' century BCE'; }
  function yearText(y) { return y < 0 ? -y + ' BCE' : String(y); }
  function spanText(a, b) { return yearText(a) + (b == null ? ' to today' : '–' + yearText(b)); }
  function centRange(c) { var a = centStart(c), b = Math.min(centEnd(c), NOW) - 1; return c > 0 ? a + '–' + b : -a + '–' + -b + ' BCE'; }
  // how much of a century a span fills (0 when it does not touch it)
  function cover(from, to, c) {
    var a = centStart(c), b = Math.min(centEnd(c), NOW), ov = Math.min(to == null ? NOW : to, b) - Math.max(from, a);
    return ov > 0 ? ov / (b - a) : 0;
  }

  function el(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function tip(n, text) { el('title', {}, n).textContent = text; }
  function star(r) { var p = []; for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push((rr * Math.cos(a)).toFixed(2) + ',' + (-rr * Math.sin(a)).toFixed(2)); } return p.join(' '); }
  function starPath(x, cx, cy, r) { for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy - rr * Math.sin(a)); } x.closePath(); }
  function segDist(px, py, a, b) {   // from a point to a line segment
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / l)) : 0;
    return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
  }
  function storedView() { try { return localStorage.getItem('epoch-faith-view'); } catch (e) { return null; } }

  function mount(host, slug, opt) {
    opt = opt || {};
    var id = 'fm' + (++uid);
    host.innerHTML =
      '<div class="fm">' +
        '<div class="fm-top"><p class="fm-when" aria-live="polite"><b class="fm-cent"></b><span class="fm-years"></span></p>' +
          '<div class="fm-ctl"><div class="atl-viewtog fm-views" role="group" aria-label="View"><button type="button" data-v="globe" aria-pressed="false">&#9679; Globe</button><button type="button" data-v="flat" aria-pressed="false">&#9645; Flat map</button></div>' +
          '<button type="button" class="fm-play" aria-pressed="false"><span class="fm-play-i" aria-hidden="true"></span><span class="fm-play-t">Play</span></button></div></div>' +
        '<div class="fm-map"><svg class="fm-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Map"></svg>' +
          '<canvas class="fm-globe" tabindex="0" role="img" aria-label="Globe" hidden></canvas>' +
          '<div class="atl-zoom fm-zoom" hidden><button type="button" data-z="1.5" aria-label="Zoom in">+</button><button type="button" data-z="0.6667" aria-label="Zoom out">&minus;</button></div>' +
          '<button type="button" class="fm-refollow" hidden><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><circle cx="10" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 1v4M10 15v4M1 10h4M15 10h4" stroke="currentColor" stroke-width="1.8"/></svg>Follow the spread</button>' +
          '<p class="fm-wheel" hidden>Click the globe, then scroll to zoom</p>' +
          '<div class="atl-tip fm-tip" hidden></div>' +
          '<p class="fm-msg">Loading the map…</p></div>' +
        '<div class="fm-slide"><input type="range" class="fm-range" min="0" max="0" step="1" value="0" aria-label="Century"><div class="fm-ends"><span class="fm-from"></span><span class="fm-to"></span></div></div>' +
        '<p class="fm-note"></p><p class="fm-pick" hidden></p>' +
        '<ul class="fm-legend" aria-label="Key">' +
          '<li class="fm-k-a" hidden><i class="fm-sw fm-sw-a"></i><span class="fm-k-an"></span></li><li class="fm-k-b" hidden><i class="fm-sw fm-sw-b"></i><span class="fm-k-bn"></span></li>' +
          '<li><i class="fm-k fm-k2"></i>a main faith there</li><li><i class="fm-k fm-k1"></i>communities</li>' +
          '<li><svg class="fm-ki" viewBox="-10 -10 20 20" aria-hidden="true"><polygon class="fm-shape fm-origin-s" points="' + star(9) + '"/></svg>where it began</li>' +
          '<li><svg class="fm-ki" viewBox="-10 -10 20 20" aria-hidden="true"><circle class="fm-shape fm-place-s" r="4.5"/></svg>a holy place or centre</li>' +
          '<li><svg class="fm-ki" viewBox="-10 -10 20 20" aria-hidden="true"><circle class="fm-shape fm-last-s" r="5.5"/></svg>a last place</li>' +
          '<li><svg class="fm-ki fm-ki-r" viewBox="0 -6 26 12" aria-hidden="true"><path class="fm-route-k" d="M1 3 Q12 -6 22 0"/><path class="fm-arrow-k" d="M25 0 L17 -4 L18 3 z"/></svg>how it spread</li>' +
        '</ul>' +
        '<p class="fm-how"></p>' +
        '<details class="fm-words"><summary>This century in words</summary><div class="fm-words-b"></div></details>' +
        '<p class="fm-src"></p>' +
      '</div>';
    var root = host.querySelector('.fm'), svg = root.querySelector('.fm-svg'), range = root.querySelector('.fm-range');
    var $ = function (s) { return root.querySelector(s); };
    var mapEl = $('.fm-map'), cv = $('.fm-globe'), tipEl = $('.fm-tip'), zoomEl = $('.fm-zoom'), refollowEl = $('.fm-refollow'), wheelEl = $('.fm-wheel'), msgEl = $('.fm-msg');
    var defs = el('defs', {}, svg);
    defs.innerHTML = ['a', 'b'].map(function (w) {
      return '<radialGradient id="' + id + '-' + w + '"><stop offset="0" class="fm-stop-' + w + '" stop-opacity="0.85"/><stop offset="0.45" class="fm-stop-' + w + '" stop-opacity="0.55"/><stop offset="1" class="fm-stop-' + w + '" stop-opacity="0"/></radialGradient>';
    }).join('');
    el('image', { href: '/maps/world.svg', x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' }, svg);
    var gAreas = el('g', { 'class': 'fm-areas' }, svg), gRoutes = el('g', { 'class': 'fm-routes' }, svg), gMarks = el('g', { 'class': 'fm-marks' }, svg);
    var st = { layers: [], cents: [], i: 0, playing: false, timer: 0, box: null, goal: null, raf: 0, failed: false, onChange: opt.onChange || null };
    var scaled = [];   // marks and arrowheads: drawn in screen pixels whatever the zoom
    var view = opt.view === 'flat' || opt.view === 'globe' ? opt.view : storedView() === 'flat' ? 'flat' : 'globe';
    if (!cv.getContext) view = 'flat';

    function pick(html) { var p = $('.fm-pick'); p.hidden = false; p.innerHTML = html; }
    function build(d, w) {
      var L = { d: d, w: w, areas: [], routes: [], marks: [] };
      // the faint areas first, so a main area glows over them; the big ones below the small ones
      d.areas.map(function (a, i) { return [a, i]; }).sort(function (p, q) { return p[0][5] - q[0][5] || q[0][2] - p[0][2]; }).forEach(function (ai) {
        var a = ai[0], n = el('circle', { cx: a[0], cy: a[1], r: a[2], fill: 'url(#' + id + '-' + w + ')', 'class': 'fm-area fm-l' + a[5], opacity: 0 }, gAreas);
        tip(n, a[6] + ' (' + spanText(a[3], a[4]) + ')' + (a[7] ? ': ' + a[7] : ''));
        n.addEventListener('click', function () { pick('<b>' + E(a[6]) + '</b> <span class="fm-pick-y">' + (a[5] === 2 ? 'a main faith' : 'communities') + ', ' + E(spanText(a[3], a[4])) + '</span> ' + E(cap(a[7]))); });
        L.areas.push({ a: a, n: n, cov: 0, i: ai[1], o: 0, g: 0 });
      });
      L.byOrder = L.areas.slice().sort(function (p, q) { return p.i - q.i; });
      d.routes.forEach(function (r) {
        var x1 = r[1], y1 = r[2], x2 = r[3], y2 = r[4], dx = x2 - x1, dy = y2 - y1;
        var cx = (x1 + x2) / 2 + dy * 0.18, cy = (y1 + y2) / 2 - dx * 0.18;   // a gentle bend
        var g = el('g', { 'class': 'fm-route fm-route-' + w, opacity: 0 }, gRoutes);
        var p = el('path', { d: 'M' + x1 + ' ' + y1 + 'Q' + cx.toFixed(0) + ' ' + cy.toFixed(0) + ' ' + x2 + ' ' + y2, pathLength: 1, 'class': 'fm-route-p' }, g);
        var ah = el('g', { 'class': 'fm-arrow' }, g); el('path', { d: 'M0 0L-9 -4.5L-9 4.5z' }, ah);
        tip(g, r[5] + ' (' + yearText(r[0]) + ')');
        g.addEventListener('click', function () { pick('<b>' + E(r[5]) + '</b> <span class="fm-pick-y">' + E(yearText(r[0])) + '</span>'); });
        scaled.push({ n: ah, x: x2, y: y2, rot: Math.atan2(y2 - cy, x2 - cx) * 180 / Math.PI });
        L.routes.push({ r: r, n: g, p: p, c: centOf(r[0]), o: 0, g: 0, t0: 0 });
      });
      d.marks.forEach(function (m) {
        var g = el('g', { 'class': 'fm-mark fm-mark-' + w + ' fm-' + m[0], opacity: 0, tabindex: '-1', role: 'button', 'aria-label': m[4] + ', ' + yearText(m[1]) + ': ' + m[5] }, gMarks);
        if (m[0] === 'origin') el('polygon', { points: star(9), 'class': 'fm-shape' }, g);
        else el('circle', { r: m[0] === 'last' ? 5.5 : 4.5, 'class': 'fm-shape' }, g);
        var t = el('text', { x: 10, y: 4, 'class': 'fm-label' }, g); t.textContent = m[4];
        tip(g, m[4] + ' (' + yearText(m[1]) + '): ' + m[5]);
        var go = function () { pick('<b>' + E(m[4]) + '</b> <span class="fm-pick-y">' + E(yearText(m[1])) + '</span> ' + E(m[5])); };
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        scaled.push({ n: g, x: m[2], y: m[3], rot: 0 });
        L.marks.push({ m: m, n: g, t: t, c: centOf(m[1]), o: 0, g: 0, lg: 0 });
      });
      return L;
    }

    // ════ the flat map: the viewBox glides to the century ════
    function aspect() { var w = svg.clientWidth, h = svg.clientHeight; return w > 0 && h > 0 ? w / h : 2; }
    function world() { var a = aspect(), h = W / a; return [0, (H - h) / 2, W, h]; }
    // the box that holds what is new or alive in this century
    function fit(c) {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      function add(x, y, r) { if (x - r < x0) x0 = x - r; if (x + r > x1) x1 = x + r; if (y - r < y0) y0 = y - r; if (y + r > y1) y1 = y + r; }
      st.layers.forEach(function (L) {
        L.areas.forEach(function (p) { if (p.cov > 0) add(p.a[0], p.a[1], p.a[2] * 0.85); });
        L.routes.forEach(function (p) { if (p.c === c) { add(p.r[1], p.r[2], 80); add(p.r[3], p.r[4], 80); } });
        L.marks.forEach(function (p) { if (p.c === c) add(p.m[2], p.m[3], 150); });
      });
      if (x0 === Infinity) return null;
      var a = aspect(), w = Math.max((x1 - x0) * 1.12 + 500, (y1 - y0 + 500) * a, 2400);
      if (w > W) w = W;
      var h = w / a, bx = Math.max(0, Math.min(W - w, (x0 + x1) / 2 - w / 2));
      var by = h >= H ? (H - h) / 2 : Math.max(0, Math.min(H - h, (y0 + y1) / 2 - h / 2));
      return [bx, by, w, h];
    }
    function rescale() {
      var k = st.box[2] / (svg.clientWidth || 800);
      gRoutes.setAttribute('stroke-width', (2 * k).toFixed(2));
      // a glow reaches a little beyond its radius (the gradient fades to nothing at the rim), more so on the world view,
      // and never shrinks below about ten pixels, so a small island community still shows
      var z = 1.3 + 0.5 * Math.max(0, Math.min(1, (st.box[2] - 3000) / 7000));
      st.layers.forEach(function (L) { L.areas.forEach(function (p) { p.n.setAttribute('r', Math.max(p.a[2] * z, 10 * k).toFixed(0)); }); });
      for (var i = 0; i < scaled.length; i++) { var s = scaled[i]; s.n.setAttribute('transform', 'translate(' + s.x + ' ' + s.y + ')' + (s.rot ? ' rotate(' + s.rot.toFixed(1) + ')' : '') + ' scale(' + k.toFixed(3) + ')'); }
    }
    function frame() {
      var b = st.box, g = st.goal, moved = false;
      for (var i = 0; i < 4; i++) { var dv = g[i] - b[i]; if (Math.abs(dv) > 2) { b[i] += dv * 0.12; moved = true; } else b[i] = g[i]; }
      svg.setAttribute('viewBox', b.map(function (v) { return v.toFixed(0); }).join(' '));
      rescale();
      st.raf = moved ? requestAnimationFrame(frame) : 0;
    }
    function glide(box) {
      if (!box) return;
      st.goal = box.slice();
      if (!st.box || reduce) { st.box = box.slice(); frame(); return; }
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    }
    // the names of the century's new marks: to the right of the mark, else to the left, above or below, wherever they
    // clear the names already placed and the other marks (measured on the box the map is gliding to)
    function placeLabels(c, box) {
      if (!box) return;
      var px = (svg.clientWidth || 800) / box[2], placed = [], dots = [];
      function at(p) { return [(p.m[2] - box[0]) * px, (p.m[3] - box[1]) * px]; }
      st.layers.forEach(function (L) { L.marks.forEach(function (p) { if (p.c <= c) dots.push(at(p)); }); });
      var spots = [[10, 4, 'start'], [-10, 4, 'end'], [0, -11, 'middle'], [0, 19, 'middle']];
      st.layers.forEach(function (L) {
        L.marks.forEach(function (p) {
          var s = spots[0];
          if (p.c === c) {
            var xy = at(p), w = p.m[4].length * 6.8 + 4, best = null;
            for (var j = 0; j < spots.length && !best; j++) {
              var o = spots[j], x0 = xy[0] + o[0] - (o[2] === 'end' ? w : o[2] === 'middle' ? w / 2 : 0), y0 = xy[1] + o[1] - 11, r = [x0, y0, x0 + w, y0 + 14];
              var clear = !placed.some(function (q) { return r[0] < q[2] && q[0] < r[2] && r[1] < q[3] && q[1] < r[3]; }) &&
                !dots.some(function (d) { return (d[0] !== xy[0] || d[1] !== xy[1]) && d[0] > r[0] - 6 && d[0] < r[2] + 6 && d[1] > r[1] - 6 && d[1] < r[3] + 6; });
              if (clear) { best = o; placed.push(r); }
            }
            s = best || spots[0];
          }
          p.t.setAttribute('x', s[0]); p.t.setAttribute('y', s[1]); p.t.setAttribute('text-anchor', s[2]);
        });
      });
    }
    function flatTo(c) { var box = fit(c); glide(box); placeLabels(c, box || st.goal); }

    // ════ the globe ════
    // G, once d3 and the land have loaded: the turn (rot: minus the longitude and latitude of the middle of its face),
    // the zoom k (1: the whole globe), the spin a flick leaves (vel), the glide under way (anim), the pointers on it, the
    // glow, mark or route under the pointer or tapped (hit, pin). An item's p.o is its opacity in the century; p.g is
    // where the globe has got to on the way there (it fades as the flat map's CSS transitions do).
    var G = null, busy = false;
    function startGlobe() {
      msgEl.hidden = false;
      globeLib().then(function (lib) {
        if (!G) {
          G = { lib: lib, ctx: cv.getContext('2d'), proj: d3.geoOrthographic().clipAngle(90), rot: [-60, -25], k: 1, vel: [0, 0], dpr: 1, R: 100, w: 0, h: 0,
            follow: true, placed: false, anim: null, raf: 0, ptrs: {}, drag: null, good: [-60, -25, 1], base: document.createElement('canvas'), key: '', col: null, last: 0, hit: null, pin: false };
          G.path = d3.geoPath(G.proj, G.ctx);
          colours(); wire();
        }
        if (view === 'globe') setView('globe');
      }).catch(function () {   // no d3 or no land: the flat map, and no globe to choose
        var b = $('.fm-views [data-v="globe"]'); b.disabled = true; b.title = 'The globe could not be loaded';
        if (view === 'globe') setView('flat');
      });
    }
    function size() {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;   // hidden: keep the last size
      G.dpr = Math.min(2, window.devicePixelRatio || 1);
      var cw = Math.round(w * G.dpr), ch = Math.round(h * G.dpr);
      if (cw !== cv.width || ch !== cv.height) { cv.width = cw; cv.height = ch; G.base.width = cw; G.base.height = ch; G.key = ''; }
      G.w = w; G.h = h; G.R = Math.min(w, h) / 2 - 12;
    }
    function colours() {
      var cs = getComputedStyle(document.documentElement), v = function (n, d) { return (cs.getPropertyValue(n) || '').trim() || d; };
      G.col = { g: v('--gold-rgb', '201,168,76'), text: v('--text', '#e8e0d0'), bg: v('--bg', '#0b0c10'), goldL: v('--gold-light', '#e8c97a'),
        a: rgbOf(v('--fm-a', '#f0c24f')), b: rgbOf(v('--fm-b', '#6cc4d8')), font: v('--font-ui', 'sans-serif'), light: document.documentElement.getAttribute('data-theme') === 'light' };
      G.key = '';
    }
    function apply() { G.proj.scale(G.R * G.k * G.dpr).translate([cv.width / 2, cv.height / 2]).rotate([G.rot[0], G.rot[1], 0]); }
    function face(lng, lat) {   // the cosine of the arc from the middle of the globe's face to a place: above 0, in view
      var cl = -G.rot[0] * D2R, cp = -G.rot[1] * D2R, la = lat * D2R;
      return Math.cos(la) * Math.cos(cp) * Math.cos(lng * D2R - cl) + Math.sin(la) * Math.sin(cp);
    }
    function glowScale() { return 1.3 + 0.5 * Math.max(0, Math.min(1, (3 - G.k) / 2)); }   // the glows reach further on the whole globe
    // the sphere, its grid and the land, painted once for each turn and zoom
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
    function ease(v, to, dt, ms) {   // a fade closes on its target a little each frame
      if (reduce) return to;
      v += (to - v) * (1 - Math.exp(-dt / ms));
      if (Math.abs(to - v) < 0.004) return to;
      busy = true; return v;
    }
    function render(now) {
      // a turn or zoom that is not a number would blank the globe for good: fall back to the last good view
      if (isFinite(G.rot[0]) && isFinite(G.rot[1]) && isFinite(G.k)) G.good = [G.rot[0], G.rot[1], G.k];
      else { G.rot = [G.good[0], G.good[1]]; G.k = G.good[2]; G.vel = [0, 0]; G.anim = null; }
      var dt = G.last ? Math.min(100, now - G.last) : 16; G.last = now;
      apply();
      var key = G.rot[0].toFixed(3) + ',' + G.rot[1].toFixed(3) + ',' + G.k.toFixed(4) + ',' + cv.width + ',' + cv.height;
      if (key !== G.key) { paintBase(); G.key = key; }
      var x = G.ctx, c = G.col, d = G.dpr, cx = cv.width / 2, cy = cv.height / 2, scr = G.R * G.k * d, zf = glowScale(), many = st.layers.length > 1;
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, cv.width, cv.height); x.drawImage(G.base, 0, 0);
      // the glows, squeezed towards the rim as the globe turns away from them: light on the dark theme, ink on the light
      x.globalCompositeOperation = c.light ? 'multiply' : 'screen';
      st.layers.forEach(function (L) {
        var rgb = L.w === 'a' ? c.a : c.b;
        L.areas.forEach(function (p) {
          p.g = ease(p.g, p.o, dt, 300); if (p.g < 0.004) return;
          var a = p.a, f = face(a[8], a[9]); if (f <= 0) return;
          var q = G.proj([a[8], a[9]]); if (!q) return;
          var r = Math.max(Math.sin(Math.min(a[2] * KM, 1.2)) * scr * zf, 10 * d);
          x.setTransform(1, 0, 0, 1, q[0], q[1]); x.rotate(Math.atan2(q[1] - cy, q[0] - cx)); x.scale(Math.max(0.06, f), 1);
          var gr = x.createRadialGradient(0, 0, 0, 0, 0, r);
          gr.addColorStop(0, 'rgba(' + rgb + ',0.85)'); gr.addColorStop(0.45, 'rgba(' + rgb + ',0.55)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
          x.fillStyle = gr; x.globalAlpha = p.g * Math.min(1, f / 0.15);
          x.beginPath(); x.arc(0, 0, r, 0, 6.2832); x.fill();
        });
      });
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
      // the routes: great circles, drawn out as they begin, with an arrowhead where they arrive
      st.layers.forEach(function (L) {
        var col = 'rgb(' + (L.w === 'a' ? c.a : c.b) + ')';
        L.routes.forEach(function (p) {
          p.g = ease(p.g, p.o, dt, 200); p.qs = null; if (p.g < 0.004) return;
          if (!p.ip) p.ip = d3.geoInterpolate([p.r[6], p.r[7]], [p.r[8], p.r[9]]);
          var t = 1, ta = 1;
          if (p.t0) { var u = (now - p.t0) / 1400; if (u < 1) busy = true; t = 1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3); ta = Math.max(0, Math.min(1, (now - p.t0 - 1100) / 400)); }
          var pts = [], n = 48, i;
          for (i = 0; i <= n; i++) pts.push(p.ip(t * i / n));
          x.globalAlpha = p.g; x.strokeStyle = col; x.lineWidth = 2 * d; x.lineCap = 'round'; x.lineJoin = 'round';
          x.beginPath(); G.path({ type: 'LineString', coordinates: pts }); x.stroke();
          p.qs = pts.map(function (ll) { return face(ll[0], ll[1]) > 0 ? G.proj(ll) : null; });   // for taps
          var e1 = pts[n], e0 = p.ip(Math.max(0, t - 0.08)), q1, q0;
          if (ta <= 0 || face(e1[0], e1[1]) <= 0.02 || !(q1 = G.proj(e1)) || !(q0 = G.proj(e0))) return;
          x.globalAlpha = p.g * ta; x.fillStyle = col;
          x.setTransform(1, 0, 0, 1, q1[0], q1[1]); x.rotate(Math.atan2(q1[1] - q0[1], q1[0] - q0[0]));
          x.beginPath(); x.moveTo(d, 0); x.lineTo(-8 * d, -4.5 * d); x.lineTo(-8 * d, 4.5 * d); x.closePath(); x.fill();
          x.setTransform(1, 0, 0, 1, 0, 0);
        });
      });
      // the marks: a star where it began, a dot for a holy place or centre, a ring for a last place
      var dots = [];
      st.layers.forEach(function (L) {
        var lc = 'rgb(' + (L.w === 'a' ? c.a : c.b) + ')';
        L.marks.forEach(function (p) {
          var hot = !!(G.hit && G.hit.p === p);
          p.g = ease(p.g, p.o, dt, 200); p.lg = ease(p.lg, p.o && (p.now || hot) ? 1 : 0, dt, 130); p.q = null;
          if (p.g < 0.004) return;
          var m = p.m, f = face(m[6], m[7]); if (f <= 0.02) return;
          var q = G.proj([m[6], m[7]]); if (!q) return;
          p.q = q; dots.push(q);
          x.globalAlpha = p.g * Math.min(1, f / 0.1); x.beginPath();
          if (m[0] === 'origin') { starPath(x, q[0], q[1], (hot ? 11 : 9) * d); x.fillStyle = lc; x.fill(); x.lineWidth = (hot ? 2.5 : 1.5) * d; x.strokeStyle = hot ? c.goldL : c.bg; x.stroke(); }
          else if (m[0] === 'place') { x.arc(q[0], q[1], (hot ? 6 : 4.5) * d, 0, 6.2832); x.fillStyle = many ? lc : c.text; x.fill(); x.lineWidth = (hot ? 2.5 : 1.5) * d; x.strokeStyle = hot ? c.goldL : c.bg; x.stroke(); }
          else { x.arc(q[0], q[1], (hot ? 7 : 5.5) * d, 0, 6.2832); x.lineWidth = 2 * d; x.strokeStyle = hot ? c.goldL : many ? lc : c.text; x.stroke(); }
        });
      });
      // the names of the century's new marks (and of the one under the pointer): right of the mark, else left, above or
      // below, wherever they clear the names already placed and the other marks
      var placed = [], spots = [[10, 4, 'left'], [-10, 4, 'right'], [0, -11, 'center'], [0, 19, 'center']];
      x.font = '600 ' + (12 * d) + 'px ' + c.font; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
      st.layers.forEach(function (L) {
        L.marks.forEach(function (p) {
          if (!p.q || p.lg < 0.004) return;
          var name = p.m[4], w = x.measureText(name).width + 4 * d, best = null;
          for (var j = 0; j < spots.length && !best; j++) {
            var o = spots[j], tx = p.q[0] + o[0] * d, ty = p.q[1] + o[1] * d, x0 = o[2] === 'right' ? tx - w : o[2] === 'center' ? tx - w / 2 : tx;
            var r = [x0, ty - 11 * d, x0 + w, ty + 3 * d];
            if (!placed.some(function (b) { return r[0] < b[2] && b[0] < r[2] && r[1] < b[3] && b[1] < r[3]; }) &&
              !dots.some(function (q) { return q !== p.q && q[0] > r[0] - 6 * d && q[0] < r[2] + 6 * d && q[1] > r[1] - 6 * d && q[1] < r[3] + 6 * d; })) best = [o[2], tx, ty, r];
          }
          if (best) placed.push(best[3]); else best = ['left', p.q[0] + 10 * d, p.q[1] + 4 * d];
          x.globalAlpha = p.g * p.lg; x.textAlign = best[0];
          x.lineWidth = 3 * d; x.strokeStyle = c.bg; x.strokeText(name, best[1], best[2]);
          x.fillStyle = c.text; x.fillText(name, best[1], best[2]);
        });
      });
      x.globalAlpha = 1;
      if (G.hit) {   // a tapped note stays beside its glow, mark or route as the globe turns; a passing one goes
        var at = G.pin ? anchor(G.hit) : null;
        if (G.pin && at && G.hit.p.o > 0) moveTip(at); else if (G.pin || G.anim || G.drag || spinning()) hideTip();
      }
    }
    function kick() { if (G && !G.raf && view === 'globe') G.raf = requestAnimationFrame(loop); }
    function spinning() { return !G.drag && (Math.abs(G.vel[0]) > 0.02 || Math.abs(G.vel[1]) > 0.02); }
    function loop(now) {
      G.raf = 0;
      if (view !== 'globe') return;
      if (G.anim) {
        var a = G.anim, t = Math.min(1, (now - a.t0) / a.ms), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        if (a.r0) { G.rot[0] = a.r0[0] + (a.r1[0] - a.r0[0]) * e; G.rot[1] = a.r0[1] + (a.r1[1] - a.r0[1]) * e; }   // a zoom alone leaves the turn to the reader
        G.k = a.k0 + (a.k1 - a.k0) * e;
        if (t >= 1) G.anim = null;
      } else if (spinning()) {   // the globe coasts after a flick
        G.rot[0] += G.vel[0]; G.rot[1] = Math.max(-85, Math.min(85, G.rot[1] + G.vel[1])); G.vel[0] *= 0.93; G.vel[1] *= 0.93;
      }
      if (!G.anim) { while (G.rot[0] > 180) G.rot[0] -= 360; while (G.rot[0] < -180) G.rot[0] += 360; }
      busy = false;
      render(now);
      if (G.anim || busy || spinning()) kick(); else G.last = 0;
    }
    function turnTo(lng, lat, k, ms, fol) {
      var r0 = G.rot.slice(), r1 = [-lng, Math.max(-80, Math.min(80, -lat))], dl = r1[0] - r0[0];
      while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
      G.vel = [0, 0];
      if (!ms || reduce) { G.rot = [r0[0] + dl, r1[1]]; G.k = k; G.anim = null; kick(); return; }
      G.anim = { t0: performance.now(), ms: ms, r0: r0, r1: [r0[0] + dl, r1[1]], k0: G.k, k1: k, follow: !!fol };
      kick();
    }
    // zooming during a glide changes where the glide ends, never the glide itself
    function setK(k) { k = Math.max(1, Math.min(8, k)); if (!isFinite(k)) return; if (G.anim) G.anim.k1 = k; else G.k = k; kick(); }
    function zoomBy(f) {
      var k1 = Math.max(1, Math.min(8, (G.anim ? G.anim.k1 : G.k) * f));
      if (G.anim || reduce) { setK(k1); return; }
      G.anim = { t0: performance.now(), ms: 260, k0: G.k, k1: k1 }; kick();
    }
    // where the century's spread is: the weighted middle of its glows and of what is new in it, and a zoom that shows
    // everything within reach of the middle (the whole globe when it reaches far round), never so close that the globe
    // stops looking round (the reader can zoom in further)
    function focusOf(c) {
      var sx = 0, sy = 0, sz = 0, pts = [];
      function add(lng, lat, w, rad) { var la = lat * D2R, lo = lng * D2R, cl = Math.cos(la); sx += w * cl * Math.cos(lo); sy += w * cl * Math.sin(lo); sz += w * Math.sin(la); pts.push([lng, lat, rad]); }
      st.layers.forEach(function (L) {
        L.areas.forEach(function (p) { if (p.cov > 0) add(p.a[8], p.a[9], (p.a[5] === 2 ? 3 : 1) * Math.sqrt(p.a[2] / 60), p.a[2] * KM); });
        L.routes.forEach(function (p) { if (p.c === c) { add(p.r[6], p.r[7], 1, 0.02); add(p.r[8], p.r[9], 2, 0.02); } });
        L.marks.forEach(function (p) { if (p.c === c) add(p.m[6], p.m[7], 2, 0.03); });
      });
      // a faith's closing century may have no glow left: its marks (the last places among them) show where it was
      if (!pts.length) st.layers.forEach(function (L) { L.marks.forEach(function (p) { if (p.c <= c) add(p.m[6], p.m[7], p.m[0] === 'last' ? 3 : 1, 0.03); }); });
      var n = Math.sqrt(sx * sx + sy * sy + sz * sz); if (!pts.length || n < 1e-9) return null;
      var lng = Math.atan2(sy, sx) / D2R, lat = Math.asin(Math.max(-1, Math.min(1, sz / n))) / D2R, far = 0.14;
      pts.forEach(function (p) { far = Math.max(far, d3.geoDistance([lng, lat], [p[0], p[1]]) + p[2]); });
      var room = (Math.min(G.w, G.h) / 2 - 26) / G.R;
      return { lng: lng, lat: Math.max(-60, Math.min(60, lat)), k: far >= 1.25 ? 1 : Math.max(1, Math.min(1.6, room / Math.sin(far))) };
    }
    function follow(anim) {
      if (!G || !G.w || !st.cents.length) return;
      var f = focusOf(st.cents[st.i]); if (!f) return;
      if (!G.placed) { anim = false; G.placed = true; }
      if (anim && d3.geoDistance([-G.rot[0], -G.rot[1]], [f.lng, f.lat]) < 0.06 && Math.abs(Math.log(f.k / G.k)) < 0.15) return;   // near enough: hold still
      turnTo(f.lng, f.lat, f.k, anim ? 1100 : 0, true);
    }
    function byHand() {   // the reader has taken the globe: it stops following the centuries until asked again
      if (G.anim && G.anim.follow) G.anim = null;
      if (G.follow) { G.follow = false; refollowEl.hidden = false; }
    }

    // ── what is under the pointer: a mark within 14 pixels, else a route within 7, else the smallest glow ──
    function hitAt(clientX, clientY) {
      var b = cv.getBoundingClientRect(), d = G.dpr, px = (clientX - b.left) * d, py = (clientY - b.top) * d, best = null, bd = 196 * d * d;
      st.layers.forEach(function (L) { L.marks.forEach(function (p) {
        if (!p.q || p.o < 1) return;
        var dx = p.q[0] - px, dy = p.q[1] - py, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { k: 'mark', p: p, L: L }; }
      }); });
      if (best) return best;
      bd = 7 * d;
      st.layers.forEach(function (L) { L.routes.forEach(function (p) {
        if (!p.qs || p.o < 0.3) return;
        for (var i = 1; i < p.qs.length; i++) if (p.qs[i] && p.qs[i - 1]) { var dd = segDist(px, py, p.qs[i - 1], p.qs[i]); if (dd < bd) { bd = dd; best = { k: 'route', p: p, L: L }; } }
      }); });
      if (best) return best;
      var scr = G.R * G.k * d;
      if (Math.hypot(px - cv.width / 2, py - cv.height / 2) > scr) return null;   // off the globe
      var ll = G.proj.invert([px, py]); if (!ll || !isFinite(ll[0])) return null;
      var zf = glowScale(), min = 10 * d / scr;
      st.layers.forEach(function (L) { L.areas.forEach(function (p) {
        if (p.o < 0.15) return;
        if (d3.geoDistance(ll, [p.a[8], p.a[9]]) <= Math.max(p.a[2] * KM * zf, min) * 0.75 && (!best || p.a[2] < best.p.a[2])) best = { k: 'area', p: p, L: L };
      }); });
      return best;
    }
    function tipHtml(h) {
      var pre = st.layers.length > 1 ? E(h.L.d.name) + ' · ' : '';
      if (h.k === 'mark') { var m = h.p.m; return '<p class="atl-tip-n">' + E(m[4]) + '</p><p class="atl-tip-y">' + pre + KIND[m[0]] + ', ' + E(yearText(m[1])) + '</p>' + (m[5] ? '<p class="atl-tip-k">' + E(m[5]) + '</p>' : ''); }
      if (h.k === 'route') { var r = h.p.r; return '<p class="atl-tip-n">' + E(r[5]) + '</p><p class="atl-tip-y">' + pre + 'How it spread' + (/\d{3}/.test(r[5]) ? '' : ', ' + E(yearText(r[0]))) + '</p>'; }
      var a = h.p.a;
      return '<p class="atl-tip-n">' + E(a[6]) + '</p><p class="atl-tip-y">' + pre + (a[5] === 2 ? 'A main faith' : 'Communities') + ', ' + E(spanText(a[3], a[4])) + '</p>' + (a[7] ? '<p class="atl-tip-k">' + E(cap(a[7])) + '</p>' : '');
    }
    function anchor(h) {   // where a tapped thing is on the screen now (CSS pixels), or null once it has turned away
      var q = null, d = G.dpr;
      if (h.k === 'mark') q = h.p.q;
      else if (h.k === 'route') { var qs = (h.p.qs || []).filter(Boolean); q = qs[Math.floor(qs.length / 2)]; }
      else if (face(h.p.a[8], h.p.a[9]) > 0) q = G.proj([h.p.a[8], h.p.a[9]]);
      return q ? [q[0] / d, q[1] / d] : null;
    }
    function moveTip(at) {
      var bw = mapEl.clientWidth, bh = mapEl.clientHeight, tw = tipEl.offsetWidth, th = tipEl.offsetHeight, l = at[0] + 14, t = at[1] + 14;
      if (l + tw > bw - 6) l = at[0] - 14 - tw; if (l < 6) l = 6;
      if (t + th > bh - 6) t = at[1] - 14 - th; if (t < 6) t = 6;
      tipEl.style.left = l + 'px'; tipEl.style.top = t + 'px';
    }
    function showTip(h, at, pin) { tipEl.innerHTML = tipHtml(h); tipEl.hidden = false; G.hit = h; G.pin = !!pin; moveTip(at); kick(); }
    function hideTip() { tipEl.hidden = true; if (G && G.hit) { G.hit = null; G.pin = false; kick(); } }
    function hover(e) {
      if (G.pin) return;   // a tapped note stays until the next tap
      var h = hitAt(e.clientX, e.clientY), b = cv.getBoundingClientRect();
      cv.style.cursor = h ? 'pointer' : '';
      if (!h) { hideTip(); return; }
      if (G.hit && G.hit.p === h.p) moveTip([e.clientX - b.left, e.clientY - b.top]);
      else showTip(h, [e.clientX - b.left, e.clientY - b.top], false);
    }
    function tap(e) {
      var h = hitAt(e.clientX, e.clientY), b = cv.getBoundingClientRect();
      if (!h || (G.pin && G.hit && G.hit.p === h.p)) { hideTip(); return; }
      showTip(h, anchor(h) || [e.clientX - b.left, e.clientY - b.top], true);
    }
    var nudgeT = 0;
    function nudge() { wheelEl.hidden = false; clearTimeout(nudgeT); nudgeT = setTimeout(function () { wheelEl.hidden = true; }, 1600); }

    // drag to turn (a flick coasts), two fingers to zoom and turn, the wheel to zoom about the pointer once the globe has
    // been clicked (or with Ctrl: a trackpad pinch), a double click to zoom in there, arrow keys and + and -
    function wire() {
      function degPerPx() { return 57.296 / (G.R * G.k); }
      function turnBy(dx, dy) { var s = degPerPx(); G.rot[0] += dx * s; G.rot[1] = Math.max(-85, Math.min(85, G.rot[1] - dy * s)); kick(); }
      cv.addEventListener('pointerdown', function (e) {
        G.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        var ids = Object.keys(G.ptrs);
        if (ids.length === 1) { G.drag = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false }; G.vel = [0, 0]; }
        else if (ids.length === 2) { var a = G.ptrs[ids[0]], b = G.ptrs[ids[1]]; G.drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: G.anim ? G.anim.k1 : G.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, moved: true }; byHand(); hideTip(); }
      });
      cv.addEventListener('pointermove', function (e) {
        if (G.ptrs[e.pointerId]) G.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (!G.drag) { if (e.pointerType === 'mouse') hover(e); return; }
        var ids = Object.keys(G.ptrs);
        if (G.drag.pinch) {
          if (ids.length !== 2) return;
          var a = G.ptrs[ids[0]], b = G.ptrs[ids[1]], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          turnBy(mx - G.drag.mx, my - G.drag.my); G.drag.mx = mx; G.drag.my = my;
          setK(G.drag.k * Math.hypot(a.x - b.x, a.y - b.y) / G.drag.pinch); return;
        }
        if (!G.drag.moved && Math.abs(e.clientX - G.drag.x0) + Math.abs(e.clientY - G.drag.y0) > 6) { G.drag.moved = true; byHand(); hideTip(); root.classList.add('is-turning'); }
        if (!G.drag.moved) return;
        var dx = e.clientX - G.drag.lx, dy = e.clientY - G.drag.ly, now = performance.now(), dt = Math.max(8, now - G.drag.lt), s = degPerPx();
        turnBy(dx, dy);
        G.vel = [dx * s * 16 / dt, -dy * s * 16 / dt];
        G.drag.lx = e.clientX; G.drag.ly = e.clientY; G.drag.lt = now;
      });
      // a finger left after a pinch carries on as a fresh drag (it must never be read as a tap)
      function afterPinch() {
        var ids = Object.keys(G.ptrs);
        if (ids.length === 1 && G.drag && G.drag.pinch) { var p = G.ptrs[ids[0]]; G.drag = { x0: p.x, y0: p.y, lx: p.x, ly: p.y, lt: performance.now(), moved: true }; G.vel = [0, 0]; }
        else if (!ids.length) { G.drag = null; root.classList.remove('is-turning'); }
      }
      cv.addEventListener('pointerup', function (e) {
        var had = !!G.ptrs[e.pointerId]; delete G.ptrs[e.pointerId];
        if (!G.drag || Object.keys(G.ptrs).length) { afterPinch(); return; }
        var d0 = G.drag; G.drag = null; root.classList.remove('is-turning');
        if (performance.now() - d0.lt > 80) G.vel = [0, 0];   // a slow release does not coast
        if (had && !d0.moved && !d0.pinch) tap(e);
        kick();
      });
      cv.addEventListener('pointercancel', function (e) { delete G.ptrs[e.pointerId]; if (Object.keys(G.ptrs).length) afterPinch(); else { G.drag = null; root.classList.remove('is-turning'); } kick(); });
      // leaving the globe lets the wheel scroll the page again (a click hands it back)
      cv.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; if (!G.pin) { cv.style.cursor = ''; hideTip(); } if (!G.drag && document.activeElement === cv) cv.blur(); });
      cv.addEventListener('wheel', function (e) {
        if (!e.ctrlKey && !e.metaKey && document.activeElement !== cv) { nudge(); return; }   // the page scrolls on
        e.preventDefault(); byHand(); hideTip();
        var f = Math.pow(1.0018, -e.deltaY * (e.deltaMode === 1 ? 30 : 1));
        if (G.anim) { setK(G.anim.k1 * f); return; }
        var b = cv.getBoundingClientRect(), mx = (e.clientX - b.left) * G.dpr, my = (e.clientY - b.top) * G.dpr;
        var p0 = Math.hypot(mx - cv.width / 2, my - cv.height / 2) < G.R * G.k * G.dpr ? G.proj.invert([mx, my]) : null;
        G.k = Math.max(1, Math.min(8, G.k * f)); apply();
        if (p0 && isFinite(p0[0])) {   // keep the place under the pointer under the pointer
          var q = G.proj(p0), s = degPerPx();
          if (q) { G.rot[0] += (mx - q[0]) / G.dpr * s; G.rot[1] = Math.max(-85, Math.min(85, G.rot[1] - (my - q[1]) / G.dpr * s)); }
        }
        kick();
      }, { passive: false });
      cv.addEventListener('dblclick', function (e) {
        var b = cv.getBoundingClientRect(), mx = (e.clientX - b.left) * G.dpr, my = (e.clientY - b.top) * G.dpr;
        if (Math.hypot(mx - cv.width / 2, my - cv.height / 2) > G.R * G.k * G.dpr) return;
        var ll = G.proj.invert([mx, my]); if (!ll || !isFinite(ll[0])) return;
        byHand(); turnTo(ll[0], ll[1], Math.min(8, G.k * 2), 500);
      });
      cv.addEventListener('keydown', function (e) {
        var s = 10 / G.k, k = e.key;
        if (k === 'Escape') { hideTip(); return; }
        if (k === 'ArrowLeft') G.rot[0] += s; else if (k === 'ArrowRight') G.rot[0] -= s;
        else if (k === 'ArrowUp') G.rot[1] = Math.max(-85, G.rot[1] - s); else if (k === 'ArrowDown') G.rot[1] = Math.min(85, G.rot[1] + s);
        else if (k === '+' || k === '=') { byHand(); zoomBy(1.5); } else if (k === '-' || k === '_') { byHand(); zoomBy(1 / 1.5); }
        else return;
        e.preventDefault(); byHand(); G.vel = [0, 0]; kick();
      });
      Array.prototype.forEach.call(zoomEl.querySelectorAll('button'), function (b) { b.addEventListener('click', function () { byHand(); zoomBy(+b.getAttribute('data-z')); }); });
      refollowEl.addEventListener('click', function () { G.follow = true; refollowEl.hidden = true; follow(true); });
      // a change of theme or of Kids mode repaints in its colours
      new MutationObserver(function () { colours(); kick(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-kids'] });
    }

    // a century: the glows by how much of it they fill, the routes begun in it (and fading for two more), the marks
    // reached; its caption is the last note given before its end
    function draw(i) {
      var c = st.cents[i], now = performance.now();
      st.i = i; range.value = String(i);
      range.setAttribute('aria-valuetext', centName(c));
      $('.fm-cent').textContent = centName(c); $('.fm-years').textContent = centRange(c);
      st.layers.forEach(function (L) {
        L.areas.forEach(function (p) {
          p.cov = cover(p.a[3], p.a[4], c);
          p.o = p.cov > 0 ? (0.62 + 0.38 * Math.min(1, p.cov * 2)) * (p.a[5] === 2 ? 1 : 0.5) : 0;
          p.n.setAttribute('opacity', p.o.toFixed(2)); p.n.style.pointerEvents = p.o ? '' : 'none';
        });
        L.routes.forEach(function (p) {
          var age = c - p.c - (p.c < 0 && c > 0 ? 1 : 0);   // no century 0: the 1st century BCE is followed by the 1st CE
          p.o = age === 0 ? 1 : age > 0 && age <= 2 ? 0.35 : 0;
          p.t0 = age === 0 && !reduce ? now : 0;
          if (p.t0) { p.n.classList.remove('is-new'); void p.p.getBoundingClientRect(); p.n.classList.add('is-new'); }
          p.n.setAttribute('opacity', p.o); p.n.style.pointerEvents = p.o ? '' : 'none';
        });
        L.marks.forEach(function (p) {
          var on = p.c <= c;
          p.o = on ? 1 : 0; p.now = p.c === c;
          p.n.setAttribute('opacity', p.o); p.n.style.pointerEvents = on ? '' : 'none';
          p.n.setAttribute('tabindex', on ? '0' : '-1');
          p.n.classList.toggle('is-now', p.now);
        });
      });
      var notes = st.layers.map(function (L) {
        var best = null, end = centEnd(c);
        L.d.notes.forEach(function (n) { if (n[0] < end && (!best || n[0] >= best[0])) best = n; });
        return best ? (st.layers.length > 1 ? '<b>' + E(L.d.name) + ':</b> ' : '') + E(best[1]) : '';
      }).filter(Boolean);
      $('.fm-note').innerHTML = notes.join('<br>');
      $('.fm-pick').hidden = true;
      words(c);
      if (view === 'flat') flatTo(c);
      else if (G) { if (G.follow) follow(true); if (G.hit && !(G.hit.p.o > 0)) hideTip(); kick(); }
      if (st.onChange) st.onChange(c);
    }
    function words(c) {
      $('.fm-words-b').innerHTML = st.layers.map(function (L) {
        var main = [], comm = [], fresh = [];
        L.byOrder.forEach(function (p) { if (p.cov > 0) (p.a[5] === 2 ? main : comm).push(p.a[6].replace(/^The /, 'the ')); });
        L.marks.forEach(function (p) { if (p.c === c) fresh.push('<li><b>' + E(p.m[4]) + '</b> (' + E(yearText(p.m[1])) + '): ' + E(p.m[5]) + '</li>'); });
        L.routes.forEach(function (p) { if (p.c === c) fresh.push('<li>' + E(p.r[5]) + (/\d{3}/.test(p.r[5]) ? '' : ' (' + E(yearText(p.r[0])) + ')') + '</li>'); });
        return '<p><b>' + E(L.d.name) + '</b> in the ' + E(centName(c)) + ': ' +
          (main.length ? 'a main faith in ' + E(main.join(', ')) : comm.length ? 'not the main faith of any region' : 'not present on the map') +
          (comm.length ? '; communities in ' + E(comm.join(', ')) : '') + '.</p>' + (fresh.length ? '<ul>' + fresh.join('') + '</ul>' : '');
      }).join('');
    }

    function playBtn(on) {
      var b = $('.fm-play'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('is-on', on);
      $('.fm-play-t').textContent = on ? 'Pause' : 'Play';
    }
    function stop() { st.playing = false; clearTimeout(st.timer); playBtn(false); }
    function tick() {
      st.timer = setTimeout(function () {
        if (!st.playing) return;
        if (st.i >= st.cents.length - 1) { stop(); return; }
        draw(st.i + 1); tick();
      }, reduce ? 2600 : 1800);
    }
    $('.fm-play').addEventListener('click', function () {
      if (st.playing) { stop(); return; }
      if (!st.cents.length) return;
      if (st.i >= st.cents.length - 1) draw(0);
      st.playing = true; playBtn(true); tick();
    });
    range.addEventListener('input', function () { stop(); draw(+range.value); });

    // ── the two views ──
    function ready() { if (!st.failed) msgEl.hidden = !!(st.cents.length && (view === 'flat' || G)); }
    function setView(v, save) {
      view = v;
      Array.prototype.forEach.call(root.querySelectorAll('.fm-views button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === v)); });
      root.classList.toggle('is-globe', v === 'globe');
      $('.fm-how').textContent = HOW[v];
      if (v === 'globe') {
        svg.setAttribute('hidden', '');   // an SVG element has no .hidden property
        cv.hidden = false;
        if (G) { zoomEl.hidden = false; refollowEl.hidden = G.follow; size(); if (G.follow) follow(false); kick(); } else startGlobe();
      } else {
        cv.hidden = true; zoomEl.hidden = true; refollowEl.hidden = true; wheelEl.hidden = true; hideTip();
        svg.removeAttribute('hidden');
        if (st.cents.length) { st.box = null; flatTo(st.cents[st.i]); if (!st.goal) glide(world()); }
      }
      ready();
      if (save) { try { localStorage.setItem('epoch-faith-view', v); } catch (e) {} if (opt.onView) opt.onView(v); }
    }
    Array.prototype.forEach.call(root.querySelectorAll('.fm-views button'), function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-v'); if (v !== view) setView(v, true); });
    });
    var rz = 0;
    function resized() {
      clearTimeout(rz);
      rz = setTimeout(function () {
        if (!st.cents.length) return;
        if (view === 'flat') { st.box = null; glide(fit(st.cents[st.i]) || world()); placeLabels(st.cents[st.i], st.goal); }
        else if (G) { size(); kick(); }
      }, 120);
    }
    if (window.ResizeObserver) new ResizeObserver(resized).observe(mapEl); else window.addEventListener('resize', resized);

    function show(a, b, cent) {
      stop();
      return Promise.all([load(a), b ? load(b) : null]).then(function (r) {
        gAreas.textContent = ''; gRoutes.textContent = ''; gMarks.textContent = ''; scaled = []; st.layers = [];
        st.layers.push(build(r[0], 'a')); if (r[1]) st.layers.push(build(r[1], 'b'));
        root.classList.toggle('is-compare', !!r[1]);
        $('.fm-k-a').hidden = $('.fm-k-b').hidden = !r[1];
        $('.fm-k-an').textContent = r[0].name; if (r[1]) $('.fm-k-bn').textContent = r[1].name;
        // the centuries: from the first year in the data to the last (today for a living faith)
        var lo = Infinity, hi = -Infinity;
        st.layers.forEach(function (L) {
          L.d.areas.forEach(function (x) { lo = Math.min(lo, x[3]); hi = Math.max(hi, x[4] == null ? NOW - 1 : x[4] - 1); });
          L.d.marks.forEach(function (x) { lo = Math.min(lo, x[1]); hi = Math.max(hi, x[1]); });
          L.d.notes.forEach(function (x) { hi = Math.max(hi, x[0]); });   // a faith that ended closes on its last note
        });
        st.cents = [];
        for (var c = centOf(lo); c <= centOf(hi); c++) if (c !== 0) st.cents.push(c);
        range.max = String(st.cents.length - 1);
        $('.fm-from').textContent = centName(st.cents[0]); $('.fm-to').textContent = centName(st.cents[st.cents.length - 1]);
        var what = 'where ' + r[0].name + (r[1] ? ' and ' + r[1].name : '') + ' spread, century by century';
        svg.setAttribute('aria-label', 'Map: ' + what);
        cv.setAttribute('aria-label', 'Globe: ' + what + '. Drag to turn it; the same century is told in words below the map.');
        $('.fm-src').innerHTML = st.layers.map(function (L) { return L.d.src.length ? '<b>Sources' + (st.layers.length > 1 ? ' (' + E(L.d.name) + ')' : '') + ':</b> ' + E(L.d.src.join('; ')) : ''; }).filter(Boolean).join('<br>');
        st.box = null;
        if (G) { G.follow = true; refollowEl.hidden = true; hideTip(); }   // a new faith: the globe follows it
        draw(nearest(cent));
        ready();
      }).catch(function () { st.failed = true; msgEl.hidden = false; msgEl.textContent = 'The map could not be loaded. Please try again later.'; });
    }
    // the index of a century, or of the nearest end of the map's centuries (the first when none is asked for)
    function nearest(cent) {
      if (cent == null || !st.cents.length) return 0;
      var i = st.cents.indexOf(cent);
      return i >= 0 ? i : cent < st.cents[0] ? 0 : st.cents.length - 1;
    }
    setView(view, false);
    show(slug, opt.compare || null, opt.cent);
    return {
      set: function (a, b, cent) { return show(a, b, cent); },
      century: function () { return st.cents[st.i]; },
      centuries: function () { return st.cents.slice(); },
      go: function (cent) { if (st.cents.length) { stop(); draw(nearest(cent)); } },
      view: function () { return view; },
      stop: stop,
      _globe: function () { return G; }   // for tests
    };
  }
  return { mount: mount, centOf: centOf, centName: centName, centRange: centRange };
})();
