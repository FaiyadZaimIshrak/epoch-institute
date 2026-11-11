// History Now (winter round W4, Nov 2026): the hand page /now and data/now.json for it and the home page's Now card.
//   node scripts/tools/make-now.js          (build-pages.ps1 runs it after the day pages and What's new)
// data/now.json {a: [[yyyy-mm-dd, years, the year as shown, text, address, kind e event | b born | d died, weight 1-3]],
//                n: [[yyyy-mm-dd, title, address]]}
//   a: the round anniversaries of every day from the first of this month for 400 days (so the file changes once a
//      month, not daily; the page shows the next thirty days): events of data/days whose age that year is a multiple
//      of 100 (weight 3), of 50 (2) or, up to 300 years, of 25 and, under 100, of 10 (1), two a day at most; and the births and deaths of
//      scripts/day-people.tsv by the same rule for the best-known people (search-index.js weight 5 or more), one a
//      day. No year 0: 44 BCE to 2026 is 2,069 years. 29 February has no day page and is left out.
//   n: the six newest release notes of scripts/whats-new.tsv with their first link (else /new).
// The page takes its head from /weekly, so its snippets (theme and look, analytics, fonts) are the site's own; the
// sources named under "In the news" are scripts/news/feeds.tsv (the headlines themselves come from /feeds/news.json,
// written by .github/workflows/news.yml, never by a build). It stamps now.json's and now.js's ?v= into /now and index.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8'), rows = f => read(f).split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const IDX = new Function(read('search-index.js') + '; return SEARCH_INDEX;')(), who = {}; for (const r of IDX) if (r[2] === 'person') who[r[0]] = [r[1], r[4] || 0];
const people = {}; for (const [k, bd, y, slug] of rows('scripts/day-people.tsv')) if (who[slug] && who[slug][1] >= 5) (people[k] = people[k] || []).push([bd, +y, slug]);
const round = n => n < 20 ? 0 : n % 100 === 0 ? 3 : n % 50 === 0 ? 2 : (n % 25 === 0 && n <= 300) || (n % 10 === 0 && n < 100) ? 1 : 0;
const now = new Date(), start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1), A = [];
for (let i = 0; i < 400; i++) {
  const d = new Date(start + i * 864e5), Y = d.getUTCFullYear(), k = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'), iso = d.toISOString().slice(0, 10);
  const f = path.join(R, 'data', 'days', k + '.json'); if (!fs.existsSync(f)) continue;
  const page = '/today-in-history/' + MONTHS[d.getUTCMonth()] + '-' + d.getUTCDate(); if (!fs.existsSync(path.join(R, page.slice(1)))) continue;
  const ago = y => Y - y - (y < 0 ? 1 : 0);
  const ev = JSON.parse(fs.readFileSync(f, 'utf8')).events.map(e => [round(ago(e.year)), e]).filter(x => x[0]).sort((a, b) => b[0] - a[0] || a[1].year - b[1].year).slice(0, 2);
  for (const [w, e] of ev) A.push([iso, ago(e.year), e.yearDisplay, e.title, page, 'e', w]);
  const pp = (people[k] || []).map(p => [round(ago(p[1])), p]).filter(x => x[0]).sort((a, b) => b[0] - a[0] || who[b[1][2]][1] - who[a[1][2]][1]).slice(0, 1);
  for (const [w, p] of pp) if (!ev.some(x => x[1].title.includes(who[p[2]][0]))) A.push([iso, ago(p[1]), (p[1] < 0 ? -p[1] + ' BCE' : String(p[1])), who[p[2]][0], '/encyclopedia/' + p[2], p[0], w]);
}
const notes = rows('scripts/whats-new.tsv').filter(c => c.length >= 3).map(c => { const l = (c[3] || '').split(' ; ').map(x => x.split('|')).filter(x => x.length === 2 && x[1].trim().startsWith('/')).map(x => [x[0].trim(), x[1].trim()]); return { d: c[0], t: c[1], s: c[2], l }; });
const N = notes.slice(0, 6).map(n => [n.d, n.t, n.l.length ? n.l[0][1] : '/new']);
const json = JSON.stringify({ a: A, n: N }) + '\n', jf = path.join(R, 'data', 'now.json');
if (!fs.existsSync(jf) || fs.readFileSync(jf, 'utf8') !== json) fs.writeFileSync(jf, json);
const hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10), VJ = hash(json), VS = hash(read('now.js'));

// ── the page ───────────────────────────────────────────────────────────────────────────────────────────────────
const W = read('weekly'), head = W.slice(0, W.indexOf('</head>'));
const T = 'History Now: In the News, Coming Anniversaries, What Is New', D = 'History and archaeology in the news, each headline beside its background at the Institute; the round anniversaries of the next thirty days; what is new.';
const h = head
  .replace(/<title>[^<]*<\/title>/, '<title>' + T + ' — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(D) + '">')
  .replace('<meta name="robots" content="noindex, follow">', '<meta name="robots" content="index, follow, max-image-preview:large">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://the-epoch-institute.org/now">')
  .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="History Now — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(D) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://the-epoch-institute.org/now">')
  .replace(/\/images\/og\/page-games\.jpg/g, '/images/og/default.jpg')
  .replace('href="/css/weekly.css"', 'href="/css/now.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: 'History Now' }] },
    { '@type': 'CollectionPage', name: 'History Now', url: 'https://the-epoch-institute.org/now', description: D }] }) + '</script>');
