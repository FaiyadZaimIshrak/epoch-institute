// Can these people speak in Who Said It? A speaker must be a person entry with dates and a picture, the picture not
// listed in scripts/no-portrait.tsv (scenes, maps, coins: a monogram is shown instead, so prefer people with a
// portrait). Prints each slug with its name, dates, quotations already in the game, and OK or why not.
//   node scripts/quotes/check-speakers.js <slug> …        or  --all-people <out.tsv> (every person who could speak)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const by = new Map(ENC.map(e => [e.slug, e]));
const noFace = new Set(fs.readFileSync(path.join(R, 'scripts', 'no-portrait.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')[0]));
const have = {}; for (const l of fs.readFileSync(path.join(R, 'scripts', 'quote-sources.tsv'), 'utf8').split(/\r?\n/)) { if (l && !l.startsWith('#')) { const s = l.split('\t')[0]; have[s] = (have[s] || 0) + 1; } }
const why = e => !e ? 'no entry' : e.type !== 'person' ? 'not a person (' + e.type + ')' : !e.dates ? 'no dates' : !e.img ? 'no picture' : noFace.has(e.slug) ? 'picture does not show them (no-portrait.tsv)' : 'OK';
const a = process.argv.slice(2);
if (a[0] === '--all-people') {
  const rows = ENC.filter(e => why(e) === 'OK').map(e => [e.slug, e.name, e.dates, have[e.slug] || 0, (e.empires || []).length].join('\t'));
  fs.writeFileSync(a[1], 'slug\tname\tdates\tquotations\tprofiles\n' + rows.join('\n') + '\n'); console.log(rows.length + ' people written to ' + a[1]);
} else for (const s of a) { const e = by.get(s); console.log(s + '\t' + (e ? e.name + '\t' + (e.dates || '') : '') + '\t' + (have[s] || 0) + ' in the game\t' + why(e)); }
