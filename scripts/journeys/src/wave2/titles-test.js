// Does a Wikipedia title name a place with a point? (as check-journeys.js looks it up)   node titles-test.js "Title" …
const UA = { 'User-Agent': 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(u) { for (let i = 0; i < 5; i++) { try { const r = await fetch(u, { headers: UA }); if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; } return await r.json(); } catch (e) { await sleep(3000); } } return {}; }
(async () => { for (const t of process.argv.slice(2)) {
  const q = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops|coordinates&ppprop=wikibase_item|disambiguation&titles=' + encodeURIComponent(t));
  const pg = Object.values((q.query || {}).pages || {})[0]; let out;
  if (!pg || pg.missing !== undefined) out = 'NO ARTICLE'; else if (pg.pageprops && pg.pageprops.disambiguation !== undefined) out = 'DISAMBIGUATION'; else { const item = pg.pageprops && pg.pageprops.wikibase_item; let c = null;
    if (item) { const w = await get('https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P625&entity=' + item); const v = ((w.claims || {}).P625 || []).map(x => x.mainsnak && x.mainsnak.datavalue && x.mainsnak.datavalue.value).filter(Boolean)[0]; if (v) c = [v.latitude.toFixed(2), v.longitude.toFixed(2)]; }
    if (!c && pg.coordinates && pg.coordinates[0]) c = [pg.coordinates[0].lat.toFixed(2), pg.coordinates[0].lon.toFixed(2), 'article']; out = (c ? c.join(', ') : 'NO COORDINATES') + '  -> ' + pg.title; }
  console.log(t + ': ' + out); await sleep(1300); } })();
