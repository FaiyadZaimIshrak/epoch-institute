// battle-map.js - "How it was fought" on the battle profiles: the field as a topographic plan, the formations as ranks
// of marks that march, shoot and break, played as one film with a time bar. BattleMap.mount(el, data) draws
// data/battles/<slug>.json (written by scripts/tools/make-battle-maps.js from scripts/battles/<slug>.json) into el
// (section.battle-field, which already holds the phases as a list: that list is what is read without scripts, by
// screen readers and in print).
// The plane is 100 x 62 units (drawn 1000 x 620). A formation: {id, side, k kind, name, short, leader, pic, w, d}.
// A phase: {title, when, text, at {id: [x, y, facing]}, how {id: advance|retreat|feint|rout},
// state {id: hidden|shown|routed|destroyed|gone}, hits [[attacker, target, bend]]}. Facing: 0 = up the page, 90 = right.
// A phase names only what changes; a hidden formation that moves is shown from then on.
// Drawing (24 Nov 2026, the user's choices): the ground by map conventions (contours, the usual symbols, a legend
// that lists only what the field uses); a formation as ranks of small marks with no box, its kind shown by a framed
// symbol in the manner of military maps beside its name; the film: every frame is a function of the time t alone
// (render), so Play, Pause, the time bar and the numbered steps are one mechanism. Nothing here adds a fact: places,
// order and words are the plan's.
var BattleMap = (function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', XL = 'http://www.w3.org/1999/xlink', W = 1000, H = 620, U = 10, SEQ = 0;
  var KIND = { infantry: 'Infantry', spears: 'Spearmen', pikes: 'Pikemen', cavalry: 'Cavalry', 'horse-archers': 'Horse archers', archers: 'Archers', light: 'Light infantry',
    elephants: 'Elephants', chariots: 'Chariots', artillery: 'Artillery', armour: 'Armour', ships: 'Ships', guard: 'Guard or reserve', camp: 'Camp', wagons: 'Baggage' };
  var GROUND = { hill: 'High ground (contours)', ridge: 'High ground (contours)', mountain: 'High ground (contours)', wood: 'Woodland', marsh: 'Marsh', river: 'River', stream: 'Stream', sea: 'Sea', lake: 'Lake',
    road: 'Road', wall: 'Wall', ditch: 'Ditch', town: 'Town', village: 'Village', fort: 'Fort', bridge: 'Bridge', ford: 'Ford', spring: 'Spring' };
  function el(n, a, kids) { var e = document.createElementNS(NS, n); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function tx(s) { return document.createTextNode(s); }
  function h(n, a, t) { var e = document.createElement(n); for (var k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (t != null) e.textContent = t; return e; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function pace(k) { return 0.45 * k + 0.55 * k * k * (3 - 2 * k); }   // a march: nearly steady, eased at its ends
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
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
  // points along the smooth line through p, k to a segment (in pixels): what smooth() draws, for placing things on it
  function curve(p, closed, k) {
    var n = p.length, out = [], i, j; if (n < 3) return p.map(function (q) { return [q[0] * U, q[1] * U]; });
    var g = function (i) { return closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; };
    for (i = 0; i < (closed ? n : n - 1); i++) {
      var a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2), x1 = b[0] + (c[0] - a[0]) / 6, y1 = b[1] + (c[1] - a[1]) / 6, x2 = c[0] - (e[0] - b[0]) / 6, y2 = c[1] - (e[1] - b[1]) / 6;
      for (j = 0; j < k; j++) { var t = j / k, m = 1 - t; out.push([(m * m * m * b[0] + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * c[0]) * U, (m * m * m * b[1] + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * c[1]) * U]); }
    }
    if (!closed) out.push([p[n - 1][0] * U, p[n - 1][1] * U]);
    return out;
  }
  function inside(x, y, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function area(poly) { var s = 0; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) s += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(s / 2); }
  // the same scatter on every visit: a small generator seeded by the shape's own points (or a number)
  function seeded(at) { var s = 7; if (typeof at === 'number') s = at | 0; else (typeof at[0] === 'number' ? [at] : at).forEach(function (q) { s = (s * 31 + Math.round(q[0] * 10) * 7 + Math.round(q[1] * 10)) | 0; }); return function () { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function scatter(poly, rnd, every, most) {   // points inside a shape, about one to `every` square pixels, top to bottom
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, out = []; poly.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); });
    var n = Math.min(most, Math.round(area(poly) / every)), tries = n * 6;
    while (out.length < n && tries-- > 0) { var x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (inside(x, y, poly)) out.push([x, y]); }
    return out.sort(function (a, b) { return a[1] - b[1]; });
  }
  function scaled(at, m, s) { return at.map(function (q) { return [m[0] + (q[0] - m[0]) * s, m[1] + (q[1] - m[1]) * s]; }); }
  // the way the nearest river or stream runs at a point (degrees), so that a bridge or ford lies across it
  function across(x, y, all) {
    var best = 1e9, ang = 90; (all || []).forEach(function (t) {
      if (t.k !== 'river' && t.k !== 'stream') return; var p = curve(t.at, false, 8);
      for (var i = 0; i < p.length - 1; i++) { var d = Math.pow(p[i][0] - x, 2) + Math.pow(p[i][1] - y, 2); if (d < best) { best = d; ang = Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]) * 180 / Math.PI + 90; } }
    });
    return ang;
  }

  // ── the ground, by map conventions ──
  var TREE = function (x, y) { return 'M' + x + ' ' + (y + 1.5) + 'v4.5M' + (x + 3.2) + ' ' + (y - 1.5) + 'a3.2 3.2 0 1 1 -6.4 0a3.2 3.2 0 1 1 6.4 0'; };   // a round crown on its stem
  var TUFT = function (x, y) { return 'M' + (x - 6) + ' ' + y + 'h12M' + (x - 3.5) + ' ' + y + 'l-1.6 -4.5M' + x + ' ' + y + 'v-5.5M' + (x + 3.5) + ' ' + y + 'l1.6 -4.5'; };   // the marsh sign: reeds over a water line
  function blocks(g, x, y, n) {   // buildings: small black blocks along two short streets
    var cols = n > 4 ? 4 : 2, w = 6, d = 5, gx = 3.5, gy = 4;
    for (var i = 0; i < n; i++) { var c = i % cols, r = Math.floor(i / cols), rows = Math.ceil(n / cols); g.appendChild(el('rect', { x: (x + (c - (cols - 1) / 2) * (w + gx) - w / 2 + (r % 2 ? 2 : 0)).toFixed(1), y: (y + (r - (rows - 1) / 2) * (d + gy) - d / 2).toFixed(1), width: w, height: d, 'class': 'bf-bld' })); }
  }
  function terrain(t, pid, all) {
    var g = el('g', { 'class': 'bf-t bf-t-' + t.k }), c, x, y, d, rnd = seeded(t.at), add = function (cls, dd, more) { var a = { d: dd || d, 'class': cls }; for (var k in more || {}) a[k] = more[k]; var e = el('path', a); g.appendChild(e); return e; };
    if (t.k === 'river' || t.k === 'stream' || t.k === 'road' || t.k === 'wall' || t.k === 'ditch') {
      d = smooth(t.at, false);
      if (t.k === 'river' || t.k === 'stream') { add('bf-bank'); add('bf-water'); }
      else if (t.k === 'road') { add('bf-road-c'); add('bf-road-f'); }
      else if (t.k === 'wall') { add('bf-wall'); add('bf-wall-t'); }
      else { add('bf-ditch'); add('bf-ditch-h'); }
      c = t.lab || t.at[Math.floor(t.at.length / 2)];
    } else if (typeof t.at[0] === 'number') {   // a place: town, village, fort, spring, bridge, ford, point
      x = t.at[0] * U; y = t.at[1] * U;
      if (t.k === 'spring') { g.appendChild(el('circle', { cx: x, cy: y, r: 4.5, 'class': 'bf-pool-f' })); add('bf-spring-t', 'M' + x + ' ' + (y + 4.5) + 'q3 5 -1 9', { fill: 'none' }); }
      else if (t.k === 'fort') {   // a walled square with a bastion at each corner
        var b = 'M' + (x - 9) + ' ' + (y - 9) + 'h18v18h-18Z'; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { b += 'M' + (x + q[0] * 9) + ' ' + (y + q[1] * 9 - 4.5) + 'l4.5 4.5l-4.5 4.5l-4.5 -4.5Z'; });
        add('bf-fort', b);
      } else if (t.k === 'bridge' || t.k === 'ford') {
        var bg = el('g', { transform: 'translate(' + x + ' ' + y + ') rotate(' + across(x, y, all).toFixed(0) + ')' });
        if (t.k === 'bridge') { bg.appendChild(el('rect', { x: -13, y: -3.5, width: 26, height: 7, 'class': 'bf-deck' })); bg.appendChild(el('path', { d: 'M-17 -7l4 3.5h26l4 -3.5M-17 7l4 -3.5h26l4 3.5', 'class': 'bf-rail', fill: 'none' })); }
        else bg.appendChild(el('path', { d: 'M-14 -3h28M-14 3h28', 'class': 'bf-ford-l', fill: 'none' }));
        g.appendChild(bg);
      }
      else if (t.k === 'town' || t.k === 'village') blocks(g, x, y, t.k === 'town' ? 8 : 3);
      else g.appendChild(el('circle', { cx: x, cy: y, r: 3 }));
      c = t.lab || [t.at[0], t.at[1] + (t.k === 'town' ? 3.4 : 2.9)];
    } else {   // an area: hill, ridge, mountain, wood, marsh, sea, lake, land
      d = smooth(t.at, true); var m = centre(t.at), poly = curve(t.at, true, 6);
      if (t.k === 'hill' || t.k === 'ridge' || t.k === 'mountain') {   // contour lines over a height tint: more of them, and closer, on a mountain
        add('bf-t-tint');
        (t.k === 'mountain' ? [1, 0.84, 0.69, 0.55, 0.42, 0.3, 0.18] : t.k === 'ridge' ? [1, 0.78, 0.56, 0.34] : [1, 0.74, 0.48, 0.24]).forEach(function (s, i) { add('bf-t-ct' + (i % 3 === 0 ? ' bf-t-ci' : ''), s === 1 ? d : smooth(scaled(t.at, m, s), true), { fill: 'none' }); });
      } else if (t.k === 'wood') {
        add('bf-t-floor'); var td = ''; scatter(poly, rnd, 430, 220).forEach(function (q) { td += TREE(+q[0].toFixed(1), +q[1].toFixed(1)); }); add('bf-tree', td, { fill: 'none' });
      } else if (t.k === 'marsh') {
        add('bf-t-floor'); var rd = ''; scatter(poly, rnd, 700, 110).forEach(function (q) { rd += TUFT(+q[0].toFixed(1), +q[1].toFixed(1)); }); add('bf-reed', rd, { fill: 'none' });
      } else if (t.k === 'sea' || t.k === 'lake') {
        add('bf-t-floor'); add('bf-shore', d, { fill: 'none' }); add('bf-wavel', smooth(scaled(t.at, m, 0.9), true), { fill: 'none' });
      } else { add('bf-t-floor'); add('bf-shore', d, { fill: 'none' }); }   // land in a sea: the ground, and its coast line
      c = t.lab || centre(t.at);
    }
    if (t.name) g._lab = el('text', { x: c[0] * U, y: c[1] * U, 'class': 'bf-tl', 'text-anchor': 'middle' }, [tx(t.name)]);   // the names go on top of all the ground (mount)
    return g;
  }
  function groundKey(k) {   // the legend's small picture of a kind of ground, drawn with the field's own classes
    var s = el('svg', { viewBox: '0 0 40 22', 'class': 'bf-key-g', 'aria-hidden': 'true' }), g = el('g', { 'class': 'bf-t bf-t-' + k }), p = function (cls, d) { g.appendChild(el('path', { d: d, 'class': cls, fill: cls.indexOf('floor') >= 0 || cls.indexOf('tint') >= 0 || cls === 'bf-fort' ? null : 'none' })); };
    if (k === 'hill' || k === 'ridge' || k === 'mountain') { p('bf-t-tint', 'M3 11a17 9 0 1 0 34 0a17 9 0 1 0 -34 0'); p('bf-t-ct bf-t-ci', 'M3 11a17 9 0 1 0 34 0a17 9 0 1 0 -34 0'); p('bf-t-ct', 'M10 11a10 5 0 1 0 20 0a10 5 0 1 0 -20 0'); p('bf-t-ct', 'M16 11a4 2 0 1 0 8 0a4 2 0 1 0 -8 0'); }
    else if (k === 'wood') { p('bf-t-floor', 'M2 3h36v16h-36Z'); p('bf-tree', TREE(10, 9) + TREE(21, 12) + TREE(31, 8)); }
    else if (k === 'marsh') { p('bf-t-floor', 'M2 3h36v16h-36Z'); p('bf-reed', TUFT(12, 10) + TUFT(28, 16)); }
    else if (k === 'river' || k === 'stream') { p('bf-bank', 'M2 14q9 -10 18 -3t18 -3'); p('bf-water', 'M2 14q9 -10 18 -3t18 -3'); }
    else if (k === 'sea' || k === 'lake') { p('bf-t-floor', 'M2 3h36v16h-36Z'); p('bf-shore', 'M2 3h36'); p('bf-wavel', 'M6 12h28'); }
    else if (k === 'road') { p('bf-road-c', 'M2 15q18 -12 36 -6'); p('bf-road-f', 'M2 15q18 -12 36 -6'); }
    else if (k === 'wall') { p('bf-wall', 'M3 11h34'); p('bf-wall-t', 'M3 11h34'); }
    else if (k === 'ditch') { p('bf-ditch', 'M3 11h34'); p('bf-ditch-h', 'M3 11h34'); }
    else if (k === 'town' || k === 'village') blocks(g, 20, 11, k === 'town' ? 8 : 3);
    else if (k === 'fort') p('bf-fort', 'M13 4h14v14h-14ZM13 0.5l3.5 3.5l-3.5 3.5l-3.5 -3.5ZM27 0.5l3.5 3.5l-3.5 3.5l-3.5 -3.5ZM27 14.5l3.5 3.5l-3.5 3.5l-3.5 -3.5ZM13 14.5l3.5 3.5l-3.5 3.5l-3.5 -3.5Z');
    else if (k === 'bridge') { g.appendChild(el('rect', { x: 8, y: 8, width: 24, height: 6, 'class': 'bf-deck' })); p('bf-rail', 'M4 4l4 4h24l4 -4M4 18l4 -4h24l4 4'); }
    else if (k === 'ford') p('bf-ford-l', 'M6 8h28M6 14h28');
    else if (k === 'spring') { g.appendChild(el('circle', { cx: 20, cy: 8, r: 4.5, 'class': 'bf-pool-f' })); p('bf-spring-t', 'M20 12.5q3 5 -1 8'); }
    s.appendChild(g); return s;
  }

  // ── formations: ranks of marks, and the framed symbol that names their kind ──
  // [space along the front, space in depth, mark, loose: how far a mark may stand out of its rank]
  var BODY = { infantry: [7.5, 7.5, 'sq', 0.6], spears: [7.5, 7.5, 'sq', 0.6], pikes: [6.8, 6.8, 'sq', 0.4], guard: [7.5, 7.5, 'sq', 0.5], archers: [10.5, 9.5, 'dot', 2.2], light: [12, 11, 'dot', 3.4],
    cavalry: [12.5, 12, 'horse', 1.6], 'horse-archers': [14.5, 13.5, 'horse', 3.2], elephants: [22, 18, 'big', 1.5], chariots: [20, 15, 'char', 1.5], artillery: [20, 13, 'gun', 0.8], armour: [19, 15, 'tank', 1],
    ships: [24, 17, 'ship', 1.2], camp: [17, 14, 'tent', 0.8], wagons: [16, 13, 'wag', 1] };
  function markEl(kind) {
    if (kind === 'sq') return el('rect', { x: -2.5, y: -2.5, width: 5, height: 5, rx: 1, 'class': 'bf-m' });
    if (kind === 'dot') return el('circle', { r: 2.4, 'class': 'bf-m' });
    if (kind === 'horse') return el('ellipse', { rx: 2.7, ry: 4.4, 'class': 'bf-m' });
    if (kind === 'big') return el('path', { d: 'M0 -9a5.5 5.5 0 0 1 5.5 5.5V5a5.5 4.5 0 0 1 -11 0V-3.5A5.5 5.5 0 0 1 0 -9Z', 'class': 'bf-m' });
    if (kind === 'char') return el('path', { d: 'M-4 -1h8v7h-8ZM0 -1V-8M-6.5 2.5v4M6.5 2.5v4', 'class': 'bf-m bf-m-l' });
    if (kind === 'gun') return el('path', { d: 'M0 -8V3M-4.5 1.5a2 2 0 1 0 0.01 0M4.5 1.5a2 2 0 1 0 0.01 0M-4.5 3.5H4.5', 'class': 'bf-m bf-m-l' });
    if (kind === 'tank') return el('path', { d: 'M-4.5 -5h9a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1 -1.5 1.5h-9a1.5 1.5 0 0 1 -1.5 -1.5v-8a1.5 1.5 0 0 1 1.5 -1.5ZM0 -1V-10', 'class': 'bf-m bf-m-l' });
    if (kind === 'ship') return el('path', { d: 'M0 -9C4.2 -4 4.4 3 3 8H-3C-4.4 3 -4.2 -4 0 -9Z', 'class': 'bf-m' });
    if (kind === 'tent') return el('path', { d: 'M0 -6L6.5 5H-6.5Z', 'class': 'bf-m bf-m-o' });
    return el('rect', { x: -3.5, y: -5, width: 7, height: 10, rx: 1, 'class': 'bf-m bf-m-o' });
  }
  function body(u, seed) {   // the marks of a formation about its centre, front upward; each keeps its own small lag and its way of scattering
    var B = BODY[u.k] || BODY.infantry, w = u.w * U, d = u.d * U, sx = B[0], sy = B[1], cols = Math.max(1, Math.round(w / sx)), rows = Math.max(1, Math.round(d / sy)), rnd = seeded(seed), out = [];
    while (cols * rows > 66) { if (cols >= rows * 2.2 || rows === 1) cols--; else rows--; }
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var e = markEl(B[2]), x = (c - (cols - 1) / 2) * (w / cols) + (rnd() - 0.5) * B[3], y = (r - (rows - 1) / 2) * (d / rows) + (rnd() - 0.5) * B[3];
      out.push({ e: e, x: x, y: y, rx: rnd() * 2 - 1, ry: rnd() * 2 - 1, lag: 0.25 + rnd() * 0.75 });
    }
    return out;
  }
  // the symbol in its frame (26 x 17 about the centre). The crossed lines, the diagonal, the dot and the oval are the
  // military-map signs for infantry, cavalry, artillery and armour; the others are made in their manner and named in the legend.
  var TAG = {
    infantry: 'M-13 -8.5L13 8.5M-13 8.5L13 -8.5', light: 'M-13 -8.5L13 8.5M-13 8.5L13 -8.5',
    spears: 'M-13 -8.5L13 8.5M-13 8.5L13 -8.5M0 -8.5V8.5', pikes: 'M-13 -8.5L13 8.5M-13 8.5L13 -8.5M-3 -8.5V8.5M3 -8.5V8.5',
    cavalry: 'M-13 8.5L13 -8.5', 'horse-archers': 'M-13 8.5L13 -8.5M3 3.5h7M10 3.5l-2.5 -2M10 3.5l-2.5 2',
    archers: 'M-8 0H8M8 0l-3.5 -3M8 0l-3.5 3M-8 0l2.5 -2.5M-8 0l2.5 2.5', artillery: '', armour: 'M-7 -4h14a4 4 0 0 1 0 8h-14a4 4 0 0 1 0 -8Z',
    elephants: 'M-6 -4.5a6 5 0 0 1 12 0V4h-3V0h-6v4h-3ZM6 -3q4 1 3 6', chariots: 'M-13 8.5L13 -8.5M-5 2.5a3.5 3.5 0 1 0 0.01 0',
    ships: 'M-8 -1h16l-3 5.5h-10ZM0 -1V-6.5M0 -6.5l4.5 4', guard: 'M-13 -8.5L13 8.5M-13 8.5L13 -8.5', camp: 'M-7 5L0 -5.5L7 5ZM0 -5.5V5', wagons: 'M-9 -1h18M-5 2.5a2 2 0 1 0 0.01 0M5 2.5a2 2 0 1 0 0.01 0' };
  function tag(k) {
    var kids = [el('rect', { x: -13, y: -8.5, width: 26, height: 17, rx: 1.5, 'class': 'bf-tag-f' + (k === 'light' ? ' bf-tag-l' : '') })];
    if (k === 'artillery') kids.push(el('circle', { r: 3.4, 'class': 'bf-tag-d' })); else kids.push(el('path', { d: TAG[k] || TAG.infantry, 'class': 'bf-tag-g', fill: 'none' }));
    if (k === 'guard') kids.push(el('path', { d: 'M-13 -8.5V-14h8l-2.5 2.7l2.5 2.8', 'class': 'bf-tag-g', fill: 'none' }));   // a staff and pennant: the reserve
    return el('g', { 'class': 'bf-tag' }, kids);
  }
  var SHOOT = { archers: 1, 'horse-archers': 1, artillery: 1, ships: 1, armour: 1 };

  function mount(root, data) {
    if (root._bf) return root._bf;
    var pid = 'bf' + (++SEQ), units = data.units, U_BY = {}, side = {}, P = data.phases, N = P.length, cur = -1, small = false, F = 15, LAY = [], Z = 1;
    var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, year = data.y != null ? data.y : data.gun ? 1700 : 0, camOn = !still;
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
    var defs = el('defs', {}), sea = data.field && data.field.ground === 'sea';
    for (var ai = 0; ai < 4; ai++) defs.appendChild(el('marker', { id: pid + '-ah' + ai, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, [el('path', { d: 'M0 0L10 5L0 10z', 'class': 'bf-ah bf-s' + ai })]));
    defs.appendChild(el('pattern', { id: pid + '-wave', width: 56, height: 30, patternUnits: 'userSpaceOnUse' }, [el('path', { d: 'M4 9q4 -3.5 8 0t8 0M32 24q4 -3.5 8 0t8 0', 'class': 'bf-wave', fill: 'none' })]));
    svg.appendChild(defs);
    svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'bf-ground' + (sea ? ' bf-sea' : '') }));
    if (sea) svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, 'class': 'bf-ground-tex', style: 'fill:url(#' + pid + '-wave)' }));
    var gT = el('g', {}), gTrail = el('g', {}), gU = el('g', {}), gA = el('g', {}), gL = el('g', {});
    // the ground from the bottom up: water and marsh, then roads, then relief, woods, and what people built
    var labs = [], ORDER = { sea: 0, lake: 0, land: 1, marsh: 2, hill: 3, ridge: 3, mountain: 3, wood: 4, river: 5, stream: 5, ditch: 6, road: 7, wall: 8, bridge: 9, ford: 9 }, used = [];
    (data.terrain || []).map(function (t, i) { return [t, i]; }).sort(function (a, b) { return (ORDER[a[0].k] != null ? ORDER[a[0].k] : 10) - (ORDER[b[0].k] != null ? ORDER[b[0].k] : 10) || a[1] - b[1]; }).forEach(function (q) { var tg = terrain(q[0], pid, data.terrain); gT.appendChild(tg); if (tg._lab) labs.push(tg._lab); if (GROUND[q[0].k] && used.indexOf(q[0].k) < 0 && !used.some(function (k) { return GROUND[k] === GROUND[q[0].k]; })) used.push(q[0].k); });
    labs.forEach(function (l) { gT.appendChild(l); });
    if (data.field && data.field.north != null) gT.appendChild(el('g', { 'class': 'bf-n', transform: 'translate(' + (W - 44) + ' 50) rotate(' + data.field.north + ')' }, [el('path', { d: 'M0 18V-14M-6 -6L0 -16L6 -6', fill: 'none' }), el('text', { x: 0, y: -22, 'text-anchor': 'middle' }, [tx('N')])]));
    (data.field && data.field.edges || []).forEach(function (e) {   // "to Baysan": a place off the plan
      gT.appendChild(el('text', { x: e.at[0] * U, y: e.at[1] * U, 'class': 'bf-edge', 'text-anchor': e.at[0] > 80 ? 'end' : e.at[0] < 20 ? 'start' : 'middle' }, [tx(e.name)]));
    });
    var node = {};
    units.forEach(function (u, i) {
      var marks = body(u, i * 977 + 13 + Math.round(u.w * 10)), inner = el('g', {}, [el('rect', { x: -u.w * U / 2 - 3, y: -u.d * U / 2 - 3, width: u.w * U + 6, height: u.d * U + 6, rx: 4, 'class': 'bf-hold' })].concat(marks.map(function (m) { m.e.setAttribute('transform', 'translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')'); return m.e; })));
      var g = el('g', { 'class': 'bf-u bf-s' + side[u.side] + ' bf-k-' + u.k }, [inner, el('title', {}, [tx(u.name + (u.leader ? ' (' + u.leader + ')' : ''))])]);
      var lab = el('text', { 'class': 'bf-ul' }), lead = u.leader ? el('text', { 'class': 'bf-ul bf-ld' }, [tx(u.leader)]) : null, pic = null, ring = null, tg = tag(u.k);
      if (u.pic) {
        defs.appendChild(el('clipPath', { id: pid + '-cp' + i }, [el('circle', { cx: 0, cy: 0, r: 1 })]));
        pic = el('image', { 'class': 'bf-pic', preserveAspectRatio: 'xMidYMin slice', 'clip-path': 'url(#' + pid + '-cp' + i + ')' }); pic.setAttribute('href', u.pic); pic.setAttributeNS(XL, 'xlink:href', u.pic);
        ring = el('circle', { 'class': 'bf-ring', fill: 'none' });
      }
      var tie = el('line', { 'class': 'bf-tie' });
      var lg = el('g', { 'class': 'bf-lg bf-s' + side[u.side] }, [tie, tg].concat(pic ? [pic, ring] : [], [lab], lead ? [lead] : []));
      gU.appendChild(g); gL.appendChild(lg);
      node[u.id] = { g: g, inner: inner, marks: marks, dirty: false, lg: lg, lab: lab, lead: lead, pic: pic, ring: ring, tag: tg, tie: tie, clip: pic ? defs.lastChild.firstChild : null, x: 0, y: 0, f: 0, o: 0, lx: 0, ly: 0, bw: 60, bh: 16, tw: 60 };
    });
    [gT, gTrail, gU, gA, gL].forEach(function (g) { svg.appendChild(g); }); svg.appendChild(el('rect', { x: 1, y: 1, width: W - 2, height: H - 2, 'class': 'bf-frame', fill: 'none' })); fig.appendChild(svg);

    // controls, the time bar and the phase's words
    var bar = h('div', { 'class': 'bf-bar' }), bBack = h('button', { type: 'button', 'class': 'bf-btn', 'aria-label': 'The phase before' }, '‹ Back'),
      bPlay = h('button', { type: 'button', 'class': 'bf-btn bf-play' }, 'Play'), bNext = h('button', { type: 'button', 'class': 'bf-btn', 'aria-label': 'The next phase' }, 'Next ›'), dots = h('div', { 'class': 'bf-dots', role: 'group', 'aria-label': 'Phases' });
    var scrub = h('input', { type: 'range', 'class': 'bf-scrub', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'The course of the battle: drag to any moment' });
    var bCam = h('button', { type: 'button', 'class': 'bf-btn bf-cam', 'aria-pressed': 'false' }, 'Whole field');
    var dot = P.map(function (p, i) { var b = h('button', { type: 'button', 'class': 'bf-dot', 'aria-label': 'Phase ' + (i + 1) + ': ' + p.title }, String(i + 1)); b.onclick = function () { stop(); seek(H0[i]); }; dots.appendChild(b); return b; });
    [bBack, bPlay, bNext].forEach(function (b) { bar.appendChild(b); }); if (!still) { bar.appendChild(scrub); bar.appendChild(bCam); } bar.appendChild(dots);
    var cap = h('div', { 'class': 'bf-cap', 'aria-live': 'polite' }), capK = h('p', { 'class': 'bf-cap-k' }), capT = h('h3', { 'class': 'bf-cap-t' }), capX = h('p', { 'class': 'bf-cap-x' });
    [capK, capT, capX].forEach(function (b) { cap.appendChild(b); });
    // the legend: the sides, the formations' symbols, then the ground: only what this field uses
    var key = h('ul', { 'class': 'bf-key' }), kinds = [];
    data.sides.forEach(function (s, i) { var li = h('li', { 'class': 'bf-key-s' }); li.appendChild(h('i', { 'class': 'bf-sw bf-s' + i })); li.appendChild(tx(s.name)); key.appendChild(li); });
    units.forEach(function (u) { if (kinds.indexOf(u.k) < 0 && KIND[u.k]) kinds.push(u.k); });
    kinds.forEach(function (k) { var li = h('li', { 'class': 'bf-key-u' }); li.appendChild(el('svg', { viewBox: '-15 -16 30 27', 'class': 'bf-key-g bf-key-t bf-s9', 'aria-hidden': 'true' }, [tag(k)])); li.appendChild(tx(KIND[k])); key.appendChild(li); });
    if (S.some(function (st) { for (var id in st) if (st[id].s === 'hidden') return true; })) { var lh = h('li', {}); lh.appendChild(h('i', { 'class': 'bf-sw bf-sw-hid' })); lh.appendChild(tx('Hidden')); key.appendChild(lh); }
    used.forEach(function (k) { var li = h('li', { 'class': 'bf-key-gr' }); li.appendChild(groundKey(k)); li.appendChild(tx(GROUND[k])); key.appendChild(li); });
    var note = h('p', { 'class': 'bf-note' }, 'A schematic drawn from the written accounts: places and distances are not to scale.' + (data.note ? ' ' + data.note : ''));
    var list = root.querySelector('.bf-phases'), box = h('div', { 'class': 'bf-box' }); [fig, bar, cap, key, note].forEach(function (b) { box.appendChild(b); });
    root.insertBefore(box, list || null); root.classList.add('bf-on');

    // ---- names: behind each formation, then moved clear of one another and of the formations
    function half(u, f) { var r = (u.k === 'camp' ? 0 : f) * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r)); return [(c * u.w + s * u.d) * U / 2, (s * u.w + c * u.d) * U / 2]; }
    function layout(i) {
      var L = {}, boxes = [], fixed = [];
      units.forEach(function (u) {
        var s = S[i][u.id]; if (!s || s.s === 'gone') return; var n = node[u.id], hf = half(u, s.f), r = s.f * Math.PI / 180, back = u.lab === 'front' ? -1 : 1;
        var dx = -Math.sin(r) * back, dy = Math.cos(r) * back, cx = s.x * U, cy = s.y * U;
        if (Math.abs(dy) >= Math.abs(dx)) cy += (dy > 0 ? 1 : -1) * (hf[1] + 6 + n.bh / 2); else cx += (dx > 0 ? 1 : -1) * (hf[0] + 9 + n.bw / 2);
        boxes.push({ id: u.id, x: cx, y: cy, w: n.bw + 8, h: n.bh + 4 }); fixed.push({ id: u.id, x: s.x * U, y: s.y * U, w: hf[0] * 2 + 8, h: hf[1] * 2 + 8 });
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
    // one formation as it stands at a moment: v {x, y, f, o, lx, ly, sc scattered 0-1, dead 0-1, vx, vy: how fast it moves (px), ox, oy: a lunge or recoil}
    function place(id, v) {
      var n = node[id], u = U_BY[id], px = v.x * U + (v.ox || 0), py = v.y * U + (v.oy || 0), fr = u.k === 'camp' ? 0 : v.f; n.x = v.x; n.y = v.y; n.f = v.f; n.o = v.o; n.lx = v.lx; n.ly = v.ly;
      n.g.setAttribute('transform', 'translate(' + px.toFixed(1) + ' ' + py.toFixed(1) + ')'); n.inner.setAttribute('transform', 'rotate(' + fr.toFixed(1) + ')');
      n.g.style.opacity = v.o; n.lg.style.opacity = v.o < 0.2 ? 0 : Math.min(1, v.o * 1.8);
      var sc = v.sc || 0, dead = v.dead || 0, sp = Math.hypot(v.vx || 0, v.vy || 0);
      if (sc > 0.001 || dead > 0.001 || sp > 0.05 || n.dirty) {   // the marks: lagging a little on the march, breaking away in a rout, lying where they fell
        var r = fr * Math.PI / 180, co = Math.cos(r), si = Math.sin(r), lx = ((v.vx || 0) * co + (v.vy || 0) * si), ly = (-(v.vx || 0) * si + (v.vy || 0) * co);   // the march, seen in the formation's own frame
        for (var q = 0; q < n.marks.length; q++) { var m = n.marks[q]; m.e.setAttribute('transform', 'translate(' + (m.x + sc * m.rx * 20 + dead * m.rx * 3 - lx * m.lag).toFixed(1) + ' ' + (m.y + sc * (m.ry * 16 + 9) + dead * m.ry * 3 - ly * m.lag).toFixed(1) + ')' + (dead > 0.001 ? ' rotate(' + (m.rx * 70 * dead).toFixed(0) + ')' : '')); }
        n.dirty = sc > 0.001 || dead > 0.001 || sp > 0.05;
      }
      // the name: its place beside the formation follows the camera, so that a name never drifts off when the view moves in
      var ux = v.x * U, uy = v.y * U, cx_ = ux + (v.lx - ux) * Z, cy_ = uy + (v.ly - uy) * Z, bw = n.bw * Z, bh = n.bh * Z, Fz = F * Z;
      if (Z < 0.999 && ux > view[0] && ux < view[0] + view[2] && uy > view[1] && uy < view[1] + view[3]) { cx_ = clamp(cx_, view[0] + bw / 2 + 4, view[0] + view[2] - bw / 2 - 4); cy_ = clamp(cy_, view[1] + bh / 2 + 4, view[1] + view[3] - bh / 2 - 4); }   // a name of a formation in view stays in view
      var two = n.lead && !small, tw = Fz * (small ? 1.3 : 1.75), pr = n.pic && !small ? Fz * 1.2 : 0, x0 = cx_ - bw / 2, tx0 = x0 + tw + 5 * Z + (pr ? pr * 2 + 5 * Z : 0), y1 = cy_ + (two ? -Fz * 0.16 : Fz * 0.34);
      n.tag.setAttribute('transform', 'translate(' + (x0 + tw / 2).toFixed(1) + ' ' + cy_.toFixed(1) + ') scale(' + (tw / 26).toFixed(3) + ')');
      n.lab.setAttribute('x', tx0.toFixed(1)); n.lab.setAttribute('y', y1.toFixed(1));
      if (n.lead) { n.lead.setAttribute('x', tx0.toFixed(1)); n.lead.setAttribute('y', (y1 + Fz * 1.04).toFixed(1)); }
      var hf = half(u, v.f), gx = Math.max(0, Math.abs(cx_ - ux) - hf[0] - bw / 2), gy = Math.max(0, Math.abs(cy_ - uy) - hf[1] - bh / 2);
      if (Math.hypot(gx, gy) > Fz * 1.1) { var ex = cx_ + Math.max(-bw / 2, Math.min(bw / 2, ux - cx_)), ey = cy_ + Math.max(-bh / 2, Math.min(bh / 2, uy - cy_)); n.tie.setAttribute('x1', ex.toFixed(1)); n.tie.setAttribute('y1', ey.toFixed(1)); n.tie.setAttribute('x2', ux.toFixed(1)); n.tie.setAttribute('y2', uy.toFixed(1)); n.tie.style.display = ''; } else n.tie.style.display = 'none';
      if (n.pic) { var pcx = x0 + tw + 5 * Z + pr, t = 'translate(' + pcx.toFixed(1) + ' ' + cy_.toFixed(1) + ')'; n.pic.setAttribute('x', pcx - pr); n.pic.setAttribute('y', cy_ - pr); n.pic.setAttribute('width', pr * 2); n.pic.setAttribute('height', pr * 2); n.clip.setAttribute('transform', t + ' scale(' + pr + ')'); n.ring.setAttribute('cx', pcx); n.ring.setAttribute('cy', cy_); n.ring.setAttribute('r', pr); }
    }
    function target(i, id) { var s = S[i][id]; if (!s) return null; var l = lay(i)[id] || [s.x * U, s.y * U]; return { x: s.x, y: s.y, f: s.f, o: s.s === 'gone' ? 0 : s.s === 'routed' ? 0.8 : s.s === 'destroyed' ? 0.85 : 1, lx: l[0], ly: l[1], sc: s.s === 'routed' ? 1 : 0, dead: s.s === 'destroyed' ? 1 : 0 }; }
    function classes(i) {
      units.forEach(function (u) { var s = S[i][u.id], n = node[u.id]; n.g.classList.toggle('is-hidden', !!s && s.s === 'hidden'); n.lg.classList.toggle('is-hidden', !!s && s.s === 'hidden'); n.g.classList.toggle('is-routed', !!s && (s.s === 'routed' || s.s === 'gone')); n.g.classList.toggle('is-destroyed', !!s && s.s === 'destroyed'); n.lg.classList.toggle('is-destroyed', !!s && s.s === 'destroyed'); n.g.style.display = n.lg.style.display = s ? '' : 'none'; });
    }
    function rim(id, tx_, ty_, i) { var s = S[i][id], u = U_BY[id], dx = tx_ - s.x, dy = ty_ - s.y, L = Math.hypot(dx, dy) || 1, r = Math.min(u.w, u.d * 2.2) / 2 + 0.8; return [s.x + dx / L * r, s.y + dy / L * r]; }
    function words(i) {
      capK.textContent = 'Phase ' + (i + 1) + ' of ' + N + (P[i].when ? ' · ' + P[i].when : ''); capT.textContent = P[i].title; capX.textContent = P[i].text;
      dot.forEach(function (b, j) { b.classList.toggle('is-on', j === i); b.classList.toggle('is-done', j < i); if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      bBack.disabled = i === 0; bNext.disabled = i === N - 1;
    }

    // ---- the film. Phase i is reached by a march (MOVE[i] ms, from T0[i]) and then held (HOLD[i] ms, from H0[i]) while its words are read.
    var MOVE = [], HOLD = [], T0 = [], H0 = [], TOTAL = 0, ROUTE = [], FX = null, t = 0, playing = false, until = null, raf = 0, lastTs = 0, CAM = [], view = [0, 0, W, H];
    (function () {
      var at = 0;
      for (var i = 0; i < N; i++) {
        var far = 0, R = {};
        if (i) units.forEach(function (u, ui) {   // each formation's road into this phase: a shallow curve, bent to one side by its place in the list
          var a = S[i - 1][u.id], b = S[i][u.id]; if (!a || !b) return; var L = Math.hypot(b.x - a.x, b.y - a.y); if (L < 0.6) return; far = Math.max(far, L);
          var how = b.how || 'advance', k = (how === 'rout' || how === 'retreat' ? 0.03 : 0.1) * (ui % 2 ? 1 : -1) * (L > 12 ? 1 : 0.5);
          R[u.id] = { a: a, b: b, L: L, how: how, cx: (a.x + b.x) / 2 - (b.y - a.y) * k, cy: (a.y + b.y) / 2 + (b.x - a.x) * k };
        });
        ROUTE.push(R); MOVE.push(!i || still ? 0 : clamp(1700 + far * 42, 2000, 3800) + ((P[i].hits || []).length ? 500 : 0)); HOLD.push(still ? 1 : clamp(P[i].text.length * 34, 2400, 6200));
        T0.push(at); at += MOVE[i]; H0.push(at); at += HOLD[i];
      }
      TOTAL = at;
    })();
    function locate(tt) { for (var i = N - 1; i >= 0; i--) if (tt >= T0[i]) return { i: i, k: MOVE[i] && tt < H0[i] ? (tt - T0[i]) / MOVE[i] : 1 }; return { i: 0, k: 1 }; }
    function onRoute(r, e) { var m = 1 - e; return [m * m * r.a.x + 2 * m * e * r.cx + e * e * r.b.x, m * m * r.a.y + 2 * m * e * r.cy + e * e * r.b.y]; }
    // the view of a phase: the part of the field where something happens, never closer than about twice
    function camOf(i) {
      if (CAM[i]) return CAM[i]; var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false, inc = function (id, s) { if (!s || s.s === 'gone') return; var hf = half(U_BY[id], s.f); x0 = Math.min(x0, s.x * U - hf[0]); x1 = Math.max(x1, s.x * U + hf[0]); y0 = Math.min(y0, s.y * U - hf[1]); y1 = Math.max(y1, s.y * U + hf[1]); any = true; };
      if (i) { for (var id in ROUTE[i]) { inc(id, S[i - 1][id]); inc(id, S[i][id]); } (P[i].hits || []).forEach(function (hh) { inc(hh[0], S[i][hh[0]]); inc(hh[1], S[i][hh[1]]); }); units.forEach(function (u) { var a = S[i - 1][u.id], b = S[i][u.id]; if (b && (!a || a.s !== b.s)) inc(u.id, b); }); }
      var full = [0, 0, W, H]; if (!any) return (CAM[i] = full);
      var pad = small ? 90 : 130, w = x1 - x0 + pad * 2, hgt = y1 - y0 + pad * 2, minW = small ? 430 : 540; w = Math.max(w, hgt * W / H, minW); if (w > W * 0.82) return (CAM[i] = full);
      hgt = w * H / W; var cx = clamp((x0 + x1) / 2, w / 2, W - w / 2), cy = clamp((y0 + y1) / 2, hgt / 2, H - hgt / 2);
      return (CAM[i] = [cx - w / 2, cy - hgt / 2, w, hgt]);
    }
    function setView(v) {
      if (Math.abs(v[0] - view[0]) + Math.abs(v[1] - view[1]) + Math.abs(v[2] - view[2]) < 0.4) return false; view = v; Z = v[2] / W;
      svg.setAttribute('viewBox', v[0].toFixed(1) + ' ' + v[1].toFixed(1) + ' ' + v[2].toFixed(1) + ' ' + v[3].toFixed(1)); svg.style.setProperty('--bf-fs', (F * Z).toFixed(2) + 'px'); svg.style.setProperty('--bf-z', Z.toFixed(3)); return true;
    }
    // what a phase adds to the picture besides the formations themselves: the tracks they leave, the strikes, the shots
    function buildFx(i) {
      while (gA.firstChild) gA.removeChild(gA.firstChild); while (gTrail.firstChild) gTrail.removeChild(gTrail.firstChild);
      var fx = { trails: [], hits: [], lunge: {} }; if (!i) return fx;
      for (var id in ROUTE[i]) { var r = ROUTE[i][id]; if (r.L < 4 || r.b.s === 'gone') continue; var back = r.how === 'retreat' || r.how === 'rout' || r.how === 'feint';
        var p = el('path', { 'class': 'bf-ar ' + (back ? (r.how === 'feint' ? 'bf-ar-feint' : 'bf-ar-back') : 'bf-ar-move') + ' bf-s' + side[U_BY[id].side], fill: 'none' }); gTrail.appendChild(p); fx.trails.push({ p: p, r: r }); }
      (P[i].hits || []).forEach(function (hh, hi) {
        var a = S[i][hh[0]], b = S[i][hh[1]]; if (!a || !b || Math.hypot(b.x - a.x, b.y - a.y) < 3) return;
        var ra = rim(hh[0], b.x, b.y, i), rb = rim(hh[1], a.x, a.y, i), si = side[U_BY[hh[0]].side], k = U_BY[hh[0]].k, shoot = !!SHOOT[k] || (year >= 1500 && (k === 'infantry' || k === 'light')), o = { a: hh[0], b: hh[1], ra: ra, rb: rb, shoot: shoot, n: hi };
        var touch = Math.hypot(rb[0] - ra[0], rb[1] - ra[1]) < 2.6 || (rb[0] - ra[0]) * (b.x - a.x) + (rb[1] - ra[1]) * (b.y - a.y) < 0;
        if (touch) {   // the two are in contact: a flash where they meet
          var cx = (ra[0] + rb[0]) / 2 * U, cy = (ra[1] + rb[1]) / 2 * U, sp = ''; for (var q = 0; q < 8; q++) { var rr = q % 2 ? 4 : 11, an = q * Math.PI / 4; sp += (q ? 'L' : 'M') + (Math.cos(an) * rr).toFixed(1) + ' ' + (Math.sin(an) * rr).toFixed(1); }
          o.spark = el('path', { d: sp + 'Z', 'class': 'bf-clash bf-s' + si }); o.sx = cx; o.sy = cy; gA.appendChild(o.spark);
        } else {
          var bend = hh[2] == null ? 0.16 : hh[2], mx = (ra[0] + rb[0]) / 2, my = (ra[1] + rb[1]) / 2; o.c = [mx - (rb[1] - ra[1]) * bend, my + (rb[0] - ra[0]) * bend];
          o.arrow = el('path', { 'class': 'bf-ar bf-ar-hit bf-s' + si, fill: 'none', 'marker-end': 'url(#' + pid + '-ah' + si + ')' }); gA.appendChild(o.arrow);
        }
        if (shoot && !still) {   // shots in flight, and smoke at the muzzle once there is powder
          o.shots = []; for (var j = 0; j < 6; j++) { var c = el('circle', { r: k === 'artillery' || k === 'ships' || k === 'armour' ? 2.6 : 1.7, 'class': 'bf-shot bf-s' + si }); gA.appendChild(c); o.shots.push(c); }
          if (year >= 1400 && k !== 'archers' && k !== 'horse-archers') { o.smoke = []; for (var j2 = 0; j2 < 3; j2++) { var s2 = el('circle', { r: 1, 'class': 'bf-smoke' }); gA.appendChild(s2); o.smoke.push(s2); } }
        }
        fx.hits.push(o);
      });
      return fx;
    }
    function runFx(i, k) {   // k: how far the phase's march has come (1 once it is held)
      if (!FX) return; var ku = Math.min(1, k / 0.78), e = pace(ku), kf = clamp((k - 0.55) / 0.45, 0, 1), held = k >= 1; FX.lunge = {};
      FX.trails.forEach(function (o) { var r = o.r, m = 1 - e, c1x = r.a.x + (r.cx - r.a.x) * e, c1y = r.a.y + (r.cy - r.a.y) * e, p = onRoute(r, e);
        o.p.setAttribute('d', 'M' + (r.a.x * U).toFixed(1) + ' ' + (r.a.y * U).toFixed(1) + 'Q' + (c1x * U).toFixed(1) + ' ' + (c1y * U).toFixed(1) + ' ' + (p[0] * U).toFixed(1) + ' ' + (p[1] * U).toFixed(1)); o.p.style.opacity = held ? 0.38 : 0.75; });
      FX.hits.forEach(function (o) {
        var pulse = held || still ? 0 : Math.pow(Math.sin(kf * Math.PI * 3), 2) * (kf > 0 ? 1 : 0), dx = o.rb[0] - o.ra[0], dy = o.rb[1] - o.ra[1], L = Math.hypot(dx, dy) || 1, ux = (S[i][o.b].x - S[i][o.a].x), uy = (S[i][o.b].y - S[i][o.a].y), UL = Math.hypot(ux, uy) || 1;
        if (!o.shoot) { var la = FX.lunge[o.a] || [0, 0], lb = FX.lunge[o.b] || [0, 0]; FX.lunge[o.a] = [la[0] + ux / UL * 5 * pulse, la[1] + uy / UL * 5 * pulse]; FX.lunge[o.b] = [lb[0] + ux / UL * 2.5 * pulse, lb[1] + uy / UL * 2.5 * pulse]; }
        if (o.spark) { var s = kf <= 0 ? 0 : held || still ? 1 : 0.75 + 0.45 * pulse; o.spark.setAttribute('transform', 'translate(' + o.sx.toFixed(1) + ' ' + o.sy.toFixed(1) + ') scale(' + s.toFixed(2) + ') rotate(' + (held ? 0 : kf * 50).toFixed(0) + ')'); o.spark.style.opacity = kf <= 0 ? 0 : 1; }
        if (o.arrow) { var g = held || still ? 1 : ease(kf), c1 = [o.ra[0] + (o.c[0] - o.ra[0]) * g, o.ra[1] + (o.c[1] - o.ra[1]) * g], m2 = 1 - g, px = m2 * m2 * o.ra[0] + 2 * m2 * g * o.c[0] + g * g * o.rb[0], py = m2 * m2 * o.ra[1] + 2 * m2 * g * o.c[1] + g * g * o.rb[1];
          o.arrow.setAttribute('d', 'M' + (o.ra[0] * U).toFixed(1) + ' ' + (o.ra[1] * U).toFixed(1) + 'Q' + (c1[0] * U).toFixed(1) + ' ' + (c1[1] * U).toFixed(1) + ' ' + (px * U).toFixed(1) + ' ' + (py * U).toFixed(1)); o.arrow.style.opacity = g < 0.04 ? 0 : 1; }
        if (o.shots) o.shots.forEach(function (c, j) {   // each shot flies an arc from the shooters to their mark, one after another
          var ph = kf * 2.6 - j * 0.22, f = ph - Math.floor(ph), on = !held && kf > 0.02 && kf < 0.98 && ph > 0, a = S[i][o.a], b = S[i][o.b], lift = Math.min(60, L * U * 0.16) * Math.sin(f * Math.PI), sx = (j % 3 - 1) * 5;
          c.style.opacity = on ? 0.95 : 0; if (on) { c.setAttribute('cx', ((a.x + (b.x - a.x) * f) * U + sx * (1 - f)).toFixed(1)); c.setAttribute('cy', ((a.y + (b.y - a.y) * f) * U - lift).toFixed(1)); } });
        if (o.smoke) o.smoke.forEach(function (c, j) { var f = clamp(kf * 1.5 - j * 0.2, 0, 1), on = !held && f > 0 && f < 1; c.style.opacity = on ? 0.5 * (1 - f) : 0; if (on) { c.setAttribute('cx', (o.ra[0] * U + (j - 1) * 9 - dy / L * 4).toFixed(1)); c.setAttribute('cy', (o.ra[1] * U - f * 14 + dx / L * 4).toFixed(1)); c.setAttribute('r', (4 + f * 12).toFixed(1)); } });
      });
    }
    function render(tt) {
      t = clamp(tt, 0, TOTAL); var w = locate(t), i = w.i, k = w.k;
      if (i !== cur) { cur = i; classes(i); words(i); FX = buildFx(i); }
      if (camOn && !still) { var va = i ? camOf(i - 1) : [0, 0, W, H], vb = camOf(i), c = k >= 1 ? 1 : ease(Math.min(1, k / 0.3)); setView([va[0] + (vb[0] - va[0]) * c, va[1] + (vb[1] - va[1]) * c, va[2] + (vb[2] - va[2]) * c, va[3] + (vb[3] - va[3]) * c]); } else setView([0, 0, W, H]);
      runFx(i, k);
      var ku = Math.min(1, k / 0.78), e = pace(ku), dk = ku < 1 ? Math.sin(ku * Math.PI) : 0;
      units.forEach(function (u) {
        var b = target(i, u.id); if (!b) return; var a = i && k < 1 ? target(i - 1, u.id) : null, lu = FX && FX.lunge[u.id];
        if (k >= 1) { b.ox = 0; b.oy = 0; place(u.id, b); return; }
        if (!a) { b.o = b.o * ease(Math.min(1, k * 2.2)); place(u.id, b); return; }   // it comes onto the field
        var r = ROUTE[i][u.id], v = { o: a.o + (b.o - a.o) * e, lx: a.lx + (b.lx - a.lx) * e, ly: a.ly + (b.ly - a.ly) * e, sc: a.sc + (b.sc - a.sc) * e, dead: a.dead + (b.dead - a.dead) * ease(clamp((k - 0.6) / 0.4, 0, 1)), ox: lu ? lu[0] : 0, oy: lu ? lu[1] : 0 }, df = ((b.f - a.f + 540) % 360) - 180;
        if (r) {
          var p = onRoute(r, e); v.x = p[0]; v.y = p[1];
          // on the march it faces the way it goes (unless it falls back facing the enemy), and comes round to its new front at the end
          var e2 = Math.min(1, e + 0.02), q = onRoute(r, e2), head = Math.atan2(q[0] - p[0], -(q[1] - p[1])) * 180 / Math.PI, fwd = r.how !== 'retreat' && r.how !== 'feint' && r.L > 6 && u.k !== 'camp', turnIn = clamp(e / 0.18, 0, 1), turnOut = clamp((e - 0.72) / 0.28, 0, 1);
          if (fwd) { var d1 = ((head - a.f + 540) % 360) - 180, mid = a.f + d1 * ease(turnIn), d2 = ((b.f - mid + 540) % 360) - 180; v.f = mid + d2 * ease(turnOut); } else v.f = a.f + df * e;
          var sp = r.L * U / (MOVE[i] * 0.78 / 1000) / 60 * 2.2 * dk, dl = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; v.vx = (q[0] - p[0]) / dl * Math.min(7, sp); v.vy = (q[1] - p[1]) / dl * Math.min(7, sp);
          if (r.how === 'rout' || r.how === 'retreat') { v.ox += Math.sin(t / 90 + u.w) * 1.2 * dk; v.oy += Math.cos(t / 70 + u.d) * 1.2 * dk; }   // a ragged step back
        } else { v.x = b.x; v.y = b.y; v.f = a.f + df * e; }
        place(u.id, v);
      });
      scrub.value = Math.round(t / TOTAL * 1000); scrub.style.setProperty('--bf-p', (t / TOTAL * 100).toFixed(1) + '%');
      bPlay.textContent = playing && until == null ? 'Pause' : t >= TOTAL - 1 ? 'Replay' : 'Play';
    }
    function seek(tt) { render(tt); }
    function stop() { playing = false; until = null; cancelAnimationFrame(raf); bPlay.textContent = t >= TOTAL - 1 ? 'Replay' : 'Play'; }
    function loop(ts) {
      if (!playing) return; var dt = lastTs ? Math.min(80, ts - lastTs) : 16; lastTs = ts; var nt = t + dt;
      if (until != null && nt >= until) { render(until); stop(); return; }
      if (nt >= TOTAL) { render(TOTAL); stop(); return; }
      render(nt); raf = requestAnimationFrame(loop);
    }
    function run(to) { cancelAnimationFrame(raf); playing = true; until = to == null ? null : to; lastTs = 0; bPlay.textContent = to == null ? 'Pause' : 'Play'; if (to != null) playing = true; raf = requestAnimationFrame(loop); }
    function play() {
      if (t >= TOTAL - 1) render(0);
      if (!still && N > 1 && t < T0[1] - 900) render(T0[1] - 900);   // from the opening the film starts to move almost at once: the first words have been on screen already
      if (still) { playing = true; bPlay.textContent = 'Pause'; (function next() { raf = setTimeout(function () { if (!playing) return; if (cur >= N - 1) { stop(); return; } render(H0[cur + 1]); bPlay.textContent = 'Pause'; next(); }, Math.max(3400, P[Math.max(0, cur)].text.length * 45)); })(); return; }
      run(null); bPlay.textContent = 'Pause';
    }
    function stopAll() { clearTimeout(raf); stop(); }
    bBack.onclick = function () { stopAll(); if (cur > 0) seek(H0[cur - 1]); };
    bNext.onclick = function () { var to = cur + 1; stopAll(); if (to > N - 1) return; if (still) { seek(H0[to]); return; } seek(Math.max(t, T0[to])); run(H0[to]); bPlay.textContent = 'Play'; };
    bPlay.onclick = function () { if (playing && until == null) stopAll(); else { stopAll(); play(); } };
    scrub.oninput = function () { stopAll(); seek(+scrub.value / 1000 * TOTAL); };
    bCam.onclick = function () { camOn = !camOn; bCam.setAttribute('aria-pressed', camOn ? 'false' : 'true'); render(t); };
    box.addEventListener('keydown', function (e) { if (e.target === scrub) return; if (e.key === 'ArrowRight') { bNext.click(); e.preventDefault(); } else if (e.key === 'ArrowLeft') { bBack.click(); e.preventDefault(); } });
    function sizes() {   // names sized for the width on screen; the short name, no portrait and no leader's line where the plan is small
      var w = svg.getBoundingClientRect().width || 760; small = w < 560; F = Math.max(15, Math.min(30, (small ? 10.5 : 11.5) * W / w)); svg.style.setProperty('--bf-fs', (F * Z) + 'px');
      var z0 = Z; Z = 1; svg.style.setProperty('--bf-fs', F + 'px');   // measured at the whole field's size
      units.forEach(function (u) {
        var n = node[u.id]; n.lab.textContent = small && u.short ? u.short : u.name; if (n.lead) n.lead.style.display = small ? 'none' : ''; if (n.pic) n.pic.style.display = n.ring.style.display = small ? 'none' : '';
        var tw = n.lab.getComputedTextLength ? n.lab.getComputedTextLength() : 0, lw = n.lead && !small && n.lead.getComputedTextLength ? n.lead.getComputedTextLength() : 0, pr = n.pic && !small ? F * 1.2 : 0;
        n.tw = Math.max(tw, lw) || u.name.length * F * 0.5; n.bw = n.tw + F * (small ? 1.3 : 1.75) + 5 + (pr ? pr * 2 + 5 : 0); n.bh = Math.max(pr * 2, F * 1.15, (n.lead && !small ? 2.15 : 1.1) * F);
      });
      Z = z0; svg.style.setProperty('--bf-fs', (F * Z) + 'px'); LAY = []; CAM = []; var keep = cur; cur = -1; render(t); if (keep < 0) render(0);
      Array.prototype.forEach.call(gT.querySelectorAll('text'), function (tx_) {   // a ground's name stays inside the plan
        if (tx_.getAttribute('data-x') == null) tx_.setAttribute('data-x', tx_.getAttribute('x')); tx_.setAttribute('x', tx_.getAttribute('data-x'));
        if (!tx_.getBBox || (tx_.parentNode.getAttribute('class') || '').indexOf('bf-n') >= 0) return; var bb = tx_.getBBox(), x0 = +tx_.getAttribute('x');
        if (bb.x < 6) tx_.setAttribute('x', (x0 + 6 - bb.x).toFixed(1)); else if (bb.x + bb.width > W - 6) tx_.setAttribute('x', (x0 - (bb.x + bb.width - W + 6)).toFixed(1));
      });
    }
    render(0); sizes();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(sizes, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizes);
    root._bf = { go: function (i) { stopAll(); seek(H0[clamp(i, 0, N - 1)]); }, play: play, stop: stopAll, phase: function () { return Math.max(0, cur); }, phases: N, state: S, node: node, layout: lay,
      time: function () { return t; }, total: TOTAL, seek: function (x) { stopAll(); seek(x); }, starts: H0, camera: function (on) { camOn = !!on && !still; bCam.setAttribute('aria-pressed', camOn ? 'false' : 'true'); render(t); }, view: function () { return view.slice(); }, playing: function () { return playing; } };
    return root._bf;
  }
  return { mount: mount, KIND: KIND };
})();
