// Kids mode: the battle game is left off Today as it is off the lobby; the three tests that count the daily games now
// count ten.   node scripts/kinds/held2/edits/battle-game-kids.js   (run once, in the repository's root)
const fs = require('fs');
const edit = (f, pairs) => { let t = fs.readFileSync(f, 'utf8'); for (const [a, b] of pairs) { const n = t.split(a).length - 1; if (n < 1) throw new Error(f + ': ' + a.slice(0, 60)); t = t.split(a).join(b); } fs.writeFileSync(f, t); console.log('ok', f); };
edit('today.js', [['.concat(GAMES.map(function (g) {', ".concat(GAMES.filter(function (g) { return !kids || g[1] !== '/games#battle'; }).map(function (g) {"]]);
edit('scripts/tests/past-games.js', [["nine games to choose from', (await p.$$('.pg-game')).length === 9)", "ten games to choose from', (await p.$$('.pg-game')).length === 10)"]]);
edit('scripts/tests/today-page.js', [["the quiz and nine games, none played: each says Play', s.games.length === 10", "the quiz and ten games, none played: each says Play', s.games.length === 11"], ["s.done === '0 of 10 done today'", "s.done === '0 of 11 done today'"], ["s.done === '2 of 10 done today'", "s.done === '2 of 11 done today'"]]);
edit('scripts/tests/born-where.js', [["document.querySelectorAll('.gm-lc').length === 18", "document.querySelectorAll('.gm-lc').length === 19"]]);
