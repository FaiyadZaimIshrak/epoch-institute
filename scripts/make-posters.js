'use strict';
// The share posters: images/og/*.jpg, 1200x630, the pictures that Facebook, Messenger, WhatsApp, X and the rest show
// when a page of the site is shared. Drawn by scripts/posters/poster.html from the site's own data and pages:
//   profiles   images/og/<slug>.jpg            emblem, picture (home-data.js HOME_PICS), dates, rise-and-fall curve
//   days       images/og/day-<month>-<day>.jpg  the day's events and its picture (data/days)
//   countries  images/og/country-<slug>.jpg     the country lit up on its map (from the country page)
//   centuries  images/og/century-<slug>.jpg     the world map of the century, its counts and great powers
//   speeches   images/og/speech-<slug>.jpg      the key passage and the speaker's portrait
//   paths      images/og/path-<slug>.jpg        the path's pictures
//   pages      images/og/page-<name>.jpg, images/og/default.jpg   the main sections
// Usage: node scripts/make-posters.js [profiles|days|countries|centuries|speeches|paths|pages ...] [--only=a,b] [--out=dir]
// (no kind: all of them; --only: posters whose file name contains one of the words; --out: write there instead,
// for a look before replacing; --dump=file.json: write the jobs and stop, for another driver of poster.html).
// Writes a poster only when its bytes changed. Needs Node and Playwright: once,
//   npm install --prefix scripts playwright-core
// (scripts/node_modules, git-ignored; on Windows it drives the installed Edge, so no browser is downloaded).
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), opt = {};
args.filter(a => a.startsWith('--')).forEach(a => { const m = /^--([^=]+)=?(.*)$/.exec(a); opt[m[1]] = m[2] || true; });
const KINDS = args.filter(a => !a.startsWith('--'));
const OUT = opt.out ? path.resolve(opt.out) : path.join(ROOT, 'images', 'og');
const ONLY = opt.only ? String(opt.only).split(',') : null;