if (!/href="\/css\/now\.css"/.test(h) || !/canonical" href="https:\/\/the-epoch-institute\.org\/now"/.test(h) || !/index, follow/.test(h)) throw new Error('the head of /weekly has changed: make-now.js no longer fits it');
const feeds = rows('scripts/news/feeds.tsv');
const long = iso => { const p = iso.split('-'); return +p[2] + ' ' + cap(MONTHS[+p[1] - 1]) + ' ' + p[0]; };
const body = `</head>
<body>

<main id="main" class="now-page ref-page">
<div class="now-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">History Now</li></ol></nav>
<header class="ref-head">
  <span class="hero-ornament"></span>
  <h1 class="research-title">History Now</h1>
  <p class="ref-lede">What is being found and written about the past this week, the round anniversaries of the next thirty days, and what is new at the Institute.</p>
</header>

<section class="now-sec now-sec-news" id="news" aria-labelledby="now-news-t">
  <h2 class="ref-sec-title" id="now-news-t">In the news</h2>
  <p class="now-note">Headlines from other publications, newest first, each with the Institute&rsquo;s page on its subject. The headlines and the articles belong to their publishers: the Institute has not written or checked them. The list is refreshed twice a day.</p>
  <ol class="now-list" data-now="news" data-max="10"><li class="now-wait">The headlines need JavaScript.</li></ol>
  <p class="now-note now-src">From the news pages of ${feeds.map(f => '<a href="' + esc(f[1]) + '" rel="noopener">' + esc(f[0]) + '</a>').join(', ')}. A headline is listed only when it names a page of the Institute.</p>
</section>

<section class="now-sec" id="anniversaries" aria-labelledby="now-ann-t">
  <h2 class="ref-sec-title" id="now-ann-t">Coming anniversaries</h2>
  <p class="now-note">Round anniversaries in the next thirty days: centuries, half-centuries, quarter-centuries of the last three hundred years and the decades of the last hundred. Every day has its own page in <a href="/today-in-history/">Today in History</a>.</p>
  <ol class="now-list" data-now="ann" data-max="40"><li class="now-wait">The anniversaries need JavaScript.</li></ol>
</section>

<section class="now-sec" id="new" aria-labelledby="now-new-t">
  <h2 class="ref-sec-title" id="now-new-t">New at the Institute</h2>
  <ol class="wn-list">
${notes.slice(0, 6).map(n => '    <li class="wn-note"><p class="wn-d"><time datetime="' + n.d + '">' + long(n.d) + '</time></p><h3 class="wn-t">' + esc(n.t) + '</h3><p class="wn-s">' + esc(n.s) + '</p>' + (n.l.length ? '<p class="wn-links">' + n.l.map(l => '<a href="' + esc(l[1]) + '">' + esc(l[0]) + '</a>').join(' ') + '</p>' : '') + '</li>').join('\n')}
  </ol>
  <p class="now-note"><a href="/new">Everything that is new, and every page added in the last thirty days &rarr;</a></p>
</section>
</div>
</main>

<script src="/shared-nav.js"></script>
<script>initNav('today');</script>
<script>var NOW_SRC = '/data/now.json?v=${VJ}';</script>
<script src="/now.js?v=${VS}"></script>
</body>
</html>
`;
const page = h + body, pf = path.join(R, 'now');
if (!fs.existsSync(pf) || fs.readFileSync(pf, 'utf8') !== page) fs.writeFileSync(pf, page);
// the home page's card: the same two addresses
const ip = path.join(R, 'index'), i0 = fs.readFileSync(ip, 'utf8'), i1 = i0.replace(/\/data\/now\.json\?v=[0-9a-f]*/, '/data/now.json?v=' + VJ).replace(/\/now\.js\?v=[0-9a-f]*/, '/now.js?v=' + VS);
if (i1 !== i0) fs.writeFileSync(ip, i1);
const soon = A.filter(a => a[0] >= now.toISOString().slice(0, 10) && Date.parse(a[0]) < Date.now() + 30 * 864e5);
console.log('History Now: ' + A.length + ' anniversaries in 400 days (' + soon.length + ' in the next 30), ' + N.length + ' notes, ' + Math.round(json.length / 1024) + ' KB');
if (process.argv.includes('--show')) for (const a of soon) console.log('  ' + a[0] + '  ' + String(a[1]).padStart(5) + '  ' + a[5] + a[6] + '  ' + a[3].slice(0, 90));
