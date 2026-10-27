// faith-map.js - the spread of a religion century by century, on the religion profiles (#spread) and /faiths: soft
// glows over the regions where it was a main faith (bright) or held communities (faint), the routes it spread by, where
// it began, its holy places and its last places, over the world map (maps/world.svg). A century slider with Play, the
// century's caption, and the same century in words. On /faiths a second faith can be laid over the first (compare).
// Data: data/faiths/<slug>.json, built by scripts/build-pages.ps1 from scripts/faiths.tsv (it writes FAITHS_V). The
// profile pages load this file without ?v= (a 10-minute cache, .htaccess). Uses escHtml from shared-nav.js if present.
var FaithMap = (function () {
  'use strict';
  var FAITHS_V = '2010788c74';
  var W = 10000, H = 4393, NOW = 2026, NS = 'http://www.w3.org/2000/svg', uid = 0;
  var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function E(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var cache = {};
  function load(slug) {
    if (!cache[slug]) cache[slug] = fetch('/data/faiths/' + slug + '.json?v=' + FAITHS_V).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { delete cache[slug]; throw e; });
    return cache[slug];
  }

  // centuries as the site labels them: the 13th century is 1200-1299, the 5th century BCE 499-400 BCE
  function centOf(y) { return y >= 0 ? Math.floor(y / 100) + 1 : -(Math.floor(-y / 100) + 1); }
  function centStart(c) { return c > 0 ? (c - 1) * 100 : c * 100 + 1; }
  function centEnd(c) { return c === -1 ? 0 : centStart(c) + 100; }   // the first year after it
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function centName(c) { return c > 0 ? ord(c) + ' century' : ord(-c) + ' century BCE'; }
  function yearText(y) { return y < 0 ? -y + ' BCE' : String(y); }
  function centRange(c) { var a = centStart(c), b = Math.min(centEnd(c), NOW) - 1; return c > 0 ? a + '–' + b : -a + '–' + -b + ' BCE'; }
  // how much of a century a span fills (0 when it does not touch it)
  function cover(from, to, c) {
    var a = centStart(c), b = Math.min(centEnd(c), NOW), ov = Math.min(to == null ? NOW : to, b) - Math.max(from, a);
    return ov > 0 ? ov / (b - a) : 0;
  }

  function el(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }
  function tip(n, text) { el('title', {}, n).textContent = text; }
  function star(r) { var p = []; for (var i = 0; i < 10; i++) { var a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push((rr * Math.cos(a)).toFixed(2) + ',' + (-rr * Math.sin(a)).toFixed(2)); } return p.join(' '); }

  function mount(host, slug, opt) {
    opt = opt || {};
    var id = 'fm' + (++uid);
    host.innerHTML =
      '<div class="fm">' +
        '<div class="fm-top"><p class="fm-when" aria-live="polite"><b class="fm-cent"></b><span class="fm-years"></span></p>' +
          '<button type="button" class="fm-play" aria-pressed="false"><span class="fm-play-i" aria-hidden="true"></span><span class="fm-play-t">Play</span></button></div>' +
        '<div class="fm-map"><svg class="fm-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Map"></svg><p class="fm-msg">Loading the map…</p></div>' +
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
        '<details class="fm-words"><summary>This century in words</summary><div class="fm-words-b"></div></details>' +
        '<p class="fm-src"></p>' +
      '</div>';
    var root = host.querySelector('.fm'), svg = root.querySelector('.fm-svg'), range = root.querySelector('.fm-range');
    var $ = function (s) { return root.querySelector(s); };
    var defs = el('defs', {}, svg);
    defs.innerHTML = ['a', 'b'].map(function (w) {
      return '<radialGradient id="' + id + '-' + w + '"><stop offset="0" class="fm-stop-' + w + '" stop-opacity="0.85"/><stop offset="0.45" class="fm-stop-' + w + '" stop-opacity="0.55"/><stop offset="1" class="fm-stop-' + w + '" stop-opacity="0"/></radialGradient>';
    }).join('');
    el('image', { href: '/maps/world.svg', x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none' }, svg);
    var gAreas = el('g', { 'class': 'fm-areas' }, svg), gRoutes = el('g', { 'class': 'fm-routes' }, svg), gMarks = el('g', { 'class': 'fm-marks' }, svg);
    var st = { layers: [], cents: [], i: 0, playing: false, timer: 0, box: null, goal: null, raf: 0, onChange: opt.onChange || null };
    var scaled = [];   // marks and arrowheads: drawn in screen pixels whatever the zoom

    function build(d, w) {
      var L = { d: d, w: w, areas: [], routes: [], marks: [] };
      // the faint areas first, so a main area glows over them; the big ones below the small ones
      d.areas.map(function (a, i) { return [a, i]; }).sort(function (p, q) { return p[0][5] - q[0][5] || q[0][2] - p[0][2]; }).forEach(function (ai) {
        var a = ai[0], n = el('circle', { cx: a[0], cy: a[1], r: a[2], fill: 'url(#' + id + '-' + w + ')', 'class': 'fm-area fm-l' + a[5], opacity: 0 }, gAreas);
        tip(n, a[6] + ' (' + yearText(a[3]) + (a[4] == null ? ' to today' : '–' + yearText(a[4])) + ')' + (a[7] ? ': ' + a[7] : ''));
        L.areas.push({ a: a, n: n, cov: 0, i: ai[1] });
      });
      L.byOrder = L.areas.slice().sort(function (p, q) { return p.i - q.i; });
      d.routes.forEach(function (r) {
        var x1 = r[1], y1 = r[2], x2 = r[3], y2 = r[4], dx = x2 - x1, dy = y2 - y1;
        var cx = (x1 + x2) / 2 + dy * 0.18, cy = (y1 + y2) / 2 - dx * 0.18;   // a gentle bend
        var g = el('g', { 'class': 'fm-route fm-route-' + w, opacity: 0 }, gRoutes);
        var p = el('path', { d: 'M' + x1 + ' ' + y1 + 'Q' + cx.toFixed(0) + ' ' + cy.toFixed(0) + ' ' + x2 + ' ' + y2, pathLength: 1, 'class': 'fm-route-p' }, g);
        var ah = el('g', { 'class': 'fm-arrow' }, g); el('path', { d: 'M0 0L-9 -4.5L-9 4.5z' }, ah);
        tip(g, r[5] + ' (' + yearText(r[0]) + ')');
        scaled.push({ n: ah, x: x2, y: y2, rot: Math.atan2(y2 - cy, x2 - cx) * 180 / Math.PI });
        L.routes.push({ r: r, n: g, p: p, c: centOf(r[0]) });
      });
      d.marks.forEach(function (m) {
        var g = el('g', { 'class': 'fm-mark fm-mark-' + w + ' fm-' + m[0], opacity: 0, tabindex: '-1', role: 'button', 'aria-label': m[4] + ', ' + yearText(m[1]) + ': ' + m[5] }, gMarks);
        if (m[0] === 'origin') el('polygon', { points: star(9), 'class': 'fm-shape' }, g);
        else el('circle', { r: m[0] === 'last' ? 5.5 : 4.5, 'class': 'fm-shape' }, g);
        var t = el('text', { x: 10, y: 4, 'class': 'fm-label' }, g); t.textContent = m[4];
        tip(g, m[4] + ' (' + yearText(m[1]) + '): ' + m[5]);
        var pick = function () { var p = $('.fm-pick'); p.hidden = false; p.innerHTML = '<b>' + E(m[4]) + '</b> <span class="fm-pick-y">' + E(yearText(m[1])) + '</span> ' + E(m[5]); };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
        scaled.push({ n: g, x: m[2], y: m[3], rot: 0 });
        L.marks.push({ m: m, n: g, t: t, c: centOf(m[1]) });
      });
      return L;
    }

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

    // a century: the glows by how much of it they fill, the routes begun in it (and fading for two more), the marks
    // reached; its caption is the last note given before its end
    function draw(i) {
      var c = st.cents[i];
      st.i = i; range.value = String(i);
      range.setAttribute('aria-valuetext', centName(c));
      $('.fm-cent').textContent = centName(c); $('.fm-years').textContent = centRange(c);
      st.layers.forEach(function (L) {
        L.areas.forEach(function (p) {
          p.cov = cover(p.a[3], p.a[4], c);
          var o = p.cov > 0 ? (0.62 + 0.38 * Math.min(1, p.cov * 2)) * (p.a[5] === 2 ? 1 : 0.5) : 0;
          p.n.setAttribute('opacity', o.toFixed(2));
        });
        L.routes.forEach(function (p) {
          var age = c - p.c - (p.c < 0 && c > 0 ? 1 : 0);   // no century 0: the 1st century BCE is followed by the 1st CE
          var o = age === 0 ? 1 : age > 0 && age <= 2 ? 0.35 : 0;
          if (age === 0 && !reduce) { p.n.classList.remove('is-new'); void p.p.getBoundingClientRect(); p.n.classList.add('is-new'); }
          p.n.setAttribute('opacity', o);
        });
        L.marks.forEach(function (p) {
          var on = p.c <= c;
          p.n.setAttribute('opacity', on ? 1 : 0);
          p.n.setAttribute('tabindex', on ? '0' : '-1');
          p.n.classList.toggle('is-now', p.c === c);
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
      var box = fit(c);
      glide(box);
      placeLabels(c, box || st.goal);
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
    var rz = 0;
    window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (st.cents.length) { st.box = null; glide(fit(st.cents[st.i]) || world()); placeLabels(st.cents[st.i], st.goal); } }, 150); });

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
        svg.setAttribute('aria-label', 'Map: where ' + r[0].name + (r[1] ? ' and ' + r[1].name : '') + ' spread, century by century');
        $('.fm-src').innerHTML = st.layers.map(function (L) { return L.d.src.length ? '<b>Sources' + (st.layers.length > 1 ? ' (' + E(L.d.name) + ')' : '') + ':</b> ' + E(L.d.src.join('; ')) : ''; }).filter(Boolean).join('<br>');
        $('.fm-msg').hidden = true;
        st.box = null;
        draw(nearest(cent));
      }).catch(function () { $('.fm-msg').hidden = false; $('.fm-msg').textContent = 'The map could not be loaded. Please try again later.'; });
    }
    // the index of a century, or of the nearest end of the map's centuries (the first when none is asked for)
    function nearest(cent) {
      if (cent == null || !st.cents.length) return 0;
      var i = st.cents.indexOf(cent);
      return i >= 0 ? i : cent < st.cents[0] ? 0 : st.cents.length - 1;
    }
    show(slug, opt.compare || null, opt.cent);
    return {
      set: function (a, b, cent) { return show(a, b, cent); },
      century: function () { return st.cents[st.i]; },
      centuries: function () { return st.cents.slice(); },
      go: function (cent) { if (st.cents.length) { stop(); draw(nearest(cent)); } },
      stop: stop
    };
  }
  return { mount: mount, centOf: centOf, centName: centName, centRange: centRange };
})();
