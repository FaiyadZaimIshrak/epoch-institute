// Titles and descriptions that came out broken: a bracket opened and not closed (12 Nov 2026: "Tian Heng (d. 202 BCE):
// King of Qi ( — The Epoch Institute"), a label ending in a preposition, article or conjunction, doubled punctuation,
// a bracket inside a bracket in a description, an empty label after the colon.
//   node scripts/tools/title-audit.js [--all]     exits 1 when a title is broken
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const dirs = 'empire,religion,language,culture,movement,government,ideology,work,life,encyclopedia,state,today-in-history,countries,centuries,paths,speeches,years,people,essays,teachers,societies,songs'.split(',');
const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
const bal = s => { let d = 0; for (const c of s) { if (c === '(') d++; else if (c === ')') { d--; if (d < 0) return false; } } return d === 0; };
const bad = [], odd = []; let n = 0;
const walk = d => { for (const f of fs.readdirSync(path.join(R, d), { withFileTypes: true })) { if (f.isDirectory()) { walk(d + '/' + f.name); continue; } if (f.name.includes('.')) continue;
  const h = fs.readFileSync(path.join(R, d, f.name), 'utf8').slice(0, 5000), tm = h.match(/<title>([^<]*)<\/title>/), dm = h.match(/<meta name="description" content="([^"]*)"/); if (!tm) continue; n++;
  const t = dec(tm[1]), core = t.replace(/ — [^—]*$/, ''), desc = dm ? dec(dm[1]) : '', u = '/' + d + '/' + f.name;
  if (!bal(core)) bad.push(u + ' :: title bracket :: ' + t);
  else if (/[:(,;–-]\s*$/.test(core) || /\s(?:of|the|a|an|and|or|in|on|at|by|to|for|with|from|who|which|that|was|is)\s*$/i.test(core)) bad.push(u + ' :: title ends badly :: ' + t);
  else if (/:\s*:|\(\s*\)|,\s*,|\s[,;:]\s/.test(core)) bad.push(u + ' :: title punctuation :: ' + t);
  if (/\([^()]*\([^()]*\)[^()]*\)\)|\(\(/.test(desc) || /\(\d[^)]{60,}\)\)?, a song:/.test(desc)) odd.push(u + ' :: description brackets :: ' + desc.slice(0, 140)); } };
for (const d of dirs) if (fs.existsSync(path.join(R, d))) walk(d);
console.log(n + ' pages; broken titles: ' + bad.length + '; odd descriptions: ' + odd.length); for (const b of bad.slice(0, process.argv.includes('--all') ? 1e9 : 60)) console.log('  ' + b); for (const b of odd.slice(0, 30)) console.log('  ' + b);
process.exit(bad.length ? 1 : 0);
