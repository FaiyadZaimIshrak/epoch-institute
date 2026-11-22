// Checks the journey drafts against their saved articles and finds every stop's map point.
//   node check-journeys.js <journeys dir> <repo> [--points] [slug …]
// Flags: a missing key, a quote not found word for word in the article, a place the quote and its surroundings never
// name, a year that is not in the quote, an entry that is no mapped place, stops out of order, text too short or long,
// praise words, dashes, BC/AD, "discovered". With --points every stop gets a point: the entry's own
// (scripts/entry-coords.tsv), else the coordinates (Wikidata P625) of the item of the Wikipedia article named in "wp"
// (redirects followed; cached in <dir>/cache); a stop far from both its neighbours while they are near each other is
// flagged as a likely namesake. Writes <dir>/points.tsv.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [dir, repo] = process.argv.slice(2), POINTS = process.argv.includes('--points'), only = process.argv.slice(4).filter(a => !a.startsWith('--'));
const UA = { 'User-Agent': 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const CACHE = path.join(dir, 'cache'); fs.mkdirSync(CACHE, { recursive: true });
async function get(url) { const f = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex') + '.json'); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  for (let i = 0; i < 6; i++) { try { const r = await fetch(url, { headers: UA }); if (r.status === 429 || r.status >= 500) { await sleep(Math.max((+r.headers.get('retry-after') || 0) * 1000, 4000 * (i + 1))); continue; } const j = await r.json(); fs.writeFileSync(f, JSON.stringify(j)); await sleep(700); return j; } catch (e) { await sleep(4000 * (i + 1)); } }
  throw new Error('gave up: ' + url); }
const tsv = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t'));
const places = new Set(tsv(path.join(dir, 'places.tsv')).map(r => r[0]));
const coords = {}; for (const r of tsv(path.join(repo, 'scripts', 'entry-coords.tsv'))) coords[r[0]] = [+r[1], +r[2]];
const norm = s => String(s).normalize('NFC').replace(/[‘’ʻʼ]/g, "'").replace(/[“”]/g, '"').replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
const fold = s => norm(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const HYPE = /\b(epic|legendary|remarkable|daring|famous(ly)?|incredible|astonishing|momentous|pivotal|iconic|heroic|fateful|historic)\b/i;
const KEYS = ['place', 'entry', 'wp', 'date', 'year', 'by', 'text', 'quote'];
const km = (a, b) => { const R = 6371, t = x => x * Math.PI / 180, dl = t(b[0] - a[0]), dg = t(b[1] - a[1]); const h = Math.sin(dl / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dg / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function pointOf(title) {
  const q = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops|coordinates&ppprop=wikibase_item|disambiguation&titles=' + encodeURIComponent(title));
  const pg = Object.values((q.query || {}).pages || {})[0]; if (!pg || pg.missing !== undefined) return { err: 'no article' };
  if (pg.pageprops && pg.pageprops.disambiguation !== undefined) return { err: 'disambiguation page' };
  const item = pg.pageprops && pg.pageprops.wikibase_item; if (!item) return { err: 'no item' };
  const w = await get('https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P625&entity=' + item);
  const c = ((w.claims || {}).P625 || []).filter(x => x.rank !== 'deprecated' && x.mainsnak && x.mainsnak.datavalue).map(x => x.mainsnak.datavalue.value).filter(v => /Q2$/.test(v.globe || 'Q2'));
  if (!c.length) { if (pg.coordinates && pg.coordinates[0]) return { p: [pg.coordinates[0].lat, pg.coordinates[0].lon], title: pg.title, item, src: 'article' }; return { err: 'no coordinates', title: pg.title, item }; }
  return { p: [c[0].latitude, c[0].longitude], title: pg.title, item, src: 'wikidata' };
}
(async () => {
  const files = fs.readdirSync(path.join(dir, process.env.JOUT || 'out')).filter(f => f.endsWith('.json') && (!only.length || only.includes(f.slice(0, -5)))); let flags = 0; const pts = [];
  for (const f of files) {
    const slug = f.slice(0, -5), say = m => { console.log('  ' + m); flags++; };
    let J; try { J = JSON.parse(fs.readFileSync(path.join(dir, process.env.JOUT || 'out', f), 'utf8')); } catch (e) { console.log(slug + ': DOES NOT PARSE ' + e.message); flags++; continue; }
    const art = norm(fs.readFileSync(path.join(dir, 'wp', slug + '.txt'), 'utf8')), fart = fold(art);
    const stops = (J.legs || []).flatMap((l, i) => (l.stops || []).map((s, k) => Object.assign({ leg: i, k }, s)));
    console.log(slug + ': ' + (J.legs || []).length + ' legs, ' + stops.length + ' stops' + (J.title ? ' — ' + J.title : ''));
    for (const k of ['slug', 'title', 'years', 'traveller', 'intro', 'ending', 'legs']) if (!J[k]) say('no ' + k);
    for (const t of [J.intro, J.ending]) if (t && (HYPE.test(t) || /\s[–—]\s/.test(t) || /\b(BC|AD)\b/.test(t))) say('intro/ending: hype, dash or BC/AD: ' + t.slice(0, 80));
    let prevY = -1e9;
    for (const s of stops) {
      const id = (s.leg + 1) + '.' + (s.k + 1) + ' ' + s.place;
      for (const k of KEYS) if (!(k in s) || (s[k] === '' )) say(id + ': no ' + k);
      if (s.year == null) s.year = null;
      if (s.date && /\b(inferred|order|sequence|placeholder)\b/i.test(s.date)) say(id + ': the date field holds a note: ' + s.date);
      if (s.year == null && s.date == null) { /* the article gives no date: the stop is shown without one */ } else if (typeof s.year !== 'number') say(id + ': year is not a number'); else { if (s.year < prevY) say(id + ': year ' + s.year + ' before the stop before it (' + prevY + ')'); prevY = s.year; }
      if (!/^(sea|land)$/.test(s.by || '')) say(id + ': by is ' + s.by);
      if (s.entry && !places.has(s.entry)) say(id + ': entry ' + s.entry + ' is no mapped place');
      const q = norm(s.quote || ''), at = art.indexOf(q);
      if (!q || at < 0) { const fq = fold(q).replace(/[^a-z0-9 ]/g, ''); if (!fq || fart.replace(/[^a-z0-9 ]/g, '').indexOf(fq) < 0) say(id + ': quote not in the article: ' + q.slice(0, 90)); }
      const near = at >= 0 ? art.slice(Math.max(0, at - 600), at + q.length + 300) : q, pn = fold(String(s.place).split(/[,(]/)[0]);
      if (!fold(near).includes(pn) && !fold(near).includes(fold(String(s.wp || '').split(/[,(]/)[0]))) say(id + ': the place is not named near the quote');
      const y = Math.abs(s.year || 0); if (typeof s.year === 'number' && !new RegExp('\\b' + y + '\\b').test(art)) say(id + ': year ' + y + ' is nowhere in the article');
      const words = String(s.text || '').split(/\s+/).filter(Boolean).length; if (words < 12 || words > 50) say(id + ': text has ' + words + ' words');
      if (HYPE.test(s.text || '')) say(id + ': praise word: ' + (s.text.match(HYPE) || [])[0]);
      if (/\s[–—]\s/.test(s.text || '')) say(id + ': a dash as punctuation');
      if (/\b(BC|AD)\b/.test((s.text || '') + ' ' + (s.date || ''))) say(id + ': BC/AD');
      if (/\bdiscover(ed|y)\b/i.test(s.text || '')) say(id + ': "discovered": ' + s.text.slice(0, 80));
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},/.test(s.date || '')) say(id + ': month-first date ' + s.date);
      // numbers of the text that the quote and its surroundings do not hold
      for (const n of (String(s.text).match(/\b\d[\d,]*\b/g) || [])) if (!near.includes(n) && !art.includes(n)) say(id + ': number ' + n + ' is not in the article');
    }
    if (POINTS) {
      const row = [];
      for (const s of stops) { let p = null, src = '';
        if (s.entry && coords[s.entry]) { p = coords[s.entry]; src = 'entry'; }
        else { const r = await pointOf(s.wp || s.place); if (r.p) { p = r.p; src = r.src + ':' + r.title; } else say((s.leg + 1) + '.' + (s.k + 1) + ' ' + s.place + ': no point for "' + (s.wp || s.place) + '" (' + r.err + ')'); }
        row.push({ s, p, src }); }
      row.forEach((r, i) => { if (!r.p) return; const a = row.slice(0, i).reverse().find(x => x.p), b = row.slice(i + 1).find(x => x.p);
        if (a && b) { const d1 = km(a.p, r.p), d2 = km(r.p, b.p), d0 = km(a.p, b.p); if (d1 > 2500 && d2 > 2500 && d0 < 1500) say((r.s.leg + 1) + '.' + (r.s.k + 1) + ' ' + r.s.place + ': ' + Math.round(d1) + ' km from the stop before and ' + Math.round(d2) + ' from the next, which are ' + Math.round(d0) + ' km apart: a namesake? (' + r.src + ')'); }
        pts.push([slug, r.s.leg + 1, r.s.k + 1, r.s.place, r.p[0].toFixed(3), r.p[1].toFixed(3), r.src, a ? Math.round(km(a.p, r.p)) : 0].join('\t')); });
    }
  }
  if (POINTS) fs.writeFileSync(path.join(dir, 'points.tsv'), '# journey\tleg\tstop\tplace\tlatitude\tlongitude\tsource\tkm from the stop before\n' + pts.join('\n') + '\n');
  console.log(flags + ' flags in ' + files.length + ' journeys');
})().catch(e => { console.error(e); process.exit(1); });
