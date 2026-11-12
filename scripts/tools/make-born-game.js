// Born Where? (structure round E2, Nov 2026): a mode of Globe Hunt with a tab of its own: a person is named, the
// reader drops the pin where they were born. Writes born-data.js (BORN [[name, dates, latitude, longitude, region,
// the place's name, entry slug]]) and stamps its ?v= into /games (BORN_SRC).
//   node scripts/tools/make-born-game.js        (build-pages.ps1 runs it after the people's data)
// The pool: the people of people-data.js (so dated, with the Institute's region) whose birthplace in
// scripts/entry-places.tsv has a point (Wikidata P19; a state named as the place has none) and who are well known:
// search-index.js weight 6 or more; not where the place is a country or a broad land (LANDS). Sorted by slug, so the file changes only when the data does.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const box = {}; vm.runInNewContext(read('people-data.js'), box);
const IDX = new Function(read('search-index.js') + '; return SEARCH_INDEX;')(), w = {}; for (const r of IDX) if (r[2] === 'person') w[r[0]] = r[4] || 0;
const born = {}; for (const l of read('scripts/entry-places.tsv').split(/\r?\n/)) { const c = l.split('\t'); if (c[1] === 'b' && c[4] && c[5]) born[c[0]] = c; }
// a country or a broad land named as the birthplace ("Egypt", "Tibet") is no place for a pin
const LANDS = new Set(new Function(read('search-pages.js') + '; return SEARCH_PAGES;')().filter(r => r[2] === 'country').map(r => r[0]).concat(['Tibet', 'Scotland', 'England', 'Wales', 'Persia', 'Anatolia', 'Arabia', 'Gaul', 'Judea', 'Korea', 'Bohemia', 'Prussia', 'Sicily', 'Crete', 'Macedonia', 'Thrace', 'Mesopotamia']));
const rows = box.PEOPLE.filter(p => born[p[0]] && !LANDS.has(born[p[0]][3]) && (w[p[0]] || 0) >= 6 && p[6] >= 0).sort((a, b) => a[0].localeCompare(b[0]))
  .map(p => { const b = born[p[0]]; return [p[1], p[2], +(+b[4]).toFixed(2), +(+b[5]).toFixed(2), box.PEOPLE_REGIONS[p[6]], b[3], p[0]]; });
if (rows.length < 200) throw new Error('Born Where?: only ' + rows.length + ' people with a birthplace on the map');
const js = '// born-data.js - written by scripts/tools/make-born-game.js from people-data.js and scripts/entry-places.tsv (Wikidata P19). Do not edit.\n// [name, dates, latitude, longitude, region, birthplace, entry]\nvar BORN = [\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n];\n';
const out = path.join(R, 'born-data.js'); if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) fs.writeFileSync(out, js);
const v = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10), gp = path.join(R, 'games'), g0 = fs.readFileSync(gp, 'utf8'), g1 = g0.replace(/born-data\.js\?v=[0-9a-f]*/, 'born-data.js?v=' + v);
if (g1 !== g0) fs.writeFileSync(gp, g1);
const by = {}; rows.forEach(r => { by[r[4]] = (by[r[4]] || 0) + 1; });
console.log('Born Where?: ' + rows.length + ' people (' + Object.entries(by).map(e => e[0] + ' ' + e[1]).join(', ') + '), ' + Math.round(js.length / 1024) + ' KB');
