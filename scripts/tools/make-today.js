// "Today at the Institute" (structure round E1, Nov 2026): writes the hand page /today from /weekly's head, as
// make-now.js does for /now, so its head snippets are the site's own. The page is filled in the browser by today.js
// (the day's events, births and song from data/days; the reader's own results of the daily quiz and games) and now.js
// (headlines, coming anniversaries). noindex like /weekly: what it shows is each reader's day, not a page to find.
//   node scripts/tools/make-today.js        (build-pages.ps1 runs it after make-now.js)
// Stamps today.js?v=, now.js?v=, data/now.json?v= and the day files' version (DAYS_V, read from index) into the page.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8'), hash = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const W = read('weekly'), head = W.slice(0, W.indexOf('</head>')), index = read('index'), now = read('now');
const DAYS = (index.match(/var DAYS_V\s*=\s*'([0-9a-f]*)'/) || [])[1], NOWV = (now.match(/\/data\/now\.json\?v=([0-9a-f]+)/) || [])[1], NOWJS = (now.match(/\/now\.js\?v=([0-9a-f]+)/) || [])[1];
if (!DAYS || !NOWV || !NOWJS) throw new Error('make-today.js: index has no DAYS_V or /now no versions (run make-now.js first)');
const T = 'Today at the Institute', D = 'The day in one place: what happened on this day, who was born, the song of the day, the daily quiz and games with your results, and history in the news.';
const h = head
  .replace(/<title>[^<]*<\/title>/, '<title>' + T + ' — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + D + '">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://the-epoch-institute.org/today">')
  .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + T + ' — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + D + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://the-epoch-institute.org/today">')
  .replace(/\/images\/og\/page-games\.jpg/g, '/images/og/default.jpg')
  .replace('href="/css/weekly.css"', 'href="/css/today.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: T }] },
    { '@type': 'WebPage', name: T, url: 'https://the-epoch-institute.org/today', description: D }] }) + '</script>');
if (!/href="\/css\/today\.css"/.test(h) || !/canonical" href="https:\/\/the-epoch-institute\.org\/today"/.test(h) || !/noindex, follow/.test(h)) throw new Error('the head of /weekly has changed: make-today.js no longer fits it');
const body = `</head>
<body>

<main id="main" class="now-page td-page ref-page" data-no-toc>
<div class="now-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li aria-current="page">Today</li></ol></nav>
<header class="ref-head">
  <span class="hero-ornament"></span>
  <h1 class="research-title">Today at the Institute</h1>
  <p class="ref-lede" id="td-date">The day in one place.</p>
</header>

<section class="now-sec" aria-labelledby="td-day-t">
  <h2 class="ref-sec-title" id="td-day-t">On this day</h2>
  <div id="td-day" class="td-day"><p class="now-note">The day&rsquo;s events need JavaScript; <a href="/today-in-history/">Today in History</a> has every day of the year.</p></div>
</section>

<section class="now-sec" aria-labelledby="td-games-t">
  <h2 class="ref-sec-title" id="td-games-t">Today&rsquo;s quiz and games <span class="n" id="td-done"></span></h2>
  <p class="now-note">The same for everyone, new each day (UTC). Your results are kept in this browser only. <span id="td-run"></span>.</p>
  <ul class="td-games" id="td-games"><li><a class="td-game" href="/games"><span class="td-game-n">History Games</span><span class="td-game-d">The daily games and the rest</span><span class="td-game-s">Play &rarr;</span></a></li></ul>
  <p class="now-note"><a href="/weekly">Your week of daily games &rarr;</a> <a href="/passport">My Passport &rarr;</a></p>
</section>

<section class="now-sec" id="td-song-sec" aria-labelledby="td-song-t">
  <h2 class="ref-sec-title" id="td-song-t">Song of the day</h2>
  <div id="td-song"></div>
</section>

<section class="now-sec" id="td-born-sec" aria-labelledby="td-born-t">
  <h2 class="ref-sec-title" id="td-born-t">Born on this day</h2>
  <ul class="td-born" id="td-born"></ul>
</section>

<section class="now-sec now-sec-news" aria-labelledby="td-news-t">
  <h2 class="ref-sec-title" id="td-news-t">In the news</h2>
  <ol class="now-list" data-now="news" data-max="3"></ol>
  <p class="now-note"><a href="/now">More headlines, each with its background &rarr;</a></p>
</section>

<section class="now-sec" aria-labelledby="td-ann-t">
  <h2 class="ref-sec-title" id="td-ann-t">Coming anniversaries</h2>
  <ol class="now-list" data-now="ann" data-max="4"></ol>
  <p class="now-note"><a href="/now#anniversaries">All of the next thirty days &rarr;</a></p>
</section>
</div>
</main>

<script src="/shared-nav.js"></script>
<script>initNav('today');</script>
<script>var TODAY_DAYS_V = '${DAYS}', NOW_SRC = '/data/now.json?v=${NOWV}';</script>
<script src="/today.js?v=${hash(read('today.js'))}"></script>
<script src="/now.js?v=${NOWJS}"></script>
</body>
</html>
`;
const page = h + body, pf = path.join(R, 'today');
if (!fs.existsSync(pf) || fs.readFileSync(pf, 'utf8') !== page) fs.writeFileSync(pf, page);
console.log('Today at the Institute: /today written (day files ' + DAYS + ')');
