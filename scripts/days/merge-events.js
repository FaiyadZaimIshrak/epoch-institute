// Adds checked Today in History events (DAYS-GUIDE.md, check-events.js, read by the editor) to data/history.json: each
// event goes into its day in year order with yearDisplay ("153 BCE", "1801"), title, description and, where given,
// links and profile. An event is refused if its day already has that year (the candidates were chosen from years a day
// lacks; a second run therefore adds nothing) or if the editor's fixes do not apply. Writes the file only with --write.
//   node scripts/days/merge-events.js [--write] [--fixes=fixes.json] <events.json> [...]
// fixes.json: [[day, year, field, old, new]] (field title or description: old must occur once; links/profile: new
// replaces the value, null removes it; field "skip": the event is left out, new = why).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
const fixF = (args.find(a => a.startsWith('--fixes=')) || '').slice(8), fixes = fixF ? JSON.parse(fs.readFileSync(fixF, 'utf8')) : [];
const HF = path.join(R, 'data', 'history.json'), H = JSON.parse(fs.readFileSync(HF, 'utf8'));
const list = k => Array.isArray(H[k]) ? H[k] : H[k].events;
let added = 0, refused = 0, skipped = 0; const used = new Set();
for (const f of files) for (const e0 of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  if (e0.skip) { skipped++; continue; }
  const e = JSON.parse(JSON.stringify(e0)), key = e.day + ' ' + e.year;
  let drop = null;
  fixes.forEach((x, i) => {
    if (x[0] !== e.day || x[1] !== e.year) return; used.add(i);
    if (x[2] === 'skip') { drop = x[4]; return; }
    if (x[2] === 'title' || x[2] === 'description') { const n = e[x[2]].split(x[3]).length - 1; if (n !== 1) throw new Error(`fix ${key} ${x[2]}: "${x[3]}" found ${n} times`); e[x[2]] = e[x[2]].replace(x[3], x[4]); }
    else if (x[4] === null) delete e[x[2]]; else e[x[2]] = x[4];
  });
  if (drop) { skipped++; continue; }
  if (!H[e.day]) { console.log('no day ' + e.day); refused++; continue; }
  const L = list(e.day); if (L.some(o => o.year === e.year)) { refused++; continue; }
  const ev = { year: e.year, yearDisplay: e.year < 0 ? -e.year + ' BCE' : String(e.year), title: e.title, description: e.description };
  if (e.links && e.links.length) ev.links = e.links; if (e.profile) ev.profile = e.profile;
  L.push(ev); L.sort((a, b) => a.year - b.year); added++;
}
fixes.forEach((x, i) => { if (!used.has(i)) console.log('fix not used: ' + x.slice(0, 3).join(' ')); });
console.log(`${added} events added, ${refused} refused (the day has that year), ${skipped} skipped`);
if (args.includes('--write') && added) { fs.writeFileSync(HF, JSON.stringify(H)); console.log('data/history.json written'); }
