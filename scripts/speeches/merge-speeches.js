// Adds checked Great Speeches (SPEECHES-GUIDE.md drafts) to the site: each record is appended to speeches-data.js in
// its one-field-per-line form and its source rows to scripts/speech-sources.tsv. Refuses a slug or title the site has,
// a draft marked skip, and a draft without a source row. Without --write it only lists what it would add.
// --edits=<edits.json>: the editor's changes, [[slug, field, old, new]] (old must occur once in that field; for
// speakerSlug, empire, links, led, year, era, full and skip the whole value is replaced: old is ignored). A draft without a
// speakerSlug gets the person entry named exactly as its speaker, if there is one.
//   node scripts/speeches/merge-speeches.js [--write] [--only=slug,slug] [--edits=f] <drafts.json> <sources.tsv> [<drafts.json> <sources.tsv> …]
// Then: powershell -File scripts\fetch-speech-texts.ps1 -Only <the new slugs>, and a full build.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), write = args.includes('--write');
const only = ((args.find(a => a.startsWith('--only=')) || '').split('=')[1] || '').split(',').filter(Boolean);
const files = args.filter(a => !a.startsWith('--'));
const edF = (args.find(a => a.startsWith('--edits=')) || '').split('=')[1];
const EDITS = edF ? JSON.parse(fs.readFileSync(edF, 'utf8')) : [];
const PEOPLE = new Map([...fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8').matchAll(/\{slug:"([^"]+)",name:"([^"]+)",type:"person"/g)].map(m => [m[2], m[1]]));
if (!files.length || files.length % 2) { console.error('usage: merge-speeches.js [--write] [--only=…] <drafts.json> <sources.tsv> …'); process.exit(1); }
const SPF = path.join(R, 'speeches-data.js'), SRF = path.join(R, 'scripts', 'speech-sources.tsv');
let sp = fs.readFileSync(SPF, 'utf8'), src = fs.readFileSync(SRF, 'utf8');
const have = new Set([...sp.matchAll(/\{slug:"([^"]+)",title:"([^"]+)"/g)].flatMap(m => [m[1], m[2].toLowerCase()]));
const S = v => JSON.stringify(String(v));   // the file's strings: double quotes, \" escaped, non-ASCII kept
const A = a => '[' + (a || []).map(S).join(',') + ']';
const recs = [], rows = [], bad = [];
for (let i = 0; i < files.length; i += 2) {
  const drafts = JSON.parse(fs.readFileSync(files[i], 'utf8'));
  const srows = fs.readFileSync(files[i + 1], 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
  for (const d of drafts) {
    if (d.skip || (only.length && !only.includes(d.slug))) continue;
    for (const [s, k, o, n] of EDITS) {
      if (s !== d.slug) continue;
      if (['speakerSlug', 'empire', 'links', 'led', 'year', 'era', 'full', 'skip'].includes(k)) { d[k] = n; continue; }
      if (String(d[k]).split(o).length !== 2) { bad.push(s + ': edit not found once in ' + k + ': ' + o); continue; }
      d[k] = String(d[k]).replace(o, () => n);
    }
    if (d.skip) continue;
    if (!d.speakerSlug && PEOPLE.has(d.speaker)) d.speakerSlug = PEOPLE.get(d.speaker);
    if (have.has(d.slug) || have.has(String(d.title).toLowerCase())) { bad.push(d.slug + ': already on the site'); continue; }
    const mine = srows.filter(r => r[0] === d.slug);
    if (!mine.length && d.full) { bad.push(d.slug + ': no source row (a speech without a full text has full "")'); continue; }
    for (const k of ['before', 'excerpt', 'source', 'after', 'title', 'display', 'place']) if (/[\r\n]/.test(d[k] || '')) bad.push(d.slug + ': a line break in ' + k);
    let r = '{slug:' + S(d.slug) + ',title:' + S(d.title) + ',speaker:' + S(d.speaker) + ',speakerSlug:' + S(d.speakerSlug || '') + ',era:' + S(d.era) + ',year:' + d.year +
      ',display:' + S(d.display) + ',place:' + S(d.place) + ',empire:' + S(d.empire || '') + ',\n';
    if (d.kind) r += 'kind:' + S(d.kind) + ',\n';
    r += 'before:' + S(d.before) + ',\nexcerpt:' + S(d.excerpt) + ',\nsource:' + S(d.source) + ',\nafter:' + S(d.after) + ',\nlinks:' + A(d.links) + ',\n';
    if ((d.led || []).length) r += 'led:' + A(d.led) + ',\n';
    r = d.full ? r + 'full:' + S(d.full) + '}' : r.replace(/,\n$/, '}');
    recs.push(r); if (d.full) rows.push(...mine.map(m => m.slice(0, 5).join('\t'))); have.add(d.slug);
  }
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(recs.length + ' speeches, ' + rows.length + ' source rows' + (write ? ' added' : ' to add (dry run: --write)'));
if (!write || !recs.length) process.exit(0);
const end = sp.lastIndexOf('}\n];'); if (end < 0) throw new Error('speeches-data.js: closing "}\\n];" not found');
sp = sp.slice(0, end + 1) + ',\n' + recs.join(',\n') + sp.slice(end + 1);
fs.writeFileSync(SPF, sp);
fs.writeFileSync(SRF, src.replace(/\n*$/, '\n') + rows.join('\n') + '\n');
