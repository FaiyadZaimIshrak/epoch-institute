// Ranks the register's states without a profile, for choosing the next profiles (Nov 2026; the Oct 2026 scorer lived in
// the scratchpad and is gone). Signals, as before: Wikidata sitelinks (language editions) and the English article's
// length through the state's Wikidata id (scripts/geo-qids.tsv), the register's links (degree), lifespan, and the
// state histories that mention it (data/enc-states.json is by entry, so mentions are counted by name in data/states).
//   node scripts/kinds/rank-states.js [--min-degree=2] [--out=file.tsv]
// Writes slug, name, region, type, start, end, degree, sitelinks, article length, mentions, score, descending by score.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const opt = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const MIN = +(opt('min-degree') || 2), OUT = opt('out') || path.join(__dirname, 'rank-states.tsv');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const P = JSON.parse(fs.readFileSync(path.join(R, 'data/polities.json'), 'utf8'));
const E = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';return EMPIRES')();
const has = new Set(E.filter(e => e.id).map(e => e.id));
const deg = {}; P.links.forEach(l => { deg[l.s] = (deg[l.s] || 0) + 1; deg[l.t] = (deg[l.t] || 0) + 1; });
const qid = {}; for (const l of fs.readFileSync(path.join(R, 'scripts/geo-qids.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[1] && /^Q\d+$/.test(c[1])) qid[c[0]] = c[1]; }
// mentions: the state texts (data/states/*.json) that name the state (its name as a whole word, folded)
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let texts = '';
for (const f of fs.readdirSync(path.join(R, 'data/states'))) if (f.endsWith('.json')) { const o = JSON.parse(fs.readFileSync(path.join(R, 'data/states', f), 'utf8')); for (const k in o) texts += ' ' + fold([o[k].t, o[k].o, o[k].r, o[k].e].join(' ')); }
const cand = P.nodes.filter(n => !n.p && !has.has(n.id) && Number.isFinite(+n.s) && Number.isFinite(+n.e) && (deg[n.id] || 0) >= MIN)
  .map(n => ({ id: n.id, name: n.n, region: n.b, type: n.t, s: +n.s, e: +n.e, deg: deg[n.id] || 0, q: qid[n.id] || '', sl: 0, len: 0, men: 0 }));
console.log('candidates', cand.length, 'with a Wikidata id', cand.filter(c => c.q).length);
async function get(u) { for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); } catch (e) {} await sleep(8000 * (i + 1)); } throw new Error('failed ' + u); }
(async () => {
  const withQ = cand.filter(c => c.q);
  for (let i = 0; i < withQ.length; i += 50) {
    const part = withQ.slice(i, i + 50);
    const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=' + part.map(c => c.q).join('|'));
    for (const c of part) { const ent = j.entities[c.q]; if (ent && ent.sitelinks) { c.sl = Object.keys(ent.sitelinks).filter(k => k.endsWith('wiki') && !k.includes('quote') && !k.includes('source') && k !== 'commonswiki').length; c.en = ent.sitelinks.enwiki && ent.sitelinks.enwiki.title; } }
    await sleep(1200); process.stdout.write('.');
  }
  const withEn = withQ.filter(c => c.en);
  for (let i = 0; i < withEn.length; i += 50) {
    const part = withEn.slice(i, i + 50);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=info&redirects=1&titles=' + encodeURIComponent(part.map(c => c.en).join('|')));
    const len = {}; for (const p of j.query.pages) len[p.title] = p.length || 0; const red = {}; (j.query.redirects || []).forEach(r => red[r.from] = r.to); (j.query.normalized || []).forEach(r => red[r.from] = r.to);
    for (const c of part) c.len = len[red[c.en] || c.en] || len[c.en] || 0;
    await sleep(1200); process.stdout.write('+');
  }
  console.log();
  for (const c of cand) { const n = ' ' + fold(c.name) + ' '; let k = 0, p = 0; while ((p = texts.indexOf(n, p)) >= 0) { k++; p += n.length; } c.men = k; }
  // the score: log of sitelinks and of length, degree, mentions, a little for lifespan
  for (const c of cand) c.score = +(2.5 * Math.log2(1 + c.sl) + 1.5 * Math.log2(1 + c.len / 1000) + 1.0 * Math.log2(1 + c.deg) + 1.0 * Math.log2(1 + c.men) + 0.4 * Math.log2(1 + Math.max(0, c.e - c.s) / 50)).toFixed(2);
  cand.sort((a, b) => b.score - a.score);
  fs.writeFileSync(OUT, 'slug\tname\tregion\ttype\tstart\tend\tdegree\tsitelinks\tlength\tmentions\tscore\n' + cand.map(c => [c.id, c.name, c.region, c.type, c.s, c.e, c.deg, c.sl, c.len, c.men, c.score].join('\t')).join('\n') + '\n');
  console.log('written', OUT, cand.length);
})();
