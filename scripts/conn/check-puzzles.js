// Checks every History Connections puzzle in scripts/connections.tsv on its own: four groups of four, levels 1-4 once
// each, every tile an entry (or a page link), no tile twice in a puzzle, no entry again within 30 puzzles, no group name
// used twice, and puzzles enough to reach a given day (#1 = 26 October 2026, UTC).
// --from=N reports only puzzles from #N on (the first 129 were assembled before the 30-puzzle rule; 59 old faults).
//   node scripts/conn/check-puzzles.js [YYYY-MM-DD] [--from=N]      (default 2027-06-30)    exit code 1 on a fault
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const have = new Set(ENC.map(e => e.slug));
const P = []; for (const l of fs.readFileSync(path.join(R, 'scripts', 'connections.tsv'), 'utf8').split(/\r?\n/)) {
  if (l.startsWith('@')) P.push([]); else { const c = l.split('\t'); if (/^[1-4]$/.test(c[0])) P[P.length - 1].push({ lv: +c[0], name: c[1], tiles: c.slice(2).map(t => t.split('=').slice(1).join('=')) }); }
}
const from = +((process.argv.find(a => a.startsWith('--from=')) || '').slice(7) || 1);
let faults = 0; const F = (n, m) => { if (n < from) return; console.log('#' + n + ': ' + m); faults++; };
const names = new Map();
P.forEach((p, i) => {
  const n = i + 1;
  if (p.length !== 4) F(n, p.length + ' groups');
  if (p.map(g => g.lv).sort().join() !== '1,2,3,4') F(n, 'levels ' + p.map(g => g.lv).join(','));
  const seen = new Set();
  for (const g of p) {
    if (g.tiles.length !== 4) F(n, g.name + ': ' + g.tiles.length + ' tiles');
    if (names.has(g.name)) F(n, 'group name used before in #' + names.get(g.name) + ': ' + g.name); else names.set(g.name, n);
    for (const s of g.tiles) {
      if (!s.startsWith('/') && !have.has(s)) F(n, 'unknown entry ' + s);
      if (seen.has(s)) F(n, 'tile twice: ' + s); seen.add(s);
      for (let k = Math.max(0, i - 30); k < i; k++) if (P[k].some(h => h.tiles.includes(s))) { F(n, s + ' was in #' + (k + 1)); break; }
    }
  }
});
const until = process.argv.slice(2).find(a => /^\d{4}-/.test(a)) || '2027-06-30', need = Math.round((Date.parse(until) - Date.UTC(2026, 9, 26)) / 864e5) + 1;
if (P.length < need) F(P.length, `only ${P.length} puzzles: ${until} needs #${need}`);
console.log(`${P.length} puzzles checked (to ${until} needs #${need}): ${faults} faults`);
process.exit(faults ? 1 : 0);
