// Wikidata's short English descriptions ("municipality in Bavaria, Germany", "river in Bhutan and India") for the
// entries whose item scripts/entry-wikidata.tsv gives as the same subject (scope "same"), and for the states of the
// register whose item scripts/geo-qids.tsv gives (not those scripts/geo-rejected.tsv lists: their item was found to be
// another thing). The descriptions are Wikidata's (CC0), written to tell namesakes apart; build-pages.ps1 puts one in
// an entry's or a state's title when the entry's own first sentence gives no label (EntryLabel).
//   node scripts/tools/entry-wddesc.js [--report=file.tsv]
// Writes scripts/entry-wddesc.tsv (e:<slug> or s:<id>, description). Refused (and listed by --report with the reason):
// a description that is only a kind (KIND: "human", "historical country", "family name" …), that holds the subject's own
// name, is longer than 60 characters, or names a year or century the entry's dates do not reach. Responses are cached in
// %LOCALAPPDATA%\epoch-tools\wd-cache (wbgetentities, 50 items a call).
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const REPORT = arg('report');
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 8; i++) {
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': UA } }); } catch (e) { await sleep(5000 * (i + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { const ra = +r.headers.get('retry-after') || 0; await sleep(Math.max(ra * 1000, 5000 * (i + 1))); continue; }
    if (!r.ok) throw new Error(url + ' ' + r.status);
    const j = await r.json(); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
    fs.writeFileSync(f, JSON.stringify(j)); await sleep(300); return j;
  }
  throw new Error('gave up: ' + url);
}
const tsv = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t'));
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'polities.json'), 'utf8'));
const bySlug = {}; for (const e of E) bySlug[e.slug] = e;
const byId = {}; for (const n of P.nodes || P) byId[n.id] = n;
const rejected = new Set(fs.existsSync(path.join(ROOT, 'scripts/geo-rejected.tsv')) ? tsv('scripts/geo-rejected.tsv').map(r => r[0]) : []);

