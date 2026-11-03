// Finds the English Wikipedia article for names that have no encyclopedia entry yet (A7, Nov 2026), for the editor to read
// before any article is fetched: each name is searched on its own and with its context words, the first results are
// kept with their short descriptions, and a result whose title folds to the name is marked "=".
//   node scripts/entries/resolve-titles.js <in.tsv> <out.tsv>
// in: context <TAB> name ("achaemenid-persia<TAB>Gobryas"; the context's words are added to the second search).
// out: name <TAB> context <TAB> mark <TAB> title <TAB> description, the best result first, then up to two others; the
// editor keeps one line per name (or none) and gives it a slug: that file goes to fetch-articles.js.
const fs = require('fs');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [inF, outF] = process.argv.slice(2);
if (!inF || !outF) { console.error('usage: resolve-titles.js <in.tsv> <out.tsv>'); process.exit(1); }
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’'`]/g, '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
async function get(u) {
  for (let i = 0; i < 6; i++) {
    try { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(10000 * (i + 1)); continue; } if (r.ok) return await r.json(); } catch (e) {}
    await sleep(3000 * (i + 1));
  }
  return null;
}
async function search(q) {
  const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srlimit=3&srprop=&srsearch=' + encodeURIComponent(q));
  return j && j.query ? j.query.search.map(s => s.title) : [];
}
async function descs(titles) {
  if (!titles.length) return {};
  const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=description&titles=' + encodeURIComponent(titles.join('|')));
  const o = {}; if (j && j.query) for (const p of j.query.pages || []) o[p.title] = p.description || ''; return o;
}
(async () => {
  const rows = fs.readFileSync(inF, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
  const out = [];
  for (const [ctx, name] of rows) {
    const base = name.replace(/\s*\(.*\)$/, ''), inner = (name.match(/\(([^)]*)\)/) || [])[1] || '';
    const words = (ctx || '').replace(/-/g, ' ');
    const seen = [];
    for (const q of [base, base + ' ' + words, inner ? inner : null].filter(Boolean)) { for (const t of await search(q)) if (!seen.includes(t)) seen.push(t); await sleep(400); }
    const d = await descs(seen.slice(0, 6)); await sleep(400);
    const top = seen.slice(0, 3).map(t => [name, ctx, fold(t) === fold(base) || fold(t) === fold(name) ? '=' : '?', t, d[t] || ''].join('\t'));
    out.push(...(top.length ? top : [[name, ctx, '-', '', ''].join('\t')]));
    process.stdout.write('.');
  }
  fs.writeFileSync(outF, out.join('\n') + '\n'); console.log('\n' + rows.length + ' names, ' + out.length + ' lines written to ' + outF);
})();
