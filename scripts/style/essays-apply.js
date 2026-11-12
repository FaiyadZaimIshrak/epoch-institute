// Puts restyled essay sections back (scripts/style/essays/out-N.json, ids essay:<file>|<section number>): each section
// is found in scripts/essays/<file> as it stood (in-N.json) and replaced. Checked first with lines.js check.
//   node scripts/style/essays-apply.js [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), D = path.join(__dirname, 'essays');
const { checkPair } = require('./check.js'); const files = {}; let n = 0; const bad = [];
for (const f of fs.readdirSync(D).filter(x => /^out-\d+\.json$/.test(x))) {
  const I = JSON.parse(fs.readFileSync(path.join(D, f.replace('out', 'in')), 'utf8')), O = JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')), by = {}; O.forEach(o => by[o.id] = o);
  for (const i of I) { const o = by[i.id]; if (!o || o.text === i.text) continue; const rep = checkPair(i.text, o.text, []).filter(r => !/^paragraphs/.test(r)); if (rep.length) { bad.push(i.id + ': ' + rep.join('; ')); continue; }
    const file = 'scripts/essays/' + i.id.slice(6).split('|')[0]; const t = files[file] !== undefined ? files[file] : fs.readFileSync(path.join(R, file), 'utf8');
    if (t.split(i.text).length !== 2) { bad.push(i.id + ': the section was not found once'); continue; } files[file] = t.replace(i.text, () => o.text); n++; } }
console.log(n + ' sections' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
if (process.argv.includes('--write') && !bad.length) { for (const f in files) fs.writeFileSync(path.join(R, f), files[f]); console.log('written'); }
