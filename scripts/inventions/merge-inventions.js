// Adds checked inventions-tree drafts (INVENTIONS-GUIDE.md) to the site: each draft's row is appended to
// scripts/inventions.tsv, and its entry written to <entries.json> for scripts/entries/merge-entries.js (which puts it in
// scripts/added-entries.json under a wave). A draft whose entry is {"slug": ..., "existing": true} adds only its row.
// Refuses a slug already on the tree. Without --write it only lists what it would add.
//   node scripts/inventions/merge-inventions.js [--write] [--edits=<edits.json>] <entries.json> <drafts.json> [<drafts.json> …]
// edits: the editor's changes, [slug, field, old, new]: field "entry.<key>" or "row.<key>"; for desc, contested, place,
// date and label old must occur once (else the whole value is replaced: old is ignored); field "skip" leaves a draft out.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), write = args.includes('--write');
const edF = (args.find(a => a.startsWith('--edits=')) || '').split('=')[1];
const EDITS = edF ? JSON.parse(fs.readFileSync(edF, 'utf8')) : [];
const [outF, ...files] = args.filter(a => !a.startsWith('--'));
if (!outF || !files.length) { console.error('usage: merge-inventions.js [--write] [--edits=f] <entries.json> <drafts.json> …'); process.exit(1); }
const TSV = path.join(R, 'scripts', 'inventions.tsv'), tsv = fs.readFileSync(TSV, 'utf8');
const have = new Set(tsv.split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')[0]));
const PART = ['desc', 'contested', 'place', 'date', 'label', 'name', 'dates'];
const entries = [], rows = [], bad = [];
for (const f of files) for (const d of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const slug = d.slug || (d.entry && d.entry.slug); if (d.skip) continue;
  let skip = false;
  for (const [s, field, o, n] of EDITS) {
    if (s !== slug) continue;
    if (field === 'skip') { skip = true; continue; }
    const [part, key] = field.split('.'), obj = d[part];
    if (!obj || !key) { bad.push(slug + ': bad edit field ' + field); continue; }
    if (PART.includes(key) && o) { if (String(obj[key]).split(o).length !== 2) { bad.push(slug + ': edit not found once in ' + field + ': ' + o); continue; } obj[key] = String(obj[key]).replace(o, () => n); }
    else obj[key] = n;
  }
  if (skip) continue;
  if (have.has(slug)) { bad.push(slug + ': already on the tree'); continue; }
  const r = d.row;
  for (const k of ['label', 'cat', 'date', 'place', 'contested', 'source']) if (/[\t\r\n]/.test(r[k] || '')) bad.push(slug + ': a tab or line break in ' + k);
  rows.push([slug, r.label, r.cat, r.year, r.circa ? 1 : '', r.date, r.place || '', (r.civ || []).join(';'), (r.people || []).join(';'), (r.also || []).join(';'),
    (r.built || []).join(','), r.contested || '', r.source].join('\t'));
  if (!d.entry.existing) entries.push({ slug, name: d.entry.name, type: d.entry.type, subtype: d.entry.subtype || '', aka: d.entry.aka || [], dates: d.entry.dates || '', desc: d.entry.desc });
  have.add(slug);
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(rows.length + ' rows, ' + entries.length + ' entries' + (write ? ' written' : ' (dry run: --write)'));
if (!write) process.exit(0);
fs.writeFileSync(outF, JSON.stringify(entries, null, 1) + '\n');
fs.writeFileSync(TSV, tsv.replace(/\n*$/, '\n') + rows.join('\n') + '\n');
