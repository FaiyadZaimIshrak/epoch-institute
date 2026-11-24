// Wires the daily game "Which Battle Is This?" (24 Nov 2026) into the pages that list the daily games. Run once, in the
// repository's root; every anchor must be found exactly once. The game's own code is in games.js (BattleQ), its dealer
// scripts/tools/make-battle-game.js.   node scripts/kinds/held2/edits/add-battle-game.js
const fs = require('fs');
const edit = (f, pairs) => { let t = fs.readFileSync(f, 'utf8'); for (const [a, b, all] of pairs) { const n = t.split(a).length - 1; if (all ? n < 1 : n !== 1) throw new Error(f + ': ' + n + ' x ' + a.slice(0, 70)); t = t.split(a).join(b); } fs.writeFileSync(f, t); console.log('ok ' + f); };
const GET = "function (n) { var r = G['battleq-' + n]; return r && r.g && r.g.length ? [r.done ? (r.w ? 'Found on clue ' + r.g.length : 'Not found') : 'In progress', !!r.done] : null; }";

// /games: the lobby card, the tab, the game's panel, the data's address, the count
edit('games', [
  ['<span class="gm-lc-s">Today&rsquo;s life is waiting</span></a></li>\n', '<span class="gm-lc-s">Today&rsquo;s life is waiting</span></a></li>\n' +
    '      <li class="gm-nokids"><a class="gm-lc" href="#battle" data-g="battle" data-new="2026-12-24"><span class="gm-lc-ic" aria-hidden="true">&#9876;</span><span class="gm-lc-t">Which Battle Is This?</span><span class="gm-lc-d">A battle&rsquo;s field in motion with every name taken off: how soon can you tell which it is?</span><span class="gm-lc-s">Today&rsquo;s battle is waiting</span></a></li>\n'],
  ['<span class="gm-tab-t">Whose Life?</span></button>\n', '<span class="gm-tab-t">Whose Life?</span></button>\n' +
    '    <button class="gm-tab gm-nokids" id="tab-battle" role="tab" aria-selected="false" aria-controls="game-battle" tabindex="-1"><span class="gm-tab-ic" aria-hidden="true">&#9876;</span><span class="gm-tab-t">Which Battle?</span></button>\n'],
  ['    <p class="gm-conn-more"><label>Play another <select id="whose-pick"></select></label></p>\n  </section>\n', '    <p class="gm-conn-more"><label>Play another <select id="whose-pick"></select></label></p>\n  </section>\n' +
    '  <section class="gm-game" id="game-battle" role="tabpanel" aria-labelledby="tab-battle" hidden>\n' +
    '    <div class="gm-head">\n' +
    '      <p class="gm-howto">One of the <a href="/battle/">battles</a> a day, the same for everyone, shown as its field in motion with every name taken off. Press Play, then choose among eight battles. A wrong answer puts a kind of name back: the ground, the century and region, the two sides, the commanders.</p>\n' +
    '    </div>\n' +
    '    <div class="gm-stats">\n' +
    '      <span class="gm-stat" id="battle-num"></span>\n' +
    '      <span class="gm-stat gm-stat-best" id="battle-best"></span>\n' +
    '    </div>\n' +
    '    <div class="gm-board gm-said gm-whose gm-bq">\n' +
    '      <div id="battle-field" class="gm-bq-field"><p class="gm-howto">The field is loading&hellip;</p></div>\n' +
    '      <div id="battle-board"></div>\n' +
    '      <div class="gm-done" id="battle-done" hidden></div>\n' +
    '    </div>\n' +
    '    <p class="gm-conn-more"><label>Play another <select id="battle-pick"></select></label></p>\n' +
    '  </section>\n'],
  ["<script>var WHOSE_SRC = ", "<script>var BATTLEQ_SRC = '/battleq-data.js?v=0';</script>\n<script>var WHOSE_SRC = "],
  ['Eighteen games', 'Nineteen games', true],
  ['games.js?v=23', 'games.js?v=24'],
]);
edit('scripts/build-pages.ps1', [
  ["k = 'Eighteen games'", "k = 'Nineteen games'"],
  ["  if ($LASTEXITCODE) { throw 'Whose Life?: scripts/tools/make-whose-life.js failed (above)' }\n", "  if ($LASTEXITCODE) { throw 'Whose Life?: scripts/tools/make-whose-life.js failed (above)' }\n" +
    "  # Which Battle Is This? (Nov 2026): a battle a day shown as its field with the names taken off, dealt by\n" +
    "  # scripts/tools/make-battle-game.js (scripts/battle-game.tsv, append only) from the fields make-battle-maps.js wrote;\n" +
    "  # it writes battleq-data.js and stamps its ?v= into /games (BATTLEQ_SRC)\n" +
    "  foreach ($bqL in (& $songExe \"$PSScriptRoot\\tools\\make-battle-game.js\")) { Say $bqL }\n" +
    "  if ($LASTEXITCODE) { throw 'Which Battle Is This?: scripts/tools/make-battle-game.js failed (above)' }\n"],
]);
// /today: a row; My Week: a column; past games: a calendar; My Passport: the nineteenth game
edit('today.js', [
  ["!!r.done] : null; }]\n  ];", "!!r.done] : null; }],\n    ['Which Battle Is This?', '/games#battle', 'A battle\\u2019s field without its names', d0(10, 27), " + GET + "]\n  ];"],
]);
edit('weekly', [
  ['<th scope="col"><a href="/games#whose">Whose Life?</a></th></tr>', '<th scope="col"><a href="/games#whose">Whose Life?</a></th><th scope="col"><a href="/games#battle">Which Battle?</a></th></tr>'],
  ["sq: r.w ? '1' : '0' }; } }];", "sq: r.w ? '1' : '0' }; } },\n    { k: 'battle', n: 'Which Battle?', day0: d0(10, 27), get: function (q, num) { var r = G['battleq-' + num]; if (!r || !r.g || !r.g.length) return null; if (!r.done) return { pts: 0, max: 5, t: 'In progress', sq: '0' }; return { pts: r.w ? 6 - r.g.length : 0, max: 5, t: r.w ? 'Found on clue ' + r.g.length : 'Not found', sq: r.w ? '1' : '0' }; } }];"],
  ["line: 'line', whose: 'whose' }", "line: 'line', whose: 'whose', battle: 'battle' }"],
]);
edit('scripts/tools/make-past-games.js', [
  ["return [r.done ? (r.w ? 'Clue ' + r.g.length : 'Missed') : 'Begun', !!r.done]; } }];", "return [r.done ? (r.w ? 'Clue ' + r.g.length : 'Missed') : 'Begun', !!r.done]; } },\n    { k: 'battle', n: 'Which Battle Is This?', s: 'A battle\\u2019s field without its names', day0: d0(10, 27), get: function (q, n) { var r = G['battleq-' + n]; if (!r || !r.g || !r.g.length) return null; return [r.done ? (r.w ? 'Clue ' + r.g.length : 'Missed') : 'Begun', !!r.done]; } }];"],
]);
edit('passport.js', [
  ["if (/^whose-\\d/.test(k)) played.whose = 1; });", "if (/^whose-\\d/.test(k)) played.whose = 1; if (/^battleq-\\d/.test(k)) played.battle = 1; });"],
  ["' of 18 played'", "' of 19 played'"],
]);
edit('passport', [['passport.js?v=16', 'passport.js?v=17']]);
