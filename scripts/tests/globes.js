// Every map is a globe (27 Nov 2026; the user: "All maps in the spherical or globe format, no flat maps"). The built
// pages, no browser: no page draws over the flat world picture or in its plane; world maps are two hemispheres whose
// dots lie on their discs; a locator's dot lies near the middle of its globe; a country's map carries its globe's
// middle and radius; every globe picture a page names exists; the three globe pages offer no flat view.
const fs = require('fs'), path = require('path'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const ls = d => fs.readdirSync(path.join(R, d)).filter(f => !/\./.test(f)).map(f => d + '/' + f);
const sample = (a, n) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0);
const pages = ['index', 'atlas', 'faiths', 'journeys', 'countries/index', 'city/index', 'battle/index', 'life/index']
  .concat(ls('centuries'), ls('countries'), sample(ls('years'), 120), sample(ls('state'), 400), sample(ls('encyclopedia'), 1500), sample(ls('teachers'), 80));
const flat = [], missing = new Set(), named = new Set(); let worlds = 0, locs = 0, ctys = 0, offDisc = [], offMid = [], badCty = [];
for (const f of pages) {
  let t; try { t = read(f); } catch (e) { continue; }
  if (/\/maps\/world\.svg|viewBox="0 0 10000 4393"[^>]*role="(img|group)"/.test(t)) flat.push(f);
  for (const m of t.matchAll(/href="\/maps\/globes\/([a-z0-9]+)\.svg"/g)) { named.add(m[1]); if (!fs.existsSync(path.join(R, 'maps', 'globes', m[1] + '.svg'))) missing.add(m[1]); }
  for (const m of t.matchAll(/<svg class="map map-world map-globes[^"]*" viewBox="0 0 20400 10000"[\s\S]*?<\/svg>/g)) {
    worlds++;
    if (!/west\.svg" x="0"/.test(m[0]) || !/east\.svg" x="10400"/.test(m[0])) offDisc.push(f + ': hemispheres');
    for (const d of m[0].matchAll(/M(-?\d+) (-?\d+)h0/g)) { const x = +d[1], y = +d[2], r = Math.min(Math.hypot(x - 5000, y - 5000), Math.hypot(x - 15400, y - 5000)); if (r > 4905) { offDisc.push(f + ': ' + x + ',' + y); break; } }
    for (const d of m[0].matchAll(/<circle cx="(-?\d+)" cy="(-?\d+)"/g)) { const x = +d[1], y = +d[2], r = Math.min(Math.hypot(x - 5000, y - 5000), Math.hypot(x - 15400, y - 5000)); if (r > 4905) { offDisc.push(f + ': circle ' + x + ',' + y); break; } }
  }
  for (const m of t.matchAll(/<svg class="map map-globe map-loc" viewBox="0 0 10000 10000"[\s\S]*?<\/svg>/g)) {
    locs++; const d = /class="map-dot-(?:me|ap)" d="M(-?\d+) (-?\d+)h0"/.exec(m[0]);
    if (!d || Math.hypot(+d[1] - 5000, +d[2] - 5000) > 4900 * 0.62) offMid.push(f);
  }
  for (const m of t.matchAll(/<svg class="map map-cty" viewBox="([-\d ]+)" data-globe="([-\d.,]+)"/g)) {
    ctys++; const v = m[1].split(' ').map(Number), g = m[2].split(',').map(Number);
    if (v.length !== 4 || g.length !== 3 || Math.abs(g[0]) > 180 || Math.abs(g[1]) > 90 || !(g[2] > 1000) || v[0] > 5000 || v[0] + v[2] < 5000 || v[1] > 5000 + v[3] || v[1] + v[3] < 5000 - v[3]) badCty.push(f);
  }
  if (/<svg class="map map-cty"(?![^>]*data-globe)/.test(t)) badCty.push(f + ': no globe');
}
ok('no page draws on the flat world picture', !flat.length, flat.slice(0, 8));
ok('every globe picture named exists', named.size >= 20 && !missing.size, [named.size, [...missing].slice(0, 6)]);
ok('world maps are two hemispheres and their dots lie on the discs', worlds > 150 && !offDisc.length, [worlds, offDisc.slice(0, 5)]);
ok('a locator\'s dot lies near the middle of its globe', locs > 300 && !offMid.length, [locs, offMid.slice(0, 5)]);
ok('a country\'s map is a globe turned to the country', ctys >= 180 && !badCty.length, [ctys, badCty.slice(0, 5)]);
const globes = fs.readdirSync(path.join(R, 'maps', 'globes')).filter(f => f.endsWith('.svg'));
ok('the globe pictures: two hemispheres, the home page\'s and a grid of 48', globes.length === 51 && ['west.svg', 'east.svg', 'home.svg', 'g000n30.svg', 'g330s30.svg'].every(g => globes.includes(g)) && globes.every(g => { const s = read('maps/globes/' + g); return s.length > 3000 && s.includes('r="4900"'); }), globes.length);
const home = read('index');
ok('the home page\'s still picture is a globe', /<svg class="map map-globe map-world" viewBox="0 0 10000 10000"[^>]*><image href="\/maps\/globes\/home\.svg"/.test(home));
const atlas = read('atlas'), aj = read('atlas.js'), fj = read('faith-map.js'), jj = read('journeys.js'), jp = read('journeys');
ok('the atlas has no flat view and does not load the flat outlines', !/Flat map|atl-v-flat|basemap\.js/.test(atlas) && /var mode = 'globe';/.test(aj) && !/mode = 'flat'/.test(aj) && /<canvas id="atl-globe"[^>]*(?<!hidden)><\/canvas>/.test(atlas) && /<svg id="atl-svg"[^>]* hidden/.test(atlas));
ok('the faith maps have no flat view', !/Flat map|world\.svg/.test(fj) && /var view = 'globe';/.test(fj) && !/setView\('flat'/.test(fj));
ok('the journeys have no flat view', !/Flat map/.test(jp) && !/jr-views/.test(jp) && !/setView\('flat'/.test(jj) && !/S\.view = 'flat'/.test(jj));
ok('the kind indexes and the builder draw no flat map', !/world\.svg|4393/.test(read('scripts/tools/make-kind-indexes.js')) && !/MapSvg|<image href="\/maps\/world\.svg"/.test(read('scripts/build-pages.ps1').replace(/^\s*#.*$/gm, '').replace(/\$world = [\s\S]*?WriteIfChanged\("\$Repo\\maps\\world\.svg"/, '')));
ok('the globes are deployed with the maps', /\bmaps\b/.test(read('scripts/deploy.sh')));
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
