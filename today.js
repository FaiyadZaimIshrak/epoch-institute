// today.js - /today, "Today at the Institute" (Nov 2026): the day's things in one place. The anniversary and events,
// the people born and the Song of the Day come from data/days/<mm-dd>.json (TODAY_DAYS_V); the daily quiz and the
// eight daily games show this browser's own results (localStorage epoch-quiz, epoch-games: the records the games keep);
// the run of days is epoch-visits. History Now's lists on the page are now.js's. ?day=mm-dd previews another day's
// events. Needs shared-nav.js (escHtml, kidsGentle). window.epochToday for tests.
(function () {
  'use strict';
  var esc = window.escHtml || function (s) { return String(s); }, $ = function (id) { return document.getElementById(id); };
  var kids = document.documentElement.getAttribute('data-kids') === '1';
  var Q = Math.floor(Date.now() / 864e5), now = new Date(Q * 864e5), pv = /[?&]day=(\d\d)-(\d\d)/.exec(location.search);
  var mm = pv ? pv[1] : ('0' + (now.getUTCMonth() + 1)).slice(-2), dd = pv ? pv[2] : ('0' + now.getUTCDate()).slice(-2);
  var MON = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var dayUrl = '/today-in-history/' + MON[+mm - 1] + '-' + (+dd), dayName = (+dd) + ' ' + MON[+mm - 1].charAt(0).toUpperCase() + MON[+mm - 1].slice(1);
  var Y = now.getUTCFullYear(), ago = function (y) { return Y - y - (y < 0 ? 1 : 0); };
  $('td-date').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  // ── the games ───────────────────────────────────────────────────────────────────────────────────────────────
  var G = {}; try { G = JSON.parse(localStorage.getItem('epoch-games') || '{}') || {}; } catch (e) {}
  var d0 = function (m, d) { return Math.floor(Date.UTC(2026, m, d) / 864e5); }, ones = function (m) { return (m.match(/1/g) || []).length; };
  var five = function (key) { return function (n) { var r = G[key + n]; return r && r.m ? [ones(r.m) + '/5' + (r.m.length < 5 ? ' so far' : ''), r.m.length >= 5] : null; }; };
  var GAMES = [
    ['Daily Ten', '/games#first-daily', 'Ten pairs: which came first?', d0(9, 26), function (n, q) { var r = G['daily-' + q]; return r && r.m ? [ones(r.m) + '/10' + (r.m.length < 10 ? ' so far' : ''), r.m.length >= 10] : null; }],
    ['Connections', '/games#conn', 'Sixteen tiles, four groups', d0(9, 26), function (n) { var r = G['conn-' + n]; return r ? [r.done ? ((r.s || []).length === 4 ? 'Solved' : (r.s || []).length + ' of 4 groups') : 'In progress', !!r.done] : null; }],
    ['Crossword', '/games#cross', 'A history crossword', d0(9, 27), function (n) { var r = G['cw-' + n]; return r ? [r.gave ? 'Answers shown' : r.done ? 'Solved' : 'In progress', !!(r.done || r.gave)] : null; }],
    ['Who Said It?', '/games#said', 'Five quotations, four faces each', d0(9, 28), five('said-')],
    ['Where Is This Song From?', '/games#songq', 'Five songs, four regions', d0(10, 3), five(kids ? 'songq-k' : 'songq-')],
    ['Six Degrees', '/games#six', 'From one entry to another by its links', d0(10, 6), function (n) { var r = G['sixd-' + n]; return r ? [r.gave ? 'Route shown' : r.done ? 'Solved in ' + r.c + ' clicks' : 'In progress', !!(r.done || r.gave)] : null; }],
    ['Quote Cipher', '/games#cipher', 'A quotation in code', d0(10, 14), function (n) { var r = G['cipher-' + n]; return r ? [r.gave ? 'Answer shown' : r.done ? 'Solved' : 'In progress', !!(r.done || r.gave)] : null; }],
    ['Finish the Line', '/games#line', 'Which line of the song comes next?', d0(10, 15), five('line-')]
  ];
  var quiz = null; try { quiz = JSON.parse(localStorage.getItem('epoch-quiz') || 'null'); } catch (e) {}
  var rows = [['Daily Quiz', '/quiz', 'Name it from the clues', quiz && quiz.day === Q ? [quiz.done ? (quiz.won ? 'Solved' : 'Not this time') : 'In progress', !!quiz.done] : null]]
    .concat(GAMES.map(function (g) { var n = Math.max(1, Q - g[3] + 1); return [g[0], g[1], g[2], g[4](n, Q)]; }));
  var done = rows.filter(function (r) { return r[3] && r[3][1]; }).length;
  $('td-games').innerHTML = rows.map(function (r) {
    return '<li><a class="td-game' + (r[3] && r[3][1] ? ' is-done' : '') + '" href="' + r[1] + '"><span class="td-game-n">' + esc(r[0]) + '</span><span class="td-game-d">' + esc(r[2]) + '</span>' +
      '<span class="td-game-s">' + (r[3] ? esc(r[3][0]) : 'Play &rarr;') + '</span></a></li>';
  }).join('');
  $('td-done').textContent = done + ' of ' + rows.length + ' done today';
  // the run of days with a visit (shared-nav.js keeps epoch-visits)
  var visits = []; try { visits = JSON.parse(localStorage.getItem('epoch-visits') || '[]') || []; } catch (e) {}
  var run = 0; for (var k = visits.length - 1, want = Q; k >= 0 && visits[k] >= want - 0; k--) { if (visits[k] === want) { run++; want--; } else if (visits[k] < want) break; }
  $('td-run').textContent = run > 1 ? run + ' days in a row at the Institute' : 'Come back tomorrow to start a run of days';

  // ── the day ─────────────────────────────────────────────────────────────────────────────────────────────────
  var S = { day: null };
  fetch('/data/days/' + mm + '-' + dd + '.json?v=' + (window.TODAY_DAYS_V || '')).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return; S.day = d;
    var ok = function (e) { return !kids || typeof kidsGentle !== 'function' || kidsGentle(e.title, e.description); };
    var evs = d.events.filter(ok), hero = d.events[d.hero] && ok(d.events[d.hero]) ? d.events[d.hero] : evs[0], rest = evs.filter(function (e) { return e !== hero; });
    // the three others: the roundest anniversaries first, then the oldest
    rest.sort(function (a, b) { var ra = ago(a.year) % 100 === 0 ? 0 : ago(a.year) % 50 === 0 ? 1 : 2, rb = ago(b.year) % 100 === 0 ? 0 : ago(b.year) % 50 === 0 ? 1 : 2; return ra - rb || a.year - b.year; });
    var yrs = function (e) { var n = ago(e.year); return n > 0 ? n.toLocaleString('en-GB') + (n === 1 ? ' year ago' : ' years ago') : ''; };
    if (hero) $('td-day').innerHTML = '<a class="td-hero" href="' + dayUrl + '">' + (d.pic && d.hero >= 0 && hero === d.events[d.hero] ? '<img src="' + esc(d.pic[0]) + '" alt="" width="320" height="200">' : '') +
      '<span class="td-hero-b"><span class="td-k">' + esc(yrs(hero)) + ' &middot; ' + esc(hero.yearDisplay) + '</span><span class="td-hero-t">' + esc(hero.title) + '</span><span class="td-hero-d">' + esc(hero.description) + '</span></span></a>' +
      '<ul class="td-evs">' + rest.slice(0, 3).map(function (e) { return '<li><a href="' + dayUrl + '"><b>' + esc(e.yearDisplay) + '</b> ' + esc(e.title) + '</a></li>'; }).join('') + '</ul>' +
      '<p class="now-note"><a href="' + dayUrl + '">All ' + d.events.length + ' events of ' + dayName + ', and who was born and died &rarr;</a></p>';
    if (d.born && d.born.length) $('td-born').innerHTML = d.born.slice(0, 4).map(function (b) {
      return '<li><a href="/encyclopedia/' + esc(b[0]) + '">' + (b[3] ? '<img src="' + esc(b[3]) + '" alt="" width="56" height="56" loading="lazy">' : '') + '<span><b>' + esc(b[1]) + '</b><i>' + esc(b[2]) + '</i></span></a></li>';
    }).join(''); else $('td-born-sec').hidden = true;
    if (d.song) $('td-song').innerHTML = '<a class="td-songc" href="/songs/' + esc(d.song[0]) + '"><span class="td-k">' + esc(d.song[2]) + ' &middot; ' + esc(d.song[3]) + '</span><span class="td-hero-t">' + esc(d.song[1]) + '</span><span class="td-hero-d">' + esc(d.song[4]) + '</span>' +
      '<span class="td-game-s">' + (d.song[6] ? 'Its story, and a performance to hear &rarr;' : 'Its story &rarr;') + '</span></a>';
    else $('td-song-sec').hidden = true;
  }).catch(function () {});
  window.epochToday = { rows: rows, done: done, run: run, state: S };
})();
