// Family trees of the ruling houses, drawn from scripts/entry-family.tsv (Wikidata's parents, spouses and children among
// the person entries: scripts/tools/entry-wd-family.js) and scripts/entry-houses.tsv.
//   node scripts/tools/make-family-trees.js [--show=<house slug>] [--html=<file>]
// Writes scripts/family-trees.tsv (house slug, people drawn, the tree as one line of inline SVG), which build-pages.ps1
// puts on the house's entry under "Rulers and members", and scripts/life-family.js (LIFE_FAMILY {profile name: {f, m,
// s: [], c: []}} of [slug, name, dates]: the Great Lives' "Family" chips in generator.html).
// The tree: generations in columns from left to right, a person's children to the right, oldest at the top; a wife or
// husband who has no parent in the tree stands under their partner (joined by a short bar). The people are the house's
// members and those one step from a member (a parent, spouse or child). Only groups of three or more are drawn, and a
// house gets a tree only when one group has four. --html writes every tree into one page for reading by eye.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const arg = n => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.slice(n.length + 3) : null; };
const tsv = f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t')) : [];
const E = new Function(fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const bySlug = {}; for (const e of E) bySlug[e.slug] = e;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstYear = d => { const s = String(d || ''), m = s.match(/(\d{1,4})/); if (!m) return 99999; return /BCE/.test(s) && !/\d\s*BCE\s*[–-].*\d\s*CE/.test(s) ? -m[1] : (/^\D*\d+\s*BCE/.test(s) ? -m[1] : +m[1]); };
const fam = tsv('scripts/entry-family.tsv').filter(r => bySlug[r[1]] && bySlug[r[2]]);
const parents = {}, children = {}, spouses = {};
for (const r of fam) {
  if (r[0] === 'p') { (parents[r[2]] = parents[r[2]] || []).push([r[1], r[3]]); (children[r[1]] = children[r[1]] || []).push(r[2]); }
  else { (spouses[r[1]] = spouses[r[1]] || []).push(r[2]); (spouses[r[2]] = spouses[r[2]] || []).push(r[1]); }
}
const byYear = (a, b) => firstYear(bySlug[a].dates) - firstYear(bySlug[b].dates) || a.localeCompare(b);

// ---- one house ----
const W = 196, BH = 40, RH = 48, GAP = 40, PAD = 6;
function tree(house, members) {
  const mem = new Set(members.filter(s => bySlug[s])), N = new Set(mem);
  for (const m of mem) { for (const p of parents[m] || []) N.add(p[0]); for (const c of children[m] || []) N.add(c); for (const s of spouses[m] || []) N.add(s); }
  // the parent a person hangs under: the father if he is in the tree, else the mother, else any parent on record
  const prim = {};
  for (const n of N) { const ps = (parents[n] || []).filter(p => N.has(p[0])); if (!ps.length) continue;
    // a parent who is only one step away through this child and belongs to no member otherwise still counts
    const f = ps.find(p => p[1] === 'f') || ps.find(p => p[1] === '?') || ps[0]; prim[n] = f[0]; }
  // a wife or husband without a parent in the tree stands with their partner
  const host = {}, guests = {};
  const order = [...N].sort(byYear);
  for (const p of order) {
    if (prim[p] || host[p]) continue;
    const cand = (spouses[p] || []).filter(q => N.has(q) && !host[q] && !(guests[p] && guests[p].length)).sort(byYear);
    let q = cand.find(q => prim[q]);
    if (!q) q = cand.find(q => mem.has(q) && !mem.has(p));
    if (!q) q = cand.find(q => (children[q] || []).some(c => (parents[c] || []).some(x => x[0] === q && x[1] === 'f')) && mem.has(q) === mem.has(p));
    if (!q) continue;
    host[p] = q; (guests[q] = guests[q] || []).push(p);
  }
  const unitOf = n => host[n] || n;
  const kids = {};
  for (const n of N) if (prim[n]) { const u = unitOf(prim[n]); if (u === unitOf(n)) continue; (kids[u] = kids[u] || []).push(n); }
  // a person hosted by a partner hangs nowhere else
  for (const u of Object.keys(kids)) kids[u] = kids[u].filter(c => !host[c]).sort(byYear);
  const roots = [...N].filter(n => !host[n] && !(prim[n] && unitOf(prim[n]) !== n)).sort(byYear);
  const size = u => 1 + (guests[u] || []).length + (kids[u] || []).reduce((s, c) => s + size(c), 0);
  const drawn = roots.filter(r => size(r) >= 3);
  if (!drawn.some(r => size(r) >= 4)) return null;
  // layout: leaves take rows, a unit stands at the middle of its children
  const pos = {}; let row = 0, maxCol = 0, people = 0;
  const rowsOf = u => 1 + (guests[u] || []).length;
  function place(u, col) {
    maxCol = Math.max(maxCol, col); people += rowsOf(u);
    const ks = kids[u] || [], top = row;
    if (!ks.length) { pos[u] = { col, row: top }; row += rowsOf(u); return; }
    for (const k of ks) place(k, col + 1);
    const span = row - top, mine = rowsOf(u);
    if (span < mine) { row = top + mine; pos[u] = { col, row: top }; }
    else pos[u] = { col, row: top + (span - mine) / 2 };
  }
  for (const r of drawn) { place(r, 0); row += 0.5; }
  const width = (maxCol + 1) * W + maxCol * GAP + PAD * 2, height = Math.ceil((row - 0.5) * RH) + PAD * 2 - (RH - BH);
  const X = c => PAD + c * (W + GAP), Y = r => PAD + r * RH;
  // a name too long for its box loses what follows its comma ("Matilda of England, Duchess of Saxony"), else its end
  const cut = (s, n) => { if (s.length <= n) return s; const c = s.indexOf(', '); if (c >= 6 && c <= n) return s.slice(0, c); return s.slice(0, n - 1).replace(/[\s,]+$/, '') + '…'; };
  let lines = '', boxes = '';
  const box = (s, x, y, guest) => { const e = bySlug[s], name = e.name, d = e.dates || '';
    boxes += '<a href="/encyclopedia/' + s + '" class="ft-p' + (mem.has(s) ? ' ft-m' : '') + '" aria-label="' + esc(name + (d ? ', ' + d : '')) + '"><title>' + esc(name + (d ? ' (' + d + ')' : '')) + '</title>' +
      '<rect x="' + x + '" y="' + y + '" width="' + W + '" height="' + BH + '" rx="5"/><text class="ft-n" x="' + (x + 9) + '" y="' + (y + (d ? 16 : 24)) + '">' + esc(cut(name, 27)) + '</text>' +
      (d ? '<text class="ft-d" x="' + (x + 9) + '" y="' + (y + 31) + '">' + esc(cut(d, 34)) + '</text>' : '') + '</a>'; };
  for (const u of Object.keys(pos)) {
    const p = pos[u], x = X(p.col), y = Y(p.row); box(u, x, y);
    (guests[u] || []).sort(byYear).forEach((g, i) => { const gy = y + (i + 1) * RH; lines += '<path class="ft-w" d="M' + (x + 14) + ' ' + (gy - (RH - BH)) + 'V' + gy + '"/>'; box(g, x, gy, true); });
    const ks = kids[u] || []; if (!ks.length) continue;
    const y1 = y + BH / 2, bus = x + W + GAP / 2;
    for (const k of ks) { const y2 = Y(pos[k].row) + BH / 2; lines += '<path class="ft-l" d="M' + (x + W) + ' ' + y1 + 'H' + bus + 'V' + y2 + 'H' + (x + W + GAP) + '"/>'; }
  }
  const hn = bySlug[house] ? bySlug[house].name : house;
  const svg = '<svg class="ft-svg" xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" role="group" aria-label="' + esc('Family tree: ' + hn) + '">' + lines + boxes + '</svg>';
  return { svg, people, groups: drawn.length, cols: maxCol + 1, width, height };
}

const out = [], show = arg('show'); let html = '';
for (const [h, ms] of tsv('scripts/entry-houses.tsv')) {
  if (show && h !== show) continue;
  const t = tree(h, ms.split('|')); if (!t) continue;
  out.push([h, t.people, t.svg]);
  html += '<h2>' + esc(bySlug[h] ? bySlug[h].name : h) + ' <small>' + t.people + ' people, ' + t.groups + ' groups, ' + t.cols + ' generations, ' + t.width + ' x ' + t.height + '</small></h2><div class="ft-wrap" tabindex="0">' + t.svg + '</div>';
}
if (arg('html')) fs.writeFileSync(arg('html'), '<!doctype html><meta charset="utf-8"><title>Family trees</title><link rel="stylesheet" href="/shared.css"><style>body{background:var(--bg);color:var(--text);padding:20px;font-family:var(--font-ui)}small{font-weight:400;font-size:13px;color:var(--muted)}' + (arg('css') ? fs.readFileSync(arg('css'), 'utf8') : '') + '</style>' + html);
if (!show) {
  fs.writeFileSync(path.join(ROOT, 'scripts', 'family-trees.tsv'), '# house entry\tpeople drawn\tthe tree, inline SVG (written by scripts/tools/make-family-trees.js)\n' + out.map(o => o.join('\t')).join('\n') + '\n');
  // the Great Lives: each life's own entry and its family
  const SD = new Function(fs.readFileSync(path.join(ROOT, 'shared-data.js'), 'utf8').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES}')();
  const self = {}; for (const r of tsv('scripts/kinds/self.tsv')) self[r[0]] = r[1];
  const card = s => [s, bySlug[s].name, bySlug[s].dates || ''], LF = {};
  for (const e of SD.EMPIRES) { if (e.kind !== 'life') continue; const s = self[e.name]; if (!s || !bySlug[s]) continue;
    const ps = parents[s] || [], f = ps.find(p => p[1] === 'f'), m = ps.find(p => p[1] === 'm'), o = { };
    if (f) o.f = card(f[0]); if (m) o.m = card(m[0]);
    const sp = (spouses[s] || []).slice().sort(byYear), ch = (children[s] || []).slice().sort(byYear);
    if (sp.length) o.s = sp.map(card); if (ch.length) o.c = ch.map(card);
    if (Object.keys(o).length) LF[e.name] = o; }
  fs.writeFileSync(path.join(ROOT, 'scripts', 'life-family.js'), '// Written by scripts/tools/make-family-trees.js: the family of each Great Life as Wikidata records it, entries only\nconst LIFE_FAMILY = ' + JSON.stringify(LF) + ';\n');
  console.log('family trees: ' + out.length + ' houses, ' + out.reduce((n, o) => n + o[1], 0) + ' people drawn; lives with family: ' + Object.keys(LF).length);
} else console.log(out.map(o => o[0] + ' ' + o[1]).join('\n'));
