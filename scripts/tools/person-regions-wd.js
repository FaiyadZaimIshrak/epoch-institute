// An audit of the people's regions (build-pages.ps1 PersonRegion, read from people-data.js) against Wikidata: each
// person's English Wikipedia article, its Wikidata item (accepted only when it is a human whose years agree with the
// entry's), the places of birth, death and work, their present-day countries, and the region the states register gives
// those countries (most of their states, those ended before 640 apart, as the register files the Near East before the
// caliphates as the Ancient Near East). A person whose region is none of those places' regions is listed for the editor,
// who decides by eye and writes the answer into scripts/entry-regions.tsv.
//   node scripts/tools/person-regions-wd.js [--out=file.tsv] [--all]
// Responses are cached in %LOCALAPPDATA%\epoch-tools\wd-cache, so a second run takes seconds.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const OUT = arg('out') || path.join(ROOT, 'scripts', 'tools', 'person-regions-audit.tsv'), ALL = process.argv.includes('--all');
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(url + ' ' + r.status);
    const j = await r.json(); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
    fs.writeFileSync(f, JSON.stringify(j)); await sleep(300); return j;
  }
  throw new Error('gave up: ' + url);
}
// the people, as the /people/ pages have them
const pd = fs.readFileSync(path.join(ROOT, 'people-data.js'), 'utf8');
const box = {}; require('vm').runInNewContext(pd, box);
const REGIONS = box.PEOPLE_REGIONS, PEOPLE = box.PEOPLE;
// present-day country -> region before and after 640, from the register
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'polities.json'), 'utf8'));
const cm = {};
for (const n of P.nodes) for (const c of (Array.isArray(n.mo) ? n.mo : String(n.mo || '').split(/[;|,]/)).map(s => String(s).trim()).filter(Boolean)) {
  const per = n.e != null && n.e < 640 ? 'pre' : 'post'; cm[c] = cm[c] || { pre: {}, post: {} }; cm[c][per][n.b] = (cm[c][per][n.b] || 0) + 1;
}
const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
function countryRegion(name, year) {
  const c = cm[ALIAS[name] || name]; if (!c) return null;
  const pre = top(c.pre), post = top(c.post);
  return year < 640 ? (pre || post)[0] : (post || pre)[0];
}
// a place's present-day country from its coordinates (P625), on the atlas globe's outlines (maps/globe-land.js: rings in
// hundredths of a degree, each with its country page's slug), so that a place Wikidata files under a historical state
// (the Roman Empire, the Duchy of Moscow) still lands in its country; the country label is the fallback
const toSlug = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const SLUG2C = {}; for (const c of Object.keys(cm)) SLUG2C[toSlug(c)] = c;
const GBOX = {}; require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'maps', 'globe-land.js'), 'utf8'), GBOX);
const RINGS = GBOX.ATLAS_GLOBE.rings.map((r, i) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < r.length; k += 2) { x0 = Math.min(x0, r[k]); x1 = Math.max(x1, r[k]); y0 = Math.min(y0, r[k + 1]); y1 = Math.max(y1, r[k + 1]); } return { r, s: GBOX.ATLAS_GLOBE.cty[i], b: [x0, y0, x1, y1] }; });
function countryAt(lng, lat) {
  const x = lng * 100, y = lat * 100;
  for (const R of RINGS) {
    if (x < R.b[0] || x > R.b[2] || y < R.b[1] || y > R.b[3] || !R.s) continue;
    let inside = false; const r = R.r;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
    if (inside) return SLUG2C[R.s] || null;
  }
  return null;
}
// overseas territories counted with a European country (Martinique, Raiatea, Curaçao, Réunion): placed by where they lie
const OVERSEAS = new Set(['France', 'Netherlands', 'United Kingdom', 'Denmark', 'Spain', 'Portugal', 'United States']);
function overseas(country, lng, lat) {
  if (!OVERSEAS.has(country)) return null;
  if ((lng < -130 || lng > 150) && lat > -50 && lat < 30) return 'Oceania';
  if (country === 'United States') return null;
  if (lng < -32) return 'Americas';
  if (lng > 40 && lng < 80 && lat < 0) return 'Sub-Saharan Africa';
  return null;
}
const coords = e => { const c = ((e.claims || {}).P625 || []).find(c => c.mainsnak.datavalue); return c ? c.mainsnak.datavalue.value : null; };
// Wikidata's English country labels where the register names them otherwise
const ALIAS = { "People's Republic of China": 'China', 'United States of America': 'United States', 'Kingdom of the Netherlands': 'Netherlands',
  'State of Palestine': 'Palestine', 'Republic of Ireland': 'Ireland', 'Czechia': 'Czech Republic', 'Republic of the Congo': 'Republic of the Congo',
  "Côte d'Ivoire": 'Ivory Coast', 'Timor-Leste': 'East Timor', 'Kingdom of Denmark': 'Denmark', 'Georgia': 'Georgia', 'The Bahamas': 'Bahamas',
  'Federated States of Micronesia': 'Micronesia', 'Taiwan': 'Taiwan', 'Republic of China': 'Taiwan', 'Sahrawi Arab Democratic Republic': 'Western Sahara',
  'North Korea': 'North Korea', 'South Korea': 'South Korea', 'Hong Kong': 'China', 'Macau': 'China', 'Kingdom of Italy': 'Italy', 'Ottoman Empire': 'Turkey' };
