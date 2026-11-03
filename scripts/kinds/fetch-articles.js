// Saves Wikipedia articles as plain text, the material the profiles are drafted and checked from.
//   node scripts/kinds/fetch-articles.js <list.tsv> <out dir> [lang]
// list lines: slug <TAB> Wikipedia title [<TAB> other columns ignored]; "#" lines skipped. Writes <out dir>/<slug>.txt
// ("Source: url", "Title: …", then the extract) in English, or <slug>.<lang>.txt for another edition. Articles already
// saved are kept; the API is asked every 2 s and retried when it answers 429.
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [list, dir, lang = 'en'] = process.argv.slice(2); fs.mkdirSync(dir, { recursive: true });
async function get(u) { for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) { const t = await r.text(); if (t.startsWith('{')) return JSON.parse(t); } } catch (e) {} await sleep(8000 * (i + 1)); } return null; }
(async () => {
  let n = 0, miss = [];
  for (const l of fs.readFileSync(list, 'utf8').split(/\r?\n/)) {
    if (!l.trim() || l.startsWith('#')) continue; const [slug, title] = l.split('\t'); if (!slug || !title) continue;
    const f = path.join(dir, slug + (lang === 'en' ? '' : '.' + lang) + '.txt'); if (fs.existsSync(f)) { n++; continue; }
    const j = await get(`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=extracts|info&explaintext=1&inprop=url&titles=` + encodeURIComponent(title));
    const p = j && j.query && j.query.pages && j.query.pages[0];
    if (!p || p.missing !== undefined || !p.extract) { miss.push(slug + ' (' + title + ')'); await sleep(2000); continue; }
    fs.writeFileSync(f, 'Source: ' + p.fullurl + '\nTitle: ' + p.title + '\n\n' + p.extract); n++;
    await sleep(2000);
  }
  console.log(n + ' articles in ' + dir + (miss.length ? '; missing: ' + miss.join(', ') : ''));
})();
