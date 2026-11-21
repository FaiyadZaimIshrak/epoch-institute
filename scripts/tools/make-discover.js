// /discover: look around first (21 Nov 2026; the owner: "most people would prefer looking through things they want to
// see before actually thinking of delving deeper"). Writes data/discover.json, the picture wall's cards:
//   {v, regions, items: [[cat, title, picture, line, address, era, region, years, credit]]}
//   cat: people | places | events | states | ideas | works | speeches; era: 0 ancient (to 499), 1 medieval (500-1499),
//   2 early modern (1500-1799), 3 modern, -1 undated; region: index in REGIONS or -1; years: the dates as shown.
// Cards: every profile (its home picture, else its emblem), the pictured entries the profiles mention most (named by
// three or more profiles: the encyclopedia's best known), and the speeches whose speaker has a portrait. Only the
// Institute's own lines are shown (a profile's teaser, an entry's first sentence) and every picture keeps its credit.
// Run by build-pages.ps1 after the profiles and entries are final; prints the count and stamps DISCOVER_SRC in /discover.
//   node scripts/tools/make-discover.js
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ctx = {}; new Function('ctx', rd('shared-data.js') + ';ctx.E=EMPIRES;ctx.I=EMPIRE_INFO;ctx.R=REGIONS;ctx.url=profileUrl;ctx.span=profileSpanText;ctx.first=function(e){return profileSpan(e)[0]};ctx.kind=profileKind;')(ctx);
const PICS = new Function(rd('home-data.js').replace(/^\s*const /gm, 'var ') + ';return HOME_PICS')();
const ENC = new Function(rd('encyclopedia-data.js') + ';return ENCYCLOPEDIA')(), bySlug = {}; for (const e of ENC) bySlug[e.slug] = e;
const SP = new Function(rd('speeches-data.js') + ';return SPEECHES')();
const regionOf = {}; for (const e of ctx.E) regionOf[e.name] = ctx.R.indexOf(e.region);
const era = y => y == null || isNaN(y) ? -1 : y < 500 ? 0 : y < 1500 ? 1 : y < 1800 ? 2 : 3;
// the first year in a dates string ("c. 1390–1441", "r. 669–631 or 627 BCE", "5th century BCE")
function firstYear(d) {
  if (!d) return null; d = d.replace(/,/g, '');
  const m = /(\d{1,4})(st|nd|rd|th)?\s*(century|millennium)?/.exec(d); if (!m) return null;
  let y = +m[1]; if (m[3] === 'century') y = (y - 1) * 100 + 50; else if (m[3] === 'millennium') y = (y - 1) * 1000 + 500;
  // BCE when the first era word after the first number is BCE ("r. 669–631 or 627 BCE", "c. 63 BCE – 14 CE")
  const after = d.slice(m.index), b = after.search(/BCE/), c = after.search(/(^|[^B])CE\b/);
  return b >= 0 && (c < 0 || b < c) ? -y : y;
}
const firstSentence = s => { s = String(s || ''); const m = /^(.{40,}?[a-z0-9)\]]\.)(\s+[A-Z“"(]|$)/.exec(s); let t = m ? m[1] : s; if (t.length > 240) t = t.slice(0, 237).replace(/\s+\S*$/, '') + '…'; return t; };
const credit = c => !c ? '' : typeof c === 'string' ? c : [c.artist, c.licence].filter(Boolean).join(', ');
const CAT = { person: 'people', place: 'places', event: 'events', polity: 'states', work: 'works', idea: 'ideas', group: 'ideas', term: 'ideas', institution: 'ideas' };
const items = [], seen = new Set();
// 1. the profiles
for (const e of ctx.E) {
  const k = ctx.kind(e), url = ctx.url(e), hp = PICS[e.name];
  const pic = hp && hp.img ? hp.img : fs.existsSync(path.join(R, 'logos', 'thumbs', e.name + '.png')) ? '/logos/thumbs/' + encodeURIComponent(e.name) + '.png' : '';
  if (!pic) continue;
  const cat = k === 'polity' ? 'states' : k === 'work' ? 'works' : k === 'life' ? 'people' : 'ideas';
  const y = ctx.first(e);
  items.push([cat, e.name, pic, firstSentence(ctx.I[e.name] || ''), url, era(y), ctx.R.indexOf(e.region), ctx.span(e), hp && hp.img ? credit(hp.credit) : '']);
  seen.add(e.name.toLowerCase());
}
// 2. the best-known pictured entries: named by three or more profiles
// (the most mentioned of each kind, so the wall stays light: about 1,600 cards in all)
const CAP = { people: 420, places: 220, events: 220, ideas: 120, states: 60, works: 80 };
const ents = []; {
  const pool = ENC.filter(e => e.img && (e.empires || []).length >= 3 && CAT[e.type] && !seen.has(e.name.toLowerCase()))
    .sort((a, b) => b.empires.length - a.empires.length), n = {};
  for (const e of pool) { const c = CAT[e.type]; if ((n[c] || 0) < CAP[c]) { n[c] = (n[c] || 0) + 1; ents.push(e); } }
}
for (const e of ents) {
  const regs = {}; for (const p of e.empires || []) { const r = regionOf[p.name]; if (r >= 0) regs[r] = (regs[r] || 0) + 1; }
  const reg = Object.keys(regs).sort((a, b) => regs[b] - regs[a])[0];
  items.push([CAT[e.type], e.name, e.img, firstSentence(e.desc), '/encyclopedia/' + e.slug, era(firstYear(e.dates)), reg === undefined ? -1 : +reg, e.dates || '', credit(e.credit)]);
}
// 3. the speeches whose speaker has a portrait
for (const s of SP) {
  const sp = bySlug[s.speakerSlug]; if (!sp || !sp.img) continue;
  const reg = s.empire ? regionOf[s.empire.split('|')[1]] : undefined;
  items.push(['speeches', s.title, sp.img, firstSentence(s.before), '/speeches/' + s.slug, era(s.year), reg === undefined ? -1 : reg, s.display || '', credit(sp.credit)]);
}
const out = JSON.stringify({ regions: ctx.R, items });
fs.writeFileSync(path.join(R, 'data', 'discover.json'), out);
const v = crypto.createHash('sha1').update(out).digest('hex').slice(0, 10);
const jv = crypto.createHash('sha1').update(rd('discover.js')).digest('hex').slice(0, 10);
// the hand page, from /weekly's head (its theme, look, analytics and font snippets are the site's own), indexed
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const W = rd('weekly'), head = W.slice(0, W.indexOf('</head>'));
const T = 'Discover', D = 'Look through history in pictures: empires, people, places, events, ideas and works, with a quick look at each before you read the full page.';
const h = head
  .replace(/<title>[^<]*<\/title>/, () => '<title>Discover History in Pictures — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + esc(D) + '">')
  .replace(/<meta name="robots" content="[^"]*">/, () => '<meta name="robots" content="index, follow, max-image-preview:large">')
  .replace(/<link rel="canonical" href="[^"]*">/, () => '<link rel="canonical" href="https://the-epoch-institute.org/discover">')
  .replace(/<meta property="og:title" content="[^"]*">/, () => '<meta property="og:title" content="Discover History in Pictures — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, () => '<meta property="og:description" content="' + esc(D) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, () => '<meta property="og:url" content="https://the-epoch-institute.org/discover">')
  .replace('href="/css/weekly.css"', 'href="/css/discover.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: T, item: 'https://the-epoch-institute.org/discover' }] },
    { '@type': 'CollectionPage', name: 'Discover History in Pictures', url: 'https://the-epoch-institute.org/discover', description: D }] }) + '</script>');
