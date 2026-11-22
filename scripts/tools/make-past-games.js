// Writes the hand page /past-games (16 Nov 2026; the user: "make a separate path to access past games") from /weekly's
// head, so its head snippets (theme and look, analytics, fonts) are the site's own. The page is a calendar of every
// day of each daily game since its #1, with this browser's result (the games' own records, localStorage epoch-games,
// read as /weekly reads them); a day opens that puzzle by its number (/games#conn-12: games.js openHash, pastFirst).
// The daily quiz is not in it: it keeps only today's round (epoch-quiz), and a previewed day would overwrite it.
//   node scripts/tools/make-past-games.js      re-run it after /weekly's head snippets change
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const W = fs.readFileSync(path.join(R, 'weekly'), 'utf8'), head = W.slice(0, W.indexOf('</head>'));
const T = 'Past Games', D = 'Every past day of the daily history games in one calendar: open any earlier puzzle and see which you have played.';
const h = head
  .replace(/<title>[^<]*<\/title>/, () => '<title>' + T + ' — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + esc(D) + '">')
  .replace(/<link rel="canonical" href="[^"]*">/, () => '<link rel="canonical" href="https://the-epoch-institute.org/past-games">')
  .replace(/<meta property="og:title" content="[^"]*">/, () => '<meta property="og:title" content="' + T + ' — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, () => '<meta property="og:description" content="' + esc(D) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, () => '<meta property="og:url" content="https://the-epoch-institute.org/past-games">')
  .replace('href="/css/weekly.css"', 'href="/css/past-games.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: 'History Games', item: 'https://the-epoch-institute.org/games' }, { '@type': 'ListItem', position: 3, name: T }] },
    { '@type': 'WebPage', name: T, url: 'https://the-epoch-institute.org/past-games', description: D }] }) + '</script>');
