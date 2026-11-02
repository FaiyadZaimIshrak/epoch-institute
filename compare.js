// compare.js: /compare, two profiles side by side (Nov 2026): any kind (states, cultures, religions, languages,
// movements, forms of government). Needs shared-data.js (EMPIRES, EMPIRE_INFO, PROFILE_KINDS, profileSpan, profileUrl,
// toSlug, firstSentence) and shared-nav.js (escHtml). Each profile's takeaways, key events and facts come from
// data/compare/<slug>.json (written by build-pages.ps1; COMPARE_V in the page). The address keeps ?a=&b=.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var BY = {}; EMPIRES.forEach(function (e) { BY[e.name] = e; });
  var NAMES = EMPIRES.map(function (e) { return e.name; }).sort(function (a, b) { return a.localeCompare(b); });
  var FACTS_POLITY = [['capital', 'Capital'], ['founder', 'Founder'], ['predecessor', 'Came after'], ['successor', 'Followed by']];
  var cache = {};
  function esc(s) { return escHtml(String(s == null ? '' : s)); }
  function yl(y) { y = Math.round(y); return y < 0 ? -y + ' BCE' : y + ' CE'; }
  function kindOf(e) { return profileKind(e); }
  function factsOf(e) { var k = PROFILE_KINDS[kindOf(e)]; return k.facts || FACTS_POLITY; }
  function load(name) {
    if (!cache[name]) cache[name] = fetch('/data/compare/' + toSlug(name) + '.json?v=' + COMPARE_V).then(function (r) { return r.ok ? r.json() : { t: [], ev: [], f: {} }; }).catch(function () { return { t: [], ev: [], f: {} }; });
    return cache[name];
  }
  // a year to sort a key event by: "1453", "c. 2500 BCE", "27 BCE", "3rd century BCE", "1450s"
  function yearOf(s) {
    s = String(s); var bce = /BCE|BC\b/.test(s);
    var c = s.match(/(\d+)(?:st|nd|rd|th)\s+(?:century|millennium)/i);
    if (c) { var n = +c[1], mil = /millennium/i.test(s) ? 1000 : 100; return bce ? -(n * mil - mil / 2) : n * mil - mil / 2; }
    var m = s.replace(/,(?=\d{3})/g, '').match(/\d+/); if (!m) return null;
    return bce ? -(+m[0]) : +m[0];
  }

  // the pickers
  var dl = document.createElement('datalist'); dl.id = 'cmp-names';
  dl.innerHTML = NAMES.map(function (n) { return '<option value="' + esc(n) + '">'; }).join(''); document.body.appendChild(dl);
  var A = $('cmp-a'), B = $('cmp-b');
  function pick(v) { v = String(v || '').trim(); if (BY[v]) return v; var f = v.toLowerCase(); return NAMES.filter(function (n) { return n.toLowerCase() === f; })[0] || null; }

  function timeline(ea, eb) {
    var sa = profileSpan(ea), sb = profileSpan(eb), lo = Math.min(sa[0], sb[0]), hi = Math.max(sa[1], sb[1]), pad = Math.max(20, (hi - lo) * 0.06);
    lo -= pad; hi += pad;
    var W = 1000, x = function (y) { return ((y - lo) / (hi - lo) * W).toFixed(1); };
    var o0 = Math.max(sa[0], sb[0]), o1 = Math.min(sa[1], sb[1]);
    var ticks = [], step = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000].filter(function (s) { return (hi - lo) / s <= 8; })[0] || 10000;
    for (var t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
    var bar = function (s, y, cls, n) { return '<rect class="' + cls + '" x="' + x(s[0]) + '" y="' + y + '" width="' + Math.max(3, x(s[1]) - x(s[0])) + '" height="26" rx="4"></rect><text class="cmp-tl-l" x="' + x(s[0]) + '" y="' + (y - 6) + '">' + esc(n) + '</text>'; };
    var svg = '<svg class="cmp-tl" viewBox="0 0 ' + W + ' 150" role="img" aria-label="' + esc(ea.name + ', ' + yl(sa[0]) + ' to ' + yl(sa[1]) + '; ' + eb.name + ', ' + yl(sb[0]) + ' to ' + yl(sb[1])) + '">' +
      (o1 > o0 ? '<rect class="cmp-tl-ov" x="' + x(o0) + '" y="18" width="' + (x(o1) - x(o0)) + '" height="104"></rect>' : '') +
      bar(sa, 34, 'cmp-tl-a', ea.name) + bar(sb, 92, 'cmp-tl-b', eb.name) +
      ticks.map(function (t) { return '<line class="cmp-tl-tick" x1="' + x(t) + '" x2="' + x(t) + '" y1="128" y2="134"></line><text class="cmp-tl-t" x="' + x(t) + '" y="148">' + (t === 0 ? '1 CE' : yl(t)) + '</text>'; }).join('') +
      '<line class="cmp-tl-axis" x1="0" x2="' + W + '" y1="128" y2="128"></line></svg>';
    var say;
    if (o1 > o0) say = 'They existed at the same time for about <b>' + Math.round(o1 - o0).toLocaleString('en-GB') + ' years</b>, from ' + yl(o0) + ' to ' + (o1 >= new Date().getFullYear() - 1 ? 'today' : yl(o1)) + '.';
    else { var first = sa[1] < sb[0] ? [ea, eb, sa[1], sb[0]] : [eb, ea, sb[1], sa[0]]; say = 'They never existed at the same time: ' + esc(first[0].name) + ' ended about <b>' + Math.round(first[3] - first[2]).toLocaleString('en-GB') + ' years</b> before ' + esc(first[1].name) + ' began.'; }
    return '<section class="cmp-sec"><h2 class="ref-sec-title">Side by side in time</h2><p class="cmp-say">' + say + '</p><div class="cmp-tl-wrap">' + svg + '</div></section>';
  }
  function head(e, cls) {
    var k = PROFILE_KINDS[kindOf(e)], info = firstSentence(EMPIRE_INFO[e.name] || '', 260);
    return '<a class="cmp-head ' + cls + '" href="' + profileUrl(e) + '"><img src="/logos/thumbs/' + encodeURIComponent(e.name) + '.png" alt="" width="72" height="72" onerror="this.style.visibility=\'hidden\'"><span class="cmp-head-b"><span class="cmp-k">' + esc(k.single) + ' &middot; ' + esc(e.region) + '</span><span class="cmp-n">' + esc(e.name) + '</span><span class="cmp-d">' + esc(profileSpanText(e)) + '</span>' + (info ? '<span class="cmp-i">' + esc(info) + '</span>' : '') + '<span class="cmp-go">Read the profile &rarr;</span></span></a>';
  }
  function render() {
    var a = pick(A.value), b = pick(B.value), out = $('cmp-out');
    var p = new URLSearchParams(); if (a) p.set('a', a); if (b) p.set('b', b);
    try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) {}
    if (!a || !b) { out.innerHTML = '<p class="cmp-hint">Choose two profiles: two cultures, a state and a religion, a movement and a form of government. Any two of the ' + NAMES.length + ' can be compared.</p>' + suggestions(); return; }
    if (a === b) { out.innerHTML = '<p class="cmp-hint">Choose two different profiles.</p>'; return; }
    var ea = BY[a], eb = BY[b];
    document.title = a + ' and ' + b + ' compared — The Epoch Institute';
    out.innerHTML = '<div class="cmp-heads">' + head(ea, 'is-a') + head(eb, 'is-b') + '</div>' + timeline(ea, eb) + '<p class="cmp-hint">Loading…</p>';
    Promise.all([load(a), load(b)]).then(function (d) {
      if (pick(A.value) !== a || pick(B.value) !== b) return;
      var h = '<div class="cmp-heads">' + head(ea, 'is-a') + head(eb, 'is-b') + '</div>' + timeline(ea, eb);
      // at a glance
      if ((d[0].t || []).length || (d[1].t || []).length) h += '<section class="cmp-sec"><h2 class="ref-sec-title">At a glance</h2><div class="cmp-two">' + [d[0], d[1]].map(function (x, i) {
        return '<div class="cmp-col ' + (i ? 'is-b' : 'is-a') + '"><h3>' + esc(i ? b : a) + '</h3><ul>' + (x.t || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' + (x.dyk ? '<p class="cmp-dyk"><b>Did you know?</b> ' + esc(x.dyk) + '</p>' : '') + '</div>';
      }).join('') + '</div></section>';
      // facts
      var fa = factsOf(ea), fb = factsOf(eb), same = kindOf(ea) === kindOf(eb);
      var frow = function (lbl, va, vb) { return '<tr><th scope="row">' + esc(lbl) + '</th><td class="is-a">' + esc(va || '—') + '</td><td class="is-b">' + esc(vb || '—') + '</td></tr>'; };
      var ft = '';
      if (same) ft = fa.map(function (f) { return frow(f[1], d[0].f[f[0]], d[1].f[f[0]]); }).join('');
      else ft = fa.map(function (f) { return frow(f[1], d[0].f[f[0]], ''); }).join('') + fb.map(function (f) { return frow(f[1], '', d[1].f[f[0]]); }).join('');
      h += '<section class="cmp-sec"><h2 class="ref-sec-title">The facts</h2><div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th></th><th scope="col" class="is-a">' + esc(a) + '</th><th scope="col" class="is-b">' + esc(b) + '</th></tr></thead><tbody>' +
        frow('Kind', PROFILE_KINDS[kindOf(ea)].single, PROFILE_KINDS[kindOf(eb)].single) + frow('Region', ea.region, eb.region) + frow('Dates', profileSpanText(ea), profileSpanText(eb)) + ft + '</tbody></table></div></section>';
      // key events on one list
      var evs = [];
      (d[0].ev || []).forEach(function (v) { evs.push({ s: 'a', y: yearOf(v[0]), d: v[0], t: v[1] }); });
      (d[1].ev || []).forEach(function (v) { evs.push({ s: 'b', y: yearOf(v[0]), d: v[0], t: v[1] }); });
      evs = evs.filter(function (v) { return v.y !== null; }).sort(function (x, y) { return x.y - y.y; });
      if (evs.length) h += '<section class="cmp-sec"><h2 class="ref-sec-title">Key events, in one line of time</h2><p class="cmp-key"><span class="is-a">' + esc(a) + '</span><span class="is-b">' + esc(b) + '</span></p><ol class="cmp-evs">' +
        evs.map(function (v) { return '<li class="is-' + v.s + '"><span class="cmp-ev-y">' + esc(v.d) + '</span><span class="cmp-ev-t">' + esc(v.t) + '</span><span class="cmp-ev-w">' + esc(v.s === 'a' ? a : b) + '</span></li>'; }).join('') + '</ol></section>';
      h += '<p class="cmp-more"><a href="/race?p=' + encodeURIComponent(toSlug(a)) + ',' + encodeURIComponent(toSlug(b)) + '"' + (ea.points && eb.points ? '' : ' hidden') + '>Race them through the centuries &rarr;</a> <a href="/atlas?year=' + Math.round((Math.max(profileSpan(ea)[0], profileSpan(eb)[0]) + Math.min(profileSpan(ea)[1], profileSpan(eb)[1])) / 2) + '">The world in their time, on the atlas &rarr;</a></p>';
      out.innerHTML = h;
    });
  }
  // a few pairs to start from: contemporaries of one kind in different regions
  var START = [['Roman Empire', 'Han dynasty'], ['Maya civilization', 'Khmer Empire'], ['Jōmon culture', 'Natufians'], ['Vikings', 'Polynesians'], ['Buddhism', 'Christianity'], ['Absolute monarchy', 'Parliamentary democracy']];
  function suggestions() {
    var ok = START.filter(function (p) { return BY[p[0]] && BY[p[1]]; });
    return ok.length ? '<p class="cmp-start">Or start with: ' + ok.map(function (p) { return '<a href="?a=' + encodeURIComponent(p[0]) + '&amp;b=' + encodeURIComponent(p[1]) + '">' + esc(p[0]) + ' and ' + esc(p[1]) + '</a>'; }).join(' · ') + '</p>' : '';
  }
  var P = new URLSearchParams(location.search);
  A.value = pick(P.get('a')) || ''; B.value = pick(P.get('b')) || '';
  [A, B].forEach(function (el) { el.addEventListener('change', render); el.addEventListener('input', function () { if (pick(el.value)) render(); }); });
  $('cmp-swap').addEventListener('click', function () { var t = A.value; A.value = B.value; B.value = t; render(); });
  $('cmp-random').addEventListener('click', function () {
    // two profiles of one kind that lived at the same time, in different regions
    for (var i = 0; i < 200; i++) {
      var x = EMPIRES[Math.floor(Math.random() * EMPIRES.length)], y = EMPIRES[Math.floor(Math.random() * EMPIRES.length)];
      if (x === y || kindOf(x) !== kindOf(y) || x.region === y.region) continue;
      var sx = profileSpan(x), sy = profileSpan(y); if (Math.min(sx[1], sy[1]) - Math.max(sx[0], sy[0]) < 50) continue;
      A.value = x.name; B.value = y.name; render(); return;
    }
  });
  render();
  window.epochCompare = { yearOf: yearOf, pick: pick, render: render };
})();
