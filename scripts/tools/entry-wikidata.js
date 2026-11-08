// Finds each encyclopedia entry's English Wikipedia article and Wikidata item, for the entry pages' "Read further" line
// and the sameAs of their JSON-LD. An entry's name is in most cases the title of the article it was written from, but a
// title can also be a namesake (another person of the name, a town named after a battle), so a match is kept only when
// something besides the name agrees:
//   pic    the entry's picture is the article's lead image or the item's image (P18)
//   years  the item's own years (born, died, founded, ended, began, ended, happened, published) meet the entry's dates
//          (a person: a human, P31 Q5, born or died within 30 years of the entry's span; anything else: within 50 and
//          not a human)
//   text   neither has years, and the entry's description and the article's first four sentences share at least six
//          content words, a third of the shorter (--min-words, --min-share; below that, namesakes crept in: the Nzakara
//          people matched the Nzakara language)
// Refused: disambiguation pages, an item whose years are far from the entry's, a human for an entry that is not a
// person (and the reverse), and an item two entries claim (it stays with the entry named exactly as the article).
//   node scripts/tools/entry-wikidata.js [--report=file.tsv]
// Writes scripts/entry-wikidata.tsv (slug, article title, item, how, scope, section): scope "same" when the name reaches
// the article or another spelling of it (sameAs), "section" or "redirect" when Wikipedia sends it to a section of a
// broader article or to another one (read further only). scripts/entry-wikidata-manual.tsv (slug, title, item, scope;
// "-" for none) is the editor's: it wins over the search. --report writes the refused matches, report-text (the text
// scores) and report-kind (picture matches across the human line: legendary figures, and namesakes whose picture the
// entry took, which is how the 25 of scripts/added-entries.json "nopicture" were found). Responses are cached in
// %LOCALAPPDATA%\epoch-tools\wd-cache.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const REPORT = arg('report'), TXT_N = +(arg('min-words') || 6), TXT_R = +(arg('min-share') || 0.3);
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'wd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const UA = 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, body) {
  const f = path.join(CACHE, crypto.createHash('sha1').update(url + (body || '')).digest('hex') + '.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 8; i++) {
    let r;
    try {
      r = await fetch(url, body ? { method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' }, body }
        : { headers: { 'User-Agent': UA } });
    } catch (e) { await sleep(5000 * (i + 1)); continue; }
    if (r.status === 429 || r.status >= 500) { const ra = +r.headers.get('retry-after') || 0; await sleep(Math.max(ra * 1000, 5000 * (i + 1))); continue; }
    if (!r.ok) throw new Error(url + ' ' + r.status);
    const j = await r.json(); if (j.error && j.error.code === 'maxlag') { await sleep(5000); continue; }
    fs.writeFileSync(f, JSON.stringify(j)); await sleep(body ? 1000 : 300); return j;
  }
  throw new Error('gave up: ' + url);
}
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const fileOf = s => { const m = String(s || '').match(/\/wiki\/File:(.+)$/); return m ? norm(decodeURIComponent(m[1])) : null; };
const norm = s => String(s).replace(/_/g, ' ').trim().toLowerCase();
// the entry's dates as a span of years (BCE negative): plain years, "5th century BCE", "c.", "fl.", "r."
function span(d) {
  d = String(d || '').replace(/d{1,2}s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/g, ' '); if (!d.trim()) return null;
  const ys = [];
  const bceAll = /\bBCE?\b/.test(d) && !/\b(CE|AD)\b/.test(d.replace(/BCE/g, ''));
  d = d.replace(/(\d+)(?:st|nd|rd|th)\s+(century|millennium)(\s+BCE?)?/gi, (m, n, u, b) => {
    const k = u.toLowerCase() === 'century' ? 100 : 1000; n = +n;
    if (b) ys.push(-(n * k - 1), -((n - 1) * k)); else ys.push((n - 1) * k, n * k - 1); return ' ';
  });
  const re = /(\d{1,5}(?:,\d{3})?)(\s*(?:BCE?|CE|AD))?/g; let m; const raw = [];
  while ((m = re.exec(d))) { const n = +m[1].replace(',', ''); if (n > 2100 && !m[2]) continue; const pv = raw[raw.length - 1], era0 = (m[2] || '').trim(); if (pv && !era0 && !pv[1] && m[1].length < String(pv[0]).length && n < pv[0] && !/BC/.test(d.slice(re.lastIndex))) { // a shortened second year: 1895–96
      const k = Math.pow(10, m[1].length), full = pv[0] - pv[0] % k + n; raw.push([full >= pv[0] ? full : n, '']); continue;
    }
    raw.push([n, era0]); }
  for (let i = 0; i < raw.length; i++) {
    let [n, era] = raw[i];
    if (!era) { const later = raw.slice(i + 1).find(r => r[1]); era = later ? later[1] : bceAll ? 'BCE' : ''; }
    ys.push(/^BC/.test(era) ? -n : n);
  }
  if (!ys.length) return null;
  return [Math.min(...ys), Math.max(...ys)];
}
// the years a description names: four-digit years, and any number written with BCE/CE
function descSpan(t) {
  const ys = []; let m; const re = /\b(\d{1,4})\s*(BCE|BC|CE|AD)\b|\b(1\d{3}|20[0-2]\d)\b/g;
  while ((m = re.exec(String(t || '')))) ys.push(m[1] ? (/^B/.test(m[2]) ? -m[1] : +m[1]) : +m[3]);
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
}
const STOP = new Set('the a an of and in on at to for by from with as or was is were are be his her its their which that this who whom also first one two three born died known best most part into during after before under over between city town river state kingdom empire people person'.split(' '));
const words = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w));
const stem = w => w.replace(/(ians|ian|ese|ish|ic|ical|s)$/, '');
(async () => {
  // 1. names -> articles: redirects followed; the item, the disambiguation flag, the lead image, the short description
  const art = {};
  for (let i = 0; i < E.length; i += 50) {
    const batch = E.slice(i, i + 50);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops|pageimages|description&ppprop=wikibase_item|disambiguation&piprop=name&pilimit=50&titles=' + encodeURIComponent(batch.map(e => e.name).join('|')));
    const q = j.query || {}, nm = {}, rd = {};
    for (const n of q.normalized || []) nm[n.from] = n.to; for (const r of q.redirects || []) rd[r.from] = r;
    const byT = {}; for (const pg of Object.values(q.pages || {})) if (!('missing' in pg)) byT[pg.title] = pg;
    for (const e of batch) {
      let t = nm[e.name] || e.name; const red = rd[t]; t = red ? red.to : t; const pg = byT[t];
      if (pg) art[e.slug] = { title: pg.title, redirect: !!red, frag: (red && red.tofragment) || '', q: pg.pageprops && pg.pageprops.wikibase_item, dis: !!(pg.pageprops && 'disambiguation' in pg.pageprops), img: pg.pageimage ? norm(pg.pageimage) : null, sd: pg.description || '' };
    }
    if (i % 5000 === 0) console.error('titles ' + i);
  }
  // 2. the items' classes, years and image, from the query service, 250 at a time
  const it = {}, ids = [...new Set(Object.values(art).filter(a => a.q && !a.dis).map(a => a.q))];
  for (let i = 0; i < ids.length; i += 250) {
    const vals = ids.slice(i, i + 250).map(x => 'wd:' + x).join(' ');
    const sp = 'SELECT ?item (GROUP_CONCAT(DISTINCT ?c;separator="|") AS ?cls) (GROUP_CONCAT(DISTINCT ?bd;separator="|") AS ?life) (GROUP_CONCAT(DISTINCT ?oy;separator="|") AS ?other) (SAMPLE(?im) AS ?img) WHERE { VALUES ?item {' + vals + '} ' +
      'OPTIONAL{?item wdt:P31 ?c} OPTIONAL{?item wdt:P569|wdt:P570 ?t1 . BIND(YEAR(?t1) AS ?bd)} ' +
      'OPTIONAL{?item wdt:P571|wdt:P576|wdt:P580|wdt:P582|wdt:P585|wdt:P577|wdt:P1319|wdt:P1326|wdt:P1249 ?t2 . BIND(YEAR(?t2) AS ?oy)} OPTIONAL{?item wdt:P18 ?im} } GROUP BY ?item';
    const j = await get('https://query.wikidata.org/sparql', 'format=json&query=' + encodeURIComponent(sp));
    for (const b of j.results.bindings) {
      const q = b.item.value.split('/').pop(), v = k => b[k] ? b[k].value : '';
      const yrs = s => s.split('|').filter(Boolean).map(Number).filter(n => !isNaN(n)).map(n => n <= 0 ? n - 1 : n); // the query service counts 1 BCE as year 0
      it[q] = { human: v('cls').split('|').some(c => c.endsWith('/Q5')), life: yrs(v('life')), other: yrs(v('other')), img: v('img') ? norm(decodeURIComponent(v('img').split('/').pop())) : null };
    }
    if (i % 5000 === 0) console.error('items ' + i);
  }
  // 2b. how widely known each item is: the number of Wikipedia language editions with an article on it (sitelinks).
  // The builder ranks a day's events by it (the best-known first in the snippet); the editor's items are counted too.
  const SL = {}, mf0 = path.join(ROOT, 'scripts', 'entry-wikidata-manual.tsv');
  const slIds = new Set(ids); if (fs.existsSync(mf0)) for (const l of fs.readFileSync(mf0, 'utf8').split(/\r?\n/)) { const q = (l.split('\t')[2] || ''); if (/^Q\d+$/.test(q)) slIds.add(q); }
  const slList = [...slIds];
  for (let i = 0; i < slList.length; i += 400) {
    const sp = 'SELECT ?item ?n WHERE { VALUES ?item {' + slList.slice(i, i + 400).map(x => 'wd:' + x).join(' ') + '} ?item wikibase:sitelinks ?n }';
    const j = await get('https://query.wikidata.org/sparql', 'format=json&query=' + encodeURIComponent(sp));
    for (const b of j.results.bindings) SL[b.item.value.split('/').pop()] = +b.n.value;
  }
  // 3. the articles' opening sentences, for the entries that neither picture nor years confirm
  const pending = E.filter(e => {
    const a = art[e.slug]; if (!a || a.dis || !a.q) return false;
    const x = it[a.q] || { human: false, life: [], other: [] }, f = fileOf(e.credit && e.credit.source), sp = span(e.dates), person = e.type === 'person';
    const yrs = person ? x.life : x.other.concat(x.human ? [] : x.life);
    return !(f && (f === a.img || f === x.img)) && person === x.human && !(sp && yrs.length);
  });
  const ext = {}, pt = [...new Set(pending.map(e => art[e.slug].title))];
  for (let i = 0; i < pt.length; i += 20) {
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&exsentences=4&exlimit=20&titles=' + encodeURIComponent(pt.slice(i, i + 20).join('|')));
    for (const pg of Object.values((j.query || {}).pages || {})) if (pg.extract) ext[pg.title] = pg.extract;
    if (i % 1000 === 0) console.error('extracts ' + i + ' of ' + pt.length);
  }
  // 4. decide
  const out = [], rep = [], stat = {}, tx = [], kind = [];
  const bump = k => stat[k] = (stat[k] || 0) + 1;
  for (const e of E) {
    const a = art[e.slug]; let how = '', why = '';
    if (!a) why = 'no article'; else if (a.dis) why = 'disambiguation'; else if (!a.q) why = 'no item';
    else {
      const x = it[a.q] || { human: false, life: [], other: [] }, f = fileOf(e.credit && e.credit.source), sp = span(e.dates);
      const person = e.type === 'person';
      const yrs = person ? x.life : x.other.concat(x.human ? [] : x.life), tol = person ? 30 : 50;
      // a person matched by the picture whose item lived far from every year the entry gives (its dates, else the years in
      // its description) is a namesake whose picture the entry took: Ibrahim Zaki of Katagum (1808) had the Maldivian
      // envoy born in 1947
      // (a description may name only a later find, Nefertari's tomb in 1904: its years flag only an item that lived after them)
      const dsp = descSpan(e.desc), ds = sp || dsp, ptol = sp && sp[0] < 0 ? 300 : 100;
      const far = person && x.human && x.life.length > 0 && (sp ? !x.life.some(y => y >= sp[0] - ptol && y <= sp[1] + ptol) : !!dsp && x.life.every(y => y > dsp[1] + 100));
      if (f && (f === a.img || f === x.img) && far) { why = 'picture, but lived ' + x.life.join(',') + ' vs ' + ds.join('..'); kind.push([e.slug, e.name, e.type, a.title, a.q, a.sd, why].join('\t')); }
      else if (f && (f === a.img || f === x.img)) { how = 'pic'; if (person !== x.human) kind.push([e.slug, e.name, e.type, a.title, a.q, a.sd].join('\t')); }
      else if (person !== x.human) why = person ? 'not a human' : 'a human';
      else if (sp && yrs.length) { if (yrs.some(y => y >= sp[0] - tol && y <= sp[1] + tol)) how = 'years'; else why = 'years ' + yrs.slice(0, 4).join(',') + ' vs ' + sp.join('..'); }
      else {
        // the entry was written from its article, so the two tell the same thing in many of the same words
        const D = new Set(words(e.desc).map(stem)), X = new Set(words(ext[a.title] || '').map(stem));
        const sh = [...D].filter(w => X.has(w)).length, r = D.size && X.size ? sh / Math.min(D.size, X.size) : 0;
        tx.push([r.toFixed(2), sh, e.slug, e.name, a.title, (ext[a.title] || '').slice(0, 160).replace(/\s+/g, ' '), String(e.desc).slice(0, 160)].join('\t'));
        if (sh >= TXT_N && r >= TXT_R) how = 'text'; else why = 'unconfirmed (' + sh + ' words, ' + r.toFixed(2) + ': ' + (a.sd || 'no description') + ')';
      }
    }
    bump(how || why.replace(/ .*/, ''));
    if (how) out.push([e.slug, a.title, a.q, how, a.redirect ? 1 : 0, e.name, a.frag]);
    else if (a && a.q && !a.dis) rep.push([e.slug, e.name, e.type, e.dates || '', a.title, a.q, a.sd, why].join('\t'));
  }
  // an item two entries claim stays with the entry named exactly as its article (else with neither)
  const byQ = {}; for (const r of out) (byQ[r[2]] = byQ[r[2]] || []).push(r);
  const keep = new Set();
  for (const rs of Object.values(byQ)) {
    if (rs.length === 1) { keep.add(rs[0][0]); continue; }
    const exact = rs.filter(r => r[5] === r[1] && !r[4]);
    if (exact.length === 1) keep.add(exact[0][0]);
    for (const r of rs) if (!keep.has(r[0])) rep.push([r[0], r[5], '', '', r[1], r[2], '', 'shared with ' + rs.filter(o => o !== r).map(o => o[0]).join(',')].join('\t'));
  }
  // the editor's own lines win
  const man = {}, mf = path.join(ROOT, 'scripts', 'entry-wikidata-manual.tsv');
  if (fs.existsSync(mf)) for (const l of fs.readFileSync(mf, 'utf8').split(/\r?\n/)) { if (!l || l[0] === '#') continue; const [s, t, q, sc] = l.split('\t'); man[s] = [t, q, sc]; }
  // the scope: "same" when the name reaches the article itself or another spelling of it (Vasily III of Moscow, Vasili III
  // of Russia); "section" when Wikipedia sends the name to a section of a broader article, "redirect" when to a broader or
  // other article (a battle to its campaign): those two are read further but not the same thing, so no sameAs
  const ENT = new Map(E.map(e => [e.slug, e]));
  const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const toks = s => fold(s).split(' ').filter(w => w.length > 2 && !['the', 'and', 'of'].includes(w));
  const near = (x, y) => x === y || (x.length > 4 && y.length > 4 && (x.startsWith(y.slice(0, 5)) || y.startsWith(x.slice(0, 5))));
  function lev(a, b) { const d = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return d[b.length]; }
  function scope(r) {
    if (r[6]) return 'section';
    const e = ENT.get(r[0]); if (!r[4] || e.name === r[1]) return 'same';
    if ((e.aka || []).some(k => fold(k) === fold(r[1]))) return 'same';
    const a = toks(e.name), b = toks(r[1]), [s, l] = a.length <= b.length ? [a, b] : [b, a];
    if (s.length && s.every(w => l.some(v => near(w, v)))) return 'same';
    const fa = fold(e.name).replace(/ /g, ''), fb = fold(r[1]).replace(/ /g, '');
    return 1 - lev(fa, fb) / Math.max(fa.length, fb.length) >= 0.6 ? 'same' : 'redirect';
  }
  const rows = [];
  for (const r of out) if (keep.has(r[0]) && !(r[0] in man)) rows.push([r[0], r[1], r[2], r[3], scope(r), r[6] || '', SL[r[2]] || ''].join('\t'));
  for (const [s, [t, q, sc]] of Object.entries(man)) if (t !== '-') rows.push([s, t, q, 'editor', sc || 'same', '', SL[q] || ''].join('\t'));
  rows.sort();
  fs.writeFileSync(path.join(ROOT, 'scripts', 'entry-wikidata.tsv'), '# slug\tWikipedia title\tWikidata item\thow\tscope (same: sameAs; section, redirect: read further only)\tsection\tWikipedia editions (sitelinks) (written by scripts/tools/entry-wikidata.js)\n' + rows.join('\n') + '\n');
  if (REPORT) fs.writeFileSync(REPORT.replace(/(\.\w+)?$/, '-text$1'), tx.sort().join('\n') + '\n');
  // picture matches where one is a human and the other not: a person entry with a place's picture, for the editor to read
  if (REPORT) fs.writeFileSync(REPORT.replace(/(\.\w+)?$/, '-kind$1'), kind.join('\n') + '\n');
  if (REPORT) fs.writeFileSync(REPORT, '# slug\tname\ttype\tdates\ttitle\titem\tdescription\twhy\n' + rep.join('\n') + '\n');
  console.log(JSON.stringify(stat), 'written', rows.length);
})();
