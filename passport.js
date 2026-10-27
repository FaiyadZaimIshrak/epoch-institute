// passport.js - My History (/passport): what this browser has read and played at the Institute, as a passport with
// stamps. Everything comes from localStorage (epoch-seen: the reading pages, epoch-visits: the days with a visit,
// epoch-paths, epoch-games, epoch-quiz-streak, epoch-shelf, epoch-recent) and nothing is sent anywhere. A stamp, once
// earned, is kept in epoch-badges. A backup code (EPOCH1. + base64 JSON of those keys) carries the passport to another
// browser; restoring adds to what is there.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var KEYS = ['epoch-seen', 'epoch-visits', 'epoch-shelf', 'epoch-recent', 'epoch-paths', 'epoch-games', 'epoch-quiz-streak', 'epoch-quiz-best', 'epoch-badges', 'epoch-reader-type'];
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(n) { return Number(n).toLocaleString('en-GB'); }
  var TODAY = Math.floor(Date.now() / 864e5);
  var KIND = [['profile', /^\/(empire|religion|language)\//, 'Profiles'], ['entry', /^\/encyclopedia\//, 'Encyclopedia entries'], ['state', /^\/state\//, 'States'],
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
    S.quiz = sk(get('epoch-quiz-streak', null)); S.ten = sk(games['daily-streak']); S.conn = sk(games['conn-streak']); S.cw = sk(games['cw-streak']);
    S.tenPerfect = Object.keys(games).some(function (k) { return /^daily-\d+$/.test(k) && games[k] && games[k].m === '1111111111'; });
    S.connPerfect = Object.keys(games).some(function (k) { var g = games[k]; return /^conn-\d+$/.test(k) && g && g.done && g.s && g.s.length === 4 && !g.m; });
    S.connSolved = Object.keys(games).filter(function (k) { var g = games[k]; return /^conn-\d+$/.test(k) && g && g.done && g.s && g.s.length === 4; }).length;
    S.cwSolved = Object.keys(games).filter(function (k) { var g = games[k]; return /^cw-\d+$/.test(k) && g && g.done && !g.gave; }).length;
    S.cwClean = Object.keys(games).some(function (k) { var g = games[k]; return /^cw-\d+$/.test(k) && g && g.done && !g.gave && !g.c && !g.r; });
    var played = { pairs: games.pairs, order: games.order, year: games.year, puzzle: games['pz-solved'] };
    Object.keys(games).forEach(function (k) { if (/^hunt-/.test(k)) played.hunt = 1; if (/^(first-|daily-\d)/.test(k)) played.first = 1; if (/^words-(?!theme)/.test(k)) played.words = 1; if (/^conn-\d/.test(k)) played.conn = 1; if (/^cw-\d/.test(k)) played.cross = 1; });
    S.games = Object.keys(played).filter(function (k) { return played[k]; }).length;
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
      ['conn', 'No mistakes', 'Solve a Connections puzzle without a mistake', S.connPerfect ? 1 : 0, 1], ['crossword', 'Crossword', 'Solve a crossword with no help', S.cwClean ? 1 : 0, 1], ['gamer', 'Games room', 'Play 5 different games', S.games, 5],
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
      ['Games', S.games + ' of 9 played', '/games']
    ];
    $('pass-play').innerHTML = play.map(function (p) { return '<li><a href="' + p[2] + '"><span class="pass-play-t">' + esc(p[0]) + '</span><span class="pass-play-d">' + esc(p[1]) + '</span></a></li>'; }).join('');
    var rec = get('epoch-recent', []);
    if (Array.isArray(rec) && rec.length) { $('pass-recent').innerHTML = rec.slice(0, 10).map(function (r) { return '<li><a href="' + esc(r.u) + '">' + esc(r.n) + ' <span>' + esc(r.t) + '</span></a></li>'; }).join(''); $('pass-recent-wrap').hidden = false; }
    return { S: S, earned: earned };
  }
  var cur = render();

  // ── share: a poster of the stamps (scoreCard, shared-nav.js) ──
  var poster = null;
  $('pass-share').addEventListener('click', function () {
    var names = cur.earned.map(function (b) { return b[1]; });
    poster = poster || (typeof scoreCard === 'function' ? scoreCard({ title: 'My History Passport', score: num(cur.S.pages), unit: cur.S.pages === 1 ? 'page read' : 'pages read', stamps: names.length ? names : ['First page'], note: names.length + (names.length === 1 ? ' stamp' : ' stamps') + ' · ' + cur.S.days + (cur.S.days === 1 ? ' day' : ' days'), cta: 'Start your own passport', url: 'the-epoch-institute.org/passport', kids: document.documentElement.getAttribute('data-kids') === '1' }) : null);
    if (typeof sharePoster === 'function') sharePoster({ text: 'My History passport at The Epoch Institute: ' + num(cur.S.pages) + ' pages read and ' + names.length + ' stamps.', url: 'https://the-epoch-institute.org/passport', title: 'My History Passport', heading: 'Share your passport', image: poster, file: 'epoch-passport.jpg', alt: 'My History Passport: ' + names.join(', '), btn: $('pass-share') });
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
    var q = from('epoch-quiz-streak'), qh = get('epoch-quiz-streak', null); if (q) { if (!qh) put('epoch-quiz-streak', q); else { qh.b = Math.max(qh.b || 0, q.b || 0, q.n || 0); put('epoch-quiz-streak', qh); } }
    ['epoch-quiz-best', 'epoch-reader-type'].forEach(function (k) { if (o[k] && localStorage.getItem(k) == null) { try { localStorage.setItem(k, o[k]); } catch (e) {} } });
    $('pass-in').value = ''; poster = null; cur = render();
    msg.textContent = 'Restored: your passport now holds ' + num(cur.S.pages) + ' pages and ' + cur.earned.length + ' stamps.';
  });
  var armed = 0;
  $('pass-clear').addEventListener('click', function () {
    if (Date.now() - armed > 6000) { armed = Date.now(); $('pass-clear').textContent = 'Click again to clear everything'; msg.textContent = 'This removes your history, shelf, streaks and stamps from this browser. Make a backup code first if you want to keep them.'; return; }
    KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    armed = 0; $('pass-clear').textContent = 'Clear my history'; poster = null; cur = render(); msg.textContent = 'Cleared. Your passport starts again from here.';
  });
  window.epochPassport = { stats: stats, render: render };
})();
