// Writes the hand page /journeys, "Journeys on the Globe" (22 Nov 2026, E5 of the editorial round): each journey of
// scripts/journeys/<slug>.json (its stops in order, each with a date, one or two sentences from the saved article and a
// map point: an entry's own, else Wikidata's coordinates of the place's article, "ll") as an article of legs and
// stops, which journeys.js draws stop by stop on a globe. scripts/journeys/journeys.tsv is the editor's: the order,
// the traveller's page, the pages that link the journey, whether it suits Kids mode. The head is /privacy's, so its
// snippets are the site's own. Also writes scripts/journey-links.js (JOURNEY_LINKS {profile name: [[slug, title]]}:
// generator.html's "Follow the journey" line) and stamps journeys.js?v= and the land's ?v= into the page.
//   node scripts/tools/make-journeys.js      (build-pages.ps1 runs it; re-run after a journey or journeys.js changes)
// It STOPS on a journey without a row, a stop without a point or a text, an entry or page that does not exist.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(R, f))).digest('hex').slice(0, 10);
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, profileUrl}')();
const byName = {}; for (const e of SD.EMPIRES) byName[e.name] = e;
const E = new Function(read('encyclopedia-data.js') + ';return ENCYCLOPEDIA')(), ent = {}; for (const e of E) ent[e.slug] = e;
// the page a name stands for: a profile's name, or "e:<entry slug>"
const pageOf = (ref, what) => { ref = ref.trim(); if (ref.startsWith('e:')) { const s = ref.slice(2); if (!ent[s]) throw new Error(what + ': no entry ' + s); return { href: '/encyclopedia/' + s, name: ent[s].name, entry: s }; }
  if (!byName[ref]) throw new Error(what + ': no profile ' + ref); return { href: SD.profileUrl(byName[ref]), name: ref, profile: ref }; };
// the age a journey belongs to, by the first year of its "years" (the picker offers one age at a time)
const ERAS = ['Before 1500', '1500 to 1699', '1700 to 1799', '1800 to 1899', 'Since 1900'];
const eraOf = y => { const m = /(\d{1,4})/.exec(String(y)); let v = m ? +m[1] : 0; if (/BCE/.test(y) && !/\d\s*CE/.test(y)) v = -v; return v < 1500 ? 0 : v < 1700 ? 1 : v < 1800 ? 2 : v < 1900 ? 3 : 4; };
const rows = read('scripts/journeys/journeys.tsv').split(/\r?\n/).filter(l => l.trim() && l[0] !== '#').map(l => l.split('\t'));
const J = rows.map(([slug, short, traveller, links, kids, article]) => {
  const f = 'scripts/journeys/' + slug + '.json'; if (!fs.existsSync(path.join(R, f))) throw new Error('journeys.tsv: no ' + f);
  const j = JSON.parse(read(f)), who = traveller && traveller !== '-' ? pageOf(traveller, slug) : null;
  for (const k of ['title', 'years', 'traveller', 'intro', 'ending', 'legs']) if (!j[k]) throw new Error(slug + ': no ' + k);
  let n = 0;
  for (const l of j.legs) for (const s of l.stops) { n++; const id = slug + ' stop ' + n + ' (' + s.place + ')';
    if (!Array.isArray(s.ll) || s.ll.length !== 2 || !isFinite(s.ll[0]) || !isFinite(s.ll[1]) || Math.abs(s.ll[0]) > 90 || Math.abs(s.ll[1]) > 180) throw new Error(id + ': no map point');
    if (!s.text || !s.place || !/^(sea|land)$/.test(s.by)) throw new Error(id + ': no text, place or way of travel');
    if (/\barticle\b/i.test(s.text)) throw new Error(id + ': the text speaks of its source');
    if (s.entry && !ent[s.entry]) throw new Error(id + ': no entry ' + s.entry); }
  if (n < 3) throw new Error(slug + ': fewer than three stops');
  return { slug, short: short || j.title, j, who, n, era: eraOf(j.years), kids: kids !== 'no', article, links: (links || '').split(';').map(x => x.trim()).filter(x => x && x !== '-').map(x => pageOf(x, slug)) };
});
for (const f of fs.readdirSync(path.join(R, 'scripts', 'journeys')).filter(f => f.endsWith('.json'))) if (!J.some(x => x.slug === f.slice(0, -5))) throw new Error('scripts/journeys/' + f + ' has no row in journeys.tsv');

