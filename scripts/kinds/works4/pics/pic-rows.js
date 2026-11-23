// pictures.js apply gives an entry of added-entries.json its img there, but apply-added-entries.ps1 does not carry it to
// an entry already applied: each such entry needs a "pictures" row [slug, artist, licence, source]. Inserts them as text.
//   node pic-rows.js <repo> <picks.txt>
const fs = require('fs'), path = require('path'), [R, picksF] = process.argv.slice(2), f = path.join(R, 'scripts/added-entries.json');
let t = fs.readFileSync(f, 'utf8'); const A = JSON.parse(t), nl = t.includes('\r\n') ? '\r\n' : '\n';
const slugs = fs.readFileSync(picksF, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t')).filter(c => c[1] !== '-').map(c => c[0]);
const add = [];
for (const s of slugs) { const e = A.entries.find(x => x.slug === s); if (!e || !e.img || !e.credit) throw new Error('no picture on ' + s); if (A.pictures.some(p => p[0] === s)) continue;
  add.push([s, e.credit.artist, e.credit.licence, e.credit.source]); }
const keys = Object.keys(A), next = keys[keys.indexOf('pictures') + 1], start = t.indexOf(nl + ' "pictures": ['), end = t.indexOf(nl + ' ],' + nl + ' "' + next + '":', start);
if (start < 0 || end < 0) throw new Error('pictures list not found');
if (add.length) { const out = t.slice(0, end) + ',' + nl + add.map(r => JSON.stringify(r, null, 1).split('\n').map(l => '  ' + l).join(nl)).join(',' + nl) + t.slice(end);
  if (JSON.parse(out).pictures.length !== A.pictures.length + add.length) throw new Error('count'); fs.writeFileSync(f, out); }
console.log(add.length + ' picture rows inserted');
