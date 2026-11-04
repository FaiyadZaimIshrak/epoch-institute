// Assembles History Connections puzzles from checked group proposals (scripts/conn/GROUPS-GUIDE.md,
// verify-proposals.js) and APPENDS them to scripts/connections.tsv (never reorders: the puzzles already played keep
// their numbers). The published rules:
//   - one group of each level (1 yellow … 4 purple) in every puzzle;
//   - at most one "year" group and one "wordplay" group in a puzzle;
//   - no entry twice within 30 puzzles (counting the published ones before);
//   - no tile that is another group's candidate in the same puzzle (so each tile fits one group only), and no tile whose
//     entry's dates hold the year of the puzzle's year group;
//   - four of the six candidates, the best known first (profiles naming the entry, a picture), in the proposal's order
//     between equals.
// Groups are taken in the order of the files given, interleaved (the first group of each file, then the second …), so
// themes and regions mix. edits.json (optional): {"drop": [group names], "keep": {group name: [slugs to prefer]},
// "rename": {old: new}, "label": {slug: label}, "dropTile": {group name: [slugs]}, "level": {group name: level}, "apart": [[group, group], …]: groups whose
// categories overlap without sharing a tile (Mamluk sultans / Slave soldiers who became rulers), never in one puzzle}.
//   node scripts/conn/assemble.js <count> <out.tsv> [--edits=edits.json] [--write] <proposals.json> [...]
// Without --write it only writes <out.tsv> (the new puzzles, for reading); with --write it also appends them.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const files = args.filter(a => !a.startsWith('--')); const count = +files.shift(), outF = files.shift();
if (!count || !outF || !files.length) { console.error('usage: assemble.js <count> <out.tsv> [--edits=f] [--write] <proposals.json> …'); process.exit(1); }
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = new Map(ENC.map(e => [e.slug, e]));
const weight = s => { const e = bySlug.get(s); return e ? (e.empires || []).length + (e.img ? 2 : 0) : -1; };
const ed = opt('edits') ? JSON.parse(fs.readFileSync(opt('edits'), 'utf8')) : {};
const drop = new Set(ed.drop || []), keep = ed.keep || {}, rename = ed.rename || {}, relabel = ed.label || {}, dropTile = ed.dropTile || {};
const apart = new Map(); for (const [a, b] of ed.apart || []) { for (const [x, y] of [[a, b], [b, a]]) { if (!apart.has(x)) apart.set(x, new Set()); apart.get(x).add(y); } }
// the published puzzles: the entries of each, in order
const TSV = path.join(R, 'scripts', 'connections.tsv'), text = fs.readFileSync(TSV, 'utf8');
const past = []; for (const l of text.split(/\r?\n/)) { if (l.startsWith('@')) past.push(new Set()); else { const c = l.split('\t'); if (/^[1-4]$/.test(c[0])) for (const t of c.slice(2)) { const s = t.split('=').slice(1).join('='); if (s && !s.startsWith('/')) past[past.length - 1].add(s); } } }
const usedNames = new Set(); for (const l of text.split(/\r?\n/)) { const c = l.split('\t'); if (/^[1-4]$/.test(c[0])) usedNames.add(c[1]); }
// the pool, interleaved by file
const lists = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const pool = []; for (let i = 0; lists.some(L => i < L.length); i++) for (const L of lists) if (i < L.length) pool.push(L[i]);
const groups = pool.filter(g => !drop.has(g.name) && !usedNames.has(rename[g.name] || g.name)).map(g => ({ ...g, level: (ed.level || {})[g.name] || g.level, name: rename[g.name] || g.name, tiles: g.tiles.filter(t => bySlug.has(t.slug) && !(dropTile[g.name] || []).includes(t.slug)) })).filter(g => g.tiles.length >= 4)
  .filter((g, i, a) => a.findIndex(h => h.name === g.name) === i);   // a name proposed twice: the first proposal wins
const yearOf = g => g.kind === 'year' ? +(g.name.match(/\d{3,4}/) || [])[0] : null;
const datesHold = (s, y) => { const e = bySlug.get(s); return !!(e && y && new RegExp('(^|\\D)' + y + '(\\D|$)').test((e.dates || '') + ' ' + e.name)); };
const out = []; const recent = past.slice(-30);
const blocked = () => { const b = new Set(); for (const p of recent.slice(-30)) for (const s of p) b.add(s); return b; };
for (let n = 0; n < count; n++) {
  const B = blocked(), chosen = [];
  for (const lv of [1, 2, 3, 4]) {
    for (const g of groups) {
      if (g.used || g.level !== lv) continue;
      if (g.kind === 'year' && chosen.some(c => c.g.kind === 'year')) continue;
      if (g.kind === 'wordplay' && chosen.some(c => c.g.kind === 'wordplay')) continue;
      if (chosen.some(c => (apart.get(g.name) || new Set()).has(c.g.name))) continue;
      const cands = new Set(chosen.flatMap(c => c.g.tiles.map(t => t.slug)));
      const yrs = chosen.map(c => yearOf(c.g)).concat(yearOf(g)).filter(Boolean);
      const pref = keep[g.name] || [];
      const ok = g.tiles.filter(t => !B.has(t.slug) && !cands.has(t.slug)
        && !chosen.some(c => c.tiles.some(x => x.slug === t.slug))
        && !yrs.some(y => y !== yearOf(g) && datesHold(t.slug, y)))
        .map((t, i) => ({ t, i, w: (pref.includes(t.slug) ? 1000 : 0) + weight(t.slug) }))
        .sort((a, b) => b.w - a.w || a.i - b.i).slice(0, 4).map(x => x.t);
      if (ok.length < 4) continue;
      // the tiles already chosen must not be this group's candidates, nor hold its year
      if (chosen.some(c => c.tiles.some(x => g.tiles.some(t => t.slug === x.slug) || (yearOf(g) && datesHold(x.slug, yearOf(g)))))) continue;
      chosen.push({ g, tiles: ok }); break;
    }
  }
  if (chosen.length < 4) { console.log(`stopped at puzzle ${past.length + 1}: no group of level ${[1, 2, 3, 4].find(l => !chosen.some(c => c.g.level === l))} fits`); break; }
  for (const c of chosen) c.g.used = true;
  const set = new Set(chosen.flatMap(c => c.tiles.map(t => t.slug))); past.push(set); recent.push(set);
  out.push('@ ' + past.length + '\n' + chosen.map(c => c.g.level + '\t' + c.g.name + '\t' + c.tiles.map(t => (relabel[t.slug] || t.label).replace(/[=\t]/g, ' ') + '=' + t.slug).join('\t')).join('\n'));
}
fs.writeFileSync(outF, out.join('\n') + '\n');
console.log(`${out.length} puzzles (from #${past.length - out.length + 1}) written to ${outF}; groups left: ` + [1, 2, 3, 4].map(l => 'L' + l + ' ' + groups.filter(g => !g.used && g.level === l).length).join(', '));
if (args.includes('--write') && out.length) { fs.writeFileSync(TSV, text.replace(/\s*$/, '\n') + out.join('\n') + '\n'); console.log('appended to scripts/connections.tsv'); }
