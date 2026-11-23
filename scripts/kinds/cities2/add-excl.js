// Appends the editor's exclusions (excl1.tsv, read from the link audit of the second wave of cities) to
// scripts/kinds/link-exclusions.tsv, after checking every profile name and entry slug.   node add-excl.js <repo> [file]
const fs = require('fs'), path = require('path'), R = process.argv[2], F = process.argv[3] || path.join(__dirname, 'excl1.tsv');
const rows = fs.readFileSync(F, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
const sd = fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8'), ed = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
const xf = path.join(R, 'scripts/kinds/link-exclusions.tsv'); let x = fs.readFileSync(xf, 'utf8'); const have = new Set(x.split('\n').map(l => l.split('\t').slice(0, 2).join('\t')));
let bad = 0, add = [];
for (const [p, s, why] of rows) {
  if (!why) { console.log('no reason: ' + p + ' ' + s); bad++; }
  if (!sd.includes('"name":"' + p + '"') && !sd.includes('name: "' + p + '"') && !sd.includes('"name": "' + p + '"')) { console.log('no profile: ' + p); bad++; }
  if (!new RegExp('slug:\\s*"' + s + '"|"slug":\\s*"' + s + '"').test(ed)) { console.log('no entry: ' + s); bad++; }
  if (have.has(p + '\t' + s)) { console.log('there already: ' + p + ' ' + s); continue; }
  add.push([p, s, why].join('\t'));
}
if (bad) { console.log(bad + ' faults; nothing written'); process.exit(1); }
if (!x.endsWith('\n')) x += '\n';
fs.writeFileSync(xf, x + add.join('\n') + '\n'); console.log('added ' + add.length + ' of ' + rows.length);