const claimIds = (e, p) => ((e.claims || {})[p] || []).filter(c => c.rank !== 'deprecated' && c.mainsnak.datavalue).map(c => c.mainsnak.datavalue.value.id).filter(Boolean);
const claimYear = (e, p) => { const c = ((e.claims || {})[p] || []).find(c => c.mainsnak.datavalue); if (!c) return null; const m = c.mainsnak.datavalue.value.time.match(/^([+-])0*(\d+)-/); return m ? (m[1] === '-' ? -+m[2] : +m[2]) : null; };
(async () => {
  // 1. titles -> Wikidata items (redirects followed, disambiguation pages refused)
  const qid = {};
  for (let i = 0; i < PEOPLE.length; i += 50) {
    const batch = PEOPLE.slice(i, i + 50), titles = batch.map(p => p[1]);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item|disambiguation&titles=' + encodeURIComponent(titles.join('|')));
    const q = j.query || {}, norm = {}, redir = {};
    for (const n of q.normalized || []) norm[n.from] = n.to; for (const r of q.redirects || []) redir[r.from] = r.to;
    const byTitle = {}; for (const pg of Object.values(q.pages || {})) if (pg.pageprops && pg.pageprops.wikibase_item && !('disambiguation' in pg.pageprops)) byTitle[pg.title] = pg.pageprops.wikibase_item;
    for (const p of batch) { let t = norm[p[1]] || p[1]; t = redir[t] || t; if (byTitle[t]) qid[p[0]] = byTitle[t]; }
    if (i % 1000 === 0) console.error('titles ' + i);
  }
  // 2. the people's items
  const ent = {}, ids = [...new Set(Object.values(qid))];
  for (let i = 0; i < ids.length; i += 50) { const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + ids.slice(i, i + 50).join('|')); Object.assign(ent, j.entities || {}); if (i % 1000 === 0) console.error('people ' + i); }
  // 3. their places and the places' countries
  const places = new Set();
  for (const p of PEOPLE) { const e = ent[qid[p[0]]]; if (!e) continue; for (const pr of ['P19', 'P20', 'P937']) claimIds(e, pr).forEach(x => places.add(x)); }
  const pl = {}, pids = [...places];
  for (let i = 0; i < pids.length; i += 50) { const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels&languages=en&ids=' + pids.slice(i, i + 50).join('|')); Object.assign(pl, j.entities || {}); if (i % 1000 === 0) console.error('places ' + i); }
  const countries = new Set(); for (const e of Object.values(pl)) claimIds(e, 'P17').forEach(x => countries.add(x));
  const co = {}, cids = [...countries];
  for (let i = 0; i < cids.length; i += 50) { const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=en&ids=' + cids.slice(i, i + 50).join('|')); Object.assign(co, j.entities || {}); }
  const label = e => e && e.labels && e.labels.en ? e.labels.en.value : '';
  const unknownCountries = {};
  // 4. compare
  const rows = [], stat = { people: PEOPLE.length, item: 0, accepted: 0, placed: 0, agree: 0, flagged: 0 };
  for (const p of PEOPLE) {
    const [slug, name, dates, first, last, kind, ri] = p, region = ri >= 0 ? REGIONS[ri] : '';
    const e = ent[qid[slug]]; if (!e) continue; stat.item++;
    if (!claimIds(e, 'P31').includes('Q5')) continue;
    const b = claimYear(e, 'P569'), d = claimYear(e, 'P570');
    // the item is this person only if its years agree with the entry's (a namesake of another age is refused)
    const lo = b != null ? b : d != null ? d - 90 : null, hi = d != null ? d : b != null ? b + 90 : null;
    if (lo == null || hi < first - 30 || lo > last + 30) continue; stat.accepted++;
    const mid = Math.round((first + last) / 2), seen = [];
    for (const [pr, what] of [['P19', 'born'], ['P20', 'died'], ['P937', 'worked']]) for (const id of claimIds(e, pr)) {
      const place = pl[id]; if (!place) continue;
      const ll = coords(place), byXY = ll ? countryAt(ll.longitude, ll.latitude) : null;
      if (byXY) { seen.push({ what, place: label(place), country: byXY, region: overseas(byXY, ll.longitude, ll.latitude) || countryRegion(byXY, mid) }); continue; }
      for (const cid of claimIds(place, 'P17').slice(0, 1)) {
        const cn = label(co[cid]), rg = countryRegion(cn, mid);
        if (!rg) { unknownCountries[cn] = (unknownCountries[cn] || 0) + 1; continue; }
        seen.push({ what, place: label(place), country: cn, region: rg });
      }
    }
    if (!seen.length) continue; stat.placed++;
    const regs = new Set(seen.map(s => s.region));
    if (regs.has(region)) { stat.agree++; if (!ALL) continue; } else stat.flagged++;
    rows.push([slug, name, dates, region || '(none)', [...regs].join(' / '), seen.map(s => s.what + ' ' + s.place + ' (' + s.country + ')').join('; ')].join('\t'));
  }
  fs.writeFileSync(OUT, '# slug\tname\tdates\tregion now\tWikidata regions\tplaces\n' + rows.join('\n') + '\n');
  console.log(JSON.stringify(stat));
  console.log('countries not in the register: ' + Object.entries(unknownCountries).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', '));
})();
