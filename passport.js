// passport.js - My Passport (/passport): what this browser has read and played at the Institute, as a passport with
// stamps. Everything comes from localStorage (epoch-seen: the reading pages, epoch-visits: the days with a visit,
// epoch-paths, epoch-games, epoch-tests, epoch-quiz-streak, epoch-shelf, epoch-recent) and nothing is sent anywhere. A stamp, once
// earned, is kept in epoch-badges. A backup code (EPOCH1. + base64 JSON of those keys) carries the passport to another
// browser; restoring adds to what is there. My timeline places the pages read in time (see timeline() below).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['epoch-seen', 'epoch-visits', 'epoch-shelf', 'epoch-recent', 'epoch-paths', 'epoch-games', 'epoch-quiz-streak', 'epoch-quiz-best', 'epoch-badges', 'epoch-reader-type', 'epoch-tests'];
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(n) { return Number(n).toLocaleString('en-GB'); }
  var TODAY = Math.floor(Date.now() / 864e5);
  var KIND = [['profile', /^\/(empire|religion|language|culture|movement)\//, 'Profiles'], ['entry', /^\/encyclopedia\//, 'Encyclopedia entries'], ['state', /^\/state\//, 'States'],
    ['country', /^\/countries\//, 'Country histories'], ['century', /^\/centuries\//, 'Centuries'], ['year', /^\/years\//, 'Years'], ['day', /^\/today-in-history\//, 'Days of the year'],
    ['speech', /^\/speeches\//, 'Great speeches'], ['path', /^\/paths\//, 'Reading paths'], ['people', /^\/people\//, 'People by century'], ['essay', /^\/(essays|articles)\//, 'Essays and articles']];
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  var CENTS = [];
  for (var c = 30; c >= 1; c--) CENTS.push([ord(c) + '-century-bce', ord(c) + ' BCE']);
  for (c = 1; c <= 21; c++) CENTS.push([ord(c) + '-century', ord(c)]);

  // ── what has been read and played ──
  function stats() {
    var S = {}, seen = get('epoch-seen', []), visits = get('epoch-visits', []), games = get('epoch-games', {}) || {}, paths = get('epoch-paths', {}) || {};
    if (!Array.isArray(seen)) seen = []; if (!Array.isArray(visits)) visits = [];
    S.seen = seen; S.pages = seen.length; S.k = {}; KIND.forEach(function (k) { S.k[k[0]] = 0; });
    seen.forEach(function (p) { for (var i = 0; i < KIND.length; i++) if (KIND[i][1].test(p)) { S.k[KIND[i][0]]++; break; } });
    S.reg = {}; var byUrl = {};
    if (typeof EMPIRES !== 'undefined' && typeof profileUrl === 'function') EMPIRES.forEach(function (e) { byUrl[profileUrl(e)] = e.region; });
    seen.forEach(function (p) { var r = byUrl[p]; if (r) S.reg[r] = (S.reg[r] || 0) + 1; });
    S.nreg = Object.keys(S.reg).length;
    S.cent = {}; seen.forEach(function (p) { var m = /^\/centuries\/([a-z0-9-]+)$/.exec(p); if (m) S.cent[m[1]] = 1; });
    var cs = Object.keys(S.cent); S.bce = cs.some(function (x) { return /-bce$/.test(x); }); S.ce = cs.some(function (x) { return !/-bce$/.test(x); });
    S.pathsDone = 0; S.pathsOn = 0;
    Object.keys(paths).forEach(function (s) { var st = paths[s]; if (!Array.isArray(st) || !st.length) return; var r = st.filter(function (h) { return seen.indexOf(String(h).replace(/\/+$/, '')) >= 0; }).length; if (r) S.pathsOn++; if (r >= st.length) S.pathsDone++; });
    var days = visits.filter(function (d, i) { return visits.indexOf(d) === i; }).sort(function (a, b) { return a - b; });
    S.days = days.length; S.run = 0;
    for (var d = days.indexOf(TODAY) >= 0 ? TODAY : TODAY - 1; days.indexOf(d) >= 0; d--) S.run++;
    function sk(o) { return o && typeof o === 'object' ? { n: o.last >= TODAY - 1 ? o.n || 0 : 0, b: Math.max(o.b || 0, o.n || 0) } : { n: 0, b: 0 }; }
    S.quiz = sk(get('epoch-quiz-streak', null)); S.ten = sk(games['daily-streak']); S.conn = sk(games['conn-streak']); S.cw = sk(games['cw-streak']); S.said = sk(games['said-streak']);
    S.tenPerfect = Object.keys(games).some(function (k) { return /^daily-\d+$/.test(k) && games[k] && games[k].m === '1111111111'; });
    S.connPerfect = Object.keys(games).some(function (k) { var g = games[k]; return /^conn-\d+$/.test(k) && g && g.done && g.s && g.s.length === 4 && !g.m; });
    S.connSolved = Object.keys(games).filter(function (k) { var g = games[k]; return /^conn-\d+$/.test(k) && g && g.done && g.s && g.s.length === 4; }).length;
    S.cwSolved = Object.keys(games).filter(function (k) { var g = games[k]; return /^cw-\d+$/.test(k) && g && g.done && !g.gave; }).length;
    S.saidPerfect = Object.keys(games).some(function (k) { var g = games[k]; return /^said-\d+$/.test(k) && g && g.done && g.m === '11111'; });
    S.saidPlayed = Object.keys(games).filter(function (k) { var g = games[k]; return /^said-\d+$/.test(k) && g && g.done; }).length;
    S.cwClean = Object.keys(games).some(function (k) { var g = games[k]; return /^cw-\d+$/.test(k) && g && g.done && !g.gave && !g.c && !g.r; });
    var played = { pairs: games.pairs, order: games.order, year: games.year, puzzle: games['pz-solved'] };
    Object.keys(games).forEach(function (k) { if (/^hunt-/.test(k)) played.hunt = 1; if (/^(first-|daily-\d)/.test(k)) played.first = 1; if (/^words-(?!theme)/.test(k)) played.words = 1; if (/^conn-\d/.test(k)) played.conn = 1; if (/^cw-\d/.test(k)) played.cross = 1; if (/^said-\d/.test(k)) played.said = 1; });
    S.games = Object.keys(played).filter(function (k) { return played[k]; }).length;
    // Test yourself (test-yourself.js): passed at 80%, by the best score of each page
    var tests = get('epoch-tests', {}) || {}; S.tests = 0; S.testsPassed = 0;
    Object.keys(tests).forEach(function (k) { var r = tests[k]; if (!r || !r.t) return; S.tests++; if (r.b / r.t >= 0.8) S.testsPassed++; });
    var shelf = get('epoch-shelf', []); S.shelf = Array.isArray(shelf) ? shelf.length : 0;
    return S;
  }
  // ── the stamps: [id, name, rule, value, goal] ──
  function stamps(S) {
    return [
      ['first', 'First page', 'Read a page of the Institute', S.pages, 1], ['reader', 'Reader', 'Read 25 pages', S.pages, 25], ['scholar', 'Scholar', 'Read 100 pages', S.pages, 100], ['sage', 'Sage', 'Read 500 pages', S.pages, 500],
      ['rise', 'Rise and fall', 'Read 10 profiles', S.k.profile, 10], ['chronicler', 'Chronicler', 'Read 50 profiles', S.k.profile, 50],
      ['map', 'Across the map', 'Read profiles from 5 regions', S.nreg, 5], ['world', 'Around the world', 'Read profiles from every region', S.nreg, typeof REGIONS !== 'undefined' ? REGIONS.length : 9],
      ['encyclopedist', 'Encyclopedist', 'Read 50 encyclopedia entries', S.k.entry, 50], ['statesman', 'Statesman', 'Read 25 state pages', S.k.state, 25],
      ['globetrotter', 'Globetrotter', 'Read 10 country histories', S.k.country, 10], ['centurion', 'Centurion', 'Visit 10 centuries', Object.keys(S.cent).length, 10],
      ['bce', 'Before and after', 'Visit a century BCE and a century CE', (S.bce ? 1 : 0) + (S.ce ? 1 : 0), 2], ['years', 'Year by year', 'Read 10 year pages', S.k.year, 10],
      ['days', 'On this day', 'Read 7 days of the year', S.k.day, 7], ['orator', 'Orator', 'Read 5 great speeches', S.k.speech, 5],
      ['path', 'Pathfinder', 'Finish a reading path', S.pathsDone, 1], ['paths', 'Wayfarer', 'Finish 3 reading paths', S.pathsDone, 3],
      ['regular', 'Regular', 'Come back on 7 different days', S.days, 7], ['devoted', 'Devoted', 'Come back on 30 different days', S.days, 30],
      ['quiz', 'Quiz streak', 'Solve the daily quiz 7 days in a row', S.quiz.b, 7], ['ten', 'Ten out of ten', 'Get all of a Daily Ten right', S.tenPerfect ? 1 : 0, 1],
      ['conn', 'No mistakes', 'Solve a Connections puzzle without a mistake', S.connPerfect ? 1 : 0, 1], ['crossword', 'Crossword', 'Solve a crossword with no help', S.cwClean ? 1 : 0, 1], ['said', 'Well quoted', 'Get all five of a Who Said It? right', S.saidPerfect ? 1 : 0, 1], ['gamer', 'Games room', 'Play 5 different games', S.games, 5],
      ['tests', 'Examined', 'Pass 10 Test yourself quizzes (80% right or better)', S.testsPassed, 10],
      ['shelf', 'Collector', 'Save 5 pages to your shelf', S.shelf, 5]
    ];
  }

  function render() {
    var S = stats(), ST = stamps(S), kept = get('epoch-badges', {}) || {}, changed = false;
    ST.forEach(function (b) { if (b[3] >= b[4] && !kept[b[0]]) { kept[b[0]] = TODAY; changed = true; } });
    if (changed) put('epoch-badges', kept);
    var earned = ST.filter(function (b) { return kept[b[0]]; });
    // in numbers
    $('pass-summary').innerHTML = [[S.pages, S.pages === 1 ? 'page read' : 'pages read'], [S.days, S.days === 1 ? 'day with a visit' : 'days with a visit'], [earned.length, 'of ' + ST.length + ' stamps'], [S.run, S.run === 1 ? 'day in a row' : 'days in a row']]
      .map(function (x) { return '<div class="pass-num"><b>' + num(x[0]) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') +
      (S.pages ? '' : '<p class="pass-note pass-empty">Nothing yet: open a <a href="/profiles">profile</a>, an <a href="/encyclopedia/">entry</a> or <a href="/today-in-history/">today in history</a>, and come back.</p>');
    // stamps
    $('pass-stamps-n').textContent = earned.length + ' of ' + ST.length;
    $('pass-stamps').innerHTML = ST.map(function (b, i) {
      var on = !!kept[b[0]], prog = Math.min(b[3], b[4]);
      return '<li class="pass-stamp' + (on ? ' is-on' : '') + '" style="--r:' + (((i * 37) % 21) - 10) + 'deg"><span class="pass-stamp-ring"><span class="pass-stamp-t">' + esc(b[1]) + '</span>' + (on ? '<span class="pass-stamp-d">' + esc(new Date(kept[b[0]] * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })) + '</span>' : '<span class="pass-stamp-p">' + num(prog) + ' / ' + num(b[4]) + '</span>') + '</span><span class="pass-stamp-rule">' + esc(b[2]) + '</span></li>';
    }).join('');
    // kinds and regions
    var maxK = Math.max.apply(null, KIND.map(function (k) { return S.k[k[0]]; }).concat([1]));
    $('pass-kinds').innerHTML = KIND.map(function (k) { var v = S.k[k[0]]; return '<li><span class="pass-bar-l">' + esc(k[2]) + '</span><span class="pass-bar"><i style="width:' + (v / maxK * 100).toFixed(1) + '%"></i></span><b>' + num(v) + '</b></li>'; }).join('');
    var regs = typeof REGIONS !== 'undefined' ? REGIONS : Object.keys(S.reg), maxR = Math.max.apply(null, regs.map(function (r) { return S.reg[r] || 0; }).concat([1]));
    $('pass-regions').innerHTML = regs.map(function (r) { var v = S.reg[r] || 0; return '<li><span class="pass-bar-l">' + esc(r) + '</span><span class="pass-bar"><i style="width:' + (v / maxR * 100).toFixed(1) + '%"></i></span><b>' + num(v) + '</b></li>'; }).join('');
    // centuries
    $('pass-cent-n').textContent = Object.keys(S.cent).length + ' of ' + CENTS.length;
    $('pass-cents').innerHTML = CENTS.map(function (x) { var on = S.cent[x[0]]; return '<li><a class="' + (on ? 'is-on' : '') + '" href="/centuries/' + x[0] + '" title="The ' + esc(x[1].replace(' BCE', ' century BCE').replace(/^(\d+\w\w)$/, '$1 century')) + (on ? ': visited' : '') + '">' + esc(x[1].replace(' BCE', '')) + (/BCE/.test(x[1]) ? '<small>BCE</small>' : '') + '</a></li>'; }).join('');
    // paths, quizzes and games
    var play = [
      ['Reading paths', S.pathsDone + ' finished' + (S.pathsOn > S.pathsDone ? ', ' + (S.pathsOn - S.pathsDone) + ' under way' : ''), '/paths/'],
      ['Daily quiz', S.quiz.n ? S.quiz.n + ' in a row now' + (S.quiz.b > S.quiz.n ? ' (best ' + S.quiz.b + ')' : '') : S.quiz.b ? 'Best run: ' + S.quiz.b + ' days' : 'Not played yet', '/quiz'],
      ['Daily Ten', S.ten.n ? S.ten.n + ' days in a row now' + (S.ten.b > S.ten.n ? ' (best ' + S.ten.b + ')' : '') : S.ten.b ? 'Best run: ' + S.ten.b + ' days' : 'Not played yet', '/games#first-daily'],
      ['Connections', S.connSolved ? S.connSolved + ' solved' + (S.conn.n > 1 ? ', ' + S.conn.n + ' days in a row' : '') : 'Not solved yet', '/games#conn'],
      ['Crossword', S.cwSolved ? S.cwSolved + ' solved' + (S.cw.n > 1 ? ', ' + S.cw.n + ' days in a row' : '') : 'Not solved yet', '/games#cross'],
      ['Test yourself', S.tests ? S.testsPassed + ' passed of ' + S.tests + ' taken' : 'At the foot of every profile, century and path', '/profiles'],
      ['Who Said It?', S.saidPlayed ? S.saidPlayed + ' played' + (S.said.n > 1 ? ', ' + S.said.n + ' days in a row' : '') : 'Not played yet', '/games#said'],
      ['Games', S.games + ' of 10 played', '/games']
    ];
    $('pass-play').innerHTML = play.map(function (p) { return '<li><a href="' + p[2] + '"><span class="pass-play-t">' + esc(p[0]) + '</span><span class="pass-play-d">' + esc(p[1]) + '</span></a></li>'; }).join('');
    var rec = get('epoch-recent', []);
    if (Array.isArray(rec) && rec.length) { $('pass-recent').innerHTML = rec.slice(0, 10).map(function (r) { return '<li><a href="' + esc(r.u) + '">' + esc(r.n) + ' <span>' + esc(r.t) + '</span></a></li>'; }).join(''); $('pass-recent-wrap').hidden = false; }
    return { S: S, earned: earned };
  }
  var cur = render();

  // ── My timeline: the pages read, placed in time. Entries, state pages, country histories and speeches from
  // data/spans/<c>.json (written by build-pages.ps1, which stamps SPANS_V; only the files these pages need), the
  // profiles from EMPIRES (profileSpan), centuries, people by century and years from their addresses. Lanes on one
  // axis of years, coloured by kind (the --cat slots), drawn when the section nears the screen; a list for the same.
  var SPANS_V = '6c6effa275';
  var TLK = [['Profiles', 1, 'Profiles', 'Profile'], ['Encyclopedia entries', 0, 'Entries', 'Encyclopedia entry'], ['States', 2, 'States', 'State'], ['Centuries, years, countries and speeches', 3, 'Other pages', '']];   // [label, colour slot, short, one]
  var PROF = {}; if (typeof EMPIRES !== 'undefined' && typeof profileUrl === 'function') EMPIRES.forEach(function (e) { PROF[profileUrl(e)] = e; });
  function yl(y) { return y < 0 ? -y + ' BCE' : y < 1000 ? y + ' CE' : String(y); }
  function spanText(a, b) {   // 1066; 499–400 BCE; 27 BCE–476 CE; 747–814 CE; 1465–1762; 600 BCE to the present
    return a === b ? yl(a) : b >= 2025 ? yl(a) + ' to the present' : b < 0 ? -a + '–' + -b + ' BCE' : a < 0 ? yl(a) + '–' + yl(b) : b < 1000 ? a + '–' + b + ' CE' : a + '–' + b;
  }
  function where(p) {   // {k: kind, a, b, n: name, u: address} or {k, key, u} to look up, or null: not a page set in time
    var m, e = PROF[p], n, y;
    if (e) { var sp = typeof profileSpan === 'function' ? profileSpan(e) : null; return sp ? { k: 0, a: sp[0], b: sp[1] == null ? 2025 : sp[1], n: e.name, u: p } : null; }
    if ((m = /^\/encyclopedia\/([a-z0-9-]+)$/.exec(p)) && m[1] !== 'glossary') return { k: 1, key: m[1], u: p };
    if ((m = /^\/state\/([a-z0-9-]+)$/.exec(p))) return { k: 2, key: 's:' + m[1], u: p };
    if ((m = /^\/countries\/([a-z0-9-]+)$/.exec(p))) return { k: 3, key: 'c:' + m[1], u: p, kl: 'Country history' };
    if ((m = /^\/speeches\/([a-z0-9-]+)$/.exec(p))) return { k: 3, key: 'p:' + m[1], u: p, kl: 'Great speech' };
    if ((m = /^\/(centuries|people)\/(\d+)(?:st|nd|rd|th)-century(-bce)?$/.exec(p))) {
      n = +m[2];
      return { k: 3, a: m[3] ? -n * 100 + 1 : Math.max(1, (n - 1) * 100), b: m[3] ? Math.min(-1, -(n - 1) * 100) : n * 100 - 1, n: (m[1] === 'people' ? 'People of the ' : 'The ') + ord(n) + ' century' + (m[3] ? ' BCE' : ''), u: p, kl: m[1] === 'people' ? 'People by century' : 'Century' };
    }
    if ((m = /^\/years\/(\d+)(-bce)?$/.exec(p))) { y = m[2] ? -m[1] : +m[1]; return { k: 3, a: y, b: y, n: 'The year ' + yl(y), u: p, kl: 'Year' }; }
    return null;
  }
  function shard(key) { var c = key.replace(/^[scp]:/, '').charAt(0); return /[a-z0-9]/.test(c) ? c : '_'; }
  var TL = null, TLD = null, tlTouch = false, tlPoster = null;
  function timeline() {
    var seen = get('epoch-seen', []), all = [], need = {}, off = 0;
    if (!Array.isArray(seen)) seen = [];
    seen.forEach(function (p) { var w = where(String(p)); if (!w) { off++; return; } all.push(w); if (w.key) need[shard(w.key)] = 1; });
    return Promise.all(Object.keys(need).map(function (c) {
      return fetch('/data/spans/' + c + '.json?v=' + SPANS_V).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    })).then(function (parts) {
      var S = {}, items = [];
      parts.forEach(function (o) { for (var k in o) S[k] = o[k]; });
      all.forEach(function (w) {
        if (w.key) { var r = S[w.key]; if (!r) { off++; return; } w.a = r[0]; w.b = typeof r[1] === 'number' ? r[1] : r[0]; w.n = r[r.length - 1]; }
        items.push(w);
      });
      TLD = [items, off]; drawTl(items, off);
    });
  }
  function tlTicks(from, to, w) {
    var span = to - from, steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000], st = steps[steps.length - 1], most = w < 500 ? 4 : 7, out = [];
    for (var i = 0; i < steps.length; i++) if (span / steps[i] <= most) { st = steps[i]; break; }
    for (var t = Math.ceil(from / st) * st; t <= to; t += st) out.push(t);
    return out;
  }
  function drawTl(items, off) {
    var svg = $('pass-tl-svg'), n = items.length;
    tlPoster = null; $('pass-tl-tip').hidden = true;
    $('pass-tl-n').textContent = n ? num(n) + (n === 1 ? ' page' : ' pages') : '';
    $('pass-tl-share').hidden = $('pass-tl-list').hidden = !n;
    $('pass-tl-note').textContent = off ? num(off) + (off === 1 ? ' page has' : ' pages have') + ' no date to place by (days of the year, reading paths, glossary terms, essays and entries without dates).' : '';
    if (!n) { TL = null; svg.innerHTML = ''; svg.style.height = '0'; $('pass-tl-key').innerHTML = ''; $('pass-tl-lede').textContent = 'Nothing to place yet: the profiles, entries, states, centuries and years you read will appear here, each where it belongs in time.'; return; }
    items.sort(function (p, q) { return p.a - q.a || q.b - p.b || (p.n < q.n ? -1 : 1); });
    var lo = items[0].a, hi = -Infinity, late = items[0], count = [0, 0, 0, 0];
    items.forEach(function (it) { if (it.b > hi) hi = it.b; if (it.a > late.a) late = it; count[it.k]++; });
    $('pass-tl-lede').textContent = (n === 1 ? 'One page placed in time, about ' + yl(items[0].a) + ' (' + items[0].n + ')' : num(n) + ' pages placed in time, the earliest about ' + yl(items[0].a) + ' (' + items[0].n + '), the latest about ' + yl(late.a) + ' (' + late.n + ')') + '. Hover or tap a line for its name; tap it again to open it.';
    $('pass-tl-key').innerHTML = TLK.map(function (k, j) { return count[j] ? '<li><i class="pass-tl-sw pass-tl-s' + k[1] + '" aria-hidden="true"></i>' + esc(k[0]) + ' <b>' + num(count[j]) + '</b></li>' : ''; }).join('');
    var W = Math.max(280, Math.round(svg.getBoundingClientRect().width) || 600), PL = 10, PR = 10, PT = 6, PB = 30;
    var span = Math.max(40, hi - lo), from = lo - span * 0.03, to = hi + span * 0.03;
    var X = function (y) { return PL + (y - from) / (to - from) * (W - PL - PR); }, lanes = [];
    items.forEach(function (it) { it.x1 = X(it.a); it.x2 = Math.max(X(it.b), it.x1 + 5); var ln = 0; while (ln < lanes.length && lanes[ln] + 3 > it.x1) ln++; lanes[ln] = it.x2; it.ln = ln; });
    var nl = lanes.length, pitch = nl <= 16 ? 14 : Math.max(3, Math.floor(280 / nl)), bh = Math.max(2, Math.round(pitch * 0.64)), H = PT + nl * pitch + PB, ticks = tlTicks(from, to, W), h = '';
    ticks.forEach(function (t) { var x = X(t).toFixed(1); h += '<line class="pass-tl-grid" x1="' + x + '" x2="' + x + '" y1="' + PT + '" y2="' + (H - PB + 4) + '"/><text class="pass-tl-ax" x="' + x + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(yl(t === 0 ? 1 : t)) + '</text>'; });
    items.forEach(function (it) { h += '<rect class="pass-tl-k' + TLK[it.k][1] + '" x="' + it.x1.toFixed(1) + '" y="' + (PT + it.ln * pitch + (pitch - bh) / 2).toFixed(1) + '" width="' + (it.x2 - it.x1).toFixed(1) + '" height="' + bh + '" rx="' + Math.min(3, bh / 2) + '"/>'; });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.style.height = H + 'px'; svg.innerHTML = h;
    svg.setAttribute('aria-label', 'Your reading on one line of years: ' + num(n) + ' pages from ' + yl(lo) + ' to ' + yl(Math.min(hi, 2025)) + '. The list below holds the same.');
    $('pass-tl-ol').innerHTML = items.map(function (it) { return '<li><i class="pass-tl-sw pass-tl-s' + TLK[it.k][1] + '" aria-hidden="true"></i><span class="pass-tl-y">' + esc(spanText(it.a, it.b)) + '</span> <a href="' + esc(it.u) + '">' + esc(it.n) + '</a></li>'; }).join('');
    TL = { items: items, W: W, PT: PT, pitch: pitch, from: from, to: to, ticks: ticks, lo: lo, late: late.a, count: count, sel: null };
  }
  function tlHit(ev) {
    if (!TL) return null;
    var r = $('pass-tl-svg').getBoundingClientRect(), x = (ev.clientX - r.left) * TL.W / r.width, ln = Math.floor((ev.clientY - r.top - TL.PT) / TL.pitch), best = null, bd = 8;
    TL.items.forEach(function (it) { if (it.ln !== ln) return; var d = x < it.x1 ? it.x1 - x : x > it.x2 ? x - it.x2 : 0; if (d < bd) { bd = d; best = it; } });
    return best;
  }
  function tlTip(it, ev) {
    var t = $('pass-tl-tip'); if (!it) { t.hidden = true; return; }
    t.textContent = ''; var b = document.createElement('b'); b.textContent = it.n; t.appendChild(b);
    var s = document.createElement('span'); s.textContent = spanText(it.a, it.b) + ' · ' + (it.kl || TLK[it.k][3]); t.appendChild(s);
    t.hidden = false;
    var fig = t.parentNode.getBoundingClientRect(), x = ev.clientX - fig.left, y = ev.clientY - fig.top;
    t.style.left = Math.max(0, Math.min(fig.width - t.offsetWidth, x - t.offsetWidth / 2)) + 'px'; t.style.top = Math.max(0, y - t.offsetHeight - 14) + 'px';
  }
  var tsvg = $('pass-tl-svg');
  tsvg.addEventListener('pointerdown', function (ev) { tlTouch = ev.pointerType !== 'mouse'; });
  tsvg.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse') { var it = tlHit(ev); tlTip(it, ev); tsvg.style.cursor = it ? 'pointer' : ''; } });
  tsvg.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse') $('pass-tl-tip').hidden = true; });
  tsvg.addEventListener('click', function (ev) {
    var it = tlHit(ev); if (!it) { $('pass-tl-tip').hidden = true; if (TL) TL.sel = null; return; }
    if (!tlTouch || TL.sel === it) { location.href = it.u; return; }   // a mouse opens at once, a finger on the second tap
    TL.sel = it; tlTip(it, ev);
  });
  // drawn when the section nears the screen, again for a new width
  var tlOn = false, tlw = 0;
  function tlStart() { if (tlOn) return; tlOn = true; timeline(); }
  if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); tlStart(); } }, { rootMargin: '400px 0px' }); io.observe($('pass-tl-sec')); } else tlStart();
  window.addEventListener('resize', function () { clearTimeout(tlw); tlw = setTimeout(function () { if (TLD) drawTl(TLD[0], TLD[1]); }, 200); });
  // share: a poster of the lanes, drawn as the pointer nears the button so it is ready inside the tap
  function tlCard() {
    if (!TL || tlPoster || typeof scoreCard !== 'function') return tlPoster;
    tlPoster = scoreCard({ title: 'My timeline', score: num(TL.items.length), unit: TL.items.length === 1 ? 'page placed in time' : 'pages placed in time',
      timeline: { from: TL.from, to: TL.to, items: TL.items.slice(0, 1500).map(function (it) { return [it.a, it.b, TLK[it.k][1]]; }), ticks: TL.ticks.map(function (t) { return [t, yl(t === 0 ? 1 : t)]; }),
        legend: TLK.map(function (k, j) { return [k[2], TL.count[j], k[1]]; }).filter(function (l) { return l[1]; }) },
      note: 'From ' + yl(TL.lo) + ' to ' + yl(TL.late), cta: 'Make your own timeline', url: 'the-epoch-institute.org/passport', kids: document.documentElement.getAttribute('data-kids') === '1' });
    return tlPoster;
  }
  ['pointerenter', 'pointerdown', 'focus'].forEach(function (t) { $('pass-tl-share').addEventListener(t, tlCard); });
  $('pass-tl-share').addEventListener('click', function () {
    if (!TL) return;
    if (typeof sharePoster === 'function') sharePoster({ text: 'My timeline at The Epoch Institute: ' + num(TL.items.length) + ' pages of history, from ' + yl(TL.lo) + ' to ' + yl(TL.late) + '.', url: 'https://the-epoch-institute.org/passport', title: 'My timeline', heading: 'Share your timeline', image: tlCard(), file: 'epoch-timeline.jpg', alt: 'My timeline: ' + num(TL.items.length) + ' pages placed in time', btn: this });
  });

  // ── share: a poster of the stamps (scoreCard, shared-nav.js) ──
  var poster = null;
  $('pass-share').addEventListener('click', function () {
    var names = cur.earned.map(function (b) { return b[1]; });
    poster = poster || (typeof scoreCard === 'function' ? scoreCard({ title: 'My Passport', score: num(cur.S.pages), unit: cur.S.pages === 1 ? 'page read' : 'pages read', stamps: names.length ? names : ['First page'], note: names.length + (names.length === 1 ? ' stamp' : ' stamps') + ' · ' + cur.S.days + (cur.S.days === 1 ? ' day' : ' days'), cta: 'Start your own passport', url: 'the-epoch-institute.org/passport', kids: document.documentElement.getAttribute('data-kids') === '1' }) : null);
    if (typeof sharePoster === 'function') sharePoster({ text: 'My Passport at The Epoch Institute: ' + num(cur.S.pages) + ' pages read and ' + names.length + ' stamps.', url: 'https://the-epoch-institute.org/passport', title: 'My Passport', heading: 'Share your passport', image: poster, file: 'epoch-passport.jpg', alt: 'My Passport: ' + names.join(', '), btn: $('pass-share') });
  });

  // ── backup code, restore, clear ──
  var msg = $('pass-msg');
  $('pass-export').addEventListener('click', function () {
    var o = { v: 1 };
    KEYS.forEach(function (k) { try { var s = localStorage.getItem(k); if (s != null) o[k] = s; } catch (e) {} });
    var code = 'EPOCH1.' + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
    $('pass-code').value = code; $('pass-code-box').hidden = false; $('pass-code').select();
    msg.textContent = 'Your backup code is ready: ' + num(code.length) + ' characters.';
  });
  $('pass-copy').addEventListener('click', function () {
    var t = $('pass-code').value; if (!t) return;
    if (typeof copyText === 'function') copyText(t).then(function () { msg.textContent = 'Copied.'; }, function () { $('pass-code').select(); msg.textContent = 'Select the code and copy it.'; });
    else { $('pass-code').select(); msg.textContent = 'Select the code and copy it.'; }
  });
  function union(a, b, key) {
    var out = Array.isArray(a) ? a.slice() : [], has = {};
    out.forEach(function (x) { has[key ? x && x[key] : x] = 1; });
    (Array.isArray(b) ? b : []).forEach(function (x) { var k = key ? x && x[key] : x; if (k != null && !has[k]) { has[k] = 1; out.push(x); } });
    return out;
  }
  $('pass-restore').addEventListener('click', function () {
    var t = ($('pass-in').value || '').trim(), o = null;
    if (t.indexOf('EPOCH1.') === 0) { try { o = JSON.parse(decodeURIComponent(escape(atob(t.slice(7))))); } catch (e) { o = null; } }
    if (!o || o.v !== 1) { msg.textContent = 'That is not a backup code of the Institute.'; return; }
    function from(k) { try { return o[k] ? JSON.parse(o[k]) : null; } catch (e) { return null; } }
    var seen = from('epoch-seen'); if (seen) put('epoch-seen', union(get('epoch-seen', []), seen).slice(-3000));
    var vis = from('epoch-visits'); if (vis) put('epoch-visits', union(get('epoch-visits', []), vis).sort(function (a, b) { return a - b; }).slice(-400));
    ['epoch-shelf', 'epoch-recent'].forEach(function (k) { var v = from(k); if (v) put(k, union(get(k, []), v, 'u').slice(0, k === 'epoch-shelf' ? 100 : 10)); });
    ['epoch-paths', 'epoch-games', 'epoch-badges'].forEach(function (k) {
      var v = from(k); if (!v || typeof v !== 'object') return;
      var here = get(k, {}) || {};
      Object.keys(v).forEach(function (x) {
        if (!(x in here)) here[x] = v[x];
        else if (/-streak$/.test(x) && v[x] && here[x]) here[x].b = Math.max(here[x].b || 0, v[x].b || 0, v[x].n || 0);   // the best runs travel too
      });
      put(k, here);
    });
    var tv = from('epoch-tests'), th = get('epoch-tests', {}) || {};   // each page keeps its best score and all its tries
    if (tv && typeof tv === 'object') { Object.keys(tv).forEach(function (x) { var a = th[x], b = tv[x]; if (!b) return; if (!a) th[x] = b; else { a.b = Math.max(a.b || 0, b.b || 0); a.n = (a.n || 0) + (b.n || 0); a.t = Math.max(a.t || 0, b.t || 0); a.d = a.d > b.d ? a.d : b.d; } }); put('epoch-tests', th); }
    var q = from('epoch-quiz-streak'), qh = get('epoch-quiz-streak', null); if (q) { if (!qh) put('epoch-quiz-streak', q); else { qh.b = Math.max(qh.b || 0, q.b || 0, q.n || 0); put('epoch-quiz-streak', qh); } }
    ['epoch-quiz-best', 'epoch-reader-type'].forEach(function (k) { if (o[k] && localStorage.getItem(k) == null) { try { localStorage.setItem(k, o[k]); } catch (e) {} } });
    $('pass-in').value = ''; poster = null; cur = render(); if (tlOn) timeline();
    msg.textContent = 'Restored: your passport now holds ' + num(cur.S.pages) + ' pages and ' + cur.earned.length + ' stamps.';
  });
  var armed = 0;
  $('pass-clear').addEventListener('click', function () {
    if (Date.now() - armed > 6000) { armed = Date.now(); $('pass-clear').textContent = 'Click again to clear everything'; msg.textContent = 'This removes your history, shelf, streaks and stamps from this browser. Make a backup code first if you want to keep them.'; return; }
    KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    armed = 0; $('pass-clear').textContent = 'Clear my passport'; poster = null; cur = render(); if (tlOn) timeline(); msg.textContent = 'Cleared. Your passport starts again from here.';
  });
  window.epochPassport = { stats: stats, render: render, timeline: function () { return TL; }, timelineCard: tlCard };
})();
