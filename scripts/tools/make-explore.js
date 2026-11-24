// The hub page of each subject of the menus (24 Nov 2026, the last part of the "level the sections" plan):
// /explore/people, /explore/places, /explore/events, /explore/ideas and /explore/play. Each shows the sections of its
// subject as picture cards, the same cards as its group on Explore Everything (/research#hub-<subject>, written by
// build-pages.ps1 from $SECTIONS and $HUBGROUPS), so the two cannot drift; the head is /research's, with its stylesheet.
// build-pages.ps1 runs this after the hub block is written.
//   node scripts/tools/make-explore.js [--check]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = 'https://the-epoch-institute.org';
// subject: [h1, title (at most 70 characters), lede]
const SUBJECTS = {
  people: ['People in History', 'People in History: Lives, Ruling Houses, Quotations and Speeches', 'The people of the past, from every side: lives told in full, everyone by century and region, the ruling houses with their family trees, the peoples and their social ladders, and what was said, in quotations and great speeches.'],
  places: ['Places in History', 'Places in History: Atlas, Cities, Countries, Empires and States', 'Where history happened: the atlas of every state through time, the cities, the history of each present-day country, the empires and states with their connections, and journeys followed stop by stop on the globe.'],
  events: ['Events in History', 'Events in History: Days, Battles, Wars, Centuries and Years', 'What happened and when: every day of the year, battles with their fields in motion, the wars with their battles and treaties, the world timeline, each century and each year.'],
  ideas: ['Ideas in History', 'Ideas in History: Faiths, Governments, Ideologies, Works, Inventions', 'What people believed, argued and made: the faiths side by side and on the map, the forms of government, ideologies and movements, the great works, the inventions and the songs.'],
  play: ['Play with History', 'Play with History: Games, Quiz, Flashcards and Ancient Scripts', 'History to play: daily games and a daily quiz, flashcards, writing in ancient scripts, the race of rising and falling states, and a corner for children.'],
};
// Today's pick and "Surprise me" (24 Nov 2026): each subject's kinds of profile. The pick is one of a baked pool of sixty
// (profiles with an emblem, none marked hide in home-pictures.tsv), chosen by the UTC day in an inline script right after
// its box, so it is drawn before the first paint and the box never changes size. Surprise reads /search-profiles.js on
// the press and opens a profile of the subject's kinds; Play, which has no profiles, opens one of its own cards.
const KINDS = { people: ['life', 'culture'], places: ['city', 'polity'], events: ['battle'], ideas: ['religion', 'ideology', 'movement', 'work', 'government'], play: [] };
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, EMPIRE_INFO, PROFILE_KINDS, profileUrl, profileSpanText}')();
const HIDE = new Set(read('scripts/home-pictures.tsv').split(/\r?\n/).filter(l => /\thide\b/.test(l)).map(l => l.split('\t')[0]));
const seeded = seed => { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const poolOf = s => { const all = SD.EMPIRES.filter(e => KINDS[s].includes(e.kind || 'polity') && !HIDE.has(e.name) && SD.EMPIRE_INFO[e.name] && fs.existsSync(path.join(R, 'logos', 'thumbs', e.name + '.png')));
  // the same number from every kind of the subject, in a fixed shuffle (so a build changes the pool only when profiles do)
  const rnd = seeded(s.length * 7919 + all.length), by = KINDS[s].map(k => all.filter(e => (e.kind || 'polity') === k).map(e => [rnd(), e]).sort((a, b) => a[0] - b[0]).map(x => x[1])), out = [];
  for (let i = 0; out.length < 60 && by.some(l => l[i]); i++) for (const l of by) if (l[i] && out.length < 60) out.push(l[i]);
  return out.map(e => [e.name, SD.profileUrl(e), SD.PROFILE_KINDS[e.kind || 'polity'].single || '', SD.profileSpanText(e), String(SD.EMPIRE_INFO[e.name]).replace(/<[^>]+>/g, '')]); };
const PREFIX = { people: ['/life/', '/culture/'], places: ['/city/', '/empire/'], events: ['/battle/'], ideas: ['/religion/', '/ideology/', '/movement/', '/work/', '/government/'] };
const pickHtml = s => { const pool = KINDS[s].length ? poolOf(s) : []; if (KINDS[s].length && pool.length < 20) throw new Error(s + ': only ' + pool.length + ' profiles for today\'s pick');
  const sur = '<p class="hub-sur"><button type="button" class="profile-more" id="hub-surprise">Surprise me</button></p>\n';
  const surJs = KINDS[s].length
    ? 'var b=document.getElementById("hub-surprise"),P=' + JSON.stringify(PREFIX[s]) + ';if(b)b.addEventListener("click",function(){function go(){if(typeof SEARCH_PROFILES==="undefined")return;var a=SEARCH_PROFILES.filter(function(r){return P.some(function(p){return r[1].indexOf(p)===0})});if(a.length)location.href=a[Math.floor(Math.random()*a.length)][1]}if(typeof SEARCH_PROFILES!=="undefined")return go();var sc=document.createElement("script");sc.src=(typeof SEARCH_PROFILES_SRC!=="undefined"?SEARCH_PROFILES_SRC:"/search-profiles.js");sc.onload=go;sc.onerror=go;document.head.appendChild(sc)});'
    : 'var b=document.getElementById("hub-surprise");if(b)b.addEventListener("click",function(){var a=document.querySelectorAll("#research .hub-card[href]");if(a.length)location.href=a[Math.floor(Math.random()*a.length)].getAttribute("href")});';
  if (!pool.length) return sur + '<script>(function(){' + surJs + '})();</script>\n';
  return '<a class="hub-pick" id="hub-pick" href="' + pool[0][1] + '"><span class="hub-pick-img"></span><span class="hub-pick-t"><span class="hub-pick-k">Today&#8217;s pick</span><b class="hub-pick-n"></b><span class="hub-pick-d"></span></span></a>\n' + sur +
    '<script>(function(){var P=' + JSON.stringify(pool).replace(/</g, '\\u003c') + ',d=Math.floor(Date.now()/864e5),p=P[d%P.length],a=document.getElementById("hub-pick");if(a){a.href=p[1];' +
    'var im=document.createElement("img");im.src="/logos/thumbs/"+encodeURIComponent(p[0]).replace(/\'/g,"%27")+".png";im.alt="";im.width=64;im.height=64;a.querySelector(".hub-pick-img").appendChild(im);' +
    'a.querySelector(".hub-pick-k").textContent="Today\\u2019s pick \\u00b7 "+p[2]+(p[3]?" \\u00b7 "+p[3]:"");a.querySelector(".hub-pick-n").textContent=p[0];a.querySelector(".hub-pick-d").textContent=p[4];}' + surJs + '})();</script>\n'; };
const T = read('research'), h1 = T.indexOf('</head>'), m0 = T.indexOf('<main'), m1 = T.indexOf('</main>'); if (h1 < 0 || m0 < 0 || m1 < 0) throw new Error('/research not found');
const head0 = T.slice(0, h1), oldTitle = (head0.match(/<title>([^<]*)<\/title>/) || [])[1], oldDesc = (head0.match(/<meta name="description" content="([^"]*)">/) || [])[1];
const oldOg = (head0.match(/<meta property="og:title" content="([^"]*)">/) || [])[1];
if (!oldTitle || !oldDesc) throw new Error('title or description of /research not found');
const tail = '</main>\n\n<script src="/shared-nav.js"></script>\n<script>\ninitNav(\'research\');\n</script>\n\n</body>\n</html>\n';
const group = id => { const i = T.indexOf('<section class="hub-group" id="' + id + '"'); if (i < 0) throw new Error('no group ' + id + ' on /research'); const e = T.indexOf('</section>', i); return T.slice(i, e + 10); };
let written = 0, bad = 0; const CHECK = process.argv.includes('--check'), names = Object.keys(SUBJECTS);
for (const [s, [h, title, lede]] of Object.entries(SUBJECTS)) {
  if (title.length > 70) throw new Error('title over 70: ' + title);
  const g = group('hub-' + s), cards = (g.match(/class="hub-card"/g) || []).length; if (cards < 3) throw new Error(s + ': only ' + cards + ' cards');
  const description = lede.length <= 160 ? lede : lede.slice(0, lede.lastIndexOf(' ', 157)).replace(/[,;:]$/, '') + '.';
  const url = SITE + '/explore/' + s;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: 'Explore Everything', item: SITE + '/research' }, { '@type': 'ListItem', position: 3, name: h, item: url }] },
    { '@type': 'CollectionPage', name: title, description, url, isPartOf: { '@type': 'WebSite', name: 'The Epoch Institute', url: SITE + '/' } }] };
  let head = head0.split(oldTitle).join(esc(title)).split(oldDesc).join(esc(description));
  if (oldOg && oldOg !== oldTitle) head = head.split(oldOg).join(esc(title));
  head = head.split(SITE + '/research"').join(url + '"')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>');
  if (!head.includes('<link rel="canonical" href="' + url + '">')) throw new Error(s + ': canonical not set');
  const others = names.filter(x => x !== s).map(x => '<a href="/explore/' + x + '">' + esc(SUBJECTS[x][0].replace(/ (in|with) History$/, '')) + '</a>').join(' · ');
  // the group's own heading would repeat the h1: the cards stand right under the lede
  const body = g.replace(/<h2 class="hub-group-t">[^<]*<\/h2>/, '').replace(' id="hub-' + s + '"', ' id="hub-' + s + '-cards"');
  const main = '<main id="main" data-no-toc>\n\n<section id="research">\n  <span class="hero-ornament"></span>\n  <h1 class="research-title">' + esc(h) + '</h1>\n  <p class="research-subtitle">' + esc(lede) + '</p>\n' + pickHtml(s) +
    body + '\n  <p class="research-subtitle">Other subjects: ' + others + ' · <a href="/research">Everything on one page</a></p>\n</section>\n\n';
  const page = head + '</head>\n' + T.slice(h1 + 8, m0) + main + tail, f = path.join(R, 'explore', s);
  if (CHECK) { if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== page) { console.log('out of date: /explore/' + s); bad++; } continue; }
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const ht = path.join(R, 'explore', '.htaccess'), htText = '# Written by scripts/tools/make-explore.js: the pages in this folder are extensionless HTML.\n<FilesMatch "^[a-z0-9-]+$">\n  ForceType text/html\n</FilesMatch>\n';
  if (!fs.existsSync(ht) || fs.readFileSync(ht, 'utf8') !== htText) fs.writeFileSync(ht, htText);
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== page) { fs.writeFileSync(f, page); written++; }
  console.log(('/explore/' + s).padEnd(18) + cards + ' cards  ' + title);
}
if (CHECK) { console.log(bad ? bad + ' hub pages out of date: run node scripts/tools/make-explore.js' : 'subject hub pages up to date'); process.exit(bad ? 1 : 0); }
console.log(written + ' hub pages written');
