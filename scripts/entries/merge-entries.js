// Adds checked encyclopedia entries (ENTRIES-GUIDE.md drafts) to scripts/added-entries.json (A7, Nov 2026), for
// apply-added-entries.ps1 to write: each entry gets the editor's fixes and link patterns, a "wave" marker (a re-run of
// the same wave replaces its own entries and keeps the pictures already given), and is refused if its slug is an
// existing entry. Link patterns: the entry's name (mode 0) and those of its aka the editor listed in <links.json>
// ({slug: [[text, mode], ...]} replaces the default; {slug: []} gives no row: a name that would link elsewhere too).
//   node scripts/entries/merge-entries.js <wave> <links.json> <fixes.json> <out.json> [<out.json> …]
// fixes.json: [[slug, field, old, new]] (field "type", "subtype", "dates", "name", "aka" (new = array) or "desc"; for
// desc, old must occur exactly once).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [wave, linksF, fixesF, ...files] = process.argv.slice(2);
if (!wave || !files.length) { console.error('usage: merge-entries.js <wave> <links.json> <fixes.json> <out.json> …'); process.exit(1); }
const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const LINKS = linksF && fs.existsSync(linksF) ? JSON.parse(fs.readFileSync(linksF, 'utf8')) : {};
const FIXES = fixesF && fs.existsSync(fixesF) ? JSON.parse(fs.readFileSync(fixesF, 'utf8')) : [];
const old = {}; for (const e of A.entries.filter(x => x.wave === wave)) old[e.slug] = e;
const mine = new Set(Object.keys(old)), other = new Set(ENC.map(e => e.slug).filter(s => !mine.has(s)));
const out = [], bad = [];
for (const f of files) for (const d of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  if (other.has(d.slug)) { bad.push(d.slug + ': already an entry'); continue; }
  const e = { slug: d.slug, name: d.name, type: d.type, subtype: d.subtype || '', aka: d.aka || [], dates: d.dates || '', desc: d.desc };
  for (const [s, field, o, n] of FIXES) {
    if (s !== d.slug) continue;
    if (field === 'desc') { if (e.desc.split(o).length !== 2) { bad.push(s + ': fix not found once: ' + o); continue; } e.desc = e.desc.replace(o, () => n); }
    else e[field] = n;
  }
  if (!e.subtype) delete e.subtype; if (!e.aka.length) delete e.aka; if (!e.dates) delete e.dates;
  if (old[d.slug] && old[d.slug].img) { e.img = old[d.slug].img; e.credit = old[d.slug].credit; }
  e.links = LINKS[d.slug] !== undefined ? LINKS[d.slug] : [[d.name, 0]];
  e.wave = wave; out.push(e);
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
A.entries = A.entries.filter(x => x.wave !== wave).concat(out);
fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
console.log(out.length + ' entries of wave ' + wave + ' in scripts/added-entries.json');
