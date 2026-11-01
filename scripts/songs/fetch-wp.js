// Songs in History: saves each listed song's English Wikipedia article as plain text, the material the drafts are
// written and checked from. node scripts/songs/fetch-wp.js <list.tsv> <out dir>
// list lines: English Wikipedia title, region, era, type, words. Writes <out dir>/<slug>.txt and <out dir>/slugs.tsv
// (slug, title, url, region, era, type, words). The slug drops a trailing "(song)", "(1860 song)", "(folklore)" …
// Articles already saved are kept; the API is asked every 2 s (it answers 429 when hurried).
const fs = require('fs'), path = require('path');
const UA = 'EpochInstitute/1.0 (the-epoch-institute.org)', sleep = ms => new Promise(r => setTimeout(r, ms));
const slugOf = t => t.replace(/\s*\([^)]*\)$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[ʻ'’]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
(async () => {
  const [list, dir] = process.argv.slice(2); fs.mkdirSync(dir, { recursive: true });
  const rows = fs.readFileSync(list, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const out = [];
  for (const r of rows) {
    const slug = slugOf(r[0]), f = path.join(dir, slug + '.txt');
    if (fs.existsSync(f)) { const h = fs.readFileSync(f, 'utf8').split('\n'); out.push([slug, h[1].slice(7), h[0].slice(8), ...r.slice(1)]); continue; }
    const u = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=extracts|info&explaintext=1&inprop=url&titles=' + encodeURIComponent(r[0]);
    let j; for (let i = 0; i < 5; i++) { try { const res = await fetch(u, { headers: { 'User-Agent': UA } }); if (res.ok) { j = await res.json(); break; } } catch (e) {} await sleep(6000 * (i + 1)); }
    const p = j && Object.values(j.query.pages)[0];
    if (!p || p.missing !== undefined || !p.extract) { console.log('MISSING', r[0]); continue; }
    fs.writeFileSync(f, 'Source: ' + p.fullurl + '\nTitle: ' + p.title + '\n\n' + p.extract);
    out.push([slug, p.title, p.fullurl, ...r.slice(1)]);
    await sleep(2000);
  }
  fs.writeFileSync(path.join(dir, 'slugs.tsv'), out.map(x => x.join('\t')).join('\n') + '\n');
  console.log(out.length, 'songs saved in', dir);
})();
