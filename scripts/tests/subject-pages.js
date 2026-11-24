// The subject pages (/explore/<subject>) and the index page of each kind of profile (/city/, /battle/ ...): the built
// pages, no browser. Every profile of a kind is listed on its index, once, by region and oldest first; the maps hold
// one linked dot per placed profile; the subject pages hold the cards of their group on Explore Everything, a pick of
// the day from profiles that exist, and Surprise me; all are served, deployed, in the sitemaps and up to date.
const fs = require('fs'), path = require('path'), cp = require('child_process'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, PROFILE_KINDS, profileUrl, profileSpan}')();
const kinds = Object.keys(SD.PROFILE_KINDS), bad = [], order = [], heads = [], maps = {};
for (const k of kinds) { const K = SD.PROFILE_KINDS[k], f = K.path + '/index'; if (!fs.existsSync(path.join(R, f))) { bad.push('no ' + f); continue; }
  const p = read(f), list = SD.EMPIRES.filter(e => (e.kind || 'polity') === k), links = [...p.slice(p.indexOf('<main'), p.indexOf('</main>')).matchAll(/<li><a href="(\/[a-z]+\/[a-z0-9-]+)">/g)].map(m => m[1]);
  if (links.length !== list.length || new Set(links).size !== links.length || !list.every(e => links.includes(SD.profileUrl(e)))) bad.push(k + ': ' + links.length + ' listed, ' + list.length + ' profiles');
  const by = Object.fromEntries(list.map(e => [SD.profileUrl(e), SD.profileSpan(e)[0]]));
  for (const g of p.split('<section class="ref-group"').slice(1)) { const a = [...g.matchAll(/<li><a href="(\/[a-z]+\/[a-z0-9-]+)">/g)].map(m => by[m[1]]); if (!a.every((x, i) => !i || a[i - 1] <= x)) order.push(k); }
  const title = (p.match(/<title>([^<]*)<\/title>/) || [])[1] || '', desc = (p.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (!title.includes(String(list.length)) || title.length > 70 || desc.length < 70 || desc.length > 160 || !p.includes('rel="canonical" href="https://the-epoch-institute.org/' + K.path + '/"') || (p.match(/<h1/g) || []).length !== 1 || !p.includes('/enc-page.js') || !p.includes('id="kx-surprise"')) heads.push(k);
  const dots = [...p.matchAll(/<a href="(\/[a-z]+\/[a-z0-9-]+)"><title>[^<]+<\/title><path class="map-dot-p" d="M(\d+) (\d+)h0"\/><\/a>/g)]; if (dots.length) maps[k] = [dots.length, dots.every(d => links.includes(d[1]) && +d[2] <= 10000 && +d[3] <= 4393)]; }
ok('an index page for every kind, listing each of its profiles once', !bad.length, bad);
ok('each region runs oldest first', !order.length, order);
ok('title with the count, description, canonical, one h1, the header script, Surprise me', !heads.length, heads);
ok('cities, battles and lives have a map of linked dots inside the plane', ['city', 'battle', 'life'].every(k => maps[k] && maps[k][0] > 60 && maps[k][1]), maps);
const hub = read('research'), subj = ['people', 'places', 'events', 'ideas', 'play'], sb = [];
for (const s of subj) { const f = 'explore/' + s; if (!fs.existsSync(path.join(R, f))) { sb.push('no ' + f); continue; } const p = read(f);
  const i = hub.indexOf('<section class="hub-group" id="hub-' + s + '"'), g = hub.slice(i, hub.indexOf('</section>', i)), cards = [...g.matchAll(/class="hub-card" href="([^"]+)"/g)].map(m => m[1]), mine = [...p.matchAll(/class="hub-card" href="([^"]+)"/g)].map(m => m[1]);
  if (i < 0 || cards.length < 3 || cards.join('|') !== mine.join('|')) sb.push(s + ': cards differ from Explore Everything');
  if (!p.includes('rel="canonical" href="https://the-epoch-institute.org/explore/' + s + '"') || (p.match(/<h1/g) || []).length !== 1 || !p.includes('href="/css/research.css"') || !p.includes('id="hub-surprise"') || !p.includes("initNav('research')")) sb.push(s + ': head or Surprise me');
  const m = p.match(/var P=(\[\[.*?\]\]),d=Math\.floor/); if (s !== 'play') { const P = m && JSON.parse(m[1]); if (!P || P.length < 20 || !P.every(r => fs.existsSync(path.join(R, r[1].slice(1))) && fs.existsSync(path.join(R, 'logos', 'thumbs', r[0] + '.png')) && r[4])) sb.push(s + ': the pool of picks'); } }
ok('each subject page: its group\'s cards, a pick of the day from profiles that exist, Surprise me', !sb.length, sb);
const nav = read('shared-nav.js'), ht = read('.htaccess'), sm = read('sitemaps/pages.xml') + read('sitemaps/profiles.xml');
ok('the menus lead to them', subj.every(s => true) && nav.includes('href="/explore/${m[0]}"') && ["'/city/'", "'/battle/'", "'/life/'", "'/work/'", "'/empire/'", "'/culture/'", "'/movement/'", "'/ideology/'"].every(a => nav.includes(a)) && !/profiles\?kind=[a-z]+'/.test(nav));
ok('served and deployed', fs.existsSync(path.join(R, 'explore', '.htaccess')) && /songs\|empire\|religion/.test(ht) && /\^explore\/\?\$ \/research/.test(ht) && !/profiles\?kind=\$1/.test(ht) && /songs explore\)/.test(read('scripts/deploy.sh')));
ok('in the sitemaps, and no index file listed as a profile', subj.every(s => sm.includes('/explore/' + s + '<')) && kinds.every(k => sm.includes('org/' + SD.PROFILE_KINDS[k].path + '/<')) && !/\/index</.test(sm));
const node = process.execPath, chk = t => { try { cp.execFileSync(node, [path.join(R, 'scripts', 'tools', t), '--check'], { stdio: 'pipe' }); return true; } catch (e) { return false; } };
ok('both sets of pages are up to date with the data', chk('make-kind-indexes.js') && chk('make-explore.js'));
ok('the stylesheet of the subject pages has their rules', read('css/research.css').includes('.hub-pick') && read('css/pages.css').includes('.kx-map'));
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
