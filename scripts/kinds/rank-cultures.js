// Ranks candidate cultures (or any Wikipedia subjects) for new profiles, as rank-states.js ranks the register's states:
//   node scripts/kinds/rank-cultures.js <titles file> <out.tsv>
// titles file: one English Wikipedia title a line ("#" lines skipped; "Title | region" sets the region column).
// Columns: title, region, sitelinks (Wikipedia language editions, from Wikidata), length (bytes of the article),
// mentions (encyclopedia descriptions and state histories naming the title's first words), done (a profile of that
// name exists already), score = 10·log10(sitelinks+1) + 5·log10(length+1) + 2·log10(mentions+1). The API is asked
// every 2 s with the site's user agent, and asked again after a 429.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [listF, out] = process.argv.slice(2); if (!out) { console.error('usage: rank-cultures.js <titles file> <out.tsv>'); process.exit(1); }
const want = fs.readFileSync(listF, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(l => { const [t, r] = l.split('|').map(s => s.trim()); return { t, r: r || '' }; });
const SD = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8').replace(/const EVENTS[\s\S]*$/, '') + ';return EMPIRES')();
const have = new Set(SD.map(e => e.name.toLowerCase()));
const ed = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
let st = ''; for (const f of fs.readdirSync(path.join(R, 'data/states'))) if (f.endsWith('.json')) st += fs.readFileSync(path.join(R, 'data/states', f), 'utf8');
const fold = s => s.replace(/\s*\(.*\)$/, '').replace(/ (culture|civilization|civilisation|people|peoples|period|complex|tradition|horizon)$/i, '');
async function api(url) { for (let i = 0; i < 5; i++) { const r = await fetch(url, { headers: UA }); if (r.status === 429) { await sleep(10000); continue; } return r.json(); } throw new Error('429 ' + url); }
(async () => {
  const rows = [];
  for (const { t, r } of want) {
    const q = encodeURIComponent(t);
    const info = await api('https://en.wikipedia.org/w/api.php?action=query&prop=info|pageprops&ppprop=wikibase_item&titles=' + q + '&redirects=1&format=json');
    const page = Object.values(info.query.pages)[0]; const length = page.length || 0, qid = page.pageprops && page.pageprops.wikibase_item;
    await sleep(2000);
    let sitelinks = 0; if (qid) { const wd = await api('https://www.wikidata.org/w/api.php?action=wbgetentities&ids=' + qid + '&props=sitelinks&format=json'); sitelinks = Object.keys(wd.entities[qid].sitelinks || {}).filter(k => k.endsWith('wiki') && k !== 'commonswiki').length; await sleep(2000); }
    const key = fold(t), re = new RegExp('\\b' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
    const mentions = (ed.match(re) || []).length + (st.match(re) || []).length;
    const done = have.has(t.toLowerCase()) || have.has(key.toLowerCase()) || have.has((key + ' culture').toLowerCase());
    const score = 10 * Math.log10(sitelinks + 1) + 5 * Math.log10(length + 1) + 2 * Math.log10(mentions + 1);
    rows.push({ t, r, sitelinks, length, mentions, done, score, redirect: page.title !== t ? page.title : '' });
    console.log(t.padEnd(36), sitelinks, length, mentions, done ? 'DONE' : '', score.toFixed(1));
  }
  rows.sort((a, b) => b.score - a.score);
  fs.writeFileSync(out, 'title\tregion\tsitelinks\tlength\tmentions\tdone\tscore\tresolved\n' + rows.map(r => [r.t, r.r, r.sitelinks, r.length, r.mentions, r.done ? 1 : 0, r.score.toFixed(2), r.redirect].join('\t')).join('\n') + '\n');
  console.log('written ' + out + ' (' + rows.length + ' rows)');
})().catch(e => { console.error(e); process.exit(1); });
