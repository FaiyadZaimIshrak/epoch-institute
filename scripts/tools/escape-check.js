// Text that would show an escape instead of its character: a backslash-u code left in a string ("Germany's" on the
// daily quiz, 12 Nov 2026: home-data.js held apostrophes escaped twice), an HTML entity in data that is printed as
// text, or an entity escaped twice. Reads the data files as the pages do (evaluated), so only what a reader would see.
//   node scripts/tools/escape-check.js [--fix]     --fix rewrites home-data.js (the only file found with the fault)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (f, v) => new Function(rd(f).replace(/^\s*const /gm, 'var ') + ';return {' + v + '}')();
const BAD = /\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}|&amp;(?:amp|quot|#\d+|lt|gt);|&#(?:39|34|x27);|\\['"]/;
let total = 0;
function chk(name, o) {
  let n = 0; const ex = [];
  (function walk(x) { if (typeof x === 'string') { if (BAD.test(x)) { n++; if (ex.length < 3) ex.push(x.slice(Math.max(0, x.search(BAD) - 40), x.search(BAD) + 40)); } } else if (x && typeof x === 'object') for (const k in x) walk(x[k]); })(o);
  total += n; console.log(name.padEnd(22) + n + (ex.length ? '\n    ' + ex.join('\n    ') : ''));
}
const FILES = [['home-data.js', 'HOME_QUIZ,HOME_PICS,HOME_ENTRIES'], ['empire-glance.js', 'GLANCE'], ['empire-facts.js', 'EMPIRE_FACTS'], ['empire-profiles.js', 'EMPIRE_PROFILES'], ['shared-data.js', 'EMPIRES,EMPIRE_INFO'],
  ['encyclopedia-data.js', 'ENCYCLOPEDIA'], ['speeches-data.js', 'SPEECHES'], ['reading-paths.js', 'READING_PATHS'], ['point-descs.js', 'POINT_DESCS'], ['games-data.js', 'GAME_CARDS,GAME_WORDS'], ['said-data.js', 'SAID'],
  ['connections-data.js', 'CONN_PUZZLES'], ['crossword-data.js', 'CW_DATA'], ['ranks-data.js', 'GAME_RANKS'], ['songq-data.js', 'SONGQ'], ['line-data.js', 'LINEQ'], ['cipher-data.js', 'CIPHER'], ['born-data.js', 'BORN'],
  ['search-index.js', 'SEARCH_INDEX,SEARCH_STATES'], ['search-pages.js', 'SEARCH_PAGES'], ['people-data.js', 'PEOPLE'], ['sixdeg-data.js', 'SIXD']];
for (const [f, v] of FILES) { try { const o = ev(f, v); for (const k in o) chk(f + ' ' + k, o[k]); } catch (e) { console.log(f.padEnd(22) + 'not read: ' + String(e).slice(0, 70)); } }
for (const d of ['data/days', 'data/enc-preview', 'data/compare', 'data/societies', 'data/cards', 'data/faiths']) { let o = {}; try { for (const f of fs.readdirSync(path.join(R, d))) if (f.endsWith('.json')) o[f] = JSON.parse(rd(d + '/' + f)); chk(d, o); } catch (e) { console.log(d + ' not read'); } }
for (const f of ['data/polities.json', 'data/history.json', 'data/now.json', 'data/inventions.json', 'data/meanwhile.json', 'data/song-lines.json']) { try { chk(f, JSON.parse(rd(f))); } catch (e) { console.log(f + ' not read'); } }
console.log(total + ' strings with an escape showing');
if (process.argv.includes('--fix')) {
  let s = rd('home-data.js'); const n0 = (s.match(/\\\\u[0-9a-fA-F]{4}/g) || []).length;
  s = s.replace(/\\\\u([0-9a-fA-F]{4})/g, (m, h) => { const c = String.fromCharCode(parseInt(h, 16)); return c === '"' ? '\\"' : c === '\\' ? '\\\\' : c; });
  new Function(s); fs.writeFileSync(path.join(R, 'home-data.js'), s); console.log('home-data.js: ' + n0 + ' escapes written as their characters');
}
process.exit(total && !process.argv.includes('--fix') ? 1 : 0);
