// inventions.js - the Inventions and Discoveries tree (/inventions): when and where each invention or discovery first
// appeared, who is credited, what it built on and what it led to. Data: data/inventions.json (INV_SRC in the page,
// written by scripts/build-pages.ps1 from scripts/inventions.tsv): {cats: [[key, label]], n: [[slug, label, cat, year,
// circa, date, place, [[civ, url, emblem]], [[person, url]], [[place, date]], [built-on indices], contested, picture,
// entry name, first sentence, source]]}.
// The lanes stand in five families, one colour each (shared.css .inv-f-*, the --cat slots, checked with the dataviz
// validator on neighbouring lanes in this order): making (tools, building, energy), living (farming, medicine), moving
// (transport, weapons), knowing (writing, science, chemistry) and connecting (communication). Every lane has its icon.
// Wide screens: the tree. HTML cards on one transformed layer with the SVG links beneath; time runs left to right in
// bands that each give an age room by how many cards one lane holds there; a sticky column of lane names at the left; an
// era strip above shows all of history at the tree's own scale, every invention as a dot, and a window on what is in
// view (drag it, or click an age to fit it). Hover or a first tap lights a card's whole lineage; "Trace the road to"
// lights only what led to it. Drag or arrow keys move, Ctrl + wheel, pinch and + - zoom; the plain wheel scrolls the
// tree once it has been clicked (the mouse leaving gives the wheel back to the page). Phones (700 px and below): a
// vertical timeline instead, the cards in date order under age and century headings, a sticky bar of ages and lane
// switches; a tap opens the card's sheet and dims all but its lineage, "Only its line" keeps just that. Also: by
// civilisation and a list. The address keeps ?focus=&view=&civ=&hide=. Kids mode starts without the weapons lane.
// window.epochInventions is there for tests.
(function () {
  'use strict';
  var CW = 200, CH = 58, GX = 14, LPT = 18, LPB = 8, TOP = 30, LEFT = 18, MINB = 110;
  var BANDS = [-3400000, -1500000, -500000, -100000, -30000, -12000, -6000, -3000, -1500, -500, 0, 500, 1000, 1300, 1500, 1650, 1750, 1800, 1830, 1860, 1880, 1900, 1920, 1940, 1960, 1980, 2000];
  // the ages of the era strip and the phone's bar: a partition of the axis
  var AGES = [['prehistory', 'Prehistory', -3400000, -3000], ['antiquity', 'Antiquity', -3000, 500], ['middle', 'Middle Ages', 500, 1500], ['early', 'Early modern', 1500, 1800], ['modern', 'Modern', 1800, 2001]];
  var FAM = { tools: 'making', building: 'making', energy: 'making', farming: 'living', medicine: 'living', transport: 'moving', weapons: 'moving', writing: 'knowing', science: 'knowing', chemistry: 'knowing', communication: 'connecting' };
  var FAMS = ['making', 'living', 'moving', 'knowing', 'connecting'];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var fam = function (cat) { return FAM[cat] || 'knowing'; };
  var N = [], CATS = [], CATL = {}, CIVS = [], BYSLUG = {}, LAY = null;
  var S = { view: 'tree', sel: -1, hov: -1, road: false, only: false, civ: '', hide: {}, k: 1, tx: 0, ty: 0, active: false, phone: false, moved: false };
  var E = {};   // the page's elements
  var MQ = window.matchMedia ? matchMedia('(max-width: 700px)') : { matches: false, addListener: function () {} };

  // ── data ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  function load(cb) {
    fetch(window.INV_SRC || '/data/inventions.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
      // the lanes in family order, each family's lanes in the data's order
      CATS = d.cats.map(function (c, i) { return [c[0], c[1], i]; }).sort(function (a, b) { return FAMS.indexOf(fam(a[0])) - FAMS.indexOf(fam(b[0])) || a[2] - b[2]; });
      CATS.forEach(function (c) { CATL[c[0]] = c[1]; });
      N = d.n.map(function (r, i) {
        return { i: i, slug: r[0], label: r[1], cat: r[2], y: r[3], circa: !!r[4], date: r[5], place: r[6], civ: r[7] || [], ppl: r[8] || [], also: r[9] || [],
          built: r[10] || [], led: [], contested: r[11] || '', img: r[12] || '', name: r[13] || r[1], first: r[14] || '', src: r[15] || '' };
      });
      N.forEach(function (n) { BYSLUG[n.slug] = n; n.built.forEach(function (p) { N[p].led.push(n.i); }); });
      var cv = {};
      N.forEach(function (n) { n.civ.forEach(function (c) { (cv[c[0]] = cv[c[0]] || { name: c[0], url: c[1], em: c[2], n: [] }).n.push(n.i); }); });
      CIVS = Object.keys(cv).map(function (k) { return cv[k]; }).sort(function (a, b) { return b.n.length - a.n.length || a.name.localeCompare(b.name); });
      cb();
    }).catch(function () { E.status.textContent = 'The inventions could not be loaded. Please try again.'; });
  }

  // ── lineage ───────────────────────────────────────────────────────────────────────────────────────────────────────
  function walk(i, key, out) { N[i][key].forEach(function (j) { if (!out[j]) { out[j] = 1; walk(j, key, out); } }); return out; }
  function ancestors(i) { return walk(i, 'built', {}); }
  function descendants(i) { return walk(i, 'led', {}); }
  function litSet() {   // what is lit: the hovered or chosen card's lineage (only its road when traced), else a civilisation's
    var i = S.hov >= 0 ? S.hov : S.sel, on = null;
    if (i >= 0) { on = ancestors(i); if (!(S.road && i === S.sel && S.hov < 0)) { var d = descendants(i); Object.keys(d).forEach(function (j) { on[j] = 1; }); } on[i] = 1; }
    else if (S.civ) { on = {}; N.forEach(function (n) { if (n.civ.some(function (c) { return c[0] === S.civ; })) on[n.i] = 1; }); }
    return on;
  }

  // ── words and marks ───────────────────────────────────────────────────────────────────────────────────────────────
  function yearText(y) {
    if (y <= -1000000) return (-y / 1e6).toFixed(1).replace(/\.0$/, '') + ' million years ago';
    if (y < -12000) return (-y).toLocaleString('en-GB') + ' years ago';
    if (y < 0) return (-y).toLocaleString('en-GB') + ' BCE';
    if (y === 0) return '1 CE';
    return String(y);
  }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function periodOf(y) {   // the phone's sub-headings: deep time in long stretches, then millennia, centuries, half-centuries
    if (y < -100000) return 'More than 100,000 years ago';
    if (y < -10000) return '100,000 to 12,000 years ago';
    if (y < -3000) return '10,000 to 3000 BCE';
    if (y < -1000) return ord(Math.floor(-y / 1000) + (-y % 1000 ? 1 : 0)) + ' millennium BCE';
    if (y < 0) return ord(Math.ceil(-y / 100)) + ' century BCE';
    if (y >= 1800) { var h = Math.floor(y / 50) * 50; return h + '–' + (h + 49); }
    return ord(Math.floor(y / 100) + 1) + ' century';
  }
  function ic(cat) { return '<span class="inv-ic inv-ic-' + esc(cat) + '" aria-hidden="true"></span>'; }
  function laneTag(cat) { return '<span class="inv-tag inv-f-' + fam(cat) + '">' + ic(cat) + esc(CATL[cat]) + '</span>'; }
  function shown(n) { return !S.hide[n.cat]; }
  function kids() { return document.documentElement.getAttribute('data-kids') === '1'; }

  // ── layout of the tree: bands of time, one row a lane. A band is as wide as the most cards one lane holds in it;
  // inside it each lane's cards stand in date order, a card's width apart, and the room left over is shared out by
  // date, so a lone card sits at its year and a crowd never overlaps. Every lane starts each band at the same line. ──
  function bandOf(y) { for (var b = 0; b < BANDS.length - 2; b++) if (y < BANDS[b + 1]) return b; return BANDS.length - 2; }
  function layout() {
    var lanes = CATS.filter(function (c) { return !S.hide[c[0]]; }).map(function (c) { return { key: c[0], label: c[1], fam: fam(c[0]), nodes: [] }; });
    var lix = {}; lanes.forEach(function (l, i) { lix[l.key] = i; });
    N.forEach(function (n) { if (lix[n.cat] !== undefined) lanes[lix[n.cat]].nodes.push(n); });
    var nb = BANDS.length - 1, bw = [], bx = [LEFT], per = [];
    for (var b = 0; b < nb; b++) {
      per[b] = lanes.map(function (l) { return l.nodes.filter(function (n) { return bandOf(n.y) === b; }).sort(function (p, q) { return p.y - q.y || p.i - q.i; }); });
      var most = lanes.length ? Math.max.apply(null, per[b].map(function (a) { return a.length; })) : 0;
      bw.push(Math.max(MINB, most * (CW + GX) + (most ? 40 : 0)));
      bx.push(bx[b] + bw[b]);
    }
    for (b = 0; b < nb; b++) per[b].forEach(function (ns) {
      var slack = bw[b] - ns.length * (CW + GX);
      ns.forEach(function (n, k) { n.x = bx[b] + k * (CW + GX) + slack * (n.y - BANDS[b]) / (BANDS[b + 1] - BANDS[b]); });
    });
    function X(y) { var b = bandOf(Math.max(BANDS[0], Math.min(BANDS[BANDS.length - 1], y))); return bx[b] + (y - BANDS[b]) / (BANDS[b + 1] - BANDS[b]) * bw[b]; }
    var top = TOP;
    lanes.forEach(function (l, k) {
      l.top = top; l.h = LPT + CH + LPB; l.k = k;
      l.nodes.sort(function (p, q) { return p.x - q.x; }).forEach(function (n, j) { n.ly = top + LPT; n.ord = j; n.lane = l; });
      top += l.h;
    });
    LAY = { lanes: lanes, bx: bx, bw: bw, X: X, w: bx[nb] + CW + 60, h: top + 8 };
  }

  // ── drawing the tree ──────────────────────────────────────────────────────────────────────────────────────────────
  function cardHtml(n) {
    var pic = n.img ? '<img src="' + esc(n.img) + '" alt="" loading="lazy" decoding="async" width="52" height="52">' : ic(n.cat);
    return '<button type="button" class="inv-card inv-f-' + fam(n.cat) + '" data-i="' + n.i + '" tabindex="-1" style="left:' + Math.round(n.x) + 'px;top:' + Math.round(n.ly) + 'px">' +
      '<span class="inv-card-pic">' + pic + '</span><span class="inv-card-b"><span class="inv-card-n">' + esc(n.label) + '</span><span class="inv-card-d">' + esc(n.date) + '</span></span></button>';
  }
  function draw() {
    if (S.phone) { drawPhone(); return; }
    layout();
    var L = LAY, svg = [], W = Math.ceil(L.w), H = Math.ceil(L.h);
    svg.push('<svg class="inv-edges" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">');
    L.lanes.forEach(function (l) { svg.push('<rect class="inv-lane-bg inv-f-' + l.fam + (l.k % 2 ? ' odd' : '') + '" x="0" y="' + l.top + '" width="' + W + '" height="' + l.h + '"></rect>'); });
    for (var b = 1; b < L.bx.length - 1; b++) svg.push('<line class="inv-grid" x1="' + L.bx[b] + '" y1="' + TOP + '" x2="' + L.bx[b] + '" y2="' + L.h + '"></line>');
    N.forEach(function (n) {
      if (!shown(n)) return;
      n.built.forEach(function (p) {
        var a = N[p]; if (!shown(a)) return;
        var c = 'inv-f-' + fam(n.cat), at = ' data-a="' + a.i + '" data-b="' + n.i + '" class="' + c + '"';
        var x1 = a.x + CW, y1 = a.ly + CH / 2, x2 = n.x, y2 = n.ly + CH / 2, dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        if (a.lane === n.lane && Math.abs(n.ord - a.ord) > 1) {   // over the cards between them, through the lane's top margin
          x1 = a.x + CW * 0.7; x2 = n.x + CW * 0.3; y1 = a.ly; y2 = n.ly;
          svg.push('<path' + at + ' d="M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 - 20) + ' ' + x2 + ',' + (y2 - 20) + ' ' + x2 + ',' + y2 + '"></path>'); return;
        }
        if (x2 < x1 + 10) { x1 = a.x + CW / 2; y1 = a.ly + (y2 > y1 ? CH : 0); x2 = n.x + CW / 2; y2 = n.ly + (y2 > a.ly ? 0 : CH); svg.push('<path' + at + ' d="M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + y2) / 2 + ' ' + x2 + ',' + (y1 + y2) / 2 + ' ' + x2 + ',' + y2 + '"></path>'); return; }
        svg.push('<path' + at + ' d="M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2 + '"></path>');
      });
    });
    svg.push('</svg>');
    E.world.innerHTML = svg.join('') + N.filter(shown).map(cardHtml).join('');
    E.world.style.width = W + 'px'; E.world.style.height = H + 'px';
    E.lanes.innerHTML = L.lanes.map(function (l) { return '<span class="inv-lane-l inv-f-' + l.fam + '" data-top="' + l.top + '" data-h="' + l.h + '">' + ic(l.key) + '<span class="inv-lane-n">' + esc(l.label) + '</span><span class="inv-lane-c">' + l.nodes.length + '</span></span>'; }).join('');
    E.axis.innerHTML = L.bx.map(function (x, b) { return '<span class="inv-tick" data-x="' + x + '">' + esc(yearText(BANDS[b])) + '</span>'; }).join('');
    E.cards = {}; $$('.inv-card', E.world).forEach(function (c) { E.cards[c.getAttribute('data-i')] = c; });
    E.paths = $$('.inv-edges path', E.world);
    strip(); clamp(); apply(); light();
  }

  // ── the era strip: all of history at the tree's own scale, the ages, a dot for every invention, the view's window ──
  function strip() {
    var L = LAY, W = L.w;
    E.strip.innerHTML = '<div class="inv-strip-ages">' + AGES.map(function (a) {
      var x0 = L.X(a[2]) / W * 100, x1 = L.X(a[3]) / W * 100;
      return '<button type="button" class="inv-age" data-age="' + a[0] + '" style="left:' + x0.toFixed(3) + '%;width:' + (x1 - x0).toFixed(3) + '%"><span>' + esc(a[1]) + '</span></button>';
    }).join('') + '</div><div class="inv-strip-dots" aria-hidden="true">' + N.filter(shown).map(function (n) {
      return '<span class="inv-sd inv-f-' + fam(n.cat) + '" data-i="' + n.i + '" style="left:' + ((n.x + CW / 2) / W * 100).toFixed(3) + '%;top:' + (4 + FAMS.indexOf(fam(n.cat)) * 5) + 'px"></span>';
    }).join('') + '</div><div class="inv-strip-win" aria-hidden="true"></div>';
    E.win = $('.inv-strip-win', E.strip); E.sdots = {}; $$('.inv-sd', E.strip).forEach(function (d) { E.sdots[d.getAttribute('data-i')] = d; });
  }
  function stripWin() {
    if (!E.win || !LAY) return;
    var fw = freeW(), lw = labW(), a = Math.max(0, (lw - S.tx) / S.k / LAY.w), b = Math.min(1, (fw - S.tx) / S.k / LAY.w);
    E.win.style.left = (a * 100).toFixed(3) + '%'; E.win.style.width = (Math.max(0.004, b - a) * 100).toFixed(3) + '%';
  }

  // ── the view: translate and scale ─────────────────────────────────────────────────────────────────────────────────
  var KMIN = 0.12, KMAX = 1.6, KTEXT = 0.38, KMINI = 0.45;   // below KTEXT the cards show only their pictures
  function stageSize() { return { w: E.stage.clientWidth || 800, h: E.stage.clientHeight || 500 }; }
  // the lane column's width at a zoom (shared.css .inv-lanes: 176 px, its icons alone, 46 px, below KMINI), so that a fit
  // computed before the zoom changes leaves room for the column it will have
  function labW(k) { return (k == null ? S.k : k) < KMINI ? 46 : 176; }
  function fitK(span, room) {   // the zoom that fits a span of the world into the room left by the lane column
    var k = room(labW(1)) / span; if (k < KMINI) k = Math.min(room(labW(0)) / span, KMINI - 0.001); return k;
  }
  function freeW() { var s = stageSize(); return !E.panel.hidden && s.w > 700 ? s.w - Math.min(360, s.w) : s.w; }
  function clamp() {
    var s = stageSize(), L = LAY; if (!L) return;
    S.k = Math.max(KMIN, Math.min(KMAX, S.k));
    var ww = L.w * S.k, wh = L.h * S.k, m = 60, fw = freeW(), lw = labW();
    S.tx = ww <= fw - lw ? lw + (fw - lw - ww) / 2 : Math.min(lw + m, Math.max(fw - ww - m, S.tx));
    S.ty = wh <= s.h ? 0 : Math.min(m, Math.max(s.h - wh - m, S.ty));
  }
  function apply() {
    E.world.style.transform = 'translate(' + S.tx.toFixed(1) + 'px,' + S.ty.toFixed(1) + 'px) scale(' + S.k.toFixed(4) + ')';
    var sh = stageSize().h;
    E.stage.classList.toggle('inv-mini', S.k < KMINI);   // the lane column shows its icons only
    $$('.inv-lane-l', E.lanes).forEach(function (s) { var t = S.ty + S.k * +s.getAttribute('data-top'), h = S.k * +s.getAttribute('data-h'); s.style.transform = 'translateY(' + Math.round(t) + 'px)'; s.style.height = Math.round(h) + 'px'; s.hidden = t + h < 0 || t > sh; });
    // a tick's label runs right from its line: shown only when all of it fits, clear of the last one shown and of the
    // lane column (its width estimated from its letters at 11 px, so that panning reads no layout)
    var end = -1e9, sw = stageSize().w, lw = labW();
    $$('.inv-tick', E.axis).forEach(function (s) {
      var x = S.tx + S.k * +s.getAttribute('data-x'), w = s._w || (s._w = s.textContent.length * 6.4);
      s.style.transform = 'translateX(' + Math.round(x) + 'px)';
      var hide = x < end + 14 || x < lw + 6 || x + w > sw - 6; s.hidden = hide; if (!hide) end = x + w;
    });
    E.stage.classList.toggle('inv-far', S.k < 0.55);
    E.stage.classList.toggle('inv-tiny', S.k < KTEXT);
    stripWin();
  }
  function zoomAt(f, px, py) {
    var k0 = S.k, k1 = Math.max(KMIN, Math.min(KMAX, k0 * f)); if (k1 === k0) return;
    S.tx = px - (px - S.tx) * k1 / k0; S.ty = py - (py - S.ty) * k1 / k0; S.k = k1; clamp(); apply();
  }
  function centreOn(n, k) {
    var s = stageSize(); if (k) S.k = k; var lw = labW();
    S.tx = lw + (freeW() - lw) / 2 - (n.x + CW / 2) * S.k; S.ty = s.h / 2 - (n.ly + CH / 2) * S.k; clamp(); apply();
  }
  function fitYears(a, b) {   // the span a..b across the stage, all lanes from the top
    var s = stageSize(), fw = freeW(), x0 = LAY.X(Math.max(BANDS[0], a)), x1 = LAY.X(Math.min(2000, b)) + CW;
    S.k = Math.max(KMIN, Math.min(1, fitK(x1 - x0 + 30, function (lw) { return fw - lw - 30; }), Math.max(0.72, s.h / LAY.h)));
    S.tx = labW() + 10 - x0 * S.k; S.ty = 0; clamp(); apply();
  }
  function fitSet(set, n) {   // the cards of a lineage in view; a road too long to read at once is followed from its end, n
    var xs = [], ys = []; Object.keys(set).forEach(function (j) { var m = N[j]; if (!shown(m)) return; xs.push(m.x, m.x + CW); ys.push(m.ly, m.ly + CH); });
    if (!xs.length) return;
    var s = stageSize(), fw = freeW(), x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var k = Math.min(1, fitK(x1 - x0 + 60, function (lw) { return fw - lw - 60; }), (s.h - 60) / (y1 - y0 + 60));
    if (k < KTEXT && n) { S.k = 0.7; S.tx = fw - 40 - (n.x + CW) * S.k; S.ty = s.h / 2 - ((y0 + y1) / 2) * S.k; clamp(); apply(); return; }
    S.k = Math.max(KMIN, k); var lw = labW(); S.tx = lw + (fw - lw - (x1 + x0) * S.k) / 2; S.ty = (s.h - (y1 + y0) * S.k) / 2; clamp(); apply();
  }

  // ── lighting a lineage ────────────────────────────────────────────────────────────────────────────────────────────
  function light() {
    var on = litSet();
    if (S.phone) {
      if (!E.vcards) return;
      E.vlist.classList.toggle('inv-lit', !!on); E.vlist.classList.toggle('inv-only', !!(on && S.only && S.sel >= 0));
      Object.keys(E.vcards).forEach(function (j) { var c = E.vcards[j]; c.classList.toggle('on', !!(on && on[j])); c.classList.toggle('sel', +j === S.sel); });
      // headings with nothing left under them go when only the line is shown
      $$('.inv-vg', E.vlist).forEach(function (g) { g.hidden = S.only && on && S.sel >= 0 && !$('.inv-vc.on', g); });
      $$('.inv-va', E.vlist).forEach(function (a) { a.hidden = S.only && on && S.sel >= 0 && !$('.inv-vc.on', a); });
      return;
    }
    if (!E.cards) return;
    E.world.classList.toggle('inv-lit', !!on);
    Object.keys(E.cards).forEach(function (j) { var c = E.cards[j]; c.classList.toggle('on', !!(on && on[j])); c.classList.toggle('sel', +j === S.sel); });
    E.paths.forEach(function (p) { p.classList.toggle('on', !!(on && on[p.getAttribute('data-a')] && on[p.getAttribute('data-b')])); });
    if (E.sdots) { E.strip.classList.toggle('inv-lit', !!on); Object.keys(E.sdots).forEach(function (j) { E.sdots[j].classList.toggle('on', !!(on && on[j])); }); }
  }

  // ── the panel (a side panel on wide screens, a sheet from the bottom on phones) ──────────────────────────────────
  function chip(j) { var n = N[j]; return '<button type="button" class="inv-chip inv-f-' + fam(n.cat) + '" data-go="' + n.i + '">' + esc(n.label) + '<span>' + esc(n.date) + '</span></button>'; }
  function civHtml(n) {
    var parts = n.ppl.map(function (p) { return p[1] ? '<a href="' + esc(p[1]) + '">' + esc(p[0]) + '</a>' : esc(p[0]); })
      .concat(n.civ.map(function (c) { return (c[2] ? '<img src="' + esc(c[2]) + '" alt="" width="22" height="22" loading="lazy">' : '') + '<a href="' + esc(c[1]) + '">' + esc(c[0]) + '</a>'; }));
    return parts.length ? '<p class="inv-p-c"><span class="inv-k">Credited to</span> ' + parts.join(' · ') + '</p>' : '';
  }
  function panel() {
    if (S.sel < 0) { E.panel.hidden = true; return; }
    var n = N[S.sel], up = n.built.filter(function (j) { return shown(N[j]); }), down = n.led.filter(function (j) { return shown(N[j]); });
    var anc = Object.keys(ancestors(n.i)).length;
    E.panel.innerHTML = '<button type="button" class="inv-x" aria-label="Close">&times;</button>' +
      (n.img ? '<img class="inv-p-img" src="' + esc(n.img.replace('/thumbs/', '/')) + '" alt="' + esc(n.name) + '" loading="lazy">' : '') +
      '<p class="inv-p-k">' + laneTag(n.cat) + '</p><h2 class="inv-p-t">' + esc(n.label) + '</h2>' + (fold(n.name) !== fold(n.label) ? '<p class="inv-p-e">' + esc(n.name) + '</p>' : '') +
      '<p class="inv-p-d"><strong>' + esc(n.date) + '</strong>' + (n.place ? ' · ' + esc(n.place) : '') + '</p>' + civHtml(n) +
      (n.first ? '<p class="inv-p-f">' + esc(n.first) + '</p>' : '') +
      (n.also.length ? '<p class="inv-p-a"><span class="inv-k">Also arose independently</span> ' + n.also.map(function (a) { return esc(a[0]) + (a[1] ? ' (' + esc(a[1]) + ')' : ''); }).join('; ') + '</p>' : '') +
      (n.contested ? '<p class="inv-p-n"><span class="inv-k">Note</span> ' + esc(n.contested) + '</p>' : '') +
      (up.length ? '<div class="inv-p-r"><span class="inv-k">Built on</span>' + up.map(chip).join('') + '</div>' : '') +
      (down.length ? '<div class="inv-p-r"><span class="inv-k">Led to</span>' + down.map(chip).join('') + '</div>' : '') +
      '<p class="inv-p-go">' + (anc ? '<button type="button" class="inv-road">' + (S.road ? 'Show what it led to as well' : 'Trace the road to it (' + anc + ' step' + (anc === 1 ? '' : 's') + ')') + '</button>' : '') +
      (S.phone && (up.length || down.length) ? '<button type="button" class="inv-only-b" aria-pressed="' + S.only + '">' + (S.only ? 'Show every invention' : 'Only its line') + '</button>' : '') +
      '<a href="/encyclopedia/' + esc(n.slug) + '">Read the entry &rarr;</a></p>';
    E.panel.hidden = false;
  }
  function select(i, opts) {
    opts = opts || {}; S.sel = i; if (!opts.keepRoad) S.road = !!opts.road; if (i < 0) S.only = false;
    if (i >= 0 && S.view !== 'tree') setView('tree');
    if (i >= 0 && !shown(N[i])) { delete S.hide[N[i].cat]; buildCats(); draw(); }
    panel(); light();
    if (i >= 0 && opts.go) {
      // on opening, again once the fonts are in: text rewrapping above the card (two hundred of them) moves it
      if (S.phone) { vScrollTo(i, opts.now); if (opts.now && document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (S.sel === i) vScrollTo(i, true); }); }
      else if (S.road) fitSet((function () { var a = ancestors(i); a[i] = 1; return a; })(), N[i]); else centreOn(N[i], Math.max(S.k, 0.85));
    }
    if (i >= 0) E.status.textContent = N[i].label + ', ' + N[i].date + (S.road ? ': the road to it is lit' + (S.phone ? '' : '; drag right to follow it back') : '');
    save();
  }

  // ── phones: the timeline, top to bottom ───────────────────────────────────────────────────────────────────────────
  function vcardHtml(n) {
    return '<button type="button" class="inv-vc inv-f-' + fam(n.cat) + '" data-i="' + n.i + '" id="inv-c-' + esc(n.slug) + '">' +
      '<span class="inv-vc-pic">' + (n.img ? '<img src="' + esc(n.img) + '" alt="" loading="lazy" decoding="async" width="56" height="56">' : ic(n.cat)) + '</span>' +
      '<span class="inv-vc-b"><span class="inv-vc-n">' + esc(n.label) + '</span><span class="inv-vc-d">' + esc(n.date) + (n.place ? ' · ' + esc(n.place) : '') + '</span>' + laneTag(n.cat) + '</span></button>';
  }
  function drawPhone() {
    var list = N.filter(shown).slice().sort(function (a, b) { return a.y - b.y || a.i - b.i; }), h = [], age = null, per = null;
    list.forEach(function (n) {
      var a = AGES.filter(function (x) { return n.y >= x[2] && n.y < x[3]; })[0] || AGES[AGES.length - 1];
      if (a !== age) { if (per !== null) h.push('</div>'); if (age) h.push('</section>'); age = a; per = null; h.push('<section class="inv-va" id="inv-age-' + a[0] + '"><h3 class="inv-vh">' + esc(a[1]) + '</h3>'); }
      var p = periodOf(n.y);
      if (p !== per) { if (per !== null) h.push('</div>'); per = p; h.push('<div class="inv-vg"><h4 class="inv-vp">' + esc(p) + '</h4>'); }
      h.push(vcardHtml(n));
    });
    if (per !== null) h.push('</div>'); if (age) h.push('</section>');
    E.vlist.innerHTML = h.join('') || '<p class="inv-none">Nothing to show: every lane is switched off.</p>';
    E.vcards = {}; $$('.inv-vc', E.vlist).forEach(function (c) { E.vcards[c.getAttribute('data-i')] = c; });
    E.vages.innerHTML = AGES.map(function (a) { return '<button type="button" data-vage="' + a[0] + '"' + ($('#inv-age-' + a[0]) ? '' : ' disabled') + '>' + esc(a[1]) + '</button>'; }).join('');
    E.vlanes.innerHTML = CATS.map(function (c) { return '<button type="button" class="inv-f-' + fam(c[0]) + '" data-cat="' + c[0] + '" aria-pressed="' + !S.hide[c[0]] + '" title="' + esc(c[1]) + '">' + ic(c[0]) + '<span>' + esc(c[1].split(' ')[0]) + '</span></button>'; }).join('');
    light();
  }
  // the card just below the sticky bar (which stands at the header's 64 px once the page has scrolled); at once when the
  // page opens on ?focus=, smoothly otherwise
  function vScrollTo(i, now) {
    var c = E.vcards && E.vcards[i]; if (!c) return;
    var top = c.getBoundingClientRect().top + scrollY - (64 + E.vbar.offsetHeight + 14);
    window.scrollTo({ top: Math.max(0, top), behavior: now || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });   // 'auto' would follow the site's CSS smooth scrolling
  }

  // ── views: by civilisation, list ──────────────────────────────────────────────────────────────────────────────────
  function tile(j) {
    var n = N[j];
    return '<button type="button" class="inv-tile inv-f-' + fam(n.cat) + '" data-go="' + n.i + '"><span class="inv-tile-pic">' + (n.img ? '<img src="' + esc(n.img) + '" alt="" loading="lazy" width="48" height="48">' : ic(n.cat)) + '</span><span class="inv-tile-b"><span class="inv-tile-n">' + esc(n.label) + '</span><span class="inv-tile-d">' + esc(n.date) + '</span></span></button>';
  }
  function civView() {
    var list = S.civ ? CIVS.filter(function (c) { return c.name === S.civ; }) : CIVS;
    E.civv.innerHTML = list.map(function (c) {
      var ns = c.n.filter(function (j) { return shown(N[j]); }).sort(function (a, b) { return N[a].y - N[b].y; });
      if (!ns.length) return '';
      return '<section class="inv-civ"><h3 class="inv-civ-h">' + (c.em ? '<img src="' + esc(c.em) + '" alt="" width="40" height="40" loading="lazy">' : '') + '<a href="' + esc(c.url) + '">' + esc(c.name) + '</a><span>' + ns.length + '</span></h3>' +
        '<div class="inv-civ-l">' + ns.map(tile).join('') + '</div></section>';
    }).join('') || '<p class="inv-none">Nothing to show: every lane is switched off.</p>';
  }
  function listView() {
    var rows = N.filter(function (n) { return shown(n) && (!S.civ || n.civ.some(function (c) { return c[0] === S.civ; })); }).slice().sort(function (a, b) { return a.y - b.y || a.i - b.i; });
    E.listv.innerHTML = '<table class="inv-table"><caption class="sr-only">Inventions and discoveries in order of their first known date</caption><thead><tr><th scope="col">First known</th><th scope="col">Invention or discovery</th><th scope="col">Lane</th><th scope="col">Where</th><th scope="col">Credited to</th></tr></thead><tbody>' +
      rows.map(function (n) { return '<tr><td>' + esc(n.date) + '</td><td><a href="/encyclopedia/' + esc(n.slug) + '">' + esc(n.label) + '</a></td><td>' + laneTag(n.cat) + '</td><td>' + esc(n.place) + '</td><td>' +
        n.ppl.map(function (p) { return esc(p[0]); }).concat(n.civ.map(function (c) { return '<a href="' + esc(c[1]) + '">' + esc(c[0]) + '</a>'; })).join(', ') + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  function setView(v) {
    S.view = v;
    $$('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view') === v)); });
    var tree = v === 'tree';
    // on phones the box stays (it holds the panel, a sheet there) and only its stage goes
    E.box.hidden = !tree; E.stage.hidden = S.phone; E.strip.hidden = !tree || S.phone; E.vwrap.hidden = !tree || !S.phone; E.civv.hidden = v !== 'civ'; E.listv.hidden = v !== 'list';
    E.zoom.hidden = !tree || S.phone;
    E.app.classList.toggle('inv-phone', S.phone);
    if (v === 'civ') civView(); if (v === 'list') listView();
    if (tree && LAY && !S.phone) { clamp(); apply(); }
    save();
  }

  // ── controls: lanes, civilisation, search ─────────────────────────────────────────────────────────────────────────
  function buildCats() {
    E.cats.innerHTML = CATS.map(function (c) { var n = N.filter(function (x) { return x.cat === c[0]; }).length; return '<label class="inv-f-' + fam(c[0]) + '"><input type="checkbox" data-cat="' + c[0] + '"' + (S.hide[c[0]] ? '' : ' checked') + '>' + ic(c[0]) + '<span>' + esc(c[1]) + '</span><span class="inv-lc">' + n + '</span></label>'; }).join('');
    var off = Object.keys(S.hide).length; E.catn.textContent = off ? (CATS.length - off) + ' of ' + CATS.length : 'all ' + CATS.length;
    if (E.vlanes) $$('[data-cat]', E.vlanes).forEach(function (b) { b.setAttribute('aria-pressed', String(!S.hide[b.getAttribute('data-cat')])); });
  }
  function toggleCat(c) {
    if (S.hide[c]) delete S.hide[c]; else S.hide[c] = 1;
    if (S.sel >= 0 && S.hide[N[S.sel].cat]) { S.sel = -1; S.only = false; panel(); }
    buildCats(); draw(); if (S.view !== 'tree') setView(S.view); save();
  }
  function buildCivs() {
    E.civ.innerHTML = '<option value="">Every civilisation</option>' + CIVS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { return '<option value="' + esc(c.name) + '"' + (c.name === S.civ ? ' selected' : '') + '>' + esc(c.name) + ' (' + c.n.length + ')</option>'; }).join('');
  }
  var sugg = [], sIx = -1;
  function suggest() {
    var q = fold(E.q.value.trim()); sIx = -1;
    if (q.length < 2) { E.sugg.hidden = true; return; }
    sugg = N.filter(function (n) { var a = fold(n.label), b = fold(n.name); return a.indexOf(q) >= 0 || b.indexOf(q) >= 0; })
      .sort(function (a, b) { var sa = fold(a.label).indexOf(q) === 0 || fold(a.name).indexOf(q) === 0 ? 0 : 1, sb = fold(b.label).indexOf(q) === 0 || fold(b.name).indexOf(q) === 0 ? 0 : 1; return sa - sb || a.y - b.y; }).slice(0, 8);
    E.sugg.innerHTML = sugg.length ? sugg.map(function (n, k) { return '<li role="option" id="inv-s' + k + '" data-i="' + n.i + '">' + esc(n.label) + ' <span>' + esc(n.date) + '</span></li>'; }).join('') : '<li class="none">No match</li>';
    E.sugg.hidden = false;
  }
  function pick(i) { E.sugg.hidden = true; E.q.value = N[i].label; select(i, { go: true, road: true }); }

  // ── the address ───────────────────────────────────────────────────────────────────────────────────────────────────
  function save() {
    var q = new URLSearchParams();
    if (S.sel >= 0) q.set('focus', N[S.sel].slug);
    if (S.view !== 'tree') q.set('view', S.view);
    if (S.civ) q.set('civ', S.civ);
    var off = Object.keys(S.hide); if (off.length && !(off.length === 1 && off[0] === 'weapons' && kids())) q.set('hide', off.join(','));
    var s = q.toString(); history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash);
  }

  // ── pointer, wheel and keys ───────────────────────────────────────────────────────────────────────────────────────
  function wire() {
    // touch: one finger drags the tree sideways through time (touch-action pan-y leaves vertical swipes to the page, so
    // a tree as tall as the phone's screen never traps it); two fingers zoom and move it in any direction
    var pts = {}, drag = null, pinch = null, touchHint = false;
    E.stage.addEventListener('pointerdown', function (e) {
      pts[e.pointerId] = { x: e.clientX, y: e.clientY }; S.moved = false;
      if (e.pointerType === 'touch' && !touchHint) { touchHint = true; hint('Drag sideways to move through time; two fingers zoom and move the tree', 2800); }
      var ids = Object.keys(pts);
      if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: S.k, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; }
      else { drag = { x: e.clientX, y: e.clientY, tx: S.tx, ty: S.ty }; pinch = null; }
      E.stage.setPointerCapture && E.stage.setPointerCapture(e.pointerId);
    });
    E.stage.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) { if (e.pointerType === 'mouse') hover(e); return; }
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts), r = E.stage.getBoundingClientRect();
      if (pinch && ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        S.tx += mx - pinch.mx; S.ty += my - pinch.my; pinch.mx = mx; pinch.my = my;   // the fingers' middle carries the tree
        if (d > 0) zoomAt(pinch.k * d / pinch.d / S.k, mx - r.left, my - r.top);
        clamp(); apply(); S.moved = true;
        return;
      }
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!S.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      S.moved = true; E.stage.classList.add('inv-dragging');
      S.tx = drag.tx + dx; S.ty = drag.ty + dy; clamp(); apply();
    });
    function up(e) {
      var was = !!pts[e.pointerId]; delete pts[e.pointerId];
      var ids = Object.keys(pts);
      if (ids.length === 1) { var p = pts[ids[0]]; drag = { x: p.x, y: p.y, tx: S.tx, ty: S.ty }; pinch = null; return; }   // a pinch ending as one finger: a fresh drag
      E.stage.classList.remove('inv-dragging'); drag = null; pinch = null;
      if (!was || S.moved || e.type === 'pointercancel') return;
      S.active = true;
      var c = document.elementFromPoint(e.clientX, e.clientY), card = c && c.closest && c.closest('.inv-card');
      if (card && E.world.contains(card)) { var i = +card.getAttribute('data-i'); select(S.sel === i ? -1 : i); }
      else if (S.sel >= 0) select(-1);
    }
    E.stage.addEventListener('pointerup', up); E.stage.addEventListener('pointercancel', up);
    E.stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { S.active = false; if (S.hov >= 0) { S.hov = -1; light(); } } });
    function hover(e) {
      var c = e.target.closest && e.target.closest('.inv-card'), i = c ? +c.getAttribute('data-i') : -1;
      if (i !== S.hov) { S.hov = i; light(); }
    }
    E.stage.addEventListener('wheel', function (e) {
      var r = E.stage.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top); return; }
      if (!S.active) { hint('Click the tree to scroll it, or hold Ctrl and scroll to zoom'); return; }
      e.preventDefault(); S.tx -= e.shiftKey ? e.deltaY : e.deltaX; S.ty -= e.shiftKey ? 0 : e.deltaY; clamp(); apply();
    }, { passive: false });
    E.stage.addEventListener('keydown', function (e) {
      var k = e.key, s = stageSize(), step = 80;
      if (k === 'ArrowLeft') S.tx += step; else if (k === 'ArrowRight') S.tx -= step; else if (k === 'ArrowUp') S.ty += step; else if (k === 'ArrowDown') S.ty -= step;
      else if (k === '+' || k === '=') { zoomAt(1.25, s.w / 2, s.h / 2); e.preventDefault(); return; }
      else if (k === '-' || k === '_') { zoomAt(0.8, s.w / 2, s.h / 2); e.preventDefault(); return; }
      else if (k === 'Escape') { select(-1); return; }
      else return;
      e.preventDefault(); clamp(); apply();
    });
    $('#inv-zin').addEventListener('click', function () { var s = stageSize(); zoomAt(1.25, s.w / 2, s.h / 2); });
    $('#inv-zout').addEventListener('click', function () { var s = stageSize(); zoomAt(0.8, s.w / 2, s.h / 2); });
    $('#inv-fit').addEventListener('click', function () { fitYears(BANDS[0], 2000); });
    // the era strip: an age fits on a click, the window drags the view, any other point brings it there
    var sd = null;
    E.strip.addEventListener('pointerdown', function (e) {
      if (!LAY) return;
      var age = e.target.closest('.inv-age'), r = E.strip.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      if (age) return;   // a click: below
      var fw = freeW(), lw = labW();
      if (!e.target.closest('.inv-strip-win')) { S.tx = lw + (fw - lw) / 2 - f * LAY.w * S.k; clamp(); apply(); }
      sd = { x: e.clientX, tx: S.tx, w: r.width }; E.strip.setPointerCapture && E.strip.setPointerCapture(e.pointerId); E.strip.classList.add('inv-dragging');
    });
    E.strip.addEventListener('pointermove', function (e) { if (!sd) return; S.tx = sd.tx - (e.clientX - sd.x) / sd.w * LAY.w * S.k; clamp(); apply(); });
    function sup() { sd = null; E.strip.classList.remove('inv-dragging'); }
    E.strip.addEventListener('pointerup', sup); E.strip.addEventListener('pointercancel', sup);
    E.strip.addEventListener('click', function (e) { var a = e.target.closest('.inv-age'); if (!a) return; var g = AGES.filter(function (x) { return x[0] === a.getAttribute('data-age'); })[0]; if (g) fitYears(g[2], g[3]); });
    E.panel.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]'); if (g) { select(+g.getAttribute('data-go'), { go: true }); return; }
      if (e.target.closest('.inv-x')) { select(-1); return; }
      if (e.target.closest('.inv-road')) { S.road = !S.road; select(S.sel, { go: true, keepRoad: true }); return; }
      if (e.target.closest('.inv-only-b')) { S.only = !S.only; panel(); light(); if (S.only) vScrollTo(S.sel); }
    });
    E.civv.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) select(+g.getAttribute('data-go'), { go: true }); });
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-view')); }); });
    E.cats.addEventListener('change', function (e) { var b = e.target.closest('[data-cat]'); if (b) toggleCat(b.getAttribute('data-cat')); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.inv-lanes-menu')) $$('.inv-lanes-menu[open]').forEach(function (d) { d.open = false; }); });
    // the lanes menu opens below its button, shifted left as far as it must to stay on the screen
    var lm = $('.inv-lanes-menu'); if (lm) lm.addEventListener('toggle', function () {
      if (!lm.open) return; E.cats.style.left = '0px';
      var r = E.cats.getBoundingClientRect(), over = r.right - (document.documentElement.clientWidth - 12);
      if (over > 0) E.cats.style.left = Math.round(-Math.min(over, r.left - 12)) + 'px';
    });
    E.civ.addEventListener('change', function () { S.civ = E.civ.value; light(); if (S.view !== 'tree') setView(S.view); save(); E.status.textContent = S.civ ? 'Lit: what is credited to ' + S.civ : ''; });
    E.q.addEventListener('input', suggest);
    E.q.addEventListener('keydown', function (e) {
      if (E.sugg.hidden) return;
      var li = $$('li[data-i]', E.sugg);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sIx = (sIx + (e.key === 'ArrowDown' ? 1 : -1) + li.length) % li.length; li.forEach(function (x, k) { x.classList.toggle('on', k === sIx); }); E.q.setAttribute('aria-activedescendant', 'inv-s' + sIx); }
      else if (e.key === 'Enter') { e.preventDefault(); var t = li[sIx >= 0 ? sIx : 0]; if (t) pick(+t.getAttribute('data-i')); }
      else if (e.key === 'Escape') E.sugg.hidden = true;
    });
    E.sugg.addEventListener('click', function (e) { var t = e.target.closest('li[data-i]'); if (t) pick(+t.getAttribute('data-i')); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.inv-search')) E.sugg.hidden = true; });
    // phones: a tap on a card opens its sheet (a second tap closes it); the bar's ages scroll, its lanes switch
    E.vlist.addEventListener('click', function (e) { var c = e.target.closest('.inv-vc'); if (!c) return; var i = +c.getAttribute('data-i'); select(S.sel === i ? -1 : i); });
    E.vages.addEventListener('click', function (e) {
      var b = e.target.closest('[data-vage]'), h = b && $('#inv-age-' + b.getAttribute('data-vage')); if (!h) return;
      window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - E.vbar.offsetHeight - 70, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    E.vlanes.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (b) toggleCat(b.getAttribute('data-cat')); });
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (LAY && !S.phone) { clamp(); apply(); } }, 120); });
    var onMq = function () { var p = MQ.matches; if (p === S.phone) return; S.phone = p; draw(); setView(S.view); if (!p && S.sel >= 0) centreOn(N[S.sel], Math.max(S.k, 0.85)); panel(); };
    if (MQ.addEventListener) MQ.addEventListener('change', onMq); else MQ.addListener(onMq);
    document.addEventListener('epoch:kids', function () { if (kids()) S.hide.weapons = 1; else delete S.hide.weapons; buildCats(); draw(); save(); });
  }
  var hintT;
  function hint(t, ms) { E.hint.textContent = t; E.hint.hidden = false; clearTimeout(hintT); hintT = setTimeout(function () { E.hint.hidden = true; }, ms || 1600); }

  // ── start ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function init() {
    E = { app: $('.inv-app'), zoom: $('.inv-zoom'), stage: $('#inv-stage'), world: $('#inv-world'), lanes: $('#inv-lanes'), axis: $('#inv-axis'), panel: $('#inv-panel'), box: $('#inv-box'), strip: $('#inv-strip'),
      vwrap: $('#inv-vwrap'), vbar: $('#inv-vbar'), vages: $('#inv-vages'), vlanes: $('#inv-vlanes'), vlist: $('#inv-vlist'),
      civv: $('#inv-civview'), listv: $('#inv-listview'), cats: $('#inv-cats'), catn: $('#inv-cat-n'), civ: $('#inv-civ'), q: $('#inv-q'), sugg: $('#inv-sugg'), status: $('#inv-status'), hint: $('#inv-hint') };
    if (!E.stage) return;
    S.phone = MQ.matches;
    load(function () {
      var q = new URLSearchParams(location.search);
      (q.get('hide') || '').split(',').forEach(function (c) { if (CATL[c]) S.hide[c] = 1; });
      if (!q.get('hide') && kids()) S.hide.weapons = 1;
      if (q.get('civ') && CIVS.some(function (c) { return c.name === q.get('civ'); })) S.civ = q.get('civ');
      buildCats(); buildCivs(); wire();
      var v = q.get('view'); S.view = v === 'civ' || v === 'list' ? v : 'tree';
      setView(S.view); draw();
      var f = BYSLUG[q.get('focus') || ''];
      if (f) select(f.i, { go: true, now: true });
      else if (!S.phone && LAY) { var s = stageSize(); S.k = Math.max(0.72, Math.min(1, s.h / LAY.h)); S.tx = labW(); S.ty = 0; clamp(); apply(); }   // every lane in view where the screen allows, never too small to read
      E.status.textContent = N.length + ' inventions and discoveries in ' + CATS.length + ' lanes';
      document.documentElement.classList.add('inv-ready');
    });
    window.epochInventions = { nodes: function () { return N; }, cats: function () { return CATS; }, civs: function () { return CIVS; }, state: S, layout: function () { return LAY; },
      ancestors: ancestors, descendants: descendants, select: function (slug, road) { var n = BYSLUG[slug]; if (n) select(n.i, { go: true, road: !!road }); return !!n; }, setView: setView, fitYears: fitYears,
      ages: AGES, families: FAMS, fam: fam, strip: function () { return E.win ? { left: parseFloat(E.win.style.left), width: parseFloat(E.win.style.width) } : null; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
