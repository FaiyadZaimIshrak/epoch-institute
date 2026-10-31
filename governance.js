// /governance: "Through the centuries", the states of the register by their recorded kind, century by century, as a
// stacked area chart (the dataviz method: one axis, fixed colour per series in stack order, a 2 px surface gap between
// fills, a legend, a crosshair readout, a table view). Data: GOV_CHART, written into the page by build-pages.ps1
// ({c: century labels, y: sample years, s: [[name, slot, count per century], ...]}). Count or share of all states.
(function () {
  'use strict';
  var D = window.GOV_CHART, box = document.getElementById('gv-chart');
  if (!D || !box) return;
  var NS = 'http://www.w3.org/2000/svg', W = 960, H = 380, L = 52, R = 14, T = 14, B = 40, n = D.c.length;
  var mode = 'count';
  try { if (localStorage.getItem('epoch-gov-chart') === 'share') mode = 'share'; } catch (e) {}
  var tot = D.c.map(function (_, i) { return D.s.reduce(function (a, s) { return a + s[2][i]; }, 0); });
  function el(tag, at, par) { var e = document.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); if (par) par.appendChild(e); return e; }
  function x(i) { return L + (W - L - R) * i / (n - 1); }
  function val(s, i) { return mode === 'share' ? (tot[i] ? 100 * s[2][i] / tot[i] : 0) : s[2][i]; }
  var head = document.createElement('div'); head.className = 'gv-chart-head';
  head.innerHTML = '<ul class="gv-legend">' + D.s.map(function (s) { return '<li><span class="gv-sw gv-k' + s[1] + '"></span>' + s[0] + '</li>'; }).join('') + '</ul>' +
    '<div class="gv-seg" role="group" aria-label="Show"><button type="button" data-m="count">Number of states</button><button type="button" data-m="share">Share</button></div>';
  box.appendChild(head);
  var wrap = document.createElement('div'); wrap.className = 'gv-plot'; box.appendChild(wrap);
  var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Recorded states by form, from the 30th century BCE to the 21st century' }, wrap);
  var tip = document.createElement('div'); tip.className = 'gv-tip'; tip.hidden = true; wrap.appendChild(tip);
  var gGrid = el('g', { 'class': 'gv-grid' }, svg), gArea = el('g', {}, svg), gAxis = el('g', { 'class': 'gv-axis' }, svg);
  var cross = el('line', { 'class': 'gv-cross', y1: T, y2: H - B, x1: -10, x2: -10 }, svg);
  // x axis: a label at the round millennia and the last centuries, where the century labels run
  var XT = [[-3000, '3000 BCE'], [-2000, '2000 BCE'], [-1000, '1000 BCE'], [0, '1 CE'], [1000, '1000'], [1500, '1500'], [2000, '2000']];
  function xOfYear(yr) { for (var i = 0; i < n - 1; i++) if (D.y[i + 1] >= yr) return x(i) + (x(i + 1) - x(i)) * (yr - D.y[i]) / (D.y[i + 1] - D.y[i]); return x(n - 1); }
  XT.forEach(function (t) { var xx = xOfYear(t[0]); el('line', { x1: xx, x2: xx, y1: H - B, y2: H - B + 5 }, gAxis); var tx = el('text', { x: xx, y: H - B + 20, 'text-anchor': 'middle' }, gAxis); tx.textContent = t[1]; });
  // a step of 1, 1.5, 2, 2.5, 3, 4 or 5 times a power of ten, so four steps reach just above the highest total
  function niceStep(m) { var p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return [1, 1.5, 2, 2.5, 3, 4, 5, 10].filter(function (s) { return s >= f; })[0] * p; }
  function draw() {
    while (gGrid.firstChild) gGrid.removeChild(gGrid.firstChild);
    while (gArea.firstChild) gArea.removeChild(gArea.firstChild);
    var step = mode === 'share' ? 25 : niceStep(Math.max.apply(null, tot) * 1.04 / 4), max = step * 4;
    var y = function (v) { return H - B - (H - B - T) * v / max; };
    for (var k = 0; k <= 4; k++) {
      var yy = y(k * step); el('line', { x1: L, x2: W - R, y1: yy, y2: yy }, gGrid);
      var tx = el('text', { x: L - 8, y: yy + 4, 'text-anchor': 'end' }, gGrid); tx.textContent = Math.round(k * step).toLocaleString('en-GB') + (mode === 'share' ? '%' : '');
    }
    var base = D.c.map(function () { return 0; });
    D.s.forEach(function (s) {
      var top = base.map(function (b, i) { return b + val(s, i); }), d = '';
      for (var i = 0; i < n; i++) d += (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(top[i]).toFixed(1);
      for (i = n - 1; i >= 0; i--) d += 'L' + x(i).toFixed(1) + ',' + y(base[i]).toFixed(1);
      el('path', { d: d + 'Z', 'class': 'gv-area gv-k' + s[1] }, gArea);
      base = top;
    });
    head.querySelectorAll('[data-m]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === mode)); });
  }
  head.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-m]'); if (!b) return;
    mode = b.getAttribute('data-m'); try { localStorage.setItem('epoch-gov-chart', mode); } catch (e) {}
    draw(); hide();
  });
  // the readout: the nearest century under the pointer, every series from the top of the stack down
  function show(cx) {
    var r = svg.getBoundingClientRect(), vx = (cx - r.left) * W / r.width;
    var i = Math.max(0, Math.min(n - 1, Math.round((vx - L) / (W - L - R) * (n - 1))));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
    tip.innerHTML = '<b>' + D.c[i] + '</b><span class="gv-tip-n">' + tot[i].toLocaleString('en-GB') + ' states</span>' +
      D.s.slice().reverse().map(function (s) { return '<span class="gv-tip-r"><span class="gv-sw gv-k' + s[1] + '"></span>' + s[0] + '<em>' + (mode === 'share' ? val(s, i).toFixed(0) + '%' : s[2][i].toLocaleString('en-GB')) + '</em></span>'; }).join('');
    tip.hidden = false;
    var px = x(i) / W * r.width, wr = wrap.getBoundingClientRect();
    tip.style.left = Math.max(0, Math.min(wr.width - tip.offsetWidth, px + (px > wr.width / 2 ? -tip.offsetWidth - 14 : 14))) + 'px';
  }
  function hide() { tip.hidden = true; cross.setAttribute('x1', -10); cross.setAttribute('x2', -10); }
  svg.addEventListener('pointermove', function (ev) { show(ev.clientX); });
  svg.addEventListener('pointerdown', function (ev) { show(ev.clientX); });
  svg.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') hide(); });
  draw();
  window.epochGov = { data: D, totals: tot, setMode: function (m) { mode = m; draw(); }, mode: function () { return mode; } };
})();

