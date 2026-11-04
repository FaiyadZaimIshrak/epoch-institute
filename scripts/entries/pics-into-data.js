// Writes the pictures of a wave's entries into encyclopedia-data.js lines that were applied before the pictures were
// chosen (apply-added-entries only gives a picture when it first adds an entry), and drops rejected picks.
// Run from the repository root:  node scripts/entries/pics-into-data.js <wave> [<slug to drop> …]
const fs = require('fs');
const [wave, ...drop] = process.argv.slice(2);
const A = JSON.parse(fs.readFileSync('scripts/added-entries.json', 'utf8'));
for (const s of drop) {
  const e = A.entries.find(x => x.slug === s); if (!e || !e.img) continue;
  for (const f of ['.' + e.img, 'images/encyclopedia/thumbs/' + s + '.jpg']) { try { fs.unlinkSync(f); } catch (_) {} }
  delete e.img; delete e.credit; console.log('dropped ' + s);
}
fs.writeFileSync('scripts/added-entries.json', JSON.stringify(A, null, 1) + '\n');
const Js = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
let t = fs.readFileSync('encyclopedia-data.js', 'utf8'), n = 0;
for (const e of A.entries.filter(x => x.wave === wave && x.img)) {
  const i = t.indexOf('\n  {slug:"' + e.slug + '"'); if (i < 0) { console.log('missing ' + e.slug); continue; }
  const j = t.indexOf('\n', i + 1); let line = t.slice(i, j); if (line.includes(',img:')) continue;
  const m = line.match(/,desc:"(?:[^"\\]|\\.)*"/);
  const ins = ',img:' + Js(e.img) + ',credit:{artist:' + Js(e.credit.artist) + ',licence:' + Js(e.credit.licence) + ',source:' + Js(e.credit.source) + '}';
  line = line.slice(0, m.index + m[0].length) + ins + line.slice(m.index + m[0].length); t = t.slice(0, i) + line + t.slice(j); n++;
}
new Function(t + ';return ENCYCLOPEDIA')();
fs.writeFileSync('encyclopedia-data.js', t); console.log(n + ' pictures written');
