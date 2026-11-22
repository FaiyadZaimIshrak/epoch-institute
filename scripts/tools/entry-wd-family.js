// Family relations from Wikidata (CC0) for the person entries whose item scripts/entry-wikidata.tsv confirms ("same"):
// father (P22), mother (P25), spouse (P26) and child (P40), kept only where the other person is a person entry too.
//   node scripts/tools/entry-wd-family.js [--report]
// Writes scripts/entry-family.tsv:
//   p <TAB> parent <TAB> child <TAB> f|m|?      (father, mother, or a parent whose item gives no sex of relation: from P40)
//   s <TAB> a <TAB> b                            (spouses, a before b by slug)
// A parent and child are kept only when their years allow it (the child's first year 12 to 110 years after the parent's,
// where both entries have years; a pair the other way round is dropped), and nobody is their own ancestor.
// scripts/entry-family-manual.tsv is the editor's and wins: "p <TAB> parent <TAB> child <TAB> -" or "s <TAB> a <TAB> b <TAB> -"
// takes a relation away, the same line with f, m or + adds one.
// The query service is asked 250 items at a time; responses are cached in %LOCALAPPDATA%\epoch-tools\wd-cache.
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
const tsv = f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t')) : [];
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = {}; for (const e of E) bySlug[e.slug] = e;
const qOf = {}, slugOf = {};
for (const r of tsv('scripts/entry-wikidata.tsv')) if (bySlug[r[0]] && /^Q\d+$/.test(r[2] || '') && r[4] === 'same') { qOf[r[0]] = r[2]; slugOf[r[2]] = r[0]; }
// the first year an entry's dates name (a birth, or the start of a reign), BCE negative; null when it has none
const firstYear = d => { const s = String(d || ''); const m = s.match(/(\d{1,4})(?:\s*(BCE))?/); if (!m) return null; if (m[2]) return -m[1];
  const after = s.slice(m.index + m[0].length); return /^[^,;]*\bBCE\b/.test(after) && !/\bCE\b/.test(after.replace(/BCE/g, '')) ? -m[1] : +m[1]; };
// every year and century an entry's dates name, in order, BCE negative: a year without an era takes the era of the
// year to its right ("135–63 BCE"), the last one is CE unless it says BCE; the day of a full date is no year
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
function years(d) {
  const s = String(d || '').replace(new RegExp('\\b\\d{1,2} (' + MONTHS + ')\\b', 'g'), '$1'), out = [];
  const re = /(\d{1,2})(?:st|nd|rd|th)(?:\s*[–-]\s*(?:early |mid-|late )?(\d{1,2})(?:st|nd|rd|th))?(?:\s+centur(?:y|ies))?(\s*BCE|\s*CE)?|(\d{1,4})(s)?(\s*BCE|\s*CE)?/g; let m;
  while ((m = re.exec(s))) {
    if (m[1]) out.push({ c: [+m[1], m[2] ? +m[2] : +m[1]], era: (m[3] || '').trim() });
    else out.push({ y: +m[4], dec: !!m[5], era: (m[6] || '').trim() });
  }
  let era = 'CE'; const res = [];
  for (let i = out.length - 1; i >= 0; i--) {
    const t = out[i]; if (t.era) era = t.era; const b = era === 'BCE';
    if (t.c) for (const n of (b ? t.c : t.c.slice().reverse())) res.unshift(b ? [-(n * 100 - 1), -((n - 1) * 100)] : [(n - 1) * 100, n * 100 - 1]);
    else res.unshift(b ? [-t.y - (t.dec ? 9 : 0), -t.y] : [t.y, t.y + (t.dec ? 9 : 0)]);
  }
  return res;   // [first, last] of each year, decade or century named
}
// the years in which the person may have been born, and the year of death where the dates give one
function birth(d) {
  const s = String(d || '').trim(), ys = years(s); if (!ys.length) return null;
  const first = ys[0][0], last = ys[ys.length - 1][1];
  if (/^(b\.|born)/.test(s)) return { lo: first - 3, hi: ys[0][1] + 3, death: null };
  if (/^(d\.|died)/.test(s)) return { lo: first - 95, hi: ys[0][1] - 1, death: ys[0][1] };
  if (/^(c\. )?\d{1,4}( BCE| CE)?( or \d+)?\s*[–-]\s*(c\. )?\d{1,4}/.test(s) && ys.length >= 2 && !/centur/.test(s)) { const pad = /c\./.test(s.split(/[–-]/)[0]) ? 8 : 2; return { lo: first - pad, hi: ys[0][1] + pad, death: last + (/c\./.test(s) ? 8 : 1) }; }   // a lifespan
  return { lo: first - 85, hi: last, death: null };   // a reign, "fl.", a century, a coronation: born some time before it ended
}

