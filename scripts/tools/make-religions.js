// Writes the hand page /religions, "Faiths Side by Side" (22 Nov 2026, E2 of the editorial round): every religion
// profile in one table, oldest first, the living faiths before those no longer practised: where and when it began,
// its founder or early teachers, its scriptures, its followers today (each the profile's own fact, EMPIRE_FACTS), the
// Great Lives and Great Works that belong to it (scripts/faiths-side.tsv) and its faith map. On phones each row is a
// card. Built from the data, so it never goes stale: build-pages.ps1 runs it before the sitemaps; the head is
// /privacy's, so its snippets are the site's own.
//   node scripts/tools/make-religions.js      (re-run after the religions' facts, the lives or the works change)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ev = (f, names) => new Function(read(f).replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {' + names + '}')();
const SD = ev('shared-data.js', 'EMPIRES, profileUrl, profileSpanText, toSlug'), FACTS = ev('empire-facts.js', 'EMPIRE_FACTS').EMPIRE_FACTS;
const byName = {}; for (const e of SD.EMPIRES) byName[e.name] = e;
const rel = SD.EMPIRES.filter(e => e.kind === 'religion');
const side = {}; for (const l of read('scripts/faiths-side.tsv').split(/\r?\n/)) { if (!l.trim() || l[0] === '#') continue; const [r, lives, works] = l.split('\t');
  if (!byName[r] || byName[r].kind !== 'religion') throw new Error('faiths-side.tsv: no religion ' + r);
  const list = (s, kind) => (s || '-').trim() === '-' ? [] : s.split(';').map(x => x.trim()).filter(Boolean).map(n => { if (!byName[n] || byName[n].kind !== kind) throw new Error('faiths-side.tsv: ' + n + ' is no ' + kind + ' profile (' + r + ')'); return n; });
  side[r] = { lives: list(lives, 'life'), works: list(works, 'work') }; }
const living = rel.filter(e => e.end == null).sort((a, b) => a.start - b.start), ended = rel.filter(e => e.end != null).sort((a, b) => a.start - b.start);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const links = (label, names) => names.length ? '<span class="fs-more"><span class="fs-more-l">' + label + '</span> ' + names.map(n => '<a href="' + SD.profileUrl(byName[n]) + '">' + esc(n) + '</a>').join(' · ') + '</span>' : '';
const row = e => { const f = FACTS[e.name] || {}, s = side[e.name] || { lives: [], works: [] }, slug = SD.toSlug(e.name), map = fs.existsSync(path.join(R, 'data', 'faiths', slug + '.json'));
  for (const k of ['origin', 'founder', 'scriptures', 'followers']) if (!f[k]) throw new Error(e.name + ': no fact ' + k);
  return '<tr data-live="' + (e.end == null ? 1 : 0) + '"><th scope="row"><a class="fs-name" href="' + SD.profileUrl(e) + '"><img src="/logos/thumbs/' + encodeURIComponent(e.name).replace(/'/g, '%27') + '.png" alt="" width="44" height="44" loading="lazy">' + esc(e.name) + '</a>' +
    '<span class="fs-span">' + esc(SD.profileSpanText(e)) + '</span><span class="fs-reg">' + esc(e.region) + '</span></th>' +
    '<td data-l="Began">' + esc(cap(f.origin)) + '</td>' +
    '<td data-l="Founder or early teachers">' + esc(cap(f.founder)) + links('Great lives:', s.lives) + '</td>' +
    '<td data-l="Scriptures">' + esc(cap(f.scriptures)) + links('Great works:', s.works) + '</td>' +
    '<td data-l="Followers today">' + esc(cap(f.followers)) + '</td>' +
    '<td data-l="Spread">' + (map ? '<a class="fs-map" href="/faiths?faith=' + slug + '">Map of its spread&nbsp;&rarr;</a>' : '<span class="fs-none">No map yet</span>') + '</td></tr>'; };
const group = (label, list) => '<tr class="fs-g"><th scope="rowgroup" colspan="6">' + label + ' <span class="n">' + list.length + '</span></th></tr>' + list.map(row).join('\n');

const P = read('privacy'), head0 = P.slice(0, P.indexOf('</head>')), foot = `</main>

<script src="/shared-nav.js"></script>
<script>
initNav('religions');
</script>

</body>
</html>
`;
const slug = 'religions', url = 'https://the-epoch-institute.org/' + slug, name = 'Faiths Side by Side';
const title = 'Faiths Side by Side: ' + rel.length + ' Religions Compared';
const desc = rel.length + ' religions in one table: where and when each began, its founder, scriptures and followers today, with the lives and sacred texts behind them.';
const h = head0
  .replace(/<title>[^<]*<\/title>/, () => '<title>' + esc(title) + ' — The Epoch Institute</title>')
  .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + esc(desc) + '">')
  .replace(/<link rel="canonical" href="[^"]*">/, () => '<link rel="canonical" href="' + url + '">')
  .replace(/<meta property="og:title" content="[^"]*">/, () => '<meta property="og:title" content="' + esc(name) + ' — The Epoch Institute">')
  .replace(/<meta property="og:description" content="[^"]*">/, () => '<meta property="og:description" content="' + esc(desc) + '">')
  .replace(/<meta property="og:url" content="[^"]*">/, () => '<meta property="og:url" content="' + url + '">')
  .replace(/<meta name="twitter:title" content="[^"]*">/, () => '<meta name="twitter:title" content="' + esc(name) + ' — The Epoch Institute">')
  .replace(/<meta name="twitter:description" content="[^"]*">/, () => '<meta name="twitter:description" content="' + esc(desc) + '">')
  .replace('href="/css/privacy.css"', 'href="/css/' + slug + '.css"')
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name: 'Profiles', item: 'https://the-epoch-institute.org/profiles' }, { '@type': 'ListItem', position: 3, name }] },
    { '@type': 'CollectionPage', name, url, description: desc, publisher: { '@type': 'Organization', name: 'The Epoch Institute', url: 'https://the-epoch-institute.org/' } }] }) + '</script>');
