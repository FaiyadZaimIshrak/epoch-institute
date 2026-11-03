// Turns the editor's chosen Wikipedia titles into a list for fetch-articles.js (A7, Nov 2026): each title is resolved
// through redirects to its article, a slug is made from the article's title as toSlug does (brackets kept as words:
// "Republic (Plato)" -> republic-plato), and a title whose subject already has an entry (by name, alias or slug, accents
// and case folded) or that repeats one already listed is dropped and reported. Disambiguation pages are reported too.
//   node scripts/entries/prepare-list.js <titles.txt> <out.tsv>      titles: one a line, "#" lines skipped;
//   "Title<TAB>slug" keeps the editor's slug
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [inF, outF] = process.argv.slice(2);
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const AE = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'added-entries.json'), 'utf8'));
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’'`]/g, '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, ' ').trim();
const toSlug = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const have = new Map(); for (const e of ENC.concat(AE.entries)) { for (const n of [e.name, e.slug.replace(/-/g, ' '), ...(e.aka || [])]) have.set(fold(n), e.slug); }
// a profile's subject is not an entry too (the Harlem Renaissance, as 'New Negro movement')
const SD = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';return EMPIRES')();
for (const e of SD) if (!have.has(fold(e.name))) have.set(fold(e.name), 'profile: ' + e.name);
const slugs = new Set(ENC.map(e => e.slug).concat(AE.entries.map(e => e.slug)));
async function get(u) { for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return await r.json(); } catch (e) {} await sleep(3000 * (i + 1)); } return null; }
(async () => {
  const rows = fs.readFileSync(inF, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const out = [], rep = [], seen = new Set();
  for (let i = 0; i < rows.length; i += 40) {
    const part = rows.slice(i, i + 40);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=disambiguation&titles=' + encodeURIComponent(part.map(r => r[0]).join('|')));
    const norm = {}; for (const x of (j.query.normalized || []).concat(j.query.redirects || [])) norm[x.from] = x.to;
    const pages = {}; for (const p of j.query.pages || []) pages[p.title] = p;
    for (const [t, s0] of part) {
      let to = t; for (let k = 0; k < 3 && norm[to]; k++) to = norm[to];
      const p = pages[to]; if (!p || p.missing) { rep.push('NO ARTICLE  ' + t); continue; }
      if (p.pageprops && 'disambiguation' in p.pageprops) { rep.push('DISAMBIG    ' + t); continue; }
      const base = to.replace(/\s*\([^)]*\)$/, '');
      const hit = have.get(fold(to)) || have.get(fold(base)) || have.get(fold(t));
      if (hit) { rep.push('HAS ENTRY   ' + t + ' -> ' + hit); continue; }
      const slug = s0 || toSlug(to); if (slugs.has(slug) || seen.has(slug)) { rep.push('SLUG TAKEN  ' + t + ' (' + slug + ')'); continue; }
      seen.add(slug); out.push(slug + '\t' + to);
    }
    await sleep(800);
  }
  fs.writeFileSync(outF, out.join('\n') + '\n');
  console.log(out.length + ' titles listed in ' + outF + (rep.length ? '\n' + rep.join('\n') : ''));
})();
