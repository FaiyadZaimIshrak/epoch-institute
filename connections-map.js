// connections-map.js - interactive connections between states (data/polities.json).
// Used by the /connections page (full map, timeline, year slider) and by profile pages (mini map).
// Radial layout: selected state in the centre, direct relations on the inner ring, second-step relations further
// out, unconnected contemporaries of the same part of the world as dim outliers at the edge.
var ConnectionsMap = (function () {
  var DATA = null, BY = {}, ADJ = {}, loading = null;
  var REL = {   // [label when the selected state is the source, label when it is the target]
    'part-of': ['was part of', 'included'], 'province-of': ['was a province of', 'held as a province'],
    'vassal-of': ['was a vassal of', 'had as a vassal'], 'tributary-to': ['paid tribute to', 'received tribute from'],
    'protectorate-of': ['was a protectorate of', 'protected'], 'colony-of': ['was a colony of', 'held as a colony'],
    'personal-union-with': ['in personal union with', 'in personal union with'], 'successor-of': ['succeeded', 'was succeeded by'],
    'predecessor-of': ['preceded', 'was preceded by'], 'conquered-by': ['was conquered by', 'conquered'],
    'split-from': ['split from', 'lost'], 'merged-into': ['merged into', 'absorbed']
  };
  var STYLE = { 'successor-of': 'seq', 'predecessor-of': 'seq', 'vassal-of': 'loose', 'tributary-to': 'loose', 'protectorate-of': 'loose', 'personal-union-with': 'loose' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yr(y) { if (y == null) return '?'; y = Math.round(y); return y < 0 ? (-y) + ' BCE' : y + ' CE'; }
  function span(n) { return yr(n.s) + ' – ' + (n.e == null ? 'present' : yr(n.e)); }
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (loading) return loading;
    loading = fetch('/data/polities.json?v=8').then(function (r) { return r.json(); }).then(function (d) {
      DATA = d; d.nodes.forEach(function (n) { BY[n.id] = n; ADJ[n.id] = []; });
      d.links.forEach(function (l) { if (BY[l.s] && BY[l.t]) { ADJ[l.s].push(l); ADJ[l.t].push(l); } });
      return d;
    });
    return loading;
  }
  function other(l, id) { return l.s === id ? l.t : l.s; }
  // 'A was part of B' style sentence, always source -> target
  function sentence(l) { var p = REL[l.r] || [l.r]; return BY[l.s].n + ' ' + p[0] + ' ' + BY[l.t].n; }
  function alive(n, y) { return y == null || ((n.s == null || n.s <= y) && (n.e == null || n.e >= y)); }
  function overlap(a, b) { return (a.s == null || b.e == null || a.s <= b.e) && (b.s == null || a.e == null || b.s <= a.e); }
  function linkOn(l, y) { return y == null || ((l.f == null || l.f <= y) && (l.u == null || l.u >= y)); }
  function plural(t) { t = String(t || 'state').replace(/-/g, ' '); if (t === 'other') return 'other states'; return /(s|x|ch|sh)$/.test(t) ? t + 'es' : /[^aeiou]y$/.test(t) ? t.slice(0, -1) + 'ies' : t + 's'; }
  // neighbourhood: depth 1 (big hubs: the most important individually, the rest grouped by type), depth 2 (limited),
  // outliers (contemporaries in the same broad region, unconnected)
  function hood(id, opts) {
    var c = BY[id], d1 = {}, d2 = {}, all1 = [], Y = opts.year == null ? null : opts.year;
    ADJ[id].forEach(function (l) { var o = other(l, id); if (!d1[o]) { d1[o] = l; all1.push(o); } });
    var max1 = opts.compact ? 14 : (opts.narrow ? 12 : 30), order1 = all1, groups = [];
    if (opts.expand || all1.length > max1) {
      function score(o) { var l = d1[o]; return ADJ[o].length + (BY[o].p ? 40 : 0) + (STYLE[l.r] === 'seq' ? 200 : 0) + (linkOn(l, Y) ? 0 : -1000); }
      var keep = [], rest = [];
      if (opts.expand) {   // one type only: up to 40 of them individually, the rest of that type as one '+N more' bubble, other types hidden (back button)
        all1.forEach(function (o) { if ((BY[o].t || 'state') === opts.expand) keep.push(o); });
        keep.sort(function (a, b) { return score(b) - score(a); });
        var cap = opts.compact || opts.narrow ? 12 : 40;
        if (keep.length > cap) groups.push({ key: 'g:*', type: '*', ids: keep.slice(cap) });
        keep = keep.slice(0, cap);
      }
      else {
        var ranked = all1.slice().sort(function (a, b) { return score(b) - score(a); });
        keep = ranked.slice(0, max1 - 6); rest = ranked.slice(max1 - 6);
      }
      if (rest.length <= 4) { keep = keep.concat(rest); rest = []; }
      var byType = {}, few = [];
      rest.forEach(function (o) { var t = BY[o].t || 'state'; (byType[t] = byType[t] || []).push(o); });
      Object.keys(byType).forEach(function (t) { if (byType[t].length < 3) { few = few.concat(byType[t]); delete byType[t]; } });
      var types = Object.keys(byType).sort(function (a, b) { return byType[b].length - byType[a].length; });
      var maxG = opts.compact || opts.narrow ? 5 : 9;
      types.forEach(function (t, i) {
        if (i < maxG - 1 || types.length <= maxG) groups.push({ key: 'g:' + t, type: t, ids: byType[t] });
        else few = few.concat(byType[t]);
      });
      if (few.length === 1) keep.push(few[0]); else if (few.length) groups.push({ key: 'g:*', type: '*', ids: few });
      var more = opts.expand ? ' more ' + plural(opts.expand) : ' more';
      groups.forEach(function (g) { g.s = Math.min.apply(null, g.ids.map(function (o) { return BY[o].s == null ? 9999 : BY[o].s; })); g.label = g.type === '*' ? g.ids.length + more : g.ids.length + ' ' + (g.ids.length === 1 ? String(g.type).replace(/-/g, ' ') : plural(g.type)); });
      order1 = keep;
    }
    order1 = order1.slice().sort(function (a, b) { return (BY[a].s || 0) - (BY[b].s || 0); });
    var big = order1.length + groups.length > 20, lim2 = opts.compact || opts.narrow ? 10 : (big ? 18 : 40), per = opts.compact || opts.narrow ? 3 : (big ? 2 : 6), order2 = [];
    order1.forEach(function (p) {
      var k = 0;
      ADJ[p].forEach(function (l) { var o = other(l, p); if (o !== id && !d1[o] && !d2[o] && order2.length < lim2 && k < per) { d2[o] = { parent: p, link: l }; order2.push(o); k++; } });
    });
    var outl = [];
    if (!opts.compact || opts.outliers) {
      var lim = opts.compact || opts.narrow ? 10 : 36;
      for (var i = 0; i < DATA.nodes.length && outl.length < lim; i++) {
        var n = DATA.nodes[i];
        if (n.id === id || d1[n.id] || d2[n.id] || n.b !== c.b || !overlap(n, c) || ADJ[n.id].length) continue;
        outl.push(n.id);
      }
      for (var j = 0; j < DATA.nodes.length && outl.length < lim; j++) {   // then connected-elsewhere contemporaries
        var m = DATA.nodes[j];
        if (m.id === id || d1[m.id] || d2[m.id] || outl.indexOf(m.id) !== -1 || m.b !== c.b || !overlap(m, c)) continue;
        outl.push(m.id);
      }
    }
    var total2 = {};   // all second-step states, for the card's count
    all1.forEach(function (p) { ADJ[p].forEach(function (l) { var o = other(l, p); if (o !== id && !d1[o]) total2[o] = 1; }); });
    return { c: c, d1: d1, order1: order1, groups: groups, d2: d2, order2: order2, outl: outl, total1: all1.length, total2: Object.keys(total2).length };
  }
  // labels that collide: keep the more important one (centre, inner ring, groups, outer ring), nudge the other up or
  // down by a line, else hide it until hover (the node keeps its tooltip and aria-label)
  function declutter(svg) {
    var items = [], placed = [];
    svg.querySelectorAll('.cm-node text:not(.cm-group-n)').forEach(function (t) {
      var c = t.parentNode.classList;
      items.push({ t: t, pr: c.contains('cm-centre') ? 0 : (c.contains('cm-n1') || c.contains('cm-group')) ? 1 : c.contains('cm-n2') ? 2 : 3 });
    });
    items.sort(function (a, b) { return a.pr - b.pr; });
    function hit(b) { return placed.some(function (p) { return b.x < p.x + p.w && p.x < b.x + b.w && b.y < p.y + p.h && p.y < b.y + b.h; }); }
    // node circles are obstacles too (a label must not run across another state's dot)
    svg.querySelectorAll('.cm-node circle').forEach(function (c) {
      var r = +c.getAttribute('r'), x = +c.getAttribute('cx'), y = +c.getAttribute('cy');
      if (r >= 3.5) placed.push({ x: x - r, y: y - r, w: 2 * r, h: 2 * r });
    });
    items.forEach(function (it) {
      var bb; try { bb = it.t.getBBox(); } catch (e) { return; }
      if (!bb || !bb.width) return;
      var b = { x: bb.x - 3, y: bb.y - 1, w: bb.width + 6, h: bb.height + 2 }, y0 = +it.t.getAttribute('y');
      if (!hit(b) || it.pr === 0) { placed.push(b); return; }
      var steps = [b.h, -b.h, 2 * b.h, -2 * b.h];
      for (var i = 0; i < steps.length; i++) {
        var nb = { x: b.x, y: b.y + steps[i], w: b.w, h: b.h };
        if (!hit(nb)) { it.t.setAttribute('y', (y0 + steps[i]).toFixed(1)); placed.push(nb); return; }
      }
      it.t.classList.add('cm-lbl-hidden');
    });
  }
  function render(el, id, opts) {
    opts = Object.assign({}, opts || {});
    // phones: a tall layout with fewer nodes, so that labels stay readable
    opts.narrow = !opts.compact && el.clientWidth > 0 && el.clientWidth < 600;
    return load().then(function () {
      if (!BY[id]) { el.innerHTML = '<p class="cm-empty">This entity is not in the register yet.</p>'; return; }
      var h = hood(id, opts), n1all = h.order1.length + h.groups.length, W = opts.compact ? 760 : (opts.narrow ? 520 : 1000), H = opts.compact ? 380 : (opts.narrow ? 760 : 640 + Math.max(0, n1all - 30) * 14), cx = W / 2, cy = H / 2;
      var R1 = Math.min(W, H) * (opts.compact ? 0.30 : 0.27), R2 = Math.min(W, H) * (opts.compact ? 0.42 : 0.43), R3 = Math.min(W, H) * 0.49;
      var st1 = W / H > 1.6 ? 1.6 : 1.25, st2 = W / H > 1.6 ? 1.6 : 1.3, st3 = W / H > 1.6 ? 1.95 : 1.5;
      // ellipse radii (x, y) of the three rings
      var E1 = opts.narrow ? [100, 290] : [R1 * st1, R1], E2 = opts.narrow ? [205, 335] : [R2 * st2, R2], E3 = opts.narrow ? [250, 372] : [R3 * st3, R3 * 0.98];
      var pos = {}; pos[id] = [cx, cy];
      var ring1 = h.order1.map(function (o) { return { k: o, s: BY[o].s || 0 }; }).concat(h.groups.map(function (g) { return { k: g.key, s: g.s }; }));
      ring1.sort(function (a, b) { return a.s - b.s; });
      var n1 = ring1.length;
      // many nodes: left and right sides only (labels beside them never collide at the top and bottom)
      var half = Math.ceil(n1 / 2), WEDGE = (opts.narrow ? 62 : 75) * Math.PI / 180;
      function ang(i) {
        if (n1 <= 10) return -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / Math.max(n1, 1);
        if (i < half) return -WEDGE + (half === 1 ? 0.5 : i / (half - 1)) * 2 * WEDGE;   // right side, top to bottom
        var m = n1 - half, j = i - half; return Math.PI - WEDGE + (m === 1 ? 0.5 : j / (m - 1)) * 2 * WEDGE;   // left side, bottom to top
      }
      ring1.forEach(function (r, i) { var a = ang(i); pos[r.k] = [cx + E1[0] * Math.cos(a), cy + E1[1] * Math.sin(a)]; });
      var perParent = {};
      h.order2.forEach(function (o) { var p = h.d2[o].parent; (perParent[p] = perParent[p] || []).push(o); });
      Object.keys(perParent).forEach(function (p) {
        var base = Math.atan2((pos[p][1] - cy) / E1[1], (pos[p][0] - cx) / E1[0]), kids = perParent[p], spread = Math.min(0.9, 2 * Math.PI / Math.max(n1, 1) * 0.8);
        kids.forEach(function (o, k) { var a = base + (kids.length === 1 ? 0 : (k / (kids.length - 1) - 0.5) * spread); pos[o] = [cx + E2[0] * Math.cos(a), cy + E2[1] * Math.sin(a)]; });
      });
      h.outl.forEach(function (o, i) { var a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / Math.max(h.outl.length, 1) + 0.13; pos[o] = [cx + E3[0] * Math.cos(a), cy + E3[1] * Math.sin(a)]; });
      var Y = opts.year == null ? null : opts.year;
      function linkActive(l) { return Y == null || ((l.f == null || l.f <= Y) && (l.u == null || l.u >= Y)); }
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cm-svg" role="img" aria-label="Connections of ' + esc(h.c.n) + '">' +
        '<defs><filter id="cm-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
      function curve(a, b) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + (mx - dy * 0.12).toFixed(1) + ' ' + (my + dx * 0.12).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
      h.order2.forEach(function (o) { var l = h.d2[o].link, p = h.d2[o].parent; svg += '<path class="cm-line cm-l2 cm-' + (STYLE[l.r] || 'firm') + (linkActive(l) ? '' : ' cm-off') + '" d="' + curve(pos[p], pos[o]) + '"/>'; });
      h.order1.forEach(function (o, i) { var l = h.d1[o]; svg += '<path class="cm-line cm-l1 cm-' + (STYLE[l.r] || 'firm') + (linkActive(l) ? '' : ' cm-off') + '" style="animation-delay:' + (i * 0.04).toFixed(2) + 's" d="' + curve(pos[id], pos[o]) + '"/>'; });
      h.groups.forEach(function (g) { var on = g.ids.some(function (o) { return linkActive(h.d1[o]); }); svg += '<path class="cm-line cm-l1 cm-group-line' + (on ? '' : ' cm-off') + '" d="' + curve(pos[id], pos[g.key]) + '"/>'; });
      // label beside the node on the inner ring (left/right of it), above/below elsewhere
      function labelAt(p, r, beside) {
        if (beside && Math.abs(p[0] - cx) > (opts.narrow ? 40 : 70)) { var right = p[0] > cx; return ' x="' + (p[0] + (right ? r + 6 : -r - 6)).toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="' + (right ? 'start' : 'end') + '"'; }
        return ' x="' + p[0].toFixed(1) + '" y="' + (p[1] + (p[1] < cy ? -r - 7 : r + 15)).toFixed(1) + '" text-anchor="middle"';
      }
      function node(nid, cls, label) {
        var n = BY[nid], p = pos[nid], r = cls === 'cm-centre' ? 14 : (cls === 'cm-n1' ? 8 : (cls === 'cm-n2' ? 5.5 : 3.5));
        var dim = alive(n, Y) ? '' : ' cm-gone', prof = n.p ? ' cm-prof' : '';
        var cut = opts.narrow && cls !== 'cm-centre' ? 15 : 26, txt = (n.n.length > cut ? n.n.slice(0, cut - 2) + '…' : n.n), showLabel = cls === 'cm-n1' || cls === 'cm-centre' || (cls === 'cm-n2' && ((h.order2.length <= 24 && n1 <= (opts.compact ? 8 : 16)) || opts.labelsAll)) || (cls === 'cm-out' && opts.labelsAll);
        return '<g class="cm-node ' + cls + dim + prof + '" data-id="' + esc(nid) + '" tabindex="0" role="button" aria-label="' + esc(n.n + ', ' + span(n) + (label ? ', ' + label : '')) + '">' +
          '<title>' + esc(n.n + ' (' + span(n) + ')' + (label ? ' — ' + label : '')) + '</title>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r + '"/>' +
          (showLabel ? '<text' + labelAt(p, r, cls === 'cm-n1') + '>' + esc(txt) + '</text>' : '') + '</g>';
      }
      function group(g) {
        var p = pos[g.key], r = 9 + Math.min(9, Math.sqrt(g.ids.length) * 1.4);
        var names = g.ids.slice(0, 6).map(function (o) { return BY[o].n; }).join(', ') + (g.ids.length > 6 ? '…' : '');
        return '<g class="cm-node cm-group' + (g.type === '*' ? ' cm-group-rest' : '') + '" data-group="' + esc(g.type) + '"' + (g.type === '*' ? '' : ' tabindex="0" role="button" aria-label="' + esc(g.label + ': show them') + '"') + '>' +
          '<title>' + esc(g.label + ': ' + names + (g.type === '*' ? '' : ' (click to show them)')) + '</title>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/>' +
          '<text class="cm-group-n" x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="middle">' + g.ids.length + '</text>' +
          '<text' + labelAt(p, r, true) + '>' + esc(g.type === '*' ? (opts.expand ? 'more' : 'more') : plural(g.type)) + '</text></g>';
      }
      h.outl.forEach(function (o) { svg += node(o, 'cm-out', 'no direct connection'); });
      h.order2.forEach(function (o) { svg += node(o, 'cm-n2', ''); });
      h.groups.forEach(function (g) { svg += group(g); });
      h.order1.forEach(function (o) { svg += node(o, 'cm-n1', sentence(h.d1[o])); });
      svg += node(id, 'cm-centre', '') + '</svg>';
      el.innerHTML = svg + (opts.expand ? '<button type="button" class="cm-back">← All connections</button>' : '');
      declutter(el.querySelector('svg'));
      var back = el.querySelector('.cm-back'); if (back) back.addEventListener('click', function () { if (opts.onExpand) opts.onExpand(null); });
      el.querySelectorAll('.cm-node').forEach(function (g) {
        function go() { var t = g.getAttribute('data-group'); if (t != null) { if (t !== '*') { if (opts.onExpand) opts.onExpand(t); else if (opts.onSelect) opts.onSelect(id); } return; } if (opts.onSelect) opts.onSelect(g.getAttribute('data-id')); }
        g.addEventListener('click', go);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      return h;
    });
  }
  // timeline rows for the direct relations of id
  function timeline(id) {
    var c = BY[id], rows = [];
    ADJ[id].forEach(function (l) {
      var o = BY[other(l, id)], f = l.f, u = l.u;
      // an undated succession is a moment: the year the successor began
      if (l.r === 'successor-of' && f == null && BY[l.s].s != null) { f = BY[l.s].s; if (u == null) u = f; }
      if (f == null) f = Math.max(c.s == null ? -1e9 : c.s, o.s == null ? -1e9 : o.s);
      if (u == null) u = Math.min(c.e == null ? 2030 : c.e, o.e == null ? 2030 : o.e);
      if (f <= -1e9) f = u;
      rows.push({ id: o.id, name: o.n, sentence: sentence(l), f: f, u: Math.max(u, f), exact: l.f != null });
    });
    rows.sort(function (a, b) { return a.f - b.f; });
    return rows;
  }
  return { load: load, render: render, timeline: timeline, get: function (id) { return BY[id]; }, all: function () { return DATA ? DATA.nodes : []; }, span: span, yr: yr, esc: esc, degree: function (id) { return (ADJ[id] || []).length; } };
})();
