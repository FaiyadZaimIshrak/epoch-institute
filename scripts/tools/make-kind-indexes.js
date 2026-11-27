// The index page of each kind of profile (24 Nov 2026, the last part of the "level the sections" plan): /empire/,
// /religion/, /language/, /culture/, /movement/, /government/, /ideology/, /work/, /life/, /city/ and /battle/ each list
// their profiles by region, oldest first, with emblem and years. Until then those addresses went to /profiles?kind=…,
// which draws its cards with a script; these are plain pages, found by search engines and readable without scripts.
// Built from the data, so they never go stale: build-pages.ps1 runs this after the entry pages (the head, header and
// footer are those of the built /encyclopedia/wars, so the snippets are the site's own).
//   node scripts/tools/make-kind-indexes.js [--check]      (re-run after profiles are added or renamed)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, REGIONS, PROFILE_KINDS, profileUrl, profileSpanText, profileSpan, toSlug}')();
const SITE = 'https://the-epoch-institute.org';
// kind: [page title (at most 70 characters with the count), h1, what the page lists, what each profile holds]
const KINDS = {
  polity: ['Empires and States: {n} Profiles by Region', 'Empires and States', 'empires, kingdoms, republics and other states',
    'its foundation, economy, army, government, its impact and its fall, with a curve of its power through the years'],
  religion: ['Religions in History: {n} Profiles by Region', 'Religions', 'religions, living and ended',
    'its origins, beliefs, scriptures, spread and communities, with a map of its spread century by century'],
  language: ['Languages in History: {n} Profiles by Region', 'Languages', 'languages of history',
    'its origins, its script and sounds, the works written in it and where it is spoken'],
  culture: ['Cultures and Peoples: {n} Profiles by Region', 'Cultures and Peoples', 'cultures and peoples, from the first farmers to living nations',
    'its origins, society, beliefs, arts, exchange and legacy'],
  movement: ['Movements in History: {n} Profiles by Region', 'Movements', 'movements that set out to change their world',
    'its background, aims, events, people and outcomes'],
  government: ['Forms of Government: {n} Profiles', 'Forms of Government', 'forms of government',
    'how it works, where it began, its record through history, and the arguments for and against it'],
  ideology: ['Ideologies in History: {n} Profiles by Region', 'Ideologies', 'political and social ideologies',
    'its origins, core ideas, spread, record in power and the critics\' arguments'],
  work: ['Great Works: {n} Books, Buildings and Works of Art', 'Great Works', 'great works of writing, building and art',
    'how it was made, what it holds, how it was received and how it survived'],
  life: ['Great Lives: {n} Lives Told in Full, by Region', 'Great Lives', 'lives told in full',
    'the early life, the rise, the deeds, the opponents and critics, the last years and the legacy'],
  city: ['Cities in History: {n} Profiles by Region', 'Cities', 'cities, living and ruined',
    'its origins, its great ages, who ruled it, life in the city, its sieges and disasters'],
  battle: ['Battles in History: {n} Battles with Their Fields in Motion', 'Battles', 'battles',
    'the two sides, how it went and what followed, with a moving plan of the field'],
};
const T = read('encyclopedia/wars'), h1 = T.indexOf('</head>'), m0 = T.indexOf('<main'), m1 = T.indexOf('</main>');
if (h1 < 0 || m0 < 0 || m1 < 0) throw new Error('encyclopedia/wars is not built');
const head0 = T.slice(0, h1), tail = T.slice(m1);   // with enc-page.js, which draws the header from body[data-nav]
const oldTitle = (head0.match(/<title>([^<]*)<\/title>/) || [])[1], oldDesc = (head0.match(/<meta name="description" content="([^"]*)">/) || [])[1];
if (!oldTitle || !oldDesc) throw new Error('title or description of the template not found');
const regSlug = r => SD.toSlug(r.replace(/&/g, 'and'));
const thumb = e => { const f = path.join(R, 'logos', 'thumbs', e.name + '.png'); return fs.existsSync(f) ? '<img src="/logos/thumbs/' + encodeURIComponent(e.name).replace(/'/g, '%27') + '.png" alt="" loading="lazy" width="44" height="44">' : '<span class="ph ph-place" aria-hidden="true"></span>'; };
// A world map of dots for the kinds whose profiles have a place: a city's and a battle's own entry (entry-coords.tsv),
// a life's birthplace (entry-places.tsv). The world as two globes, as build-pages.ps1 W2XY draws it (maps/globes/west.svg centred
// on 115 W, east.svg on 65 E; each disc has a radius of 4900 in a square of 10000, the eastern one 10400 further right).
const LINKS = new Function(read('encyclopedia-links.js') + ';return ENC_LINKS')();
const COORD = {}, BORN = {};
for (const l of read('scripts/entry-coords.tsv').split(/\r?\n/)) { const p = l.split('\t'); if (p.length >= 3 && !l.startsWith('#') && p[1] !== '' && isFinite(+p[1]) && isFinite(+p[2])) COORD[p[0]] = [+p[1], +p[2]]; }
for (const l of read('scripts/entry-places.tsv').split(/\r?\n/)) { const p = l.split('\t'); if (p[1] === 'b' && p[4] && p[5] && isFinite(+p[4]) && isFinite(+p[5])) BORN[p[0]] = [+p[4], +p[5]]; }
const EE = (lng, lat) => { const D = Math.PI / 180, east = Math.cos((lng - 65) * D) >= 0, l = (lng - (east ? 65 : -115)) * D, p = lat * D;
  return [Math.round((east ? 15400 : 5000) + 4900 * Math.cos(p) * Math.sin(l)), Math.round(5000 - 4900 * Math.sin(p))]; };
const MAPS = { city: [COORD, 'Where the cities stand', 'each dot is a city: choose one to open its profile'], battle: [COORD, 'Where the battles were fought', 'each dot is a battle: choose one to open its profile'], life: [BORN, 'Where they were born', 'each dot is a birthplace, as Wikidata records it: choose one to open the life'] };
const mapOf = (kind, list, h) => { const M = MAPS[kind]; if (!M) return ''; const pts = [];
  for (const e of list) { const s = LINKS.self[e.name], c = s && M[0][s]; if (!c) continue; const q = EE(c[1], c[0]); pts.push([e, q]); }
  if (pts.length < list.length / 2) return '';
  return '<figure class="cen-map kx-map"><svg class="map map-world map-globes" viewBox="0 0 20400 10000" role="group" aria-label="The world as two globes: ' + esc(M[1].toLowerCase()) + '"><image href="/maps/globes/west.svg" x="0" y="0" width="10000" height="10000"/><image href="/maps/globes/east.svg" x="10400" y="0" width="10000" height="10000"/>' +
    '<path class="map-dot-bg" d="' + pts.map(p => 'M' + p[1][0] + ' ' + p[1][1] + 'h0').join('') + '"/>' +
    pts.map(p => '<a href="' + SD.profileUrl(p[0]) + '"><title>' + esc(p[0].name) + '</title><path class="map-dot-p" d="M' + p[1][0] + ' ' + p[1][1] + 'h0"/></a>').join('') +
    '</svg><figcaption>' + esc(M[1]) + ': ' + pts.length + ' of the ' + list.length + ' ' + esc(h.toLowerCase()) + '; ' + esc(M[2]) + '.</figcaption></figure>\n'; };
// "Surprise me": one of the page's own profiles
const SURPRISE = '<p class="profile-more-row kx-sur"><button type="button" class="profile-more" id="kx-surprise">Surprise me</button></p>\n';
const SURJS = '<script>(function(){var b=document.getElementById("kx-surprise");if(!b)return;b.addEventListener("click",function(){var a=document.querySelectorAll("main .enc-seealso a[href]");if(a.length)location.href=a[Math.floor(Math.random()*a.length)].getAttribute("href")})})();</script>\n';
let written = 0, bad = 0; const CHECK = process.argv.includes('--check');
for (const [kind, [title0, h, what, holds]] of Object.entries(KINDS)) {
  const K = SD.PROFILE_KINDS[kind]; if (!K) throw new Error('no kind ' + kind);
  const list = SD.EMPIRES.filter(e => (e.kind || 'polity') === kind), n = list.length; if (!n) throw new Error('no profiles of kind ' + kind);
  const title = title0.replace('{n}', n); if (title.length > 70) throw new Error('title over 70: ' + title);
  const regions = SD.REGIONS.filter(r => list.some(e => e.region === r)); const other = list.filter(e => !SD.REGIONS.includes(e.region)); if (other.length) throw new Error(kind + ': region not in REGIONS: ' + other[0].name);
  const oldest = list.slice().sort((a, b) => SD.profileSpan(a)[0] - SD.profileSpan(b)[0]);
  const desc = (n + ' ' + what + ' profiled by The Epoch Institute, by region and oldest first, from ' + oldest[0].name + ' to ' + oldest[n - 1].name + '. Each gives ' + holds.split(',')[0] + ' and more.');
  const description = desc.length <= 160 ? desc : (n + ' ' + what + ' profiled by The Epoch Institute, by region and oldest first, from ' + oldest[0].name + ' to ' + oldest[n - 1].name + '.').slice(0, 160);
  if (description.length > 160 || description.length < 70) throw new Error(kind + ': description length ' + description.length);
  const url = SITE + '/' + K.path + '/';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Profiles', item: SITE + '/profiles' }, { '@type': 'ListItem', position: 3, name: h, item: url }] },
    { '@type': 'CollectionPage', name: title, description, url, isPartOf: { '@type': 'WebSite', name: 'The Epoch Institute', url: SITE + '/' } }] };
  let head = head0.split(esc(oldTitle)).join(esc(title)).split(oldTitle).join(esc(title)).split(oldDesc).join(esc(description))
    .split(SITE + '/encyclopedia/wars').join(url)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>');
  if (head.includes('Wars of History') || !head.includes('<link rel="canonical" href="' + url + '">')) throw new Error(kind + ': the head still holds the template\'s words');
  const groups = regions.map(r => { const g = list.filter(e => e.region === r).sort((a, b) => SD.profileSpan(a)[0] - SD.profileSpan(b)[0] || a.name.localeCompare(b.name));
    return '<section class="ref-group" id="' + regSlug(r) + '"><h2>' + esc(r) + ' <span class="n">' + g.length + '</span></h2><ul class="enc-seealso">' +
      g.map(e => '<li><a href="' + SD.profileUrl(e) + '">' + thumb(e) + '<span><span class="nm">' + esc(e.name) + '</span><span class="tp">' + esc(SD.profileSpanText(e)) + '</span></span></a></li>').join('') + '</ul></section>'; });
  const main = '<main id="main" class="enc-page ref-page">\n<div class="enc-wrap">\n' +
    '<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/profiles">Profiles</a></li><li aria-current="page">' + esc(h) + '</li></ol></nav>\n' +
    '<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">' + esc(h) + '</h1><p class="ref-lede">' + n + ' ' + esc(what) + ', region by region and oldest first. Each profile gives ' + esc(holds) + '. To see them as cards, on a timeline or with filters, open <a href="/profiles?kind=' + (kind === 'polity' ? 'polity' : kind) + '">All Profiles</a>.</p></header>\n' +
    SURPRISE + mapOf(kind, list, h) +
    (regions.length > 1 ? '<nav class="ref-letters hs-regions" aria-label="Regions">' + regions.map(r => '<a href="#' + regSlug(r) + '">' + esc(r) + '</a>').join('') + '</nav>\n' : '') +
    groups.join('\n') + '\n' +
    // every index links the others in the page itself: the menus are drawn in script, and four of these pages had no
    // static link from anywhere (the SEO audit of 26 Nov 2026)
    '<p class="ref-note kx-others">Other profiles: ' + Object.entries(KINDS).filter(o => o[0] !== kind).map(o => '<a href="/' + SD.PROFILE_KINDS[o[0]].path + '/">' + esc(o[1][1]) + '</a>').join(' · ') + '.</p>\n</div>\n' + SURJS;
  const page = head + '</head>\n<body data-nav="profiles">\n\n\n' + main + tail, f = path.join(R, K.path, 'index');
  if (CHECK) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== page) { console.log('out of date: /' + K.path + '/'); bad++; } continue; }
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== page) { fs.writeFileSync(f, page); written++; }
  console.log(('/' + K.path + '/').padEnd(14) + String(n).padStart(4) + '  ' + title);
}
if (CHECK) { console.log(bad ? bad + ' index pages out of date: run node scripts/tools/make-kind-indexes.js' : 'kind index pages up to date'); process.exit(bad ? 1 : 0); }
console.log(written + ' index pages written');
