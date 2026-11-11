// Where the people of the encyclopedia were born and died, from Wikidata (CC0): the place of birth (P19) and of death
// (P20) of the items scripts/entry-wikidata.tsv gives as the person entries' own subjects (scope "same").
//   node scripts/tools/entry-wd-places.js [--sample=N]
// Kept only where Wikidata's best-ranked statements name exactly one place and that place has an English label. The
// place's own coordinates (P625; a place with points more than half a degree apart has none) give its present-day
// country: the country page whose outline on maps/globe-land.js holds the point, so a town Wikidata files under the
// Roman Empire still lands in its country. A place that is itself a state of the register (scripts/geo-qids.tsv) or
// has no point is named but gets no dot and no country, unless the state's item is a town (a human settlement by
// Wikidata's P31: the city-states) or the subject of a place entry. Where the place is the subject of an entry (the same "same"
// items), that entry's slug is given, so the page can link it.
// scripts/entry-places-manual.tsv (the editor's: slug, b or d, "-") takes a place away.
// Writes scripts/entry-places.tsv: slug, b|d, the place's item, its label, latitude, longitude (3 decimals, or empty),
// the country page's slug (or empty), the place's entry (or empty). The query service is asked 200 items at a time;
// responses are cached in %LOCALAPPDATA%\epoch-tools\wd-cache.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)';
const SAMPLE = +((process.argv.find(a => a.startsWith('--sample=')) || '').slice(9)) || 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sparql(q) {
  const body = 'format=json&query=' + encodeURIComponent(q);
  const f = path.join(CACHE, crypto.createHash('sha1').update('https://query.wikidata.org/sparql' + body).digest('hex') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 8; i++) {
    let r;
    try { r = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' }, body }); }
    catch (e) { await sleep(5000 * (i + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { const ra = +r.headers.get('retry-after') || 0; await sleep(Math.max(ra * 1000, 5000 * (i + 1))); continue; }
    if (!r.ok) throw new Error('sparql ' + r.status);
    const j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); await sleep(1000); return j;
  }
  throw new Error('gave up');
}
const tsv = f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t')) : [];
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = {}; for (const e of E) bySlug[e.slug] = e;
const qOf = {}, slugOf = {};
for (const r of tsv('scripts/entry-wikidata.tsv')) if (bySlug[r[0]] && /^Q\d+$/.test(r[2] || '') && r[4] === 'same') { qOf[r[0]] = r[2]; slugOf[r[2]] = r[0]; }
const STATES = new Set(tsv('scripts/geo-qids.tsv').map(r => r[1]));
const OFF = new Set(tsv('scripts/entry-places-manual.tsv').filter(r => r[2] === '-').map(r => r[0] + ' ' + r[1]));
// the country pages' outlines
const G = {}; require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'maps', 'globe-land.js'), 'utf8'), G);
const RINGS = G.ATLAS_GLOBE.rings.map((r, i) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let k = 0; k < r.length; k += 2) { x0 = Math.min(x0, r[k]); x1 = Math.max(x1, r[k]); y0 = Math.min(y0, r[k + 1]); y1 = Math.max(y1, r[k + 1]); } return { r, b: [x0, y0, x1, y1], s: G.ATLAS_GLOBE.cty[i] }; })
  .sort((a, b) => (a.b[2] - a.b[0]) * (a.b[3] - a.b[1]) - (b.b[2] - b.b[0]) * (b.b[3] - b.b[1]));   // the smallest outline first (Lesotho before South Africa)