if (!/href="\/css\/discover\.css"/.test(h) || !/canonical" href="https:\/\/the-epoch-institute\.org\/discover"/.test(h) || !/index, follow, max-image/.test(h)) throw new Error('the head of /weekly has changed: make-discover.js no longer fits it');
const KINDS = [['', 'Everything'], ['people', 'People'], ['places', 'Places'], ['events', 'Events'], ['states', 'States and empires'], ['ideas', 'Cultures and ideas'], ['works', 'Works'], ['speeches', 'Speeches']];
const ERAS = [['', 'Any age'], ['0', 'Ancient'], ['1', 'Medieval'], ['2', 'Early modern'], ['3', 'Modern']];
const page = h + `</head>
<body>

<main id="main" class="dc-page ref-page" data-no-toc>
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Discover</li></ol></nav>
<header class="ref-head">
  <span class="hero-ornament"></span>
  <h1 class="research-title">Discover</h1>
  <p class="ref-lede">Look through history in pictures. Tap any picture for a quick look, then read the full page when something catches your eye.</p>
</header>
<div class="dc-bar" role="group" aria-label="Choose what to see">
  <div class="dc-chips" id="dc-kinds">${KINDS.map((k, i) => '<button type="button" class="dc-chip" data-k="' + k[0] + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + k[1] + '</button>').join('')}</div>
  <div class="dc-row">
    <label class="dc-sel"><span>Age</span><select id="dc-era">${ERAS.map(e => '<option value="' + e[0] + '">' + e[1] + '</option>').join('')}</select></label>
    <label class="dc-sel"><span>Region</span><select id="dc-region"><option value="">Anywhere</option>${ctx.R.map((r, i) => '<option value="' + i + '">' + esc(r) + '</option>').join('')}</select></label>
    <button type="button" class="dc-surprise" id="dc-surprise">Surprise me</button>
  </div>
</div>
<p class="dc-count" id="dc-count" aria-live="polite"></p>
<div class="dc-wall" id="dc-wall"><noscript><p class="pass-note">The picture wall needs JavaScript. The <a href="/profiles">profiles</a> and the <a href="/encyclopedia/">encyclopedia</a> list the same subjects.</p></noscript></div>
<div class="dc-more-row"><button type="button" class="dc-more" id="dc-more" hidden>Show more</button></div>
</main>

<div class="dc-ql" id="dc-ql" role="dialog" aria-modal="true" aria-labelledby="dc-ql-t" hidden>
  <div class="dc-ql-card">
    <button type="button" class="dc-ql-x" id="dc-ql-x" aria-label="Close">&times;</button>
    <figure class="dc-ql-fig"><img id="dc-ql-img" alt=""><figcaption id="dc-ql-cr"></figcaption></figure>
    <div class="dc-ql-body">
      <p class="dc-ql-k" id="dc-ql-k"></p>
      <h2 class="dc-ql-t" id="dc-ql-t"></h2>
      <p class="dc-ql-y" id="dc-ql-y"></p>
      <p class="dc-ql-line" id="dc-ql-line"></p>
      <a class="dc-ql-go" id="dc-ql-go" href="/">Read the full page &rarr;</a>
      <div class="dc-ql-nav"><button type="button" id="dc-ql-prev">&larr; Previous</button><button type="button" id="dc-ql-next">Next &rarr;</button></div>
    </div>
  </div>
</div>

<script src="/shared-nav.js"></script>
<script>initNav('discover');</script>
<script>var DISCOVER_SRC = '/data/discover.json?v=${v}';</script>
<script src="/discover.js?v=${jv}"></script>
</body>
</html>
`;
const pf = path.join(R, 'discover');
if (!fs.existsSync(pf) || rd('discover') !== page) fs.writeFileSync(pf, page);
// the home page's strip (build:home-discover, written only where the markers stand): 84 gentle cards with a real picture
// (no emblems), taken in turn from each kind; an inline script deals twelve of them by the day, before the first paint
{
  const kg = new Function(/function kidsGentle\(title, desc\) \{[\s\S]*?\n\}/.exec(rd('shared-nav.js'))[0] + ';return kidsGentle')();
  const LBL = { people: 'Person', places: 'Place', events: 'Event', states: 'State or empire', ideas: 'Culture or idea', works: 'Work' };
  const byCat = {}; for (const c of items) if (LBL[c[0]] && /^\/images\//.test(c[2]) && kg(c[1], c[3])) (byCat[c[0]] = byCat[c[0]] || []).push(c);
  const order = ['people', 'places', 'states', 'events', 'works', 'ideas'], pool = [];
  for (let i = 0; pool.length < 84 && i < 200; i++) for (const k of order) { const c = (byCat[k] || [])[i]; if (c && pool.length < 84) pool.push([c[1], c[2], c[4], LBL[k]]); }
  const cardH = c => '<li><a class="hdc-card" href="' + esc(c[2]) + '"><span class="hdc-pic"><img src="' + esc(c[1]) + '" alt="" loading="lazy" decoding="async"></span><span class="hdc-cap"><i>' + esc(c[3]) + '</i><b>' + esc(c[0]) + '</b></span></a></li>';
  const block = '<ul class="hdc-row" id="hdc-row">' + pool.slice(0, 12).map(cardH).join('') + '</ul>\n<script>(function () {   /* twelve of the pool a day (UTC), the same for everyone, drawn before the first paint */\n' +
    '  var P = ' + JSON.stringify(pool) + ', d = Math.floor(Date.now() / 864e5), el = document.getElementById(\'hdc-row\'), h = \'\', e = function (s) { return String(s).replace(/&/g, \'&amp;\').replace(/</g, \'&lt;\').replace(/"/g, \'&quot;\'); };\n' +
    '  for (var i = 0; i < 12; i++) { var c = P[(d * 12 + i * 7) % P.length]; h += \'<li><a class="hdc-card" href="\' + e(c[2]) + \'"><span class="hdc-pic"><img src="\' + e(c[1]) + \'" alt="" loading="lazy" decoding="async"></span><span class="hdc-cap"><i>\' + e(c[3]) + \'</i><b>\' + e(c[0]) + \'</b></span></a></li>\'; }\n' +
    '  if (el) el.innerHTML = h;\n})();</script>';
  const ip = path.join(R, 'index'), i0 = rd('index'), m = /(<!-- build:home-discover -->)[\s\S]*?(<!-- \/build:home-discover -->)/;
  if (m.test(i0)) { const i1 = i0.replace(m, (a, x, y) => x + '\n' + block + '\n' + y); if (i1 !== i0) fs.writeFileSync(ip, i1); }
}
const by = {}; for (const i of items) by[i[0]] = (by[i[0]] || 0) + 1;
console.log('discover: ' + items.length + ' cards (' + Object.entries(by).map(x => x.join(' ')).join(', ') + '), ' + Math.round(out.length / 1024) + ' KB, v=' + v);
