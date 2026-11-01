// Songs in History: ranks candidate songs by how widely they are known: the number of Wikipedia language editions with
// an article on them (Wikidata sitelinks) and the length of the English article. node scripts/songs/score.js <file.tsv>
// (lines: English Wikipedia title, region, era, type, words). Writes <file>-scored.tsv, best first, and reports titles
// that have no article (fix the title, or drop the song).
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { for (let i = 0; i < 5; i++) { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); await sleep(5000 * (i + 1)); } throw new Error('failed ' + u); };
(async () => {
  const file = process.argv[2], rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const info = {};
  for (let i = 0; i < rows.length; i += 40) {
    const ts = rows.slice(i, i + 40).map(r => r[0]);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=info|pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(ts.join('|')));
    const map = {}; for (const x of [...(j.query.normalized || []), ...(j.query.redirects || [])]) map[x.from] = x.to;
    for (const t of ts) { let k = t; while (map[k]) k = map[k]; const p = Object.values(j.query.pages).find(p => p.title === k);
      info[t] = p && !('missing' in p) ? { title: p.title, len: p.length, qid: p.pageprops && p.pageprops.wikibase_item } : null; }
    await sleep(1500);
  }
  const qids = Object.values(info).filter(x => x && x.qid).map(x => x.qid), links = {};
  for (let i = 0; i < qids.length; i += 45) {
    const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=' + qids.slice(i, i + 45).join('|'));
    for (const [q, e] of Object.entries(j.entities)) links[q] = Object.keys(e.sitelinks || {}).filter(k => /wiki$/.test(k) && !/^(commons|species|meta|wikidata|mediawiki|sources|outreach)wiki$/.test(k)).length;
    await sleep(1500);
  }
  const out = [], missing = [];
  for (const r of rows) {
    const x = info[r[0]]; if (!x) { missing.push(r[0]); continue; }
    const n = links[x.qid] || 1, score = Math.log2(1 + n) * 2 + Math.log2(1 + x.len / 1000);
    out.push([score.toFixed(2), n, Math.round(x.len / 1000) + 'k', x.title, ...r.slice(1)]);
  }
  out.sort((a, b) => b[0] - a[0]);
  fs.writeFileSync(file.replace(/\.tsv$/, '') + '-scored.tsv', '# score\tlanguages\tlength\ttitle\tregion\tera\ttype\twords\n' + out.map(o => o.join('\t')).join('\n') + '\n');
  console.log(out.length, 'scored;', missing.length, 'without an article:', missing.join(' | '));
})();