// ── data ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
const ctx = { console }; vm.createContext(ctx);
function load(f) { vm.runInContext(read(f).replace(/^(const|let) /mg, 'var '), ctx, { filename: f }); }
['shared-data.js', 'home-data.js', 'speeches-data.js', 'reading-paths.js', 'encyclopedia-data.js'].forEach(load);
const { EMPIRES, EMPIRE_INFO, HOME_PICS, HOME_COUNTS, SPEECHES, READING_PATHS, ENCYCLOPEDIA } = ctx;
const ENC = {}; ENCYCLOPEDIA.forEach(e => { ENC[e.slug] = e; });
const POL = JSON.parse(read('data/polities.json'));
const BYPROF = {}; POL.nodes.forEach(n => { if (n.p) BYPROF[n.p] = n; });
const exists = f => fs.existsSync(path.join(ROOT, f.replace(/^\//, '')));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function jpegSize(f) {   // [w, h] of a JPEG (its SOF marker)
  try {
    const b = fs.readFileSync(path.join(ROOT, f.replace(/^\//, '')));
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1]; if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      if ((m >= 0xC0 && m <= 0xC3) || (m >= 0xC5 && m <= 0xC7) || (m >= 0xC9 && m <= 0xCB) || (m >= 0xCD && m <= 0xCF)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  } catch (e) {}
  return null;
}
// an entry's picture: the 800 px game picture where there is one, else the encyclopedia's
function picOf(slug, top) {
  const e = ENC[slug]; if (!e || !e.img) return null;
  const big = '/images/games/' + slug + '.jpg', src = exists(big) ? big : e.img, sz = jpegSize(src);
  return { src, w: sz && sz[0], h: sz && sz[1], top, credit: creditOf(e) };
}
function creditOf(e) {
  const c = e && e.credit; if (!c) return '';
  // (some artists' names came through twice: "Unknown authorUnknown author")
  return 'Picture: ' + [String(c.artist || '').replace(/^(.{3,}?)\1$/, '$1'), c.licence].filter(Boolean).join(' · ').replace(/\s+/g, ' ');
}
const text = s => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
const grab = (html, re) => { const m = re.exec(html); return m ? m[1] : ''; };
function firstSentence(t, max) {
  const m = String(t || '').match(/^.+?[a-z0-9)’']{2}[.!?](?=\s|$)/); let s = m ? m[0] : String(t || '');
  if (max && s.length > max) s = s.slice(0, s.lastIndexOf(' ', max - 1)) + '…';
  return s;
}
const yr = y => y < 0 ? (-y) + ' BCE' : y + ' CE';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── jobs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const JOBS = { profiles: [], days: [], countries: [], centuries: [], speeches: [], paths: [], pages: [] };

// profiles kept out of the home page's featured rotation (scripts/home-pictures.tsv "hide") get no emblem on the poster
const HIDDEN = {}; read('scripts/home-pictures.tsv').split(/\r?\n/).forEach(l => { const c = l.split('\t'); if (c[2] && /\bhide\b/.test(c[2])) HIDDEN[c[0]] = 1; });
EMPIRES.forEach(e => {
  const slug = ctx.toSlug(e.name), url = ctx.profileUrl(e), html = exists(url) ? read(url.slice(1)) : '';
  const node = BYPROF[url], type = node && node.t && node.t !== 'other' ? node.t.replace(/-/g, ' ') : ctx.profileSubtype(e).toLowerCase();
  const period = text(grab(html, /Period<\/span><span class="info-stat-val">(.*?)<\/span>/)), dur = text(grab(html, /Duration<\/span><span class="info-stat-val">(.*?)<\/span>/));
  const region = text(grab(html, /<p class="profile-detail-region">(.*?)<\/p>/)) || e.region;
  const hp = HOME_PICS[e.name], pic = hp && hp.slug ? picOf(hp.slug, hp.top) : null;
  const logo = HIDDEN[e.name] ? null : ['/logos-src/' + e.name + '.png', '/logos/' + e.name + '.png'].find(exists);
  const pts = e.points || [], from = pts.length ? yr(pts[0][0]) : '', last = pts.length ? pts[pts.length - 1][0] : 0;
  const pk = e.kind && ctx.PROFILE_KINDS[e.kind];
  if (pk && !pk.chart) {
    // a religion or language: its kind and region (the page header already reads "Religion · <region>"), its span as
    // a band on the timeline of recorded history instead of a power curve
    const c = s => s ? 'c. ' : '';
    JOBS.profiles.push({ kind: 'profile', file: slug + '.jpg', name: e.name, kicker: region === e.region ? pk.single + ' · ' + region : region,
      sub: esc(period || ctx.profileSpanText(e)), tease: firstSentence(EMPIRE_INFO[e.name], 170), emblem: logo ? encodeURI(logo) : '',
      pic: pic ? { src: pic.src, w: pic.w, h: pic.h, top: pic.top } : null, points: [],
      span: [e.start, e.end == null ? 2025 : e.end, c(e.circa) + yr(e.start), e.end == null ? 'today' : c(e.endCirca) + yr(e.end)],
      url: 'the-epoch-institute.org' + url, credit: pic ? pic.credit : '' });
    return;
  }
  JOBS.profiles.push({ kind: 'profile', file: slug + '.jpg', name: e.name, kicker: region + ' · ' + type.replace(/\b\w/g, c => c.toUpperCase()),
    sub: esc(period || (from + ' – ' + yr(last))) + (dur ? ' <span style="color:#a1957f">· ' + esc(dur.replace(/yrs$/, 'years')) + '</span>' : ''),
    tease: firstSentence(EMPIRE_INFO[e.name], 170), emblem: logo ? encodeURI(logo) : '', pic: pic ? { src: pic.src, w: pic.w, h: pic.h, top: pic.top } : null,
    points: pts, from, to: last >= 2025 && node && node.e == null ? 'today' : yr(last), url: 'the-epoch-institute.org' + url, credit: pic ? pic.credit : '' });
});

fs.readdirSync(path.join(ROOT, 'data/days')).filter(f => /^\d\d-\d\d\.json$/.test(f)).sort().forEach(f => {
  const d = JSON.parse(read('data/days/' + f)), mo = +f.slice(0, 2), day = +f.slice(3, 5), title = day + ' ' + MONTHS[mo - 1];
  const slug = MONTHS[mo - 1].toLowerCase() + '-' + day, evs = d.events || [];
  const pic = d.pic ? picOf(d.pic[1]) : null, who = d.pic && ENC[d.pic[1]];
  JOBS.days.push({ kind: 'day', file: 'day-' + slug + '.jpg', title, day: String(day), month: MONTHS[mo - 1], kicker: 'On this day in history', total: evs.length,
    events: evs.slice(0, 5).map(e => ({ y: String(Math.abs(e.year)), era: e.year < 0 ? 'BCE' : '', t: e.title })),
    pic: pic && { src: pic.src, w: pic.w, h: pic.h, top: 25 }, cap: who ? esc(who.name) : '', url: 'the-epoch-institute.org/today-in-history/' + slug, credit: pic ? pic.credit : '' });
});

fs.readdirSync(path.join(ROOT, 'countries')).filter(f => /^[a-z0-9-]+$/.test(f) && f !== 'index').sort().forEach(slug => {
  const html = read('countries/' + slug), lede = text(grab(html, /<header class="ref-head cty-head">[\s\S]*?<p class="ref-lede">([\s\S]*?)<\/p>/));
  const map = grab(html, /(<svg class="map map-cty"[\s\S]*?<\/svg>)/);
  const n = (re) => { const m = re.exec(lede); return m ? m[1] : null; };
  const st = n(/^([\d,]+) recorded states?/), pr = n(/(\d+) of them (?:has|have) a full profile/) || n(/(\d+) (?:has|have) a full profile/), ru = n(/(\d+) outside powers? ruled here/);
  const stats = [st && [st, 'recorded states'], pr && [pr, pr === '1' ? 'full profile' : 'full profiles'], ru && [ru, ru === '1' ? 'power ruled here' : 'powers ruled here']].filter(Boolean);
  const range = grab(lede, /(from .*? to [^.]*?)\./) || (grab(lede, /(from [^.]*?\))\./) ? grab(lede, /(from [^.]*?\))\./) + ' onwards' : '');
  JOBS.countries.push({ kind: 'country', file: 'country-' + slug + '.jpg', title: text(grab(html, /<h1[^>]*>(.*?)<\/h1>/)), kicker: text(grab(html, /<p class="cty-kicker">(.*?)<\/p>/)),
    map, stats, tease: range ? range.charAt(0).toUpperCase() + range.slice(1) + '.' : firstSentence(lede, 160), url: 'the-epoch-institute.org/countries/' + slug });
});

fs.readdirSync(path.join(ROOT, 'centuries')).filter(f => /^[a-z0-9-]+$/.test(f) && f !== 'index').forEach(slug => {
  const html = read('centuries/' + slug), lede = text(grab(html, /<header class="ref-head cen-head">[\s\S]*?<p class="ref-lede">([\s\S]*?)<\/p>/));
  const m = /^(\d+)(?:st|nd|rd|th)-century(-bce)?$/.exec(slug), c = +m[1];
  const sub = m[2] ? (c * 100 - 1) + '–' + ((c - 1) * 100 || 1) + ' BCE' : ((c - 1) * 100 || 1) + '–' + (c * 100 - 1) + ' CE';
  const ex = /([\d,]+) recorded states existed/.exec(lede), fo = /([\d,]+) were founded/.exec(lede), en = /([\d,]+) came to an end/.exec(lede);
  const stats = [ex && [ex[1], 'states existed'], fo && [fo[1], 'were founded'], en && [en[1], 'came to an end']].filter(Boolean);
  // the great powers: the profile links of the page's powers list, as emblems
  const sec = grab(html, /(<h2 class="ref-sec-title">Great powers[\s\S]*?<\/section>)/) || '';
  const powers = [], seen = {};
  (sec.match(/href="\/empire\/[a-z0-9-]+"/g) || []).forEach(h => {
    const u = h.slice(6, -1), e = EMPIRES.find(x => ctx.profileUrl(x) === u);
    if (e && !seen[u] && powers.length < 4) { seen[u] = 1; const lg = '/logos/thumbs/' + e.name + '.png'; if (exists(lg)) powers.push(encodeURI(lg)); }
  });
  JOBS.centuries.push({ kind: 'century', file: 'century-' + slug + '.jpg', title: text(grab(html, /<h1[^>]*>(.*?)<\/h1>/)).replace(/\bcentury\b/, 'Century'), kicker: text(grab(html, /<p class="cty-kicker">(.*?)<\/p>/)),
    sub, stats, powers, map: grab(html, /(<svg class="map map-world"[\s\S]*?<\/svg>)/), url: 'the-epoch-institute.org/centuries/' + slug });
});

SPEECHES.forEach(s => {
  const pic = picOf(s.speakerSlug, 18), para = s.kind === 'paraphrase';
  JOBS.speeches.push({ kind: 'speech', file: 'speech-' + s.slug + '.jpg', kicker: 'Great speeches · ' + s.display, quote: para ? s.excerpt : s.excerpt, para,
    by: s.speaker, what: s.title, pic: pic && { src: pic.src, top: 18 }, url: 'the-epoch-institute.org/speeches/' + s.slug, credit: pic ? pic.credit : '' });
});

READING_PATHS.forEach(p => {
  const pics = [], seen = {};
  p.steps.forEach(st => { if (st.img && !seen[st.img] && pics.length < 6) { seen[st.img] = 1; pics.push({ src: st.img, top: 25 }); } });
  JOBS.paths.push({ kind: 'mosaic', file: 'path-' + p.slug + '.jpg', kicker: 'Reading path · ' + p.steps.length + ' stops', title: p.title, tease: p.tagline, pics,
    chips: p.steps.slice(0, 5).map(st => st.name.length > 30 ? st.name.slice(0, st.name.lastIndexOf(' ', 28)) + '…' : st.name),
    url: 'the-epoch-institute.org/paths/' + p.slug, credit: 'Pictures: Wikimedia Commons, credited on the page' });
});

// the main sections
const fmt = n => Number(n).toLocaleString('en-GB');
const EMB = EMPIRES.filter(e => !e.id).map(e => '/logos/thumbs/' + e.name + '.png').filter(exists).map(encodeURI);
const pick = (slugs) => slugs.map(s => picOf(s, 25)).filter(Boolean).map(p => ({ src: p.src, top: p.top }));
const GAMEPICS = fs.readdirSync(path.join(ROOT, 'images/games')).filter(f => f.endsWith('.jpg')).map(f => f.slice(0, -4));
const nStates = POL.nodes.length;
function page(name, j) { JOBS.pages.push(Object.assign({ file: name === 'default' ? 'default.jpg' : 'page-' + name + '.jpg', url: 'the-epoch-institute.org' }, j)); }
page('default', { kind: 'tiles', tiles: EMB.slice(0, 96), kicker: 'Historical & societal research', title: 'The Epoch Institute', sub: 'Histories of states, empires and civilisations',
  chips: [EMPIRES.length + ' profiles', fmt(HOME_COUNTS.entries) + ' encyclopedia entries', fmt(nStates) + ' states', '365 days in history'] });
page('profiles', { kind: 'tiles', tiles: EMB.slice(0, 96), kicker: 'Profiles', title: 'States and empires', sub: EMPIRES.length + ' profiles, from Elam to the present', chips: ['Rise and fall', 'Key events', 'Emblems', 'Sources'], url: 'the-epoch-institute.org/profiles' });
page('games', { kind: 'mosaic', pics: pick(['great-wall-of-china', 'cleopatra-vii', 'rosetta-stone', 'bayeux-tapestry', 'borobudur', 'napoleon']), kicker: 'History games', title: 'Play with the past',
  tease: 'Seven games built from real pictures and real dates, and a Daily Ten for everyone.', chips: ['Emblem Pairs', 'Order the Ages', 'Globe Hunt', 'Which Came First?', 'Picture Puzzle', 'Word Hunt', 'Guess the Year'], url: 'the-epoch-institute.org/games' });
page('quiz', { kind: 'mosaic', pics: pick(['genghis-khan', 'machu-picchu', 'mansa-musa', 'hagia-sophia', 'joan-of-arc', 'confucius']), kicker: 'History quiz', title: 'A new puzzle every day',
  tease: 'Four clues, one answer: a profile, a person, an event, a place, an idea or a work.', url: 'the-epoch-institute.org/quiz' });
page('speeches', { kind: 'mosaic', pics: pick(SPEECHES.map(s => s.speakerSlug)).filter((p, i, a) => a.findIndex(q => q.src === p.src) === i).slice(0, 6), kicker: 'Great speeches', title: 'The words that moved history',
  tease: SPEECHES.length + ' speeches from Pericles to Reagan: the setting, the key passage and what followed.', url: 'the-epoch-institute.org/speeches/' });
page('write', { kind: 'mosaic', pics: pick(['rosetta-stone', 'behistun-inscription', 'edicts-of-ashoka', 'linear-b', 'mesha-stele', 'cyrus-cylinder']), kicker: 'Write in ancient scripts', title: 'Write like a scribe',
  tease: 'Cuneiform, hieroglyphs, Linear B, runes, Brahmi and more: twelve languages of the past, every sign with its sound.', chips: ['12 languages', '18 scripts', 'Save it as a picture'], url: 'the-epoch-institute.org/write' });
page('paths', { kind: 'mosaic', pics: READING_PATHS.slice(0, 6).map(p => p.steps.find(s => s.img)).filter(Boolean).map(s => ({ src: s.img, top: 25 })), kicker: 'Reading paths', title: 'Themed routes through history',
  tease: READING_PATHS.length + ' paths through the profiles and the encyclopedia, each stop with a reason to read it.', url: 'the-epoch-institute.org/paths/' });
page('encyclopedia', { kind: 'mosaic', pics: pick(['julius-caesar', 'battle-of-hastings', 'great-pyramid-of-giza', 'confucius', 'hagia-sophia', 'joan-of-arc']), kicker: 'Encyclopedia', title: 'The Encyclopedia',
  tease: fmt(HOME_COUNTS.entries) + ' entries on the people, events, places and ideas of the past, ' + fmt(HOME_COUNTS.images) + ' of them with pictures.', url: 'the-epoch-institute.org/encyclopedia/' });
page('today', { kind: 'mosaic', pics: pick(['julius-caesar', 'storming-of-the-bastille', 'hagia-sophia', 'elizabeth-i', 'magna-carta', 'genghis-khan']), kicker: 'Today in history', title: 'On this day',
  tease: 'What happened on every day of the year, from the ancient world to the present.', chips: ['365 days', 'Anniversaries', 'International days'], url: 'the-epoch-institute.org/today-in-history/' });
const KIDSDOORS = read('scripts/kids-corner.tsv').split(/\r?\n/).filter(l => l.startsWith('@')).map(l => l.split('\t')[3]).filter(Boolean);
page('kids', { kind: 'mosaic', theme: 'kids', pics: pick(KIDSDOORS).slice(0, 6), kicker: 'Kids corner', title: 'History for young explorers',
  tease: 'Pictures, facts and games about the past, made for young readers.', chips: ['Fact of the day', 'Eight themes', 'Seven games'], url: 'the-epoch-institute.org/kids' });
const mapOf = c => (JOBS.centuries.find(j => j.file === 'century-' + c + '.jpg') || JOBS.centuries[0] || {}).map;
page('atlas', { kind: 'century', map: mapOf('16th-century'), kicker: 'The atlas', title: 'The world in any year', sub: '3500 BCE to today', stats: [[fmt(nStates), 'states'], ['5,500', 'years']], powers: [], url: 'the-epoch-institute.org/atlas' });
page('states', { kind: 'century', map: mapOf('13th-century'), kicker: 'States', title: 'Every recorded state', sub: 'Kingdoms, empires, republics and chiefdoms', stats: [[fmt(nStates), 'states'], [fmt(POL.links.length), 'relations']], powers: [], url: 'the-epoch-institute.org/state/' });
page('countries', { kind: 'century', map: mapOf('19th-century'), kicker: 'Country histories', title: 'Each land through time', sub: 'The states that rose and fell where countries are today', stats: [[String(JOBS.countries.length), 'countries']], powers: [], url: 'the-epoch-institute.org/countries/' });
page('centuries', { kind: 'century', map: mapOf('5th-century-bce'), kicker: 'Centuries', title: 'One century at a time', sub: 'From the 30th century BCE to the 21st', stats: [[String(JOBS.centuries.length), 'centuries']], powers: [], url: 'the-epoch-institute.org/centuries/' });
const CURVED = ['Achaemenid Empire', 'Roman Empire', 'Abbasid Caliphate', 'Mongol Empire', 'Ottoman Empire', 'British Empire']
  .map(n => EMPIRES.find(e => e.name === n)).filter(Boolean);
page('explorer', { kind: 'curves', lines: CURVED.map(e => ({ name: e.name, points: e.points, color: e.color || '#c9a84c' })), from: -650, to: 2020,
  ticks: [[-500, '500 BCE'], [1, '1 CE'], [500, '500'], [1000, '1000'], [1500, '1500'], [2000, '2000']],
  kicker: 'Empire explorer', title: 'Rise and fall compared', sub: 'The power curves of ' + EMPIRES.length + ' states and empires on one time line', url: 'the-epoch-institute.org/explorer' });
page('connections', { kind: 'tiles', tiles: EMB.slice(0, 96), kicker: 'Connections', title: 'The states as a network', sub: 'Who ruled, succeeded and conquered whom', url: 'the-epoch-institute.org/connections' });
page('start', { kind: 'tiles', tiles: EMB.slice(0, 96), kicker: 'Find your way in', title: 'Where should you start?', sub: 'Four questions, and reading paths that suit you', url: 'the-epoch-institute.org/start' });

// ── render ───────────────────────────────────────────────────────────────────────────────────────────────────────
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/scripts/posters/poster.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html' }); fs.createReadStream(f).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
function playwright() {   // from scripts/node_modules, else wherever Node finds it
  for (const m of ['playwright', 'playwright-core']) for (const paths of [[__dirname], null]) {
    try { return require(paths ? require.resolve(m, { paths }) : m); } catch (e) {}
  }
  throw new Error('Playwright not found: npm install --prefix scripts playwright-core');
}
async function launch() {
  const pw = playwright();
  if (process.platform === 'win32') { try { return await pw.chromium.launch({ channel: 'msedge' }); } catch (e) {} }
  return pw.chromium.launch();
}
// the same poster rasterised a hair differently (the rotated emblem fields vary by a few levels from run to run):
// every pixel within 40 of 255 of the old one, where any real change of words or picture moves some by far more
function nearlySame(pg, oldBuf, buf) {
  return pg.evaluate(async ([a, b]) => {
    const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = s; });
    const [x, y] = await Promise.all([load(a), load(b)]);
    if (x.width !== y.width || x.height !== y.height) return false;
    const c = document.createElement('canvas'); c.width = x.width; c.height = x.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(x, 0, 0); const p = g.getImageData(0, 0, c.width, c.height).data;
    g.drawImage(y, 0, 0); const q = g.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - q[i]) > 40) return false;
    return true;
  }, ['data:image/jpeg;base64,' + oldBuf.toString('base64'), 'data:image/jpeg;base64,' + buf.toString('base64')]);
}
(async () => {
  const list = (KINDS.length ? KINDS : Object.keys(JOBS)).flatMap(k => { if (!JOBS[k]) throw new Error('unknown kind ' + k); return JOBS[k]; })
    .filter(j => !ONLY || ONLY.some(w => j.file.includes(w)));
  if (opt.dump) { fs.writeFileSync(path.resolve(String(opt.dump)), JSON.stringify(list)); console.log('jobs: ' + list.length + ' → ' + opt.dump); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), browser = await launch();
  const pg = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await pg.goto('http://127.0.0.1:' + srv.address().port + '/');
  let wrote = 0, same = 0, n = 0;
  for (const job of list) {
    await pg.evaluate(j => window.render(j), job);
    const warn = await pg.evaluate(() => window.check());
    if (warn.length) console.log('  ' + job.file + ': ' + warn.join(', '));
    const buf = await pg.screenshot({ type: 'jpeg', quality: 84, animations: 'disabled' });
    const f = path.join(OUT, job.file), old = fs.existsSync(f) ? fs.readFileSync(f) : null;
    if (old && (Buffer.compare(old, buf) === 0 || await nearlySame(pg, old, buf))) same++; else { fs.writeFileSync(f, buf); wrote++; }
    if (++n % 50 === 0) console.log(n + ' / ' + list.length);
  }
  await browser.close(); srv.close();
  console.log('posters: ' + list.length + ' drawn, ' + wrote + ' written, ' + same + ' unchanged → ' + path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
