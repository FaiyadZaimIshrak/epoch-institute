// Two facts from Wikidata (CC0) for the items scripts/entry-wikidata.tsv gives as the entries' own subjects (scope "same"):
//   family (P53) of the person entries: a house's entry lists the people of the encyclopedia whose item names the house's
//     item as their family ("Rulers and members"); a house is any entry whose item at least three person entries name,
//     whatever its slug ("Bourbon dynasty", "House of Habsburg", "Medici family" …)
//   coordinates (P625) of the place, event and polity entries: the entry's own point ("On the map"), for an event the
//     place it happened (a battle's field), never a war's: an event whose item has more than one point is left out, and
//     scripts/entry-coords-manual.tsv (the editor's) takes away the points of continents, oceans, broad regions and wars
//     fought across a region, and sets those Wikidata has wrong
//   node scripts/tools/entry-wd-claims.js
// Writes scripts/entry-houses.tsv (house slug, member slugs by birth year, |-separated) and scripts/entry-coords.tsv
// (slug, latitude, longitude to 3 decimals). The query service is asked 250 items at a time; responses are cached in
// %LOCALAPPDATA%\epoch-tools\wd-cache.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)';
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
const tsv = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t'));
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = {}; for (const e of E) bySlug[e.slug] = e;
const qOf = {}, slugOf = {};
for (const r of tsv('scripts/entry-wikidata.tsv')) if (bySlug[r[0]] && /^Q\d+$/.test(r[2] || '') && r[4] === 'same') { qOf[r[0]] = r[2]; slugOf[r[2]] = r[0]; }
const firstYear = d => { const m = String(d || '').match(/(\d{1,4})(\s*BCE?)?/); return m ? (m[2] ? -m[1] : +m[1]) : 9999; };

(async () => {
  const persons = Object.keys(qOf).filter(s => bySlug[s].type === 'person'), fam = {};
  for (let i = 0; i < persons.length; i += 250) {
    const vals = persons.slice(i, i + 250).map(s => 'wd:' + qOf[s]).join(' ');
    const j = await sparql('SELECT ?i ?f WHERE { VALUES ?i { ' + vals + ' } ?i wdt:P53 ?f }');
    for (const b of j.results.bindings) { const q = b.i.value.split('/').pop(), f = b.f.value.split('/').pop(); (fam[f] = fam[f] || new Set()).add(slugOf[q]); }
    if (i % 2500 === 0) process.stderr.write('family ' + i + ' of ' + persons.length + '\n');
  }
  const houses = [];
  for (const [f, set] of Object.entries(fam)) {
    const hs = slugOf[f]; if (!hs || bySlug[hs].type === 'person' || set.size < 3) continue;
    houses.push([hs, [...set].sort((a, b) => firstYear(bySlug[a].dates) - firstYear(bySlug[b].dates) || a.localeCompare(b))]);
  }
  houses.sort((a, b) => a[0].localeCompare(b[0]));
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-houses.tsv'), '# house entry\tmember entries, |-separated, oldest first (Wikidata P53, written by scripts/tools/entry-wd-claims.js)\n' + houses.map(h => h[0] + '\t' + h[1].join('|')).join('\n') + '\n');
  const placed = Object.keys(qOf).filter(s => /^(place|event|polity)$/.test(bySlug[s].type)), pts = {};
  for (let i = 0; i < placed.length; i += 250) {
    const vals = placed.slice(i, i + 250).map(s => 'wd:' + qOf[s]).join(' ');
    const j = await sparql('SELECT ?i ?c WHERE { VALUES ?i { ' + vals + ' } ?i wdt:P625 ?c }');
    for (const b of j.results.bindings) { const q = b.i.value.split('/').pop(), m = b.c.value.match(/^Point\(([-\d.eE]+) ([-\d.eE]+)\)$/); if (!m || b.c.value.includes('<')) continue; (pts[slugOf[q]] = pts[slugOf[q]] || []).push([+m[2], +m[1]]); }
    if (i % 2500 === 0) process.stderr.write('coordinates ' + i + ' of ' + placed.length + '\n');
  }
  const rows = []; let multi = 0;
  for (const [s, ps] of Object.entries(pts)) {
    const far = ps.some(p => Math.abs(p[0] - ps[0][0]) > 0.5 || Math.abs(p[1] - ps[0][1]) > 0.5);
    if (far) { multi++; continue; }
    if (Math.abs(ps[0][0]) > 90 || Math.abs(ps[0][1]) > 180) continue;
    rows.push(s + '\t' + ps[0][0].toFixed(3) + '\t' + ps[0][1].toFixed(3));
  }
  // the editor's lines (scripts/entry-coords-manual.tsv) win: "-" takes a point away, a pair sets it
  const man = {}; let nMan = 0;
  for (const r of tsv('scripts/entry-coords-manual.tsv')) if (!bySlug[r[0]]) console.warn('entry-coords-manual.tsv: no entry ' + r[0]); else man[r[0]] = r[1] === '-' ? null : [+r[1], +r[2]];
  for (let i = rows.length - 1; i >= 0; i--) { const s = rows[i].split('\t')[0]; if (s in man) { rows.splice(i, 1); nMan++; } }
  for (const [s, p] of Object.entries(man)) if (p) rows.push(s + '\t' + p[0].toFixed(3) + '\t' + p[1].toFixed(3));
  rows.sort();
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-coords.tsv'), '# entry\tlatitude\tlongitude (Wikidata P625, written by scripts/tools/entry-wd-claims.js)\n' + rows.join('\n') + '\n');
  console.log('houses ' + houses.length + ' (members ' + houses.reduce((n, h) => n + h[1].length, 0) + '), points ' + rows.length + ' of ' + placed.length + ' (' + multi + ' with points far apart left out, ' + nMan + ' set by the editor)');
})().catch(e => { console.error(e); process.exit(1); });