// the pages that link a journey: the profiles for generator.html, the entries for build-pages.ps1 (scripts/journey-entries.tsv)
const LINKS = {}, ELINKS = [];
for (const x of J) for (const p of [x.who].concat(x.links).filter(Boolean)) { if (p.profile) { (LINKS[p.profile] = LINKS[p.profile] || []); if (!LINKS[p.profile].some(l => l[0] === x.slug)) LINKS[p.profile].push([x.slug, x.j.title]); } else if (!ELINKS.some(l => l[0] === p.entry && l[1] === x.slug)) ELINKS.push([p.entry, x.slug, x.j.title]); }
fs.writeFileSync(path.join(R, 'scripts', 'journey-links.js'), '// Written by scripts/tools/make-journeys.js: the journeys a profile\'s subject made (/journeys?j=<slug>)\nconst JOURNEY_LINKS = ' + JSON.stringify(LINKS) + ';\n');
fs.writeFileSync(path.join(R, 'scripts', 'journey-entries.tsv'), '# entry\tjourney\ttitle (written by scripts/tools/make-journeys.js: the entries that link a journey)\n' + ELINKS.map(l => l.join('\t')).join('\n') + '\n');

const art = x => { let n = 0; const j = x.j;
  return '<article class="jr-j" id="' + x.slug + '" data-kids="' + (x.kids ? 1 : 0) + '">\n<h2>' + esc(j.title) + '</h2>\n<p class="jr-meta">' + esc(j.years) + ' &#183; ' + (x.who ? '<a href="' + x.who.href + '">' + esc(j.traveller) + '</a>' : esc(j.traveller)) + ' &#183; ' + x.n + ' stops</p>\n<p class="jr-intro">' + esc(j.intro) + '</p>\n' +
    j.legs.map(l => (j.legs.length > 1 ? '<h3 class="jr-leg">' + esc(l.title) + '</h3>\n' : '') + '<ol class="jr-stops" start="' + (n + 1) + '">\n' + l.stops.map(s => { n++;
      return '<li data-ll="' + (+s.ll[0]).toFixed(3) + ',' + (+s.ll[1]).toFixed(3) + '" data-by="' + s.by + '"><span class="jr-place">' + (s.entry ? '<a href="/encyclopedia/' + s.entry + '">' + esc(s.place) + '</a>' : esc(s.place)) + '</span>' + (s.date ? ' <span class="jr-date">' + esc(s.date) + '</span>' : '') + '<p>' + esc(s.text) + '</p></li>'; }).join('\n') + '\n</ol>').join('\n') +
    '\n<p class="jr-end">' + esc(j.ending) + '</p>\n<p class="jr-src">Told after the Wikipedia article &#8220;' + esc(x.article) + '&#8221;. Places with an encyclopedia entry are linked.</p>\n</article>'; };

const P = read('privacy'), head0 = P.slice(0, P.indexOf('</head>'));
const slug = 'journeys', url = 'https://the-epoch-institute.org/' + slug, name = 'Journeys on the Globe', stops = J.reduce((a, x) => a + x.n, 0);
const NUM = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'], cnt = NUM[J.length] || String(J.length);
const title = 'Journeys on the Globe: ' + J.length + ' Great Journeys, Stop by Stop';
const desc = cnt + ' journeys drawn stop by stop on a globe: Ibn Battuta, Marco Polo, Xuanzang, Zheng He, Magellan, Alexander, the Hijra, Darwin\'s Beagle and more.';
if (desc.length > 160) throw new Error('the description has ' + desc.length + ' characters');
const h = head0
  .replace(/<title>[^<]*<\/title>/, () => '<title>' + esc(title) + '</title>')
  .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + esc(desc) + '">')
  .replace(/<link rel="canonical" href="[^"]*">/, () => '<link rel="canonical" href="' + url + '">')
  .replace(/<meta property="og:title" content="[^"]*">/, () => '<meta property="og:title" content="' + esc(name) + ' — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, () => '<meta property="og:description" content="' + esc(desc) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, () => '<meta property="og:url" content="' + url + '">')
  .replace(/<meta name="twitter:title" content="[^"]*">/, () => '<meta name="twitter:title" content="' + esc(name) + ' — The Epoch Institute">')
  .replace(/<meta name="twitter:description" content="[^"]*">/, () => '<meta name="twitter:description" content="' + esc(desc) + '">')
  .replace('href="/css/privacy.css"', 'href="/css/' + slug + '.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name }] },
    { '@type': 'CollectionPage', name, url, description: desc, publisher: { '@type': 'Organization', name: 'The Epoch Institute', url: 'https://the-epoch-institute.org/' },
      mainEntity: { '@type': 'ItemList', itemListElement: J.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.j.title, url: url + '?j=' + x.slug })) } }] }) + '</script>');
