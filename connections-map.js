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
    loading = fetch('/data/polities.json?v=1').then(function (r) { return r.json(); }).then(function (d) {
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
  // neighbourhood: depth 1 (all), depth 2 (limited), outliers (contemporaries in the same broad region, unconnected)
  function hood(id, opts) {
    var c = BY[id], d1 = {}, d2 = {}, order1 = [];
    ADJ[id].forEach(function (l) { var o = other(l, id); if (!d1[o]) { d1[o] = l; order1.push(o); } });
    order1.sort(function (a, b) { return (BY[a].s || 0) - (BY[b].s || 0); });
    var lim2 = opts.compact ? 10 : 48, order2 = [];
    order1.forEach(function (p) {
      ADJ[p].forEach(function (l) { var o = other(l, p); if (o !== id && !d1[o] && !d2[o] && order2.length < lim2) { d2[o] = { parent: p, link: l }; order2.push(o); } });
    });
    var outl = [];
    if (!opts.compact || opts.outliers) {
      var lim = opts.compact ? 10 : 36;
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
    return { c: c, d1: d1, order1: order1, d2: d2, order2: order2, outl: outl };
  }
  function render(el, id, opts) {
    opts = opts || {};
    return load().then(function () {
      if (!BY[id]) { el.innerHTML = '<p class="cm-empty">This entity is not in the register yet.</p>'; return; }
      var h = hood(id, opts), W = opts.compact ? 760 : 1000, H = opts.compact ? 380 : 640, cx = W / 2, cy = H / 2;
      var R1 = Math.min(W, H) * (opts.compact ? 0.30 : 0.27), R2 = Math.min(W, H) * (opts.compact ? 0.46 : 0.43), R3 = Math.min(W, H) * 0.49;
      var pos = {}; pos[id] = [cx, cy];
      var n1 = h.order1.length;
      h.order1.forEach(function (o, i) { var a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / Math.max(n1, 1); pos[o] = [cx + R1 * Math.cos(a) * (W / H > 1.6 ? 1.6 : 1.25), cy + R1 * Math.sin(a)]; });
      var perParent = {};
      h.order2.forEach(function (o) { var p = h.d2[o].parent; (perParent[p] = perParent[p] || []).push(o); });
      Object.keys(perParent).forEach(function (p) {
        var base = Math.atan2(pos[p][1] - cy, (pos[p][0] - cx) / (W / H > 1.6 ? 1.6 : 1.25)), kids = perParent[p], spread = Math.min(0.9, 2 * Math.PI / Math.max(n1, 1) * 0.8);
        kids.forEach(function (o, k) { var a = base + (kids.length === 1 ? 0 : (k / (kids.length - 1) - 0.5) * spread); pos[o] = [cx + R2 * Math.cos(a) * (W / H > 1.6 ? 1.6 : 1.3), cy + R2 * Math.sin(a)]; });
      });
      h.outl.forEach(function (o, i) { var a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / Math.max(h.outl.length, 1) + 0.13; pos[o] = [cx + R3 * Math.cos(a) * (W / H > 1.6 ? 1.95 : 1.5), cy + R3 * Math.sin(a) * 0.98]; });
      var Y = opts.year == null ? null : opts.year;
      function linkActive(l) { return Y == null || ((l.f == null || l.f <= Y) && (l.u == null || l.u >= Y)); }
      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cm-svg" role="img" aria-label="Connections of ' + esc(h.c.n) + '">' +
        '<defs><filter id="cm-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
      function curve(a, b) { var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' Q' + (mx - dy * 0.12).toFixed(1) + ' ' + (my + dx * 0.12).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1); }
      h.order2.forEach(function (o) { var l = h.d2[o].link, p = h.d2[o].parent; svg += '<path class="cm-line cm-l2 cm-' + (STYLE[l.r] || 'firm') + (linkActive(l) ? '' : ' cm-off') + '" d="' + curve(pos[p], pos[o]) + '"/>'; });
      h.order1.forEach(function (o, i) { var l = h.d1[o]; svg += '<path class="cm-line cm-l1 cm-' + (STYLE[l.r] || 'firm') + (linkActive(l) ? '' : ' cm-off') + '" style="animation-delay:' + (i * 0.04).toFixed(2) + 's" d="' + curve(pos[id], pos[o]) + '"/>'; });
      function node(nid, cls, label) {
        var n = BY[nid], p = pos[nid], r = cls === 'cm-centre' ? 14 : (cls === 'cm-n1' ? 8 : (cls === 'cm-n2' ? 5.5 : 3.5));
        var dim = alive(n, Y) ? '' : ' cm-gone', prof = n.p ? ' cm-prof' : '';
        var txt = (n.n.length > 26 ? n.n.slice(0, 24) + '…' : n.n), ty = p[1] + (p[1] < cy ? -r - 7 : r + 15);
        return '<g class="cm-node ' + cls + dim + prof + '" data-id="' + esc(nid) + '" tabindex="0" role="button" aria-label="' + esc(n.n + ', ' + span(n) + (label ? ', ' + label : '')) + '">' +
          '<title>' + esc(n.n + ' (' + span(n) + ')' + (label ? ' — ' + label : '')) + '</title>' +
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + r + '"/>' +
          (cls === 'cm-out' && !opts.labelsAll ? '' : '<text x="' + p[0].toFixed(1) + '" y="' + ty.toFixed(1) + '" text-anchor="middle">' + esc(txt) + '</text>') + '</g>';
      }
      h.outl.forEach(function (o) { svg += node(o, 'cm-out', 'no direct connection'); });
      h.order2.forEach(function (o) { svg += node(o, 'cm-n2', ''); });
      h.order1.forEach(function (o) { svg += node(o, 'cm-n1', sentence(h.d1[o])); });
      svg += node(id, 'cm-centre', '') + '</svg>';
      el.innerHTML = svg;
      el.querySelectorAll('.cm-node').forEach(function (g) {
        function go() { if (opts.onSelect) opts.onSelect(g.getAttribute('data-id')); }
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
