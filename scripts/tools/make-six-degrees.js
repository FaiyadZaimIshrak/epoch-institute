// Six Degrees (/games#six, Nov 2026): one puzzle a day for everyone (UTC; #1 = 6 Nov 2026): go from one encyclopedia
// entry to another by following the gold links in each entry's description. Run by scripts/build-pages.ps1 after it
// writes the link files data/sixdeg/<c>.json ({slug: [name, dates, picture 0/1, [[linked slug, name], …]]}).
// scripts/six-degrees.tsv holds the puzzles (start, target), APPENDED to and never reordered, so a day keeps its puzzle;
// every run re-solves each one on the current links (a change to the descriptions may change the shortest route) and
// stops if one can no longer be solved. New puzzles: two well-known entries with a picture (named by at least
// MINPROF profiles), neither a war, battle or atrocity, the target 3 or 4 clicks from the start, no entry used again
// within 60 puzzles. Writes sixdeg-data.js: SIXD = {v: the link files' version, p: [[start, target, shortest, [a
// shortest route]], …], n: {slug: [name, dates, picture]} for every start and target}.
//   node scripts/tools/make-six-degrees.js [--count=N]   (N puzzles at least; default: to 31 October 2027)
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const D = path.join(R, 'data', 'sixdeg'), TSV = path.join(R, 'scripts', 'six-degrees.tsv');
const DAY0 = Date.UTC(2026, 10, 6), MINPROF = 3, GAP = 60;
const want = +((process.argv.find(a => a.startsWith('--count=')) || '').slice(8)) || Math.floor((Date.UTC(2027, 9, 31) - DAY0) / 864e5) + 1;
const G = {}, hash = crypto.createHash('sha1');
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.json')).sort()) { const t = fs.readFileSync(path.join(D, f), 'utf8'); hash.update(t); Object.assign(G, JSON.parse(t)); }
const V = hash.digest('hex').slice(0, 10);
const out = s => (G[s] ? G[s][3].map(x => x[0]) : []);
function solve(a, b) {   // breadth first over the links; returns a shortest route [a … b] or null
  if (!G[a] || !G[b]) return null;
  const prev = { [a]: null }, q = [a];
  for (let i = 0; i < q.length; i++) {
    const s = q[i]; if (s === b) break;
    for (const t of out(s)) if (!(t in prev)) { prev[t] = s; q.push(t); }
  }
  if (!(b in prev)) return null;
  const r = []; for (let s = b; s != null; s = prev[s]) r.unshift(s); return r;
}
function dist(a, max) { const d = { [a]: 0 }, q = [a]; for (let i = 0; i < q.length; i++) { const s = q[i]; if (d[s] >= max) continue; for (const t of out(s)) if (!(t in d)) { d[t] = d[s] + 1; q.push(t); } } return d; }
// the pool: well-known entries with a picture, people, places, works and events that are not wars, battles or killings
const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const GRIM = /\b(massacre|genocide|holocaust|execution|executed|slaughter|atrocit|pogrom|famine)/i;
const pool = E.filter(e => e.img && G[e.slug] && (e.empires || []).length >= MINPROF && ['person', 'place', 'work', 'event', 'institution', 'idea'].includes(e.type) &&
  !(e.tags && e.tags.length) && !GRIM.test(e.desc || '') && G[e.slug][3].length >= 2).map(e => e.slug).sort();
// the puzzles so far
const rows = fs.existsSync(TSV) ? fs.readFileSync(TSV, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')) : [];
const head = '# Six Degrees (/games#six): one puzzle a day, #1 = 6 Nov 2026, in this order. start<TAB>target (entry slugs).\n' +
  '# Written by scripts/tools/make-six-degrees.js, which only ever appends; a row may be edited by hand to replace a puzzle\n' +
  '# that no longer solves (the build stops on one).\n';
function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let added = 0;
while (rows.length < want) {
  const n = rows.length + 1, r = rng(n * 7919 + 13), recent = new Set(rows.slice(-GAP).flat());
  let found = null;
  for (let tries = 0; tries < 4000 && !found; tries++) {
    const a = pool[Math.floor(r() * pool.length)]; if (recent.has(a)) continue;
    const d = dist(a, 4), far = pool.filter(b => (d[b] === 3 || d[b] === 4) && !recent.has(b) && b !== a);
    if (far.length) found = [a, far[Math.floor(r() * far.length)]];
  }
  if (!found) { console.error('no puzzle found for #' + n); process.exit(1); }
  rows.push(found); added++;
}
const P = [], bad = [];
rows.forEach((p, i) => { const route = solve(p[0], p[1]); if (!route || route.length < 3) bad.push('#' + (i + 1) + ' ' + p.join(' -> ')); else P.push([p[0], p[1], route.length - 1, route]); });
if (bad.length) { console.error('Six Degrees: these puzzles no longer solve (replace them in scripts/six-degrees.tsv):\n  ' + bad.join('\n  ')); process.exit(1); }
fs.writeFileSync(TSV, head + rows.map(p => p.join('\t')).join('\n') + '\n');
const N = {}; for (const p of P) for (const s of [p[0], p[1]]) N[s] = [G[s][0], G[s][1], G[s][2]];
const js = '// sixdeg-data.js - written by scripts/tools/make-six-degrees.js from scripts/six-degrees.tsv and data/sixdeg. Do not edit.\n' +
  'var SIXD = {v:' + JSON.stringify(V) + ',\np:' + JSON.stringify(P) + ',\nn:' + JSON.stringify(N) + '};\n';
const F = path.join(R, 'sixdeg-data.js'); if (!fs.existsSync(F) || fs.readFileSync(F, 'utf8') !== js) fs.writeFileSync(F, js);
const pars = P.map(p => p[2]);
console.log('six degrees: ' + P.length + ' puzzles (' + added + ' new; pool ' + pool.length + ' entries), shortest routes: ' + [2, 3, 4, 5, 6].map(k => k + ' clicks ' + pars.filter(x => x === k).length).join(', '));