function countryAt(lat, lng) {
  const x = lng * 100, y = lat * 100;
  for (const R of RINGS) {
    if (!R.s || x < R.b[0] || x > R.b[2] || y < R.b[1] || y > R.b[3]) continue;
    let inside = false; const r = R.r;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
    if (inside) return R.s;
  }
  return '';
}
const TOWN = {};   // a state's item -> is it a human settlement (Wikidata P31, with subclasses)
(async () => {
  const persons = Object.keys(qOf).filter(s => bySlug[s].type === 'person').sort(), out = [], n = { b: 0, d: 0, many: 0, nolabel: 0, nopoint: 0, state: 0, country: 0, entry: 0 };
  for (const [prop, kind] of [['P19', 'b'], ['P20', 'd']]) {
    const got = {};   // person slug -> {place item: {label, pts}}
    for (let i = 0; i < persons.length; i += 200) {
      const vals = persons.slice(i, i + 200).map(s => 'wd:' + qOf[s]).join(' ');
      const j = await sparql('SELECT ?i ?x ?xLabel ?c WHERE { VALUES ?i { ' + vals + ' } ?i wdt:' + prop + ' ?x . OPTIONAL { ?x wdt:P625 ?c } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }');
      for (const b of j.results.bindings) {
        if (b.x.type !== 'uri' || !/\/Q\d+$/.test(b.x.value)) continue;
        const s = slugOf[b.i.value.split('/').pop()], x = b.x.value.split('/').pop(), o = (got[s] = got[s] || {}), p = (o[x] = o[x] || { label: (b.xLabel || {}).value || '', pts: [] });
        const m = b.c && !b.c.value.includes('<') && b.c.value.match(/^Point\(([-\d.eE]+) ([-\d.eE]+)\)$/); if (m) p.pts.push([+m[2], +m[1]]);
      }
      if (i % 2000 === 0) process.stderr.write(prop + ' ' + i + ' of ' + persons.length + '\n');
    }
    // of the places that are states of the register, the towns (Verona, Sparta, Miletus: city-states) keep their point
    const ask = [...new Set(Object.values(got).flatMap(o => Object.keys(o)).filter(x => STATES.has(x) && TOWN[x] === undefined))];
    for (let i = 0; i < ask.length; i += 80) {
      const part = ask.slice(i, i + 80); for (const x of part) TOWN[x] = false;
      const j = await sparql('SELECT DISTINCT ?x WHERE { VALUES ?x { ' + part.map(x => 'wd:' + x).join(' ') + ' } ?x wdt:P31/wdt:P279* wd:Q486972 }');
      for (const b of j.results.bindings) TOWN[b.x.value.split('/').pop()] = true;
    }
    for (const s of persons) {
      const o = got[s]; if (!o || OFF.has(s + ' ' + kind)) continue;
      const xs = Object.keys(o); if (xs.length !== 1) { n.many++; continue; }
      const x = xs[0], p = o[x]; if (!p.label || /^Q\d+$/.test(p.label)) { n.nolabel++; continue; }
      let lat = '', lng = '', cty = '';
      const spread = p.pts.length && Math.max(...p.pts.map(a => Math.abs(a[0] - p.pts[0][0]) + Math.abs(a[1] - p.pts[0][1])));
      const ent = slugOf[x] && bySlug[slugOf[x]].type !== 'person' ? slugOf[x] : ''; if (ent) n.entry++;
      if (STATES.has(x) && !(ent && bySlug[ent].type === 'place') && !TOWN[x]) n.state++;   // a state of the register, unless the item is a town with an entry of its own (Athens, Venice)
      else if (!p.pts.length || spread > 0.5) n.nopoint++;
      else {
        lat = p.pts[0][0].toFixed(3); lng = p.pts[0][1].toFixed(3); cty = countryAt(+lat, +lng);
        // a port or an island off the simplified coast: the country a sixth of a degree away, if only one lies there
        if (!cty) { const near = new Set(); for (const [dy, dx] of [[.17, 0], [-.17, 0], [0, .17], [0, -.17], [.12, .12], [.12, -.12], [-.12, .12], [-.12, -.12]]) { const c = countryAt(+lat + dy, +lng + dx); if (c) near.add(c); } if (near.size === 1) cty = [...near][0]; }
        if (cty) n.country++;
      }
      n[kind]++; out.push([s, kind, x, p.label.replace(/\s+/g, ' '), lat, lng, cty, ent]);
    }
  }
  out.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-places.tsv'), '# person entry\tb born | d died\tthe place\'s Wikidata item\tits English label\tlatitude\tlongitude\tcountry page\tthe place\'s entry (Wikidata P19, P20; written by scripts/tools/entry-wd-places.js)\n' + out.map(r => r.join('\t')).join('\n') + '\n');
  console.log(persons.length + ' person entries with an item: ' + n.b + ' birthplaces, ' + n.d + ' places of death (' + n.country + ' in a present-day country, ' + n.entry + ' with an entry of their own; left out: ' + n.many + ' with several places, ' + n.nolabel + ' without a label; named without a point: ' + n.state + ' states, ' + n.nopoint + ' others)');
  if (SAMPLE) { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; for (let i = 0; i < SAMPLE; i++) { const r = out[Math.floor(rnd() * out.length)], e = bySlug[r[0]]; console.log('  ' + e.name + ' (' + e.dates + ') ' + (r[1] === 'b' ? 'born' : 'died') + ': ' + r[3] + ' [' + (r[6] || '-') + (r[7] ? ', entry ' + r[7] : '') + ']  | ' + e.desc.slice(0, 110)); } }
})().catch(e => { console.error(e); process.exit(1); });
