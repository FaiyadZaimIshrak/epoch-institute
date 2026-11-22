// modern-states.js - are today's states all on the site? (21 Nov 2026; the user: "I see some missing points and entries
// for current modern states in the world map atlas as well as the encyclopedia")
//   node scripts/tools/modern-states.js [--refresh] [--check]
// The present-day states are the members of the United Nations (Wikidata P463 Q1065), its two observer states and the
// six partly recognised states the editor chose (OTHER). Wikidata's answer (CC0) is cached in
// %LOCALAPPDATA%\epoch-tools\modern-states.json (--refresh asks again). For each state it finds
//   - its living state in the register (data/polities.json, end null): the id whose Wikidata item scripts/geo-qids.tsv
//     gives, else scripts/modern-states-manual.tsv (QID TAB register id TAB entry slug; "-" = none, an empty field = find)
//   - that state's point (data/geo.json, its source: 9 is approximate), its text (data/states) and its picture
//   - its encyclopedia entry (the "same" row of scripts/entry-wikidata.tsv for the item) and the entry's map point
// and writes scripts/modern-states.tsv. --check exits 1 on any gap (check-site.ps1 runs it), so a present-day state
// never goes missing again. It also lists the years between the register's last state on the country's soil and the
// present state where nothing is on record.
const fs = require('fs'), path = require('path'), https = require('https');
const R = path.join(__dirname, '..', '..'), rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const CACHE = path.join(process.env.LOCALAPPDATA || require('os').tmpdir(), 'epoch-tools', 'modern-states.json');
const args = process.argv.slice(2), CHECK = args.includes('--check'), REFRESH = args.includes('--refresh');
// observers and partly recognised states: the Holy See's state, Palestine, Kosovo, the Sahrawi Republic, Northern
// Cyprus, Abkhazia, South Ossetia, Transnistria (Taiwan and Somaliland are in the register already, as the Republic of
// China and the Republic of Somaliland; they are added here too, so they stay checked)
const OTHER = ['Q237', 'Q219060', 'Q1246', 'Q40362', 'Q23681', 'Q23334', 'Q23427', 'Q907112', 'Q865', 'Q34754'];
// items Wikidata also counts as UN members beside the country's own item: the Danish realm (Denmark is Q35) and the
// present period of Greece (Greece is Q41)
const SAME = ['Q756617', 'Q17765809'];

