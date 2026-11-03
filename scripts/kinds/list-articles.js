// From register names to a list for fetch-articles.js: node scripts/kinds/list-articles.js <names file> <out.tsv>
// (one register name a line) → slug <TAB> English Wikipedia title <TAB> region <TAB> start <TAB> end, through the
// state's Wikidata id (scripts/geo-qids.tsv) and its enwiki sitelink. Names without an id or a sitelink are reported.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [namesF, out] = process.argv.slice(2);
const want = fs.readFileSync(namesF, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const P = JSON.parse(fs.readFileSync(path.join(R, 'data/polities.json'), 'utf8')).nodes;
const qid = {}; for (const l of fs.readFileSync(path.join(R, 'scripts/geo-qids.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[1] && /^Q\d+$/.test(c[1])) qid[c[0]] = c[1]; }
(async () => {
  const rows = [], miss = [];
  for (const n of want) { const node = P.find(x => x.n === n); if (!node) { miss.push(n + ' (not in the register)'); continue; } rows.push({ n, id: node.id, b: node.b, s: node.s, e: node.e, q: qid[node.id] }); if (!qid[node.id]) miss.push(n + ' (no Wikidata id)'); }
  const withQ = rows.filter(r => r.q);
  for (let i = 0; i < withQ.length; i += 50) {
    const part = withQ.slice(i, i + 50);
    const j = await (await fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&ids=' + part.map(c => c.q).join('|'), { headers: UA })).json();
    for (const r of part) { const e = j.entities[r.q]; r.title = e && e.sitelinks && e.sitelinks.enwiki ? e.sitelinks.enwiki.title : ''; if (!r.title) miss.push(r.n + ' (no English article)'); }
    await sleep(1500);
  }
  fs.writeFileSync(out, '# slug\tWikipedia title\tregion\tstart\tend\n' + rows.filter(r => r.title).map(r => [r.id, r.title, r.b, r.s, r.e].join('\t')).join('\n') + '\n');
  console.log(rows.filter(r => r.title).length + ' rows in ' + out + (miss.length ? '\nmissing: ' + miss.join('; ') : ''));
})();
