// Checks History Connections group proposals (scripts/conn/GROUPS-GUIDE.md) against the encyclopedia, for the
// proposer and the editor: every tile's slug is an entry, its quote is copied from that entry's name, dates or
// description, a year group's quotes hold the year of its name, the group is not a published one, labels do not give
// the group away. Prints FAIL lines (must be fixed), WARN lines (to read) and each tile's weight (profiles naming the
// entry + 2 for a picture: a low weight is an obscure tile).
//   node scripts/conn/verify-proposals.js <proposals.json> [...]     exit code 1 when anything FAILs
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = new Map(ENC.map(e => [e.slug, e]));
const norm = s => String(s || '').normalize('NFC').replace(/&amp;/g, '&').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const fold = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const published = new Set();
for (const l of fs.readFileSync(path.join(R, 'scripts', 'connections.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (/^[1-4]$/.test(c[0]) && c[1]) published.add(fold(c[1])); }
const weight = e => (e.empires || []).length + (e.img ? 2 : 0);
let fails = 0, warns = 0, groups = 0; const seenNames = new Set();
for (const file of process.argv.slice(2)) {
  const G = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const g of G) {
    groups++; const out = [], F = m => { out.push('  FAIL ' + m); fails++; }, W = m => { out.push('  WARN ' + m); warns++; };
    if (!g.name) F('no name');
    if (published.has(fold(g.name))) F('published already: ' + g.name);
    if (seenNames.has(fold(g.name))) W('name proposed twice: ' + g.name); seenNames.add(fold(g.name));
    if (![1, 2, 3, 4].includes(g.level)) F('level ' + g.level);
    if (!['plain', 'year', 'wordplay'].includes(g.kind)) F('kind ' + g.kind);
    const tiles = g.tiles || []; if (tiles.length < 5) F(tiles.length + ' tiles (six wanted)');
    const yr = g.kind === 'year' ? (String(g.name).match(/\d{3,4}/) || [])[0] : null;
    if (g.kind === 'year' && !yr) F('a year group without a year in its name');
    const nameWords = fold(g.name).split(' ').filter(w => w.length > 4 && !/^\d+$/.test(w));
    const slugs = new Set(); const ws = [];
    for (const t of tiles) {
      if (slugs.has(t.slug)) F('tile twice: ' + t.slug); slugs.add(t.slug);
      const e = bySlug.get(t.slug); if (!e) { F('unknown slug: ' + t.slug); continue; }
      const hay = norm(e.name + ' | ' + (e.dates || '') + ' | ' + e.desc + ' | ' + (e.aka || []).join(' | '));
      if (!t.quote) F(t.slug + ': no quote');
      else if (norm(t.quote).length < 10 && norm(t.quote) !== norm(e.dates)) F(t.slug + ': quote too short (4 words, or the dates field whole)');
      else if (!hay.includes(norm(t.quote))) F(t.slug + ': quote not in the entry: "' + t.quote + '"');
      if (yr && !norm(t.quote).includes(yr)) F(t.slug + ': quote lacks the year ' + yr);
      if (!t.label) F(t.slug + ': no label');
      else if (g.kind !== 'wordplay') for (const w of nameWords) if (fold(t.label).split(' ').includes(w)) W(t.slug + ': label "' + t.label + '" repeats "' + w + '" of the name');
      ws.push(t.label + ' ' + weight(e)); if (weight(e) === 0) W(t.slug + ': weight 0 (no picture, no profile names it)');
    }
    console.log(`${g.level} ${g.kind.padEnd(8)} ${g.name}  [${ws.join(', ')}]`); for (const o of out) console.log(o);
  }
}
console.log(`${groups} groups: ${fails} FAIL, ${warns} WARN`);
process.exit(fails ? 1 : 0);