function sparql(q) {
  return new Promise((ok, no) => {
    const body = 'query=' + encodeURIComponent(q);
    const rq = https.request('https://query.wikidata.org/sparql', { method: 'POST', headers: { 'User-Agent': 'EpochInstituteTools/1.0 (https://the-epoch-institute.org)', Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.setEncoding('utf8'); res.on('data', c => d += c); res.on('end', () => res.statusCode === 200 ? ok(JSON.parse(d).results.bindings) : no(new Error('Wikidata ' + res.statusCode + ' ' + d.slice(0, 200))));
    });
    rq.on('error', no); rq.end(body);
  });
}
async function wikidata() {
  if (!REFRESH && fs.existsSync(CACHE)) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  // --check without the cache (the deploy's runner): the list as it was last written, so the check never needs the network
  const tsv = path.join(R, 'scripts', 'modern-states.tsv');
  if (CHECK && !REFRESH && fs.existsSync(tsv)) return fs.readFileSync(tsv, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'))
    .map(p => ({ q: p[1], label: p[0], title: p[2], iso: p[3], inc: p[7] ? p[7].split('|').map(Number) : [], cap: p[8] ? p[8].split('|') : [], flag: p[9] || '' }));
  const q = `SELECT ?c ?label ?title ?iso ?inc ?cap ?capLabel ?flag WHERE {
    { ?c wdt:P463 wd:Q1065 } UNION { VALUES ?c { ${OTHER.map(x => 'wd:' + x).join(' ')} } }
    FILTER NOT EXISTS { ?c wdt:P576 ?gone } FILTER NOT EXISTS { ?c wdt:P31 wd:Q3024240 }
    ?c rdfs:label ?label FILTER(LANG(?label) = "en")
    OPTIONAL { ?a schema:about ?c; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title }
    OPTIONAL { ?c wdt:P298 ?iso } OPTIONAL { ?c wdt:P571 ?inc } OPTIONAL { ?c wdt:P36 ?cap } OPTIONAL { ?c wdt:P41 ?flag }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
  const rows = await sparql(q), by = {};
  for (const r of rows) {
    const id = r.c.value.split('/').pop(), x = by[id] || (by[id] = { q: id, label: r.label.value, title: r.title ? r.title.value : '', iso: '', inc: [], cap: [], flag: '' });
    if (r.iso && !x.iso) x.iso = r.iso.value;
    if (r.inc) { const y = parseInt(r.inc.value, 10) * (r.inc.value.startsWith('-') ? -1 : 1); if (!x.inc.includes(y)) x.inc.push(y); }
    if (r.capLabel && !x.cap.includes(r.capLabel.value)) x.cap.push(r.capLabel.value);
    if (r.flag && !x.flag) x.flag = decodeURIComponent(r.flag.value.split('/').pop());
  }
  const out = Object.values(by).sort((a, b) => a.label.localeCompare(b.label));
  fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, JSON.stringify(out));
  return out;
}

(async () => {
  const W = (await wikidata()).filter(s => !SAME.includes(s.q));
  const P = JSON.parse(rd('data/polities.json')), NODE = {}; for (const n of P.nodes) NODE[n.id] = n;
  const GEO = JSON.parse(rd('data/geo.json'));
  const TXT = {}; for (const f of fs.readdirSync(path.join(R, 'data', 'states'))) Object.assign(TXT, JSON.parse(rd('data/states/' + f)));
  const byQ = {}; for (const l of rd('scripts/geo-qids.tsv').split(/\r?\n/)) { const p = l.split('\t'); if (p.length === 2 && !l.startsWith('#')) (byQ[p[1]] = byQ[p[1]] || []).push(p[0]); }
  const entQ = {}; for (const l of rd('scripts/entry-wikidata.tsv').split(/\r?\n/)) { const p = l.split('\t'); if (p[2] && p[4] === 'same' && !entQ[p[2]]) entQ[p[2]] = p[0]; }
  const ENC = new Function(rd('encyclopedia-data.js') + ';return ENCYCLOPEDIA')(), BY = {}; for (const e of ENC) BY[e.slug] = e;
  const coords = new Set(rd('scripts/entry-coords.tsv').split(/\r?\n/).map(l => l.split('\t')[0]));
  const man = {}, manF = path.join(R, 'scripts', 'modern-states-manual.tsv');
  if (fs.existsSync(manF)) for (const l of fs.readFileSync(manF, 'utf8').split(/\r?\n/)) { if (!l || l.startsWith('#')) continue; const p = l.split('\t'); man[p[0]] = { reg: p[1] || '', ent: p[2] || '' }; }
  for (const l of rd('scripts/entry-coords-manual.tsv').split(/\r?\n/)) { const p = l.split('\t'); if (p[0] && !l.startsWith('#')) { if (/^-\s*$/.test(p[1] || '')) coords.delete(p[0]); else coords.add(p[0]); } }
  const LAND = JSON.parse(rd('data/land.json')).countries, landIso = {}; for (const c of LAND) if (c.iso && c.iso !== '-99') landIso[c.iso] = c.n;
  const living = id => NODE[id] && NODE[id].e == null;
  // data/land.json's names where the register writes a present-day country otherwise
  const MO = { Czechia: 'Czech Republic', 'Cabo Verde': 'Cape Verde', 'São Tomé and Principe': 'São Tomé and Príncipe' };
  const LANDN = {}; for (const c of LAND) LANDN[c.n] = c.n;
  for (const k in landIso) landIso[k] = MO[landIso[k]] || landIso[k];
  const LOCAL = /^(colony|chiefdom|tribal-confederation|princely-state|protectorate|city-state|imperial-city|county|duchy|emirate|sultanate|principality|theocracy)$/;
  const slug = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rows = [], gaps = [], faults = [];
  for (const s of W) {
    const m = man[s.q] || {};
    const country = landIso[s.iso] || LANDN[s.label] || '';
    // the register: by the item, else the living state whose present-day country is this one alone (a polity, the newest)
    let reg = m.reg === '-' ? '' : m.reg || (byQ[s.q] || []).find(living) || (country ? (P.nodes.filter(x => x.e == null && (x.mo || []).length === 1 && x.mo[0] === country && !LOCAL.test(x.t) && [x.n, ...(x.a || [])].some(nm => [s.label, country].some(c => slug(nm) === slug(c) || slug(nm).endsWith('-' + slug(c))))).sort((a, b) => b.s - a.s)[0] || {}).id || '' : '');
    // the entry: by the item, else the place or polity entry named like the state
    let ent = m.ent === '-' ? '' : m.ent || entQ[s.q] || [s.title, s.label, country].map(x => x && BY[slug(x)]).filter(x => x && /^(place|polity)$/.test(x.type)).map(x => x.slug)[0] || '';
    const n = NODE[reg], g = GEO[reg], t = TXT[reg], e = BY[ent];
    const miss = [];
    if (!n) miss.push('register'); else if (n.e != null) miss.push('register (ended ' + n.e + ')');
    if (n && !g) miss.push('point'); else if (g && g[2] === 9) miss.push('point (approximate)');
    if (n && !t && !(n.p)) miss.push('text');
    if (n && !n.p && t && !t.img) miss.push('picture');
    // a state with a full profile has its page there (a profile's subject is not an entry too)
    if (!e) { if (!(n && n.p)) miss.push('entry'); } else if (!coords.has(ent)) miss.push('entry point');
    if (miss.length) faults.push(s.label + ': ' + miss.join(', '));
    // the years before the present state with nothing on record in the country (by the register's present-day countries)
    if (n && country) {
      const before = P.nodes.filter(x => x.id !== n.id && (x.mo || []).includes(country) && x.e != null && x.e <= n.s + 1);
      const last = before.reduce((a, x) => Math.max(a, x.e), -1e9);
      if (last > -1e9 && n.s - last > 10) gaps.push(s.label + ': ' + last + '-' + n.s + ' (' + (n.s - last) + ' years)');
    }
    rows.push([s.label, s.q, s.title, s.iso, country, reg, ent, s.inc.join('|'), s.cap.join('|'), s.flag, miss.join('; ')].join('\t'));
  }
  const head = '# present-day state\tWikidata\tWikipedia title\tISO\tdata/land.json name\tregister id\tencyclopedia slug\tinception (Wikidata)\tcapital\tflag\tgaps (written by scripts/tools/modern-states.js)';
  const out = head + '\n' + rows.join('\n') + '\n', of = path.join(R, 'scripts', 'modern-states.tsv');
  if (!fs.existsSync(of) || fs.readFileSync(of, 'utf8') !== out) fs.writeFileSync(of, out);
  console.log('present-day states: ' + W.length + '; with gaps: ' + faults.length);
  if (!CHECK || faults.length) for (const f of faults) console.log('  ' + f);
  if (!CHECK && gaps.length) { console.log('years with nothing on record before the present state:'); for (const g of gaps) console.log('  ' + g); }
  if (CHECK && faults.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(2); });
