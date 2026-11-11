// Writes the hand page /advent (the Advent calendar, winter round W3, Nov 2026) from /weekly's head, so its head
// snippets (theme and look, analytics, fonts) are the site's own, and from scripts/advent.tsv:
//   day (1-24) TAB title TAB line (from the linked page's own text) TAB address (/encyclopedia/<slug> or /songs/<slug>)
// It STOPS on a day missing or twice, a line over 170 characters, or an address without a built page. A door's picture
// is its entry's (images/encyclopedia/<slug>.jpg); a song's door has none and shows a note.
//   node scripts/tools/make-advent.js
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rows = fs.readFileSync(path.join(R, 'scripts', 'advent.tsv'), 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
const doors = [];
for (const [d, title, line, href] of rows) {
  const n = +d; if (!(n >= 1 && n <= 24) || doors[n - 1]) throw new Error('advent.tsv: day ' + d + ' is missing, out of range or twice');
  if (!title || !line || line.length > 170) throw new Error('advent.tsv: day ' + d + ' needs a title and a line of at most 170 characters');
  if (!/^\/(encyclopedia|songs)\/[a-z0-9-]+$/.test(href) || !fs.existsSync(path.join(R, href.slice(1)))) throw new Error('advent.tsv: day ' + d + ': no page ' + href);
  const slug = href.split('/')[2], img = href.startsWith('/encyclopedia/') && fs.existsSync(path.join(R, 'images', 'encyclopedia', slug + '.jpg')) ? '/images/encyclopedia/' + slug + '.jpg' : '';
  doors[n - 1] = [title, line, href, img];
}
for (let i = 0; i < 24; i++) if (!doors[i]) throw new Error('advent.tsv: no day ' + (i + 1));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const W = fs.readFileSync(path.join(R, 'weekly'), 'utf8'), head = W.slice(0, W.indexOf('</head>'));
const T = 'An Advent Calendar of History', D = 'Twenty-four doors for the days of December: behind each a festival, a carol or something that happened on that day in history.';
let h = head
  .replace(/<title>[^<]*<\/title>/, '<title>' + T + ' — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(D) + '">')
  .replace('<meta name="robots" content="noindex, follow">', '<meta name="robots" content="index, follow, max-image-preview:large">')
  .replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="https://the-epoch-institute.org/advent">')
  .replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + T + ' — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(D) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="https://the-epoch-institute.org/advent">')
  .replace(/\/images\/og\/page-games\.jpg/g, '/images/og/default.jpg')
  .replace('href="/css/weekly.css"', 'href="/css/advent.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: 'Today in History', item: 'https://the-epoch-institute.org/today-in-history/' }, { '@type': 'ListItem', position: 3, name: T }] },
    { '@type': 'CollectionPage', name: T, url: 'https://the-epoch-institute.org/advent', description: D }] }) + '</script>');