for (const [what, rx] of [['title', /<title>Journeys on the Globe: \d+ Great Journeys, Stop by Stop<\/title>/], ['canonical', /canonical" href="https:\/\/the-epoch-institute\.org\/journeys"/], ['css', /\/css\/journeys\.css/], ['description', /<meta name="description" content="[^"]{70,160}">/]])
  if (!rx.test(h)) throw new Error('/privacy\'s head has changed: make-journeys.js no longer fits it (' + what + ')');
const landV = (read('atlas').match(/globe-land\.js\?v=([0-9a-f]+)/) || [])[1]; if (!landV) throw new Error('/atlas no longer names maps/globe-land.js?v=');
const main = `<main id="main" class="ref-page jr-page" data-no-toc>
<div class="jr-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Journeys on the Globe</li></ol></nav>
<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Journeys on the Globe</h1>
<p class="ref-lede">${cnt} journeys that crossed the known world of their day, drawn stop by stop: pilgrims, merchants, fleets, armies and naturalists, ${stops} stops in all. Choose a journey, then press Play or step through it; each stop says what happened there.</p></header>
<div class="jr-eras" role="group" aria-label="Ages">${ERAS.map((e, i) => '<button type="button" data-era="' + i + '" aria-pressed="false">' + e + ' <span>' + J.filter(x => x.era === i).length + '</span></button>').join('')}</div>
<nav class="jr-pick" aria-label="Journeys">
${J.map(x => '<a href="#' + x.slug + '" data-j="' + x.slug + '" data-era="' + x.era + '" data-kids="' + (x.kids ? 1 : 0) + '"><b>' + esc(x.short) + '</b><span>' + esc(x.j.years) + '</span></a>').join('\n')}
</nav>
<div class="jr-stage">
<div class="jr-map">
<div class="jr-box"><canvas id="jr-globe" tabindex="0" role="img" aria-label="Globe: the route of the journey. The stops are listed beside it."></canvas><p id="jr-msg" class="jr-msg" hidden>Loading the globe&#8230;</p></div>
<div class="jr-ctl"><button type="button" id="jr-prev" aria-label="The stop before">&#8249; Back</button><button type="button" id="jr-play" aria-pressed="false">Play the journey</button><button type="button" id="jr-next" aria-label="The next stop">Next &#8250;</button><span class="jr-zooms"><button type="button" class="jr-zoom" data-z="out" aria-label="Zoom out">&#8722;</button><button type="button" class="jr-zoom" data-z="in" aria-label="Zoom in">+</button></span></div>
<div id="jr-now" class="jr-now" aria-live="polite"></div>
<p class="jr-how">Drag to turn the globe; pinch, or click it and scroll, to zoom. Tap a dot, or a stop in the list. A dashed line is a passage by sea.</p>
</div>
<div class="jr-list">
${J.map(art).join('\n')}
</div>
</div>
<script>(function(){var d=document,k=d.documentElement.getAttribute('data-kids')==='1',a=[].slice.call(d.querySelectorAll('.jr-j')),m=/[?&]j=([a-z0-9-]+)/.exec(location.search),w=m?m[1]:(location.hash||'').slice(1),c=null;a.forEach(function(x){if(x.id===w&&(!k||x.getAttribute('data-kids')==='1'))c=x});if(!c)c=a.filter(function(x){return !k||x.getAttribute('data-kids')==='1'})[0]||a[0];d.documentElement.classList.add('jr-js');c.classList.add('is-on');var pa=d.querySelector('.jr-pick a[data-j="'+c.id+'"]'),er=pa?pa.getAttribute('data-era'):'0';[].forEach.call(d.querySelectorAll('.jr-pick a'),function(x){if(x.getAttribute('data-era')!==er)x.classList.add('jr-off')});[].forEach.call(d.querySelectorAll('.jr-eras button'),function(x){var on=x.getAttribute('data-era')===er;if(on)x.classList.add('is-on');x.setAttribute('aria-pressed',on?'true':'false')})})()</script>
<section class="jr-about"><h2>How the journeys are told</h2>
<p>Each journey follows one Wikipedia article, named under it: the stops are the places that article treats as stages of the route, in its order, with its dates and its doubts. Where scholars question whether a traveller reached a place, the stop says so. A stop's point on the globe is the place's own, from its encyclopedia entry or from Wikidata; the lines between stops are the shortest paths on the globe, not the roads and sea lanes actually taken. Some journeys have a few more stops in their sources than are drawn here: a stage is left out when no point for the place itself could be found.</p>
<p>More to explore: <a href="/atlas">the Atlas</a>, <a href="/faiths">Faith Maps</a>, <a href="/profiles?kind=life">Great Lives</a>, <a href="/paths/">Reading Paths</a>.</p></section>
</div>
</main>

<script>var JR_GLOBE_SRC = '/maps/globe-land.js?v=${landV}';</script>
<script src="/shared-nav.js"></script>
<script>
initNav('journeys');
</script>
<script src="/journeys.js?v=${hash('journeys.js')}" defer></script>

</body>
</html>
`;
const page = h + '</head>\n<body data-nav="journeys">\n' + main;
fs.writeFileSync(process.env.JR_OUT || path.join(R, slug), page);   // JR_OUT: a preview elsewhere
console.log('Journeys on the Globe: ' + J.length + ' journeys, ' + stops + ' stops; /journeys written (' + page.length + ' bytes); ' + Object.keys(LINKS).length + ' profiles and ' + ELINKS.length + ' entries link a journey');
