// battle-map.js - "How it was fought" on the battle profiles: the field as a schematic plan, the formations as blocks
// that move phase by phase. BattleMap.mount(el, data) draws data/battles/<slug>.json (written by
// scripts/tools/make-battle-maps.js from scripts/battles/<slug>.json) into el (section.battle-field, which already
// holds the phases as a list: that list is what is read without scripts, by screen readers and in print).
// The plane is 100 x 62 units (drawn 1000 x 620). A formation: {id, side, k kind, name, short, leader, pic, w, d}.
// A phase: {title, when, text, at {id: [x, y, facing]}, how {id: advance|retreat|feint|rout},
// state {id: hidden|shown|routed|destroyed|gone}, hits [[attacker, target, bend]]}. Facing: 0 = up the page, 90 = right.
// A phase names only what changes; a hidden formation that moves is shown from then on.
var BattleMap = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink', W = 1000, H = 620, U = 10, SEQ = 0;
  var KIND = { infantry: 'Foot', spears: 'Spearmen', pikes: 'Pikemen', cavalry: 'Horse', 'horse-archers': 'Horse archers', archers: 'Archers', light: 'Light troops',
    elephants: 'Elephants', chariots: 'Chariots', artillery: 'Guns', armour: 'Armour', ships: 'Ships', guard: 'Guard or reserve', camp: 'Camp', wagons: 'Baggage' };
  function el(n, a, kids) { var e = document.createElementNS(NS, n); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function tx(s) { return document.createTextNode(s); }
  function h(n, a, t) { var e = document.createElement(n); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  // a smooth line through points (Catmull-Rom as cubic Béziers); closed for areas
  function smooth(p, closed) {
    var n = p.length; if (n < 3) return 'M' + p.map(function (q) { return q[0] * U + ' ' + q[1] * U; }).join('L') + (closed ? 'Z' : '');
    var g = function (i) { return closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; }, d = 'M' + p[0][0] * U + ' ' + p[0][1] * U;
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2);
      d += 'C' + ((b[0] + (c[0] - a[0]) / 6) * U).toFixed(1) + ' ' + ((b[1] + (c[1] - a[1]) / 6) * U).toFixed(1) + ' ' + ((c[0] - (e[0] - b[0]) / 6) * U).toFixed(1) + ' ' + ((c[1] - (e[1] - b[1]) / 6) * U).toFixed(1) + ' ' + c[0] * U + ' ' + c[1] * U;
    }
    return d + (closed ? 'Z' : '');
  }
  function centre(p) { var x = 0, y = 0; p.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / p.length, y / p.length]; }
  // the pictures inside a block say what the formation is. Each is drawn in a 24 x 24 box about its centre:
  // f a filled shape, s a stroked line, c a line cut out of a filled shape (in the block's own colour), o a filled dot,
  // r a ring. A block holds one to four of them in a rank; each stands in a group that update() keeps upright.
  var IC = {
    infantry: [['f', 'M-7 -10H7V0C7 6 3 9 0 11C-3 9 -7 6 -7 0Z'], ['c', 'M0 -8V8M-5 -3H5']],
    light: [['o', -2, 2, 6], ['c', 'M-2 2h.01'], ['s', 'M-9 10L9 -9'], ['f', 'M11 -11L9.5 -5L5 -9.5Z']],
    spears: [['o', -4, 3, 5.5], ['s', 'M4 11V-6'], ['f', 'M4 -12L7 -5H1Z']],
    pikes: [['s', 'M-6 11V-6M0 11V-6M6 11V-6'], ['f', 'M-6 -12L-3.6 -5H-8.4ZM0 -12L2.4 -5H-2.4ZM6 -12L8.4 -5H3.6Z']],
    archers: [['s', 'M-5 -10C6 -6 6 6 -5 10'], ['t', 'M-5 -10V10'], ['s', 'M-9 0H7'], ['f', 'M11 0L6 -3V3Z']],
    cavalry: [['f', 'M-8 11H9V7C9 0 6 -6 0 -9L-1 -12L-4 -9C-7 -7 -10 -3 -11 0L-9 3L-5 1C-5 4 -7 6 -8 8Z'], ['c', 'M-5 -4h.01']],
    'horse-archers': [['f', 'M-11 11H3V8C3 2 1 -3 -4 -6L-5 -8L-7 -6C-9 -4 -11 -1 -12 1L-10 3L-7 2C-7 4 -9 6 -10 8Z'], ['s', 'M6 -10C12 -7 12 1 6 4'], ['t', 'M6 -10V4'], ['s', 'M2 -3H10']],
    elephants: [['f', 'M-11 4V-3C-11 -7 -8 -9 -4 -9H4C9 -9 12 -6 12 -2V6C12 8 9.5 8 9.5 6V1C9.5 0 8.5 -1 7 -1H6V10H2V4H-5V10H-9V4Z'], ['c', 'M7 -5h.01']],
    chariots: [['r', 0, 0, 8], ['s', 'M-8 0H8M0 -8V8M-5.7 -5.7L5.7 5.7M-5.7 5.7L5.7 -5.7'], ['o', 0, 0, 2.2]],
    artillery: [['f', 'M-10 0L8 -9L10 -5L-8 4Z'], ['r', -3, 5, 5.5], ['o', -3, 5, 1.6]],
    armour: [['f', 'M-11 2H11L8.5 9H-8.5Z'], ['f', 'M-5 2V-3C-5 -4 -4 -5 -3 -5H3C4 -5 5 -4 5 -3V2Z'], ['s', 'M5 -2H12']],
    ships: [['f', 'M-10 4H10L7 10H-7Z'], ['s', 'M0 4V-11'], ['f', 'M1.5 -10L9 2H1.5ZM-1.5 -7L-7 2H-1.5Z']],
    guard: [['s', 'M-6 11V-11'], ['f', 'M-6 -10H9L5 -5L9 0H-6Z']],
    wagons: [['f', 'M-10 -6H10V3H-10Z'], ['r', -5, 6, 3.5], ['r', 5, 6, 3.5]],
    rifles: [['f', 'M-11 11L-4 8L-7 4Z'], ['s', 'M-7 7L6 -6'], ['t', 'M6 -6L11 -11']]   // foot from 1500 on: a musket and its bayonet
  };
  function mark(k, w, d) {
    var P = IC[k]; if (!P) return [];
    var s = Math.min(w, d) * 0.92, n = Math.max(1, Math.min(4, Math.floor(w / (s * 1.35)))), out = [];
    for (var i = 0; i < n; i++) {
      var kids = P.map(function (p) {
        if (p[0] === 'o') return el('circle', { cx: p[1], cy: p[2], r: p[3], 'class': 'bf-mk-f' });
        if (p[0] === 'r') return el('circle', { cx: p[1], cy: p[2], r: p[3], 'class': 'bf-mk', fill: 'none' });
        return el('path', { d: p[1], 'class': p[0] === 'f' ? 'bf-mk-f' : p[0] === 'c' ? 'bf-ic-c' : p[0] === 't' ? 'bf-mk bf-ic-t' : 'bf-mk', fill: p[0] === 'f' ? null : 'none' });
      });
      out.push(el('g', { 'class': 'bf-ic', transform: 'translate(' + ((i - (n - 1) / 2) * (w / n)).toFixed(1) + ' 0) scale(' + (s / 24).toFixed(3) + ')' }, [el('g', { 'class': 'bf-ic-r' }, kids)]));
    }
    return out;
  }
  function shape(u) {
    var w = u.w * U, d = u.d * U;
    if (u.k === 'ships') return el('path', { d: 'M' + (-w / 2) + ' ' + (d / 2) + 'L' + (-w / 2) + ' ' + (-d * 0.1) + 'L0 ' + (-d / 2 - d * 0.35) + 'L' + (w / 2) + ' ' + (-d * 0.1) + 'L' + (w / 2) + ' ' + (d / 2) + 'Z', 'class': 'bf-blk' });
    if (u.k === 'camp') return el('path', { d: 'M' + (-w / 2) + ' ' + (d / 2) + 'L0 ' + (-d / 2) + 'L' + (w / 2) + ' ' + (d / 2) + 'ZM0 ' + (-d / 2) + 'V' + (d / 2), 'class': 'bf-blk bf-camp' });
    return el('rect', { x: -w / 2, y: -d / 2, width: w, height: d, rx: 3, 'class': 'bf-blk' });
  }
  function terrain(t, pid) {
    var g = el('g', { 'class': 'bf-t bf-t-' + t.k }), c, x, y;
    if (t.k === 'river' || t.k === 'stream' || t.k === 'road' || t.k === 'wall' || t.k === 'ditch') {
      g.appendChild(el('path', { d: smooth(t.at, false), fill: 'none' })); c = t.lab || t.at[Math.floor(t.at.length / 2)];
    } else if (typeof t.at[0] === 'number') {   // a place: town, village, fort, spring, bridge, ford, point
      x = t.at[0] * U; y = t.at[1] * U;
      if (t.k === 'spring') g.appendChild(el('circle', { cx: x, cy: y, r: 7 }));
      else if (t.k === 'fort') g.appendChild(el('path', { d: 'M' + (x - 11) + ' ' + (y + 9) + 'V' + (y - 9) + 'h6v5h5v-5h5v5h6V' + (y + 9) + 'Z' }));
      else if (t.k === 'bridge' || t.k === 'ford') g.appendChild(el('path', { d: 'M' + (x - 12) + ' ' + (y - 5) + 'h24M' + (x - 12) + ' ' + (y + 5) + 'h24', fill: 'none' }));
      else if (t.k === 'town' || t.k === 'village') { for (var i = 0, n = t.k === 'town' ? 6 : 3; i < n; i++) g.appendChild(el('rect', { x: x - 14 + (i % 3) * 10, y: y - 9 + Math.floor(i / 3) * 10, width: 7, height: 7 })); }
      else g.appendChild(el('circle', { cx: x, cy: y, r: 3 }));
      c = t.lab || [t.at[0], t.at[1] + 2.9];
    } else {   // an area: hill, ridge, mountain, wood, marsh, sea, lake, land
      g.appendChild(el('path', { d: smooth(t.at, true) }));
      if (t.k === 'wood' || t.k === 'marsh') g.appendChild(el('path', { d: smooth(t.at, true), 'class': 'bf-t-tex', style: 'fill:url(#' + pid + '-' + t.k + ')' }));
      if (t.k === 'hill' || t.k === 'ridge' || t.k === 'mountain') {
        var m = centre(t.at); [0.72, 0.44].forEach(function (s) { g.appendChild(el('path', { d: smooth(t.at.map(function (q) { return [m[0] + (q[0] - m[0]) * s, m[1] + (q[1] - m[1]) * s]; }), true), 'class': 'bf-t-in' })); });
      }
      c = t.lab || centre(t.at);
    }
    if (t.name) g.appendChild(el('text', { x: c[0] * U, y: c[1] * U, 'class': 'bf-tl', 'text-anchor': 'middle' }, [tx(t.name)]));
    return g;
  }

  function mount(root, data) {
    if (root._bf) return root._bf;
    var pid = 'bf' + (++SEQ), units = data.units, U_BY = {}, side = {}, P = data.phases, N = P.length, cur = 0, raf = 0, timer = 0, playing = false, small = false, F = 15, LAY = [];
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    data.sides.forEach(function (s, i) { side[s.id] = i; });
    units.forEach(function (u) { u.w = u.w || (u.k === 'ships' ? 5 : u.k === 'camp' ? 6 : 10); u.d = u.d || (u.k === 'ships' ? 2.4 : u.k === 'camp' ? 5 : 3); U_BY[u.id] = u; });
    // every formation's place, facing and state in every phase
    var S = [], last = {};
    P.forEach(function (p) {
      var st = {}; units.forEach(function (u) {
        var prev = last[u.id], a = (p.at || {})[u.id], s = (p.state || {})[u.id];
        if (!prev && !a) return;
        st[u.id] = { x: a ? a[0] : prev.x, y: a ? a[1] : prev.y, f: a && a[2] != null ? a[2] : prev ? prev.f : 0, s: s || (prev ? (prev.s === 'hidden' && a ? 'shown' : prev.s === 'destroyed' ? 'gone' : prev.s) : 'shown'), how: (p.how || {})[u.id] || '' };
      });
      S.push(st); last = st;
    });

    var fig = h('div', { 'class': 'bf-fig' }), svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'bf-svg', role: 'img', 'aria-label': 'Plan of the ' + data.name + ', phase by phase. Each phase is told in the words under the plan.' });
    var defs = el('defs', {});
    for (var ai = 0; ai < 4; ai++) defs.appendChild(el('marker', { id: pid + '-ah' + ai, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, [el('path', { d: 'M0 0L10 5L0 10z', 'class': 'bf-ah bf-s' + ai })]));
    defs.appendChild(el('pattern', { id: pid + '-wood', width: 26, height: 22, patternUnits: 'userSpaceOnUse' }, [el('circle', { cx: 7, cy: 7, r: 4.2, 'class': 'bf-tree' }), el('circle', { cx: 20, cy: 17, r: 3.6, 'class': 'bf-tree' })]));
    defs.appendChild(el('pattern', { id: pid + '-marsh', width: 30, height: 18, patternUnits: 'userSpaceOnUse' }, [el('path', { d: 'M3 6h10M17 14h10', 'class': 'bf-reed' })]));
    svg.appendChild(defs);
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'bf-ground' + (data.field && data.field.ground === 'sea' ? ' bf-sea' : '') }));
    var gT = el('g', {}), gTrail = el('g', {}), gU = el('g', {}), gA = el('g', {}), gL = el('g', {});
    (data.terrain || []).forEach(function (t) { gT.appendChild(terrain(t, pid)); });
    if (data.field && data.field.north != null) gT.appendChild(el('g', { 'class': 'bf-n', transform: 'translate(' + (W - 44) + ' 50) rotate(' + data.field.north + ')' }, [el('path', { d: 'M0 18V-14M-6 -6L0 -16L6 -6', fill: 'none' }), el('text', { x: 0, y: -22, 'text-anchor': 'middle' }, [tx('N')])]));
    (data.field && data.field.edges || []).forEach(function (e) {   // "to Baysan": a place off the plan
      gT.appendChild(el('text', { x: e.at[0] * U, y: e.at[1] * U, 'class': 'bf-edge', 'text-anchor': e.at[0] > 80 ? 'end' : e.at[0] < 20 ? 'start' : 'middle' }, [tx(e.name)]));
    });
    var node = {};
    units.forEach(function (u, i) {
      var inner = el('g', {}, [shape(u)].concat(mark(data.gun && (u.k === 'infantry' || u.k === 'light') ? 'rifles' : u.k, u.w * U, u.d * U), [el('path', { d: 'M-9 -9L9 9M9 -9L-9 9', 'class': 'bf-x' })]));
      var g = el('g', { 'class': 'bf-u bf-s' + side[u.side] + ' bf-k-' + u.k }, [inner, el('title', {}, [tx(u.name + (u.leader ? ' (' + u.leader + ')' : ''))])]);
      var lab = el('text', { 'class': 'bf-ul' }), lead = u.leader ? el('text', { 'class': 'bf-ul bf-ld' }, [tx(u.leader)]) : null, pic = null, ring = null;
      if (u.pic) {
        defs.appendChild(el('clipPath', { id: pid + '-cp' + i }, [el('circle', { cx: 0, cy: 0, r: 1 })]));
        pic = el('image', { 'class': 'bf-pic', preserveAspectRatio: 'xMidYMin slice', 'clip-path': 'url(#' + pid + '-cp' + i + ')' }); pic.setAttribute('href', u.pic); pic.setAttributeNS(XL, 'xlink:href', u.pic);
        ring = el('circle', { 'class': 'bf-ring', fill: 'none' });
      }
      var tie = el('line', { 'class': 'bf-tie' });
      var lg = el('g', { 'class': 'bf-lg bf-s' + side[u.side] }, [tie].concat(pic ? [pic, ring] : [], [lab], lead ? [lead] : []));
      gU.appendChild(g); gL.appendChild(lg);
      node[u.id] = { g: g, inner: inner, ics: inner.querySelectorAll('.bf-ic-r'), lg: lg, lab: lab, lead: lead, pic: pic, ring: ring, tie: tie, clip: pic ? defs.lastChild.firstChild : null, x: 0, y: 0, f: 0, o: 0, lx: 0, ly: 0, bw: 60, bh: 16, tw: 60 };
    });
    [gT, gTrail, gU, gA, gL].forEach(function (g) { svg.appendChild(g); }); fig.appendChild(svg);

    // controls and the phase's words
    var bar = h('div', { 'class': 'bf-bar' }), bBack = h('button', { type: 'button', 'class': 'bf-btn', 'aria-label': 'The phase before' }, '‹ Back'),
      bPlay = h('button', { type: 'button', 'class': 'bf-btn bf-play' }, 'Play'), bNext = h('button', { type: 'button', 'class': 'bf-btn', 'aria-label': 'The next phase' }, 'Next ›'), dots = h('div', { 'class': 'bf-dots', role: 'group', 'aria-label': 'Phases' });
    var dot = P.map(function (p, i) { var b = h('button', { type: 'button', 'class': 'bf-dot', 'aria-label': 'Phase ' + (i + 1) + ': ' + p.title }, String(i + 1)); b.onclick = function () { stop(); go(i, true); }; dots.appendChild(b); return b; });
    [bBack, bPlay, bNext, dots].forEach(function (b) { bar.appendChild(b); });
    var cap = h('div', { 'class': 'bf-cap', 'aria-live': 'polite' }), capK = h('p', { 'class': 'bf-cap-k' }), capT = h('h3', { 'class': 'bf-cap-t' }), capX = h('p', { 'class': 'bf-cap-x' });
    [capK, capT, capX].forEach(function (b) { cap.appendChild(b); });
    var key = h('ul', { 'class': 'bf-key' }), kinds = [];
    data.sides.forEach(function (s, i) { var li = h('li', { 'class': 'bf-key-s' }); li.appendChild(h('i', { 'class': 'bf-sw bf-s' + i })); li.appendChild(tx(s.name)); key.appendChild(li); });
    units.forEach(function (u) { if (kinds.indexOf(u.k) < 0 && KIND[u.k]) kinds.push(u.k); });
    kinds.forEach(function (k) {
      var ship = k === 'ships', li = h('li', {});
      li.appendChild(el('svg', { viewBox: '-24 -16 48 30', 'class': 'bf-key-g bf-s9', 'aria-hidden': 'true' }, [el('g', {}, [shape({ k: k, w: ship ? 3.2 : 3.6, d: ship ? 1.4 : 1.8 })].concat(mark(data.gun && (k === 'infantry' || k === 'light') ? 'rifles' : k, ship ? 32 : 36, ship ? 14 : 18)))]));
      li.appendChild(tx(KIND[k])); key.appendChild(li);
    });
    if (S.some(function (st) { for (var id in st) if (st[id].s === 'hidden') return true; })) { var lh = h('li', {}); lh.appendChild(h('i', { 'class': 'bf-sw bf-sw-hid' })); lh.appendChild(tx('Hidden')); key.appendChild(lh); }
    var note = h('p', { 'class': 'bf-note' }, 'A schematic drawn from the written accounts: places and distances are not to scale.' + (data.note ? ' ' + data.note : ''));
    var list = root.querySelector('.bf-phases'), box = h('div', { 'class': 'bf-box' }); [fig, bar, cap, key, note].forEach(function (b) { box.appendChild(b); });
    root.insertBefore(box, list || null); root.classList.add('bf-on');

    // ---- names: behind each formation, then moved clear of one another and of the blocks
    function half(u, f) { var r = (u.k === 'camp' ? 0 : f) * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [(c * u.w + s * u.d) * U / 2, (s * u.w + c * u.d) * U / 2]; }
    function layout(i) {
      var L = {}, boxes = [], fixed = [];
      units.forEach(function (u) {
        var s = S[i][u.id]; if (!s || s.s === 'gone') return; var n = node[u.id], hf = half(u, s.f), r = s.f * Math.PI / 180, back = u.lab === 'front' ? -1 : 1;
        var dx = -Math.sin(r) * back, dy = Math.cos(r) * back, cx = s.x * U, cy = s.y * U;
        if (Math.abs(dy) >= Math.abs(dx)) cy += (dy > 0 ? 1 : -1) * (hf[1] + 5 + n.bh / 2); else cx += (dx > 0 ? 1 : -1) * (hf[0] + 8 + n.bw / 2);
        boxes.push({ id: u.id, x: cx, y: cy, w: n.bw + 8, h: n.bh + 4 }); fixed.push({ id: u.id, x: s.x * U, y: s.y * U, w: hf[0] * 2 + 6, h: hf[1] * 2 + 6 });
      });
      for (var it = 0; it < 40; it++) {
        var moved = false;
        boxes.forEach(function (a, ia) {
          boxes.forEach(function (b, ib) {
            if (ib <= ia) return; var ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y); if (ox <= 0 || oy <= 0) return; moved = true;
            if (oy <= ox) { var sy = a.y <= b.y ? -1 : 1; a.y += sy * (oy / 2 + 0.5); b.y -= sy * (oy / 2 + 0.5); } else { var sx = a.x <= b.x ? -1 : 1; a.x += sx * (ox / 2 + 0.5); b.x -= sx * (ox / 2 + 0.5); }
          });
          fixed.forEach(function (b) {
            var ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y); if (ox <= 0 || oy <= 0) return; moved = true;
            if (oy <= ox) a.y += (a.y <= b.y ? -1 : 1) * (oy + 0.5); else a.x += (a.x <= b.x ? -1 : 1) * (ox + 0.5);
          });
          a.x = Math.max(a.w / 2 + 2, Math.min(W - a.w / 2 - 2, a.x)); a.y = Math.max(a.h / 2 + 2, Math.min(H - a.h / 2 - 2, a.y));
        });
        if (!moved) break;
      }
      boxes.forEach(function (b) { L[b.id] = [b.x, b.y]; }); return L;
    }
    function lay(i) { return LAY[i] || (LAY[i] = layout(i)); }
    function place(id, v) {
      var n = node[id]; n.x = v.x; n.y = v.y; n.f = v.f; n.o = v.o; n.lx = v.lx; n.ly = v.ly;
      n.g.setAttribute('transform', 'translate(' + (v.x * U).toFixed(1) + ' ' + (v.y * U).toFixed(1) + ')'); n.inner.setAttribute('transform', 'rotate(' + (U_BY[id].k === 'camp' ? 0 : v.f).toFixed(1) + ')'); for (var q = 0; q < n.ics.length; q++) n.ics[q].setAttribute('transform', 'rotate(' + (-v.f).toFixed(1) + ')');   // the pictures stay upright   // a camp is a sign, not a line: it never turns
      n.g.style.opacity = v.o; n.lg.style.opacity = v.o < 0.2 ? 0 : Math.min(1, v.o * 1.8);
      var two = n.lead && !small, pr = n.pic && !small ? F * 1.25 : 0, x0 = v.lx - n.bw / 2, tx0 = pr ? x0 + pr * 2 + 6 : v.lx, y1 = v.ly + (two ? -F * 0.16 : F * 0.34);
      n.lab.setAttribute('x', tx0.toFixed(1)); n.lab.setAttribute('y', y1.toFixed(1)); n.lab.setAttribute('text-anchor', pr ? 'start' : 'middle');
      if (n.lead) { n.lead.setAttribute('x', tx0.toFixed(1)); n.lead.setAttribute('y', (y1 + F * 1.04).toFixed(1)); n.lead.setAttribute('text-anchor', pr ? 'start' : 'middle'); }
      var hf = half(U_BY[id], v.f), gx = Math.max(0, Math.abs(v.lx - v.x * U) - hf[0] - n.bw / 2), gy = Math.max(0, Math.abs(v.ly - v.y * U) - hf[1] - n.bh / 2);
      if (Math.hypot(gx, gy) > F * 1.1) { var ex = v.lx + Math.max(-n.bw / 2, Math.min(n.bw / 2, v.x * U - v.lx)), ey = v.ly + Math.max(-n.bh / 2, Math.min(n.bh / 2, v.y * U - v.ly)); n.tie.setAttribute('x1', ex.toFixed(1)); n.tie.setAttribute('y1', ey.toFixed(1)); n.tie.setAttribute('x2', (v.x * U).toFixed(1)); n.tie.setAttribute('y2', (v.y * U).toFixed(1)); n.tie.style.display = ''; } else n.tie.style.display = 'none';
      if (n.pic) { var cx = x0 + pr, t = 'translate(' + cx.toFixed(1) + ' ' + v.ly.toFixed(1) + ')'; n.pic.setAttribute('x', cx - pr); n.pic.setAttribute('y', v.ly - pr); n.clip.setAttribute('transform', t + ' scale(' + pr + ')'); n.ring.setAttribute('cx', cx); n.ring.setAttribute('cy', v.ly); }
    }
    function target(i, id) { var s = S[i][id]; if (!s) return null; var l = lay(i)[id] || [s.x * U, s.y * U]; return { x: s.x, y: s.y, f: s.f, o: s.s === 'gone' ? 0 : s.s === 'routed' ? 0.85 : s.s === 'destroyed' ? 0.8 : 1, lx: l[0], ly: l[1] }; }
    function classes(i) {
      units.forEach(function (u) { var s = S[i][u.id], n = node[u.id]; n.g.classList.toggle('is-hidden', !!s && s.s === 'hidden'); n.lg.classList.toggle('is-hidden', !!s && s.s === 'hidden'); n.g.classList.toggle('is-routed', !!s && (s.s === 'routed' || s.s === 'gone')); n.g.classList.toggle('is-destroyed', !!s && s.s === 'destroyed'); n.lg.classList.toggle('is-destroyed', !!s && s.s === 'destroyed'); n.g.style.display = n.lg.style.display = s ? '' : 'none'; });
    }
    function rim(id, tx_, ty_, i) { var s = S[i][id], u = U_BY[id], dx = tx_ - s.x, dy = ty_ - s.y, L = Math.hypot(dx, dy) || 1, r = Math.min(u.w, u.d * 2.2) / 2 + 0.6; return [s.x + dx / L * r, s.y + dy / L * r]; }
    function arrow(a, b, cls, si, bend) {
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], k = bend == null ? 0.16 : bend;
      return el('path', { d: 'M' + (a[0] * U).toFixed(1) + ' ' + (a[1] * U).toFixed(1) + 'Q' + ((mx - dy * k) * U).toFixed(1) + ' ' + ((my + dx * k) * U).toFixed(1) + ' ' + (b[0] * U).toFixed(1) + ' ' + (b[1] * U).toFixed(1), 'class': 'bf-ar ' + cls + ' bf-s' + si, fill: 'none', 'marker-end': 'url(#' + pid + '-ah' + si + ')' });
    }
    function arrows(i, animate) {
      while (gA.firstChild) gA.removeChild(gA.firstChild); while (gTrail.firstChild) gTrail.removeChild(gTrail.firstChild);
      if (i === 0) return; var solid = [];
      units.forEach(function (u) {   // where a formation came from
        var a = S[i - 1][u.id], b = S[i][u.id]; if (!a || !b || b.s === 'gone') return; var L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 7) return;
        var how = b.how || 'advance', back = how === 'retreat' || how === 'rout' || how === 'feint', r = Math.min(u.w, u.d * 2.2) / 2 + 1.2;
        var T = Math.min(L, 20), sx = b.x - (b.x - a.x) / L * T, sy = b.y - (b.y - a.y) / L * T;
        var p = arrow([sx, sy], [b.x - (b.x - a.x) / L * r, b.y - (b.y - a.y) / L * r], back ? (how === 'feint' ? 'bf-ar-feint' : 'bf-ar-back') : 'bf-ar-move', side[u.side], 0.07); gTrail.appendChild(p); if (!back) solid.push(p);
      });
      (P[i].hits || []).forEach(function (hh) {
        var a = S[i][hh[0]], b = S[i][hh[1]]; if (!a || !b) return; if (Math.hypot(b.x - a.x, b.y - a.y) < 3) return;
        var ra = rim(hh[0], b.x, b.y, i), rb = rim(hh[1], a.x, a.y, i);
        if (Math.hypot(rb[0] - ra[0], rb[1] - ra[1]) < 2.6 || (rb[0] - ra[0]) * (b.x - a.x) + (rb[1] - ra[1]) * (b.y - a.y) < 0) {   // the two are in contact: a spark where they meet
          var cx = (ra[0] + rb[0]) / 2 * U, cy = (ra[1] + rb[1]) / 2 * U, sp = ''; for (var q = 0; q < 8; q++) { var r = q % 2 ? 4 : 11, an = q * Math.PI / 4; sp += (q ? 'L' : 'M') + (cx + Math.cos(an) * r).toFixed(1) + ' ' + (cy + Math.sin(an) * r).toFixed(1); }
          gA.appendChild(el('path', { d: sp + 'Z', 'class': 'bf-clash bf-s' + side[U_BY[hh[0]].side] })); return;
        }
        var p = arrow(ra, rb, 'bf-ar-hit', side[U_BY[hh[0]].side], hh[2]); gA.appendChild(p); solid.push(p);
      });
      if (!animate || still) return;
      solid.forEach(function (p) {   // an arrow draws itself out once the blocks are nearly in place
        var len = p.getTotalLength ? p.getTotalLength() : 200; p.style.strokeDasharray = len + ' ' + len; p.style.strokeDashoffset = len; p.style.markerEnd = 'none'; p.getBoundingClientRect();
        p.style.transition = 'stroke-dashoffset .8s ease .75s'; p.style.strokeDashoffset = '0';
        setTimeout(function () { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; p.style.markerEnd = ''; }, 1600);
      });
    }
    function words(i) {
      capK.textContent = 'Phase ' + (i + 1) + ' of ' + N + (P[i].when ? ' · ' + P[i].when : ''); capT.textContent = P[i].title; capX.textContent = P[i].text;
      dot.forEach(function (b, j) { b.classList.toggle('is-on', j === i); b.classList.toggle('is-done', j < i); if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      bBack.disabled = i === 0; bNext.disabled = i === N - 1; bPlay.textContent = playing ? 'Pause' : i === N - 1 ? 'Replay' : 'Play';
    }
    function go(i, animate, done) {
      cancelAnimationFrame(raf); var from = {}, to = {}, t0 = null, D = 1500;
      units.forEach(function (u) { var n = node[u.id], t = target(i, u.id); if (!t) return; from[u.id] = S[cur][u.id] && animate ? { x: n.x, y: n.y, f: n.f, o: n.o, lx: n.lx, ly: n.ly } : { x: t.x, y: t.y, f: t.f, o: animate ? 0 : t.o, lx: t.lx, ly: t.ly }; to[u.id] = t; });
      cur = i; classes(i); words(i); arrows(i, animate);
      if (!animate || still) { for (var id in to) place(id, to[id]); if (done) done(); return; }
      function step(ts) {
        if (t0 == null) t0 = ts; var k = Math.min(1, (ts - t0) / D), e = ease(k);
        for (var id in to) { var a = from[id], b = to[id], df = ((b.f - a.f + 540) % 360) - 180; place(id, { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, f: a.f + df * e, o: a.o + (b.o - a.o) * e, lx: a.lx + (b.lx - a.lx) * e, ly: a.ly + (b.ly - a.ly) * e }); }
        if (k < 1) raf = requestAnimationFrame(step); else if (done) done();
      }
      raf = requestAnimationFrame(step);
    }
    function stop() { playing = false; clearTimeout(timer); words(cur); }
    function play() {
      if (cur === N - 1) go(0, false);
      playing = true; words(cur); var first = true;
      (function next() { timer = setTimeout(function () { if (!playing) return; go(cur + 1, true, function () { if (cur >= N - 1) stop(); else next(); }); }, first ? 700 : Math.max(3400, P[cur].text.length * 45)); first = false; })();
    }
    bBack.onclick = function () { stop(); if (cur > 0) go(cur - 1, true); };
    bNext.onclick = function () { stop(); if (cur < N - 1) go(cur + 1, true); };
    bPlay.onclick = function () { if (playing) stop(); else play(); };
    box.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { bNext.click(); e.preventDefault(); } else if (e.key === 'ArrowLeft') { bBack.click(); e.preventDefault(); } });
    function sizes() {   // names sized for the width on screen; the short name, no portrait and no leader's line where the plan is small
      var w = svg.getBoundingClientRect().width || 760; small = w < 560; F = Math.max(15, Math.min(30, (small ? 10.5 : 11.5) * W / w)); svg.style.setProperty('--bf-fs', F + 'px');
      units.forEach(function (u) {
        var n = node[u.id]; n.lab.textContent = small && u.short ? u.short : u.name; if (n.lead) n.lead.style.display = small ? 'none' : ''; if (n.pic) { n.pic.style.display = n.ring.style.display = small ? 'none' : ''; n.pic.setAttribute('width', F * 2.5); n.pic.setAttribute('height', F * 2.5); n.ring.setAttribute('r', F * 1.25); }
        var tw = n.lab.getComputedTextLength ? n.lab.getComputedTextLength() : 0, lw = n.lead && !small && n.lead.getComputedTextLength ? n.lead.getComputedTextLength() : 0, pr = n.pic && !small ? F * 1.25 : 0;
        n.tw = Math.max(tw, lw) || u.name.length * F * 0.5; n.bw = n.tw + (pr ? pr * 2 + 6 : 0); n.bh = Math.max(pr * 2, (n.lead && !small ? 2.15 : 1.1) * F);
      });
      LAY = []; for (var id in node) { var t = target(cur, id); if (t) place(id, t); }
      Array.prototype.forEach.call(gT.querySelectorAll('text'), function (tx_) {   // a ground's name stays inside the plan
        if (tx_.getAttribute('data-x') == null) tx_.setAttribute('data-x', tx_.getAttribute('x')); tx_.setAttribute('x', tx_.getAttribute('data-x'));
        if (!tx_.getBBox || (tx_.parentNode.getAttribute('class') || '').indexOf('bf-n') >= 0) return; var bb = tx_.getBBox(), x0 = +tx_.getAttribute('x');
        if (bb.x < 6) tx_.setAttribute('x', (x0 + 6 - bb.x).toFixed(1)); else if (bb.x + bb.width > W - 6) tx_.setAttribute('x', (x0 - (bb.x + bb.width - W + 6)).toFixed(1));
      });
    }
    go(0, false); sizes();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(sizes, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizes);
    root._bf = { go: function (i) { stop(); go(i, false); }, play: play, stop: stop, phase: function () { return cur; }, phases: N, state: S, node: node, layout: lay };
    return root._bf;
  }
  return { mount: mount, KIND: KIND };
})();