if (!/href="\/css\/advent\.css"/.test(h) || !/canonical" href="https:\/\/the-epoch-institute\.org\/advent"/.test(h)) throw new Error('the head of /weekly has changed: make-advent.js no longer fits it');
const body = `</head>
<body>

<main id="main" class="wk-page adv-page ref-page">
<div class="wk-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/today-in-history/">Today in History</a></li><li aria-current="page">Advent Calendar</li></ol></nav>
<header class="ref-head">
  <span class="hero-ornament"></span>
  <h1 class="research-title">An Advent Calendar of History</h1>
  <p class="ref-lede">Twenty-four doors for the days of December. Behind each is a festival of the dark season, a carol, or something that happened on that day. A door opens on its own day and stays open.</p>
</header>

<section aria-labelledby="adv-t">
  <h2 class="ref-sec-title" id="adv-t">The doors <span class="n" id="adv-n"></span></h2>
  <p class="pass-note" id="adv-note">The calendar needs JavaScript. Without it, <a href="/today-in-history/december">December in history</a> has the month's events, festivals and songs.</p>
  <ol class="adv-grid" id="adv-grid"></ol>
  <div class="adv-detail" id="adv-detail" aria-live="polite" hidden></div>
  <p class="pass-note">Days are counted in UTC. The doors you have opened are kept in this browser only. More of the season: <a href="/today-in-history/december">December in history</a>, the essay <a href="/essays/midwinter">Midwinter</a> and the reading path <a href="/paths/the-story-of-christmas">The Story of Christmas</a>.</p>
</section>
</div>
</main>

<script src="/shared-nav.js"></script>
<script>initNav('today');</script>
<script>
(function () {
  // [title, line, address, picture] for the days 1-24 (scripts/advent.tsv through scripts/tools/make-advent.js)
  var DOORS = ${JSON.stringify(doors)};
  var now = new Date(), q = /[?&]day=(\\d+)/.exec(location.search);   // ?day=N previews the calendar as on N December
  var m = now.getUTCMonth(), d = now.getUTCDate(), year = m === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  var inDec = m === 11, after = m === 0 && d < 7, season = inDec || after;
  var upto = q ? Math.min(24, +q[1]) : inDec ? Math.min(24, d) : 24;   // out of season every door may be opened
  if (q) { inDec = true; season = true; }
  var all = {}; try { all = JSON.parse(localStorage.getItem('epoch-advent') || '{}') || {}; } catch (e) {}
  var open = Array.isArray(all[year]) ? all[year] : [];
  function save() { all = {}; all[year] = open; try { localStorage.setItem('epoch-advent', JSON.stringify(all)); } catch (e) {} }
  var grid = document.getElementById('adv-grid'), det = document.getElementById('adv-detail'), note = document.getElementById('adv-note');
  note.textContent = season ? (inDec && upto < 24 ? 'Today is ' + upto + ' December: ' + (upto === 1 ? 'the first door is' : 'doors 1 to ' + upto + ' are') + ' ready to open.' : 'Every door is ready to open.')
    : 'The calendar runs from 1 to 24 December. Out of season every door may be opened.';
  function count() { document.getElementById('adv-n').textContent = open.length + ' of 24 opened'; }
  function show(i) {
    var D = DOORS[i];
    det.innerHTML = '<p class="adv-d-day">' + (i + 1) + ' December</p><h3 class="adv-d-title">' + escHtml(D[0]) + '</h3><p class="adv-d-line">' + escHtml(D[1]) + '</p><a class="hero-cta" href="' + D[2] + '">' + (D[2].indexOf('/songs/') === 0 ? 'Hear it and read its story' : 'Read more') + ' &rarr;</a>';
    det.hidden = false;
  }
  function paint(li, i, isOpen) {
    var D = DOORS[i], b = li.firstChild;
    b.className = 'adv-door' + (isOpen ? ' is-open' : '') + (inDec && i + 1 === upto ? ' is-today' : '');
    b.setAttribute('aria-label', isOpen ? (i + 1) + ' December: ' + D[0] : i < upto ? 'Open the door of ' + (i + 1) + ' December' : (i + 1) + ' December: opens on its day');
    b.innerHTML = isOpen ? (D[3] ? '<img src="' + D[3] + '" alt="" loading="lazy">' : '<span class="adv-note-ic" aria-hidden="true">&#9834;</span>') + '<span class="adv-num">' + (i + 1) + '</span><span class="adv-name">' + escHtml(D[0]) + '</span>'
      : '<span class="adv-big">' + (i + 1) + '</span>';
  }
  DOORS.forEach(function (D, i) {
    var li = document.createElement('li'), b = document.createElement('button'); b.type = 'button'; li.appendChild(b); grid.appendChild(li);
    if (i >= upto) b.disabled = true;
    paint(li, i, open.indexOf(i + 1) >= 0);
    b.addEventListener('click', function () {
      if (open.indexOf(i + 1) < 0) { open.push(i + 1); save(); paint(li, i, true); count(); }
      show(i); det.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });
  count();
  window.epochAdvent = { doors: DOORS, upto: upto, open: open, year: year, season: season };
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(R, 'advent'), h + body);
console.log('advent written: 24 doors, ' + doors.filter(x => x[3]).length + ' with a picture');