if (!/href="\/css\/past-games\.css"/.test(h) || !/canonical" href="https:\/\/the-epoch-institute\.org\/past-games"/.test(h) || !/noindex/.test(h)) throw new Error('the head of /weekly has changed: make-past-games.js no longer fits it');
const body = `</head>
<body>

<main id="main" class="wk-page pg-page ref-page" data-no-toc>
<div class="wk-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/games">History Games</a></li><li aria-current="page">Past Games</li></ol></nav>
<header class="ref-head">
  <span class="hero-ornament"></span>
  <h1 class="research-title">Past Games</h1>
  <p class="ref-lede">Every day of the daily games since each began. Choose a game, then a day, to play that day&rsquo;s puzzle. The days you have played show your result.</p>
</header>

<section aria-labelledby="pg-t">
  <h2 class="ref-sec-title" id="pg-t">Choose a game <span class="n" id="pg-n"></span></h2>
  <div class="pg-games" id="pg-games" role="group" aria-label="Daily games"></div>
  <p class="pass-note" id="pg-note">The calendar needs JavaScript. Without it, <a href="/games">the games page</a> has today&rsquo;s puzzles.</p>
  <div id="pg-cal" aria-live="polite"></div>
  <div class="pass-acts"><a class="gm-again" href="/games">Play today&rsquo;s games &rarr;</a><a class="gm-again" href="/weekly">My week, side by side &rarr;</a></div>
  <p class="pass-note">Days are counted in UTC, as the games count them. Results are kept in this browser only. An earlier puzzle is kept under its own number; only today&rsquo;s counts for a run of days. The <a href="/quiz">Daily Quiz</a> keeps only today&rsquo;s round, so it has no past days here.</p>
</section>
</div>
</main>

<script src="/shared-nav.js"></script>
<script>initNav('games');</script>
<script>
(function () {
  // the games' own records (games.js: localStorage epoch-games), by each game's number; #1 days as in games.js
  var G = {}; try { G = JSON.parse(localStorage.getItem('epoch-games') || '{}') || {}; } catch (e) {}
  var kids = document.documentElement.getAttribute('data-kids') === '1';
  var Q = Math.floor(Date.now() / 864e5), d0 = function (m, d) { return Math.floor(Date.UTC(2026, m, d) / 864e5); };
  var ones = function (m) { return (String(m).match(/1/g) || []).length; };
  var of = function (r, n) { return r && r.m ? [ones(r.m) + '/' + n, r.m.length >= n] : null; };
  // get(day, number) -> [text, finished] or null
  var GAMES = [
    { k: 'first-daily', n: 'Daily Ten', s: 'Ten pairs: which came first?', day0: d0(9, 26), get: function (q) { return of(G['daily-' + q], 10); } },
    { k: 'conn', n: 'Connections', s: 'Sixteen tiles, four groups', day0: d0(9, 26), get: function (q, n) { var r = G['conn-' + n]; if (!r) return null; var f = (r.s || []).length; return [f === 4 ? 'Solved' : f + ' of 4', !!r.done || f === 4]; } },
    { k: 'cross', n: 'Crossword', s: 'A history crossword', day0: d0(9, 27), get: function (q, n) { var r = G['cw-' + n]; if (!r) return null; var t = r.t || 0; return [r.gave ? 'Shown' : r.done ? Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2) : 'Begun', !!r.done || !!r.gave]; } },
    { k: 'said', n: 'Who Said It?', s: 'Five quotations', day0: d0(9, 28), get: function (q, n) { return of(G['said-' + n], 5); } },
    { k: 'songq', n: 'Where Is This Song From?', s: 'Five songs, four regions', day0: d0(10, 3), get: function (q, n) { return of(G['songq-' + (kids ? 'k' : '') + n], 5); } },
    { k: 'six', n: 'Six Degrees', s: 'From one entry to another', day0: d0(10, 6), get: function (q, n) { var r = G['sixd-' + n]; if (!r) return null; return [r.gave ? 'Shown' : r.done ? r.c + ' clicks' : 'Begun', !!r.done || !!r.gave]; } },
    { k: 'cipher', n: 'Quote Cipher', s: 'A quotation in code', day0: d0(10, 14), get: function (q, n) { var r = G['cipher-' + n]; if (!r) return null; return [r.gave ? 'Shown' : r.done ? 'Solved' : 'Begun', !!r.done || !!r.gave]; } },
    { k: 'line', n: 'Finish the Line', s: 'Which line comes next?', day0: d0(10, 15), get: function (q, n) { return of(G['line-' + n], 5); } },
    { k: 'whose', n: 'Whose Life?', s: 'A great life in five clues', day0: d0(10, 24), get: function (q, n) { var r = G['whose-' + n]; if (!r || !r.g || !r.g.length) return null; return [r.done ? (r.w ? 'Clue ' + r.g.length : 'Missed') : 'Begun', !!r.done]; } }];
  var esc = typeof escHtml === 'function' ? escHtml : function (s) { return String(s); };
  var box = document.getElementById('pg-games'), cal = document.getElementById('pg-cal'), cur = null;
  document.getElementById('pg-note').hidden = true;
  function played(g) { var c = 0; for (var q = g.day0; q <= Q; q++) { var r = g.get(q, q - g.day0 + 1); if (r && r[1]) c++; } return c; }
  box.innerHTML = GAMES.map(function (g) {
    var days = Math.max(0, Q - g.day0 + 1);
    return '<button type="button" class="pg-game" data-k="' + g.k + '" aria-pressed="false"><b>' + esc(g.n) + '</b><span>' + esc(g.s) + '</span><i>' + (days ? played(g) + ' of ' + days + ' played' : 'Starts soon') + '</i></button>';
  }).join('');
  function month(g, y, m) {   // one month of one game: Monday first; days outside the game's run are blank
    var first = Math.floor(Date.UTC(y, m, 1) / 864e5), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), lead = (new Date(first * 864e5).getUTCDay() + 6) % 7;
    var h = '<h3 class="pg-month">' + new Date(first * 864e5).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) + '</h3><ol class="pg-grid">';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { h += '<li class="pg-wd" aria-hidden="true">' + d + '</li>'; });
    for (var i = 0; i < lead; i++) h += '<li class="pg-pad" aria-hidden="true"></li>';
    for (var d = 1; d <= n; d++) {
      var q = first + d - 1, num = q - g.day0 + 1;
      if (num < 1 || q > Q) { h += '<li class="pg-off"><span class="pg-d">' + d + '</span></li>'; continue; }
      var r = g.get(q, num), today = q === Q, lbl = new Date(q * 864e5).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
      h += '<li><a class="pg-day' + (r ? (r[1] ? ' is-done' : ' is-part') : '') + (today ? ' is-today' : '') + '" href="/games#' + g.k + (today ? '' : '-' + num) + '" aria-label="' + esc(g.n + ' #' + num + ', ' + lbl + ': ' + (r ? r[0] : today ? 'today, not played yet' : 'not played')) + '">' +
        '<span class="pg-d">' + d + '</span><span class="pg-num">#' + num + '</span><span class="pg-r">' + (r ? esc(r[0]) : today ? 'Today' : 'Play') + '</span></a></li>';
    }
    return h + '</ol>';
  }
  function show(k, quiet) {
    var g = GAMES.filter(function (x) { return x.k === k; })[0] || GAMES[0]; cur = g.k;
    Array.prototype.forEach.call(box.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === g.k)); });
    var days = Math.max(0, Q - g.day0 + 1);
    document.getElementById('pg-n').textContent = days ? g.n + ': ' + days + (days === 1 ? ' day' : ' days') + ' so far' : g.n;
    if (!days) { cal.innerHTML = '<p class="pass-note">' + esc(g.n) + ' has not begun yet.</p>'; return; }
    var a = new Date(g.day0 * 864e5), b = new Date(Q * 864e5), h = '';
    for (var y = b.getUTCFullYear(), m = b.getUTCMonth(); y > a.getUTCFullYear() || (y === a.getUTCFullYear() && m >= a.getUTCMonth()); m--) { if (m < 0) { m = 11; y--; } h += month(g, y, m); }
    cal.innerHTML = h;
    try { localStorage.setItem('epoch-past-game', g.k); if (!quiet) history.replaceState(null, '', '#' + g.k); } catch (e) {}
  }
  box.addEventListener('click', function (e) { var b = e.target.closest('.pg-game'); if (b) show(b.getAttribute('data-k')); });
  var want = location.hash.slice(1), kept = ''; try { kept = localStorage.getItem('epoch-past-game') || ''; } catch (e) {}
  show(want || kept || 'first-daily', true);
  window.epochPastGames = { games: GAMES, show: show, current: function () { return cur; }, today: Q };
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(R, 'past-games'), h + body);
console.log('past-games written (' + (h + body).length + ' bytes)');
