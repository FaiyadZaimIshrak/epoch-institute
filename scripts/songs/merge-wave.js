// Adds a wave of drafted songs (SONGS-GUIDE.md, WORDS-VIDEOS-GUIDE.md) to the site, as the editor decided:
//   node scripts/songs/merge-wave.js <drafts dir> <decisions.json> <rows.tsv> <videos.tsv> [--write]
// decisions.json: {"drop": {slug: why}, "nowords": {slug: why} (public-domain words not printed: no free, clean edition;
// the slug joins make-data.js GAPS), "withheld": {slug: why} (make-data.js WITHHELD), "edits": [[slug, old, new]] (on the
// song file's text; old must occur once), "fixes": {"slug|part": [[old, new]]} (into text-fixes.json)}.
// rows.tsv: the words rows chosen (sources.tsv format); videos.tsv: the performances chosen (videos.tsv format).
// Copies each draft to scripts/songs/<slug>.txt (refusing a song the site has), appends the rows and performances under
// a comment line, merges the fixes and adds the gaps. Without --write it only reports.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), SD = path.join(R, 'scripts', 'songs');
const args = process.argv.slice(2), write = args.includes('--write'), [dir, decF, rowsF, vidF] = args.filter(a => !a.startsWith('--'));
const D = JSON.parse(fs.readFileSync(decF, 'utf8')), drop = D.drop || {}, nowords = D.nowords || {}, withheld = D.withheld || {};
const rows = fs.readFileSync(rowsF, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
const vids = fs.readFileSync(vidF, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
const bad = [], files = {};
// the songs the site has, by their titles and local titles (folded): a draft under another slug is still a duplicate
// (4 Nov 2026: the wave's İstiklal Marşı was the site's "Independence March", istiklal-marsi)
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const heads = t => { const g = k => (t.match(new RegExp('^' + k + ':\\s*(.*)$', 'm')) || [])[1] || ''; return [g('title'), ...g('local').split(' / ')].map(fold).filter(Boolean); };
const HAVE = new Map(); for (const f of fs.readdirSync(SD).filter(f => /^[a-z0-9-]+\.txt$/.test(f))) for (const k of heads(fs.readFileSync(path.join(SD, f), 'utf8'))) HAVE.set(k, f.slice(0, -4));
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.txt'))) {
  const slug = f.slice(0, -4); if (drop[slug]) continue;
  if (fs.existsSync(path.join(SD, f))) { bad.push(slug + ': the site has this song'); continue; }
  let t = fs.readFileSync(path.join(dir, f), 'utf8');
  const dup = heads(t).find(k => HAVE.has(k)); if (dup) { bad.push(slug + ': the site has this song as ' + HAVE.get(dup) + ' ("' + dup + '")'); continue; }
  for (const [s, o, n] of D.edits || []) if (s === slug) { if (t.split(o).length !== 2) bad.push(slug + ': edit not found once: ' + o); else t = t.replace(o, () => n); }
  files[slug] = t;
}
const slugs = Object.keys(files);
for (const r of rows) { const s = r.split('\t')[0]; if (!files[s]) bad.push('row for a song not in the wave: ' + s); if (nowords[s] || withheld[s]) bad.push('row for a song without words: ' + s); }
for (const v of vids) { const s = v.split('\t')[0]; if (!files[s]) bad.push('performance for a song not in the wave: ' + s); }
for (const s of [...Object.keys(nowords), ...Object.keys(withheld)]) if (!files[s]) bad.push('gap for a song not in the wave: ' + s);
const withRows = new Set(rows.map(r => r.split('\t')[0]));
for (const s of slugs) { const pd = /^status:\s*pd\b/m.test(files[s]); if (pd && !withRows.has(s) && !nowords[s] && !withheld[s]) bad.push(s + ': public domain, but no words row and no stated gap'); }
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log(slugs.length + ' songs, ' + rows.length + ' words rows for ' + withRows.size + ' songs, ' + vids.length + ' performances, ' +
  Object.keys(nowords).length + ' without words, ' + Object.keys(withheld).length + ' withheld' + (write ? '' : ' (dry run: --write)'));
if (!write) process.exit(0);
const label = D.label || 'a new wave';
for (const s of slugs) fs.writeFileSync(path.join(SD, s + '.txt'), files[s]);
const app = (f, lines) => { const p = path.join(SD, f), t = fs.readFileSync(p, 'utf8'); fs.writeFileSync(p, t.replace(/\n*$/, '\n') + '# ' + label + '\n' + lines.join('\n') + '\n'); };
if (rows.length) app('sources.tsv', rows);
if (vids.length) app('videos.tsv', vids);
const TF = path.join(SD, 'text-fixes.json'), tf = JSON.parse(fs.readFileSync(TF, 'utf8'));
for (const [k, v] of Object.entries(D.fixes || {})) tf[k] = (tf[k] || []).concat(v);
fs.writeFileSync(TF, JSON.stringify(tf, null, 1) + '\n');
// the gaps: make-data.js's GAPS array and WITHHELD object take the new slugs
const MD = path.join(SD, 'make-data.js'); let md = fs.readFileSync(MD, 'utf8');
if (Object.keys(nowords).length) md = md.replace(/const GAPS = \[/, m => m + Object.keys(nowords).map(s => JSON.stringify(s)).join(', ') + ', ');
if (Object.keys(withheld).length) md = md.replace(/const WITHHELD = \{/, m => m + '\n  ' + Object.entries(withheld).map(([s, w]) => JSON.stringify(s) + ': ' + JSON.stringify(w)).join(',\n  ') + ',');
fs.writeFileSync(MD, md);
console.log('written; import the words: node scripts/songs/fetch-texts.js --only=' + [...withRows].join(','));