// descriptions that say only what kind of thing it is: no help in telling it from namesakes
const KIND = new Set(['human', 'person', 'historical country', 'former country', 'country', 'sovereign state', 'state',
  'kingdom', 'empire', 'dynasty', 'family', 'noble family', 'royal family', 'family name', 'surname', 'given name',
  'male given name', 'female given name', 'city', 'town', 'village', 'river', 'mountain', 'battle', 'war', 'treaty',
  'military conflict', 'armed conflict', 'ethnic group', 'people', 'language', 'religion', 'historical period',
  'period', 'event', 'organization', 'organisation', 'concept', 'term', 'title', 'book', 'painting', 'film',
  'historical region', 'region', 'island', 'archaeological site', 'settlement', 'polity', 'chiefdom', 'tribe',
  'clan', 'caste', 'deity', 'god', 'goddess', 'mythological character', 'legendary figure', 'fictional character',
  'protected area', 'human settlement', 'historical event', 'literary work', 'written work', 'musical work',
  'musical composition', 'song', 'poem', 'sculpture', 'building', 'temple', 'castle', 'fortification', 'church building',
  'mosque', 'monastery', 'archaeological culture', 'historical dynasty', 'royal house', 'noble house', 'ruling house',
  'historical state', 'historical polity', 'former state', 'princely state', 'ethnic group', 'social class', 'title of nobility',
  'military unit', 'military operation', 'military campaign', 'siege', 'massacre', 'rebellion', 'revolution', 'uprising']);
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// every lower-case word of a description must be a word the encyclopedia's own texts use: so a slip of Wikidata's ("fhe")
// or a word nobody would know never reaches a title
const VOCAB = new Set(); for (const e of E) for (const w of fold((e.desc || '') + ' ' + e.name).split(/[^a-z0-9'-]+/)) if (w) VOCAB.add(w);
// years in brackets or after a comma say again what the title's own years say: "German prince (1851–1928)"
const clean = d => d.replace(/\s*\((?:[^()]*\d{3,4}[^()]*)\)/g, '').replace(/,\s*(?:c\.\s*)?\d{1,4}\s*[–-]\s*\d{1,4}\s*$/, '').replace(/,\s*[A-Z]\w+ national heritage site$/, '').replace(/\s+/g, ' ').trim();
// years and centuries the entry's dates reach, as a span (BCE negative); null when undated
function span(d) {
  d = String(d || ''); if (!/\d/.test(d)) return null; const ys = [];
  const bce = /BCE?/.test(d) && !/\b(CE|AD)\b/.test(d.replace(/BCE/g, ''));
  d.replace(/(\d+)(?:st|nd|rd|th)\s+century(\s+BCE?)?/gi, (m, n, b) => { n = +n; if (b || bce) ys.push(-(n * 100 - 1), -((n - 1) * 100)); else ys.push((n - 1) * 100, n * 100 - 1); return ''; })
    .replace(/(\d{1,4})(\s*BCE?)?/g, (m, n, b) => { ys.push((b || bce) ? -n : +n); return ''; });
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
}
// the years and centuries a description names
function named(d) {
  const ys = [];
  d.replace(/(\d+)(?:st|nd|rd|th)[- ]century(\s+BCE?|\s+BC)?/gi, (m, n, b) => { n = +n; ys.push(b ? [-(n * 100 - 1), -((n - 1) * 100)] : [(n - 1) * 100, n * 100 - 1]); return ''; })
    .replace(/\b(\d{3,4})s?\b(\s*BCE?|\s*BC)?/g, (m, n, b) => { ys.push(b ? [-n, -n] : [+n, +n + (m.includes('s') && !b ? 9 : 0)]); return ''; });
  return ys;
}
// a leading year or century says again what the title's own years say: "1040 battle of the Seljuk-Ghaznavid Wars" is
// "Battle of the Seljuk-Ghaznavid Wars" beside "Battle of Dandanaqan (1040)"; what is left must still say something
const LEAD = /^(?:c\.\s*)?(?:\d{1,4}s?(?:\s*[-–]\s*\d{1,4})?|\d+(?:st|nd|rd|th)[- ]century)(?:\s*(?:BCE|BC|AD|CE))?\s+/i;
function verdict(desc, name, dates, sp0) {
  if (!desc) return 'none';
  if (/=|\bID\b|peerage/i.test(desc)) return 'junk';
  const sp = sp0 || span(dates), ys = named(desc);
  // a firm year must lie within the subject's own years (even a year off is a contradiction on the page: "Battle of Carham
  // (c. 1018): 1016 battle"); a decade or century must meet them
  if (ys.length && !sp) return 'years';
  if (ys.length) for (const [a, b] of ys) { const firm = a === b; if (firm ? (a < sp[0] || a > sp[1]) : (b < sp[0] - 60 || a > sp[1] + 60)) return 'years'; }
  if (sp && LEAD.test(desc)) { desc = desc.replace(LEAD, ''); if (/^(in|of|on|at|during|from|by|between|and|to|the)\b/i.test(desc)) return 'kind'; }
  const d = desc.trim(), f = fold(d);
  if (d.length > 60) return 'long';
  if (KIND.has(f) || /^wikimedia /.test(f) || /^(family name|surname|given name)/.test(f)) return 'kind';
  // heritage registers' wording ("cultural property in Zaragoza, Spain", "material cultural heritage site in Ghana") says
  // only that a register lists it
  if (/^(material )?(cultural (property|heritage( site)?)|heritage site)\b/.test(f) || /^\S+ (national |cultural )+heritage site$/.test(f)) return 'kind';
  if (d.split(/\s+/).length < 2) return 'kind';
  for (const w of d.split(/[\s,;:()]+/)) { if (!w || /^[A-Z0-9]/.test(w)) continue; const lw = fold(w).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''); if (lw && !VOCAB.has(lw)) return 'word ' + lw; }
  const nm = fold(name).replace(/\s*\(.*?\)\s*/g, ' ').trim();
  if (nm.length > 3 && f.includes(nm)) return 'own name';
  const words = nm.split(/[\s,-]+/).filter(w => w.length > 4 && !/^(kingdom|empire|dynasty|battle|state|republic|sultanate|province|river|people|language)$/.test(w));
  if (words.some(w => new RegExp('\\b' + w + '\\b').test(f))) return 'own name';
  return { d };
}

(async () => {
  const want = [];   // [key, qid, name, dates]
  for (const r of tsv('scripts/entry-wikidata.tsv')) { const e = bySlug[r[0]]; if (e && r[2] && /^Q\d+$/.test(r[2]) && r[4] === 'same') want.push(['e:' + r[0], r[2], e.name, e.dates]); }
  for (const r of tsv('scripts/geo-qids.tsv')) { const n = byId[r[0]]; if (n && r[1] && /^Q\d+$/.test(r[1]) && !rejected.has(r[0])) want.push(['s:' + r[0], r[1], n.n, '', n.s != null ? [n.s, n.e != null ? n.e : 2025] : null]); }
  const ids = [...new Set(want.map(w => w[1]))].sort(); const desc = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=descriptions&languages=en&ids=' + ids.slice(i, i + 50).join('|'));
    for (const [q, it] of Object.entries(j.entities || {})) desc[q] = it.descriptions && it.descriptions.en ? it.descriptions.en.value : '';
    if (i % 2500 === 0) process.stderr.write(i + ' of ' + ids.length + '\n');
  }
  const out = ['# key (e:<entry slug> or s:<state id>)\tWikidata\'s English description (CC0), written by scripts/tools/entry-wddesc.js'], rep = [], cnt = {};
  for (const [k, q, name, dates, sp] of want) {
    const d = clean(desc[q] || ''), v = verdict(d, name, dates, sp);
    if (typeof v === 'string') { const vk = v.startsWith('word') ? 'word' : v; cnt[vk] = (cnt[vk] || 0) + 1; if (v !== 'none') rep.push([k, name, dates, d, v].join('\t')); continue; }
    cnt.kept = (cnt.kept || 0) + 1; out.push(k + '\t' + v.d);
  }
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-wddesc.tsv'), out.join('\n') + '\n');
  if (REPORT) fs.writeFileSync(REPORT, rep.join('\n') + '\n');
  console.log('descriptions: ' + Object.entries(cnt).map(([a, b]) => a + ' ' + b).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