for (const [what, rx] of [['title', /<title>Faiths Side by Side: \d+ Religions Compared — The Epoch Institute<\/title>/], ['canonical', /canonical" href="https:\/\/the-epoch-institute\.org\/religions"/], ['css', /\/css\/religions\.css/], ['description', /<meta name="description" content="[^"]{70,160}">/]])
  if (!rx.test(h)) throw new Error('/privacy\'s head has changed: make-religions.js no longer fits it (' + what + ')');
const main = `<main id="main" class="ref-page fs-page" data-no-toc>
<div class="fs-wrap">
<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/profiles?kind=religion">Religions</a></li><li aria-current="page">Faiths Side by Side</li></ol></nav>
<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">Faiths Side by Side</h1>
<p class="ref-lede">The ${rel.length} religions the Institute profiles, set beside one another: where and when each began, who founded or first taught it, what it holds sacred in writing, and who follows it today. Each line is the short answer; the profile behind it tells the faith as its followers hold it and as historians describe it. The order is by age, and says nothing of rank.</p></header>
<div class="fs-bar" role="group" aria-label="Show">
  <button type="button" class="fs-f is-on" data-f="all" aria-pressed="true">All ${rel.length}</button>
  <button type="button" class="fs-f" data-f="1" aria-pressed="false">Practised today <span class="n">${living.length}</span></button>
  <button type="button" class="fs-f" data-f="0" aria-pressed="false">No longer practised <span class="n">${ended.length}</span></button>
  <a class="fs-cmp" href="/compare">Compare any two in full&nbsp;&rarr;</a>
</div>
<div class="fs-tablewrap"><table class="fs-table">
<caption class="sr-only">The religions compared: beginnings, founders, scriptures, followers and spread</caption>
<thead><tr><th scope="col">Faith</th><th scope="col">Began</th><th scope="col">Founder or early teachers</th><th scope="col">Scriptures</th><th scope="col">Followers today</th><th scope="col">Spread</th></tr></thead>
<tbody id="fs-live">
${group('Practised today', living)}
</tbody>
<tbody id="fs-ended">
${group('No longer practised', ended)}
</tbody>
</table></div>
<p class="fs-note">Dates of beginning are those each profile gives, many of them approximate or traditional. Followers are counted as the profile's sources count them. <a href="/faiths">Faith Maps</a> shows the spread of each faith on a globe; <a href="/profiles?kind=life">Great Lives</a> and <a href="/profiles?kind=work">Great Works</a> hold the founders and the texts.</p>
</div>
<script>
(function () {
  var bs = document.querySelectorAll('.fs-f'), rows = document.querySelectorAll('.fs-table tbody tr[data-live]'), gs = document.querySelectorAll('.fs-table tbody');
  function show(f) {
    for (var i = 0; i < rows.length; i++) rows[i].hidden = f !== 'all' && rows[i].getAttribute('data-live') !== f;
    for (var j = 0; j < gs.length; j++) gs[j].hidden = f !== 'all' && !gs[j].querySelector('tr[data-live="' + f + '"]');
    for (var k = 0; k < bs.length; k++) { var on = bs[k].getAttribute('data-f') === f; bs[k].classList.toggle('is-on', on); bs[k].setAttribute('aria-pressed', on ? 'true' : 'false'); }
  }
  for (var k = 0; k < bs.length; k++) bs[k].addEventListener('click', function () { show(this.getAttribute('data-f')); });
  // on phones a card opens on its beginnings; the rest unfolds (the styles act below 860 px only)
  var tb = document.querySelector('.fs-table'); if (!tb) return; tb.classList.add('fs-js');
  for (var r = 0; r < rows.length; r++) (function (tr) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-open'; b.setAttribute('aria-expanded', 'false'); b.textContent = 'Founder, scriptures, followers';
    b.addEventListener('click', function () { var on = !tr.classList.contains('is-open'); tr.classList.toggle('is-open', on); b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.textContent = on ? 'Show less' : 'Founder, scriptures, followers'; });
    tr.appendChild(document.createElement('td')).className = 'fs-openc'; tr.lastChild.appendChild(b);
  })(rows[r]);
})();
</script>`;
const out = h + '</head>\n<body data-nav="religions">\n' + main + '\n' + foot;
fs.writeFileSync(path.join(R, slug), out);
console.log('/' + slug + ': ' + rel.length + ' religions (' + living.length + ' practised today, ' + ended.length + ' ended), ' + Object.keys(side).length + ' with lives or works, ' + Math.round(out.length / 1024) + ' KB');