// "Design your state" (/governance#design): seven questions, one at a time as on /start (progress dots, Back, a choice
// moves on), each answer leaning towards the forms it describes; the result is the form the answers most resemble,
// with its profile, and the next two. Colonial rule is never offered (it is not a way to govern one's own state). The
// forms' teasers and addresses are read from the page's own cards (build:gov-forms). Appended to governance.js.
(function () {
  'use strict';
  var box = document.getElementById('gv-wiz');
  if (!box) return;
  var Q = [
    ['Who should have the final say?', [
      ['One ruler', { 'Absolute monarchy': 3, 'Dictatorship': 3, 'Tyranny': 3, 'Elective monarchy': 2, 'Chiefdom': 2, 'Nomadic confederation': 2 }],
      ['A small group: nobles, the rich, officers or one party', { 'Aristocracy': 3, 'Oligarchy': 3, 'Feudalism': 2, 'Military junta': 2, 'One-party state': 2, 'City-state': 1 }],
      ['Representatives the people elect', { 'Parliamentary democracy': 3, 'Presidential democracy': 3, 'Republic': 3, 'Constitutional monarchy': 2, 'Federation': 2 }],
      ['All the citizens, in person', { 'Direct democracy': 3, 'City-state': 2 }],
      ['God’s law, as its guardians read it', { 'Theocracy': 3 }]]],
    ['How should the rulers be chosen?', [
      ['By birth, within one family', { 'Absolute monarchy': 3, 'Constitutional monarchy': 2, 'Aristocracy': 3, 'Feudalism': 3, 'Chiefdom': 3 }],
      ['By a small college of electors', { 'Elective monarchy': 3, 'Theocracy': 2, 'Oligarchy': 2, 'Nomadic confederation': 2, 'One-party state': 1 }],
      ['By the votes of all citizens', { 'Parliamentary democracy': 3, 'Presidential democracy': 3, 'Republic': 2, 'Federation': 2, 'Direct democracy': 2 }],
      ['By lot, so that anyone may serve', { 'Direct democracy': 3, 'City-state': 1 }],
      ['Whoever can take power and hold it', { 'Tyranny': 3, 'Dictatorship': 3, 'Military junta': 3 }]]],
    ['What should limit the rulers?', [
      ['Nothing but their own judgement', { 'Absolute monarchy': 2, 'Dictatorship': 3, 'Tyranny': 2, 'One-party state': 1 }],
      ['A written constitution and the courts', { 'Constitutional monarchy': 3, 'Presidential democracy': 3, 'Federation': 3, 'Republic': 2, 'Parliamentary democracy': 1 }],
      ['Custom, oaths and kinship', { 'Feudalism': 3, 'Chiefdom': 3, 'Nomadic confederation': 3, 'Aristocracy': 3 }],
      ['The law of God', { 'Theocracy': 3 }],
      ['The voters, who can turn them out', { 'Parliamentary democracy': 3, 'Presidential democracy': 2, 'Direct democracy': 2, 'Republic': 1 }]]],
    ['How large is your state?', [
      ['One city and its fields', { 'City-state': 3, 'Direct democracy': 2, 'Tyranny': 3, 'Oligarchy': 2 }],
      ['A cluster of villages', { 'Chiefdom': 3 }],
      ['A kingdom of one people', { 'Absolute monarchy': 2, 'Constitutional monarchy': 2, 'Parliamentary democracy': 2, 'Feudalism': 1, 'Aristocracy': 1 }],
      ['Many regions with their own governments', { 'Federation': 3, 'Presidential democracy': 1 }],
      ['Peoples on the move across a continent', { 'Nomadic confederation': 3 }]]],
    ['What should hold your people together?', [
      ['Loyalty to the ruling family', { 'Absolute monarchy': 2, 'Constitutional monarchy': 2, 'Elective monarchy': 1, 'Chiefdom': 2, 'Nomadic confederation': 2 }],
      ['A shared faith', { 'Theocracy': 3 }],
      ['A shared cause, taught by one party', { 'One-party state': 3, 'Dictatorship': 1 }],
      ['Order and security above all', { 'Military junta': 3, 'Dictatorship': 3, 'Absolute monarchy': 1 }],
      ['Citizens’ rights and liberties', { 'Republic': 3, 'Parliamentary democracy': 2, 'Presidential democracy': 2, 'Direct democracy': 2, 'Federation': 1, 'Aristocracy': 1 }]]],
    ['Who should defend it?', [
      ['Mounted lords, bound to the ruler by oaths', { 'Feudalism': 3, 'Aristocracy': 1 }],
      ['Every citizen in arms', { 'City-state': 2, 'Direct democracy': 1, 'Republic': 2, 'Nomadic confederation': 2 }],
      ['A standing army under civilian command', { 'Parliamentary democracy': 2, 'Presidential democracy': 2, 'Constitutional monarchy': 2, 'Federation': 2 }],
      ['The army, which should also govern', { 'Military junta': 3, 'Dictatorship': 1 }],
      ['Paid soldiers loyal to the ruler alone', { 'Tyranny': 3, 'Absolute monarchy': 2, 'Dictatorship': 1 }]]],
    ['How should power change hands?', [
      ['To the heir, when the ruler dies', { 'Absolute monarchy': 3, 'Constitutional monarchy': 1, 'Feudalism': 1, 'Chiefdom': 2, 'Aristocracy': 1 }],
      ['At elections held on a fixed day', { 'Presidential democracy': 3, 'Republic': 3, 'Federation': 1, 'Direct democracy': 1 }],
      ['Whenever the elected assembly withdraws its confidence', { 'Parliamentary democracy': 3, 'Constitutional monarchy': 1 }],
      ['By an election when the throne falls empty', { 'Elective monarchy': 3, 'Theocracy': 1 }],
      ['Inside the ruling party, by its own rules', { 'One-party state': 3 }]]]
  ];
  // the forms' cards on the page: name -> [address, teaser, emblem]
  var CARDS = {};
  document.querySelectorAll('.gv-card').forEach(function (a) {
    var t = a.querySelector('.gv-card-t'), d = a.querySelector('.gv-card-d'), im = a.querySelector('img');
    if (t) CARDS[t.textContent] = [a.getAttribute('href'), d ? d.textContent : '', im ? im.getAttribute('src') : ''];
  });
  var step = 0, ans = [];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dots() { return '<ol class="gv-wiz-dots" aria-hidden="true">' + Q.map(function (_, i) { return '<li class="' + (i < step ? 'done' : i === step ? 'now' : '') + '"></li>'; }).join('') + '</ol>'; }
  function ask() {
    var q = Q[step];
    box.innerHTML = dots() + '<p class="gv-wiz-n">Question ' + (step + 1) + ' of ' + Q.length + '</p><h3 class="gv-wiz-q" tabindex="-1">' + esc(q[0]) + '</h3>' +
      '<div class="gv-wiz-opts" role="group" aria-label="' + esc(q[0]) + '">' + q[1].map(function (o, i) { return '<button type="button" class="gv-wiz-opt' + (ans[step] === i ? ' on' : '') + '" data-i="' + i + '">' + esc(o[0]) + '</button>'; }).join('') + '</div>' +
      (step ? '<button type="button" class="gv-wiz-back">&larr; Back</button>' : '');
  }
  function result() {
    var sc = {};
    ans.forEach(function (a, i) { var w = Q[i][1][a][1]; for (var k in w) sc[k] = (sc[k] || 0) + w[k]; });
    var order = Object.keys(sc).filter(function (k) { return CARDS[k]; }).sort(function (a, b) { return sc[b] - sc[a] || a.localeCompare(b); });
    var top = order[0], c = CARDS[top], more = order.slice(1, 3);
    box.innerHTML = '<p class="gv-wiz-n">Your state</p><div class="gv-wiz-res">' + (c[2] ? '<img src="' + esc(c[2]) + '" alt="" width="72" height="72">' : '') +
      '<div><h3 class="gv-wiz-q" tabindex="-1">It is closest to ' + (/^[AEIOU]/.test(top) ? 'an ' : 'a ') + esc(top.toLowerCase()) + '</h3><p class="gv-wiz-d">' + esc(c[1]) + '</p>' +
      '<a class="gv-wiz-go" href="' + esc(c[0]) + '">How it works, and the case for and against it &rarr;</a></div></div>' +
      (more.length ? '<p class="gv-wiz-more">Your answers also point to ' + more.map(function (k) { return '<a href="' + esc(CARDS[k][0]) + '">' + esc(k.toLowerCase()) + '</a>'; }).join(' and ') + '.</p>' : '') +
      '<p class="gv-wiz-note">A game, not a verdict: no state ever fitted one form exactly, and each profile sets out what its defenders and critics have argued.</p>' +
      '<button type="button" class="gv-wiz-again">Design another state</button>';
    window.epochGovWizard.last = { top: top, scores: sc };
  }
  box.addEventListener('click', function (ev) {
    var o = ev.target.closest('.gv-wiz-opt'), back = ev.target.closest('.gv-wiz-back'), again = ev.target.closest('.gv-wiz-again');
    if (o) { ans[step] = +o.getAttribute('data-i'); step++; if (step < Q.length) ask(); else result(); }
    else if (back) { step = Math.max(0, step - 1); ask(); }
    else if (again) { step = 0; ans = []; ask(); }
    else return;
    var h = box.querySelector('.gv-wiz-q'); if (h) h.focus({ preventScroll: true });
  });
  ask();
  window.epochGovWizard = { questions: Q, answer: function (list) { ans = list.slice(); step = Q.length; result(); return window.epochGovWizard.last; } };
})();