(async () => {
  const persons = Object.keys(qOf).filter(s => bySlug[s].type === 'person');
  const par = new Map(), sp = new Set(), kin = [];   // "parent|child" -> f|m|?
  const addP = (p, c, k) => { if (p === c) return; const key = p + '|' + c; if (!par.has(key) || par.get(key) === '?') par.set(key, k); };
  for (let i = 0; i < persons.length; i += 250) {
    const vals = persons.slice(i, i + 250).map(s => 'wd:' + qOf[s]).join(' ');
    const j = await sparql('SELECT ?i ?p ?o ?kin WHERE { VALUES ?i { ' + vals + ' } VALUES (?p ?ps) { (p:P22 ps:P22) (p:P25 ps:P25) (p:P26 ps:P26) (p:P40 ps:P40) } ?i ?p ?st . ?st ?ps ?o . ?st wikibase:rank ?rk . FILTER(?rk != wikibase:DeprecatedRank) OPTIONAL { ?st pq:P1039 ?kin } }');
    for (const b of j.results.bindings) {
      const a = slugOf[b.i.value.split('/').pop()], o = slugOf[b.o.value.split('/').pop()], p = b.p.value.split('/').pop();
      if (!a || !o || a === o || bySlug[o].type !== 'person') continue;
      if (b.kin && p !== 'P26') { kin.push(a + ' ' + p + ' ' + o); continue; }   // "kinship to subject": adoptive father, stepmother, foster child …
      if (p === 'P22') addP(o, a, 'f'); else if (p === 'P25') addP(o, a, 'm'); else if (p === 'P40') addP(a, o, '?'); else sp.add([a, o].sort().join('|'));
    }
    if (i % 2500 === 0) process.stderr.write('family ' + i + ' of ' + persons.length + '\n');
  }
  // the editor's lines
  let nMan = 0;
  for (const r of tsv('scripts/entry-family-manual.tsv')) {
    if (!bySlug[r[1]] || !bySlug[r[2]]) { console.warn('entry-family-manual.tsv: no entry ' + r[1] + ' / ' + r[2]); continue; }
    nMan++;
    if (r[0] === 'p') { if (r[3] === '-') par.delete(r[1] + '|' + r[2]); else par.set(r[1] + '|' + r[2], /^[fm]$/.test(r[3]) ? r[3] : '?'); }
    else if (r[0] === 's') { const k = [r[1], r[2]].sort().join('|'); if (r[3] === '-') sp.delete(k); else sp.add(k); }
  }
  // years: a child comes 12 to 110 years after its parent where both have years
  const dropped = [];
  for (const [key, k] of [...par]) {
    const [p, c] = key.split('|'), P = birth(bySlug[p].dates), C = birth(bySlug[c].dates);
    if (!P || !C) continue;
    // some birth year of the child lies 12 to 80 years after some birth year of the parent, and not after the parent's death
    if (C.hi - P.lo < 12 || C.lo - P.hi > 80 || (P.death != null && C.lo > P.death + 1)) { par.delete(key); dropped.push(p + ' -> ' + c + ' (' + bySlug[p].dates + ' / ' + bySlug[c].dates + ')'); }
  }
  // a pair recorded both ways round: both go
  for (const key of [...par.keys()]) { const [p, c] = key.split('|'); if (par.has(c + '|' + p)) { par.delete(key); par.delete(c + '|' + p); dropped.push(p + ' <-> ' + c + ' (both ways)'); } }
  // nobody is their own ancestor
  const kids = {}; for (const key of par.keys()) { const [p, c] = key.split('|'); (kids[p] = kids[p] || []).push(c); }
  const state = {}; const cyc = [];
  const walk = (n, trail) => { if (state[n] === 2) return; if (state[n] === 1) { cyc.push(trail.concat(n).join(' > ')); return; } state[n] = 1; for (const c of kids[n] || []) walk(c, trail.concat(n)); state[n] = 2; };
  Object.keys(kids).forEach(n => walk(n, []));
  if (cyc.length) { console.error('cycles:\n' + cyc.join('\n')); process.exit(1); }
  // at most one father and one mother each: a second one of the same kind is a Wikidata slip; keep the one whose years fit best
  const ofChild = {}; for (const [key, k] of par) { const [p, c] = key.split('|'); (ofChild[c] = ofChild[c] || []).push([p, k]); }
  for (const [c, ps] of Object.entries(ofChild)) for (const kind of ['f', 'm']) {
    const same = ps.filter(x => x[1] === kind); if (same.length < 2) continue;
    for (const x of same.slice(1)) { par.delete(x[0] + '|' + c); dropped.push(x[0] + ' -> ' + c + ' (a second ' + (kind === 'f' ? 'father' : 'mother') + ')'); }
  }
  const rows = [...par].map(([key, k]) => 'p\t' + key.replace('|', '\t') + '\t' + k).sort().concat([...sp].sort().map(k => 's\t' + k.replace('|', '\t')));
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-family.tsv'), '# kind (p parent and child, s spouses)\tparent or first spouse\tchild or second spouse\tf father, m mother, ? (Wikidata P22, P25, P26, P40, written by scripts/tools/entry-wd-family.js)\n' + rows.join('\n') + '\n');
  const inTree = new Set(); for (const key of par.keys()) key.split('|').forEach(s => inTree.add(s)); for (const k of sp) k.split('|').forEach(s => inTree.add(s));
  console.log('parent and child ' + par.size + ', spouses ' + sp.size + ', people with a relation ' + inTree.size + ' of ' + persons.length + '; dropped ' + dropped.length + ', manual ' + nMan);
  if (process.argv.includes('--report')) console.log(dropped.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
