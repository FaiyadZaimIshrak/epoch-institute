// Wave ms2, the text edits that no other tool makes (run from the repository AFTER merge-register.js --write):
//  - data/geo.json: the new state's point, the register's capital (Paris, as its neighbours in time have it, source 0)
//  - data/polities.json: present-day countries added to four states that ruled land now another country's
//    (Colombia held Panama to 1903, Pakistan held Bangladesh to 1971, Indonesia held East Timor 1975-1999, Sudan held
//    South Sudan to 2011, Jordan
//    held the West Bank 1948-1967), so those countries' histories no longer show a break
//  - data/enc-states.json "p": an entry's own state page, for the new state and for the present-day states of wave
//    ms1 whose country entry never got the link (scripts/modern-states.tsv names both)
//   node ms2-apply.js [--write]
const fs = require('fs'), WRITE = process.argv.includes('--write');
const P0 = fs.readFileSync('data/polities.json', 'utf8'); let P = P0; const POL = JSON.parse(P0), NODE = new Map(POL.nodes.map(n => [n.id, n]));
if (!NODE.has('first-french-empire')) throw new Error('run merge-register.js --write first');
// geo
let G = fs.readFileSync('data/geo.json', 'utf8'); const GJ = JSON.parse(G);
if (!GJ['first-french-empire']) { const src = GJ['french-first-republic']; if (!src) throw new Error('no point to copy');
  const i = G.lastIndexOf('}'); G = G.slice(0, i) + ',"first-french-empire":' + JSON.stringify([src[0], src[1], 0]) + G.slice(i); JSON.parse(G); console.log('geo: first-french-empire ' + src.slice(0, 2).join(', ')); }
// present-day countries
const MO = [['republic-of-colombia', 'Panama'], ['islamic-republic-of-pakistan', 'Bangladesh'], ['indonesia', 'East Timor'], ['hashemite-kingdom-of-jordan', 'Palestine'], ['jordan', 'Palestine'], ['sudan', 'South Sudan']];
for (const [id, c] of MO) { const n = NODE.get(id); if (!n) throw new Error('no state ' + id); if ((n.mo || []).includes(c)) { console.log('mo: ' + id + ' has ' + c); continue; }
  const a = P.indexOf('{"id":"' + id + '",'); if (a < 0 || P.indexOf('{"id":"' + id + '",', a + 1) >= 0) throw new Error('node not found once: ' + id);
  const b = P.indexOf('}', a), node = P.slice(a, b + 1), mo = JSON.stringify(n.mo); if (node.split('"mo":' + mo).length !== 2) throw new Error(id + ': mo not found as text: ' + mo);
  const out = node.replace('"mo":' + mo, () => '"mo":' + JSON.stringify(n.mo.concat([c]))); JSON.parse(out); P = P.slice(0, a) + out + P.slice(b + 1); console.log('mo: ' + id + ' + ' + c); }
const P2 = JSON.parse(P); if (P2.nodes.length !== POL.nodes.length || P2.links.length !== POL.links.length) throw new Error('register changed size');
// an entry's own state page
let E = fs.readFileSync('data/enc-states.json', 'utf8'); const EJ = JSON.parse(E), ENT = fs.readFileSync('encyclopedia-data.js', 'utf8'), add = [];
const want = [['first-french-empire', 'first-french-empire']];
for (const l of fs.readFileSync('scripts/modern-states.tsv', 'utf8').split(/\r?\n/)) { if (!l || l.startsWith('#')) continue; const c = l.split('\t'); if (c[5] && c[6]) want.push([c[6], c[5]]); }
for (const [slug, id] of want) { const n = NODE.get(id); if (!n || n.p || EJ.p[slug] || !ENT.includes('slug:"' + slug + '",')) continue; add.push([slug, id]); }
if (add.length) { const k = E.indexOf('"p":{'); if (k < 0) throw new Error('enc-states: no p'); E = E.slice(0, k + 5) + add.map(([s, id]) => JSON.stringify(s) + ':' + JSON.stringify(id)).join(',') + ',' + E.slice(k + 5); JSON.parse(E); }
console.log('own state pages: ' + add.length + ' entries (' + add.slice(0, 8).map(x => x[0]).join(', ') + ' …)');
if (WRITE) { fs.writeFileSync('data/geo.json', G); fs.writeFileSync('data/polities.json', P); fs.writeFileSync('data/enc-states.json', E); console.log('written'); }
