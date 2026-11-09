// Finds encyclopedia entries matched to a namesake's Wikipedia article and Wikidata item (scripts/entry-wikidata.tsv). The
// picture rule ("pic": the entry's picture is the article's lead image) confirms a namesake when the picture itself came
// from the namesake's article at the merges, so these lists are read by eye; the fixes go into
// scripts/entry-wikidata-manual.tsv (the right article, or "-") and scripts/added-entries.json "nopicture" (9 Nov 2026:
// Tarom had a TAROM airliner, Soba Japanese noodles, Neptune the planet).
//   node scripts/tools/namesake-check.js country   a map point (scripts/entry-coords.tsv) in a present-day country the
//        entry's first two sentences do not name while they name others (maps/globe-land.js outlines)
//   node scripts/tools/namesake-check.js seats     a map point more than 1,200 km from the seat of every state whose
//        history names the entry (data/enc-states.json, data/geo.json; approximate seats left out)
//   node scripts/tools/namesake-check.js text      a "pic" match whose article opening shares at most one content word,
//        besides the name, with the entry's first three sentences (Wikipedia extracts, 20 a request, cached in
//        %LOCALAPPDATA%\epoch-tools\wd-cache; about 20 minutes the first time)
// Each prints its list, most suspect first. Most of what they list is right (a war's description names the countries
// that fought; a state's history names a far-off museum), so read every line.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MODE = process.argv[2];
const E = new Function(rd('encyclopedia-data.js') + ';return ENCYCLOPEDIA')(); const by = {}; for (const e of E) by[e.slug] = e;
const tsv = f => rd(f).split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t'));
const hav = (a, b) => { const R = 6371, t = Math.PI / 180, dl = (b[0] - a[0]) * t, dg = (b[1] - a[1]) * t; const h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const firstSentences = (d, n) => String(d || '').split(/(?<=[.!?])\s+(?=[A-Z])/).slice(0, n).join(' ');

function country() {
  const G = new Function(rd('maps/globe-land.js') + ';return ATLAS_GLOBE')();
  const inRing = (r, x, y) => { let c = false; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) { const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; };
  const at = (la, lo) => { const x = Math.round(lo * 100), y = Math.round(la * 100), hit = new Set(); G.rings.forEach((r, i) => { if (G.cty[i] && inRing(r, x, y)) hit.add(G.cty[i]); }); return [...hit]; };
  const ALIAS = { 'united-states': ['United States', 'USA', 'America'], 'united-kingdom': ['United Kingdom', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland'], 'czech-republic': ['Czech Republic', 'Czechia', 'Bohemia', 'Moravia'], 'turkey': ['Turkey', 'Türkiye', 'Anatolia'], 'myanmar': ['Myanmar', 'Burma'], 'ivory-coast': ["Côte d'Ivoire", 'Ivory Coast'], 'netherlands': ['Netherlands', 'Holland'], 'iran': ['Iran', 'Persia'], 'sri-lanka': ['Sri Lanka', 'Ceylon'] };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slugs = [...new Set(G.cty.filter(Boolean))], names = {};
  for (const s of slugs) names[s] = (ALIAS[s] || [s.split('-').map(w => /^(and|of|the)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' ')]).map(n => new RegExp('\\b' + esc(n) + '\\b'));
  const out = [];
  for (const [slug, la, lo] of tsv('scripts/entry-coords.tsv')) {
    const e = by[slug]; if (!e) continue; const here = at(+la, +lo); if (!here.length) continue;
    const t = firstSentences(e.desc, 2), named = slugs.filter(s => names[s].some(re => re.test(t)));
    if (named.length && !named.some(s => here.includes(s))) out.push([slug, la + ',' + lo, 'in ' + here.join('|'), 'names ' + named.join('|'), t.slice(0, 140)].join('\t'));
  }
  return out;
}
function seats() {
  const M = JSON.parse(rd('data/enc-states.json')).m, GEO = JSON.parse(rd('data/geo.json')), out = [];
  for (const [slug, la, lo] of tsv('scripts/entry-coords.tsv')) {
    const m = M[slug]; if (!m) continue; const pts = m[1].map(s => GEO[s[0]]).filter(g => g && g[2] !== 9); if (!pts.length) continue;
    const d = Math.min(...pts.map(g => hav([+la, +lo], [g[0], g[1]])));
    if (d > 1200) out.push([Math.round(d), slug, la + ',' + lo, m[1].slice(0, 3).map(s => s[1]).join('; '), String(by[slug] ? by[slug].desc : '').slice(0, 110)].join('\t'));
  }
  return out.sort((a, b) => parseInt(b) - parseInt(a));
}
async function text() {
  const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
  const UA = { 'User-Agent': 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
  async function get(url) {
    const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    for (let i = 0; i < 8; i++) {
      let r; try { r = await fetch(url, { headers: UA }); } catch (e) { await sleep(5000 * (i + 1)); continue; }
      if (r.status === 429 || r.status >= 500) { await sleep(Math.max((+r.headers.get('retry-after') || 0) * 1000, 5000 * (i + 1))); continue; }
      if (!r.ok) throw new Error(url + ' ' + r.status);
      const j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); await sleep(500); return j;
    }
    throw new Error('gave up ' + url);
  }
  const rows = tsv('scripts/entry-wikidata.tsv').filter(r => r[3] === 'pic' && by[r[0]]), ext = {}, titles = [...new Set(rows.map(r => r[1]))];
  for (let i = 0; i < titles.length; i += 20) {
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exsentences=4&exlimit=20&redirects=1&format=json&titles=' + encodeURIComponent(titles.slice(i, i + 20).join('|')));
    const norm = {}, red = {}; for (const n of (j.query.normalized || [])) norm[n.to] = n.from; for (const n of (j.query.redirects || [])) red[n.to] = n.from;
    for (const p of Object.values(j.query.pages || {})) for (const b of [p.title, red[p.title], norm[p.title], norm[red[p.title]], red[norm[p.title]]].filter(Boolean)) ext[b] = p.extract || '';
    if (i % 2000 === 0) process.stderr.write(i + ' of ' + titles.length + '\n');
  }
  const STOP = new Set('the a an of and in on at to from by for with as was is were are be been his her its their it he she they this that which who whom also into after before during under over between first one two three later early late part known called name named city town river king queen emperor state kingdom empire war battle people century centuries years year son daughter wife father ruler rulers dynasty modern present day region north south east west northern southern eastern western world great new old most more other than about around some many all made became become'.split(' '));
  const words = s => new Set(fold(s).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w) && !/^\d{1,2}$/.test(w)));
  const out = [];
  for (const r of rows) {
    const e = by[r[0]], x = ext[r[1]]; if (x == null) continue;
    const ew = words(e.name + ' ' + firstSentences(e.desc, 3)), aw = words(x), nw = words(e.name); let shared = 0;
    for (const w of ew) if (aw.has(w) && !nw.has(w)) shared++;
    if (shared <= 1) out.push([shared, r[0], r[1], String(e.desc || '').slice(0, 90), x.slice(0, 110).replace(/\s+/g, ' ')].join('\t'));
  }
  return out.sort((a, b) => parseInt(a) - parseInt(b));
}
(async () => {
  const run = { country, seats, text }[MODE]; if (!run) { console.error('usage: namesake-check.js country|seats|text'); process.exit(2); }
  const out = await run(); console.log(out.length + ' to read'); console.log(out.join('\n'));
})().catch(e => { console.error(e); process.exit(1); });
