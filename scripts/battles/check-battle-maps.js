// Checks the battle plans (scripts/battles/<slug>.json) against their saved articles.
//   node check-battle-maps.js <scenario dir> <articles dir> [slug …]
// A file holding only "skip" records a battle that cannot be drawn (its profile is removed); only "hold", one whose
// plan waits for a fuller source (its profile stays, without a plan). A scenario names its article ("article": the file's name without .txt). Faults are printed per battle; exit 1 on any.
// What it cannot see is whether a block stands where the account puts it: that is read by eye on the sheet (sheet.js).
const fs = require('fs'), path = require('path');
const [dir, wp, ...only] = process.argv.slice(2);
if (!dir || !wp) { console.error('usage: check-battle-maps.js <scenario dir> <articles dir> [slug …]'); process.exit(1); }
const KINDS = ['infantry', 'spears', 'pikes', 'cavalry', 'horse-archers', 'archers', 'light', 'elephants', 'chariots', 'artillery', 'ships', 'guard', 'camp', 'wagons'];
const AREAS = ['hill', 'ridge', 'mountain', 'wood', 'marsh', 'sea', 'lake', 'land'], LINES = ['river', 'stream', 'road', 'wall', 'ditch'], PLACES = ['town', 'village', 'fort', 'spring', 'bridge', 'ford', 'point'];
const HOW = ['advance', 'retreat', 'feint', 'rout'], STATE = ['hidden', 'shown', 'routed', 'destroyed', 'gone'];
const HYPE = /\b(brilliant|masterful|masterly|genius|legendary|stunning|heroic|glorious|decisive blow|famous(ly)?|iconic|pivotal|crushing|daring|bold(ly)?|magnificent|epic|turning point|against all odds|fateful)\b/i;
const norm = s => String(s).replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
const W = 100, H = 62;
function corners(u, p) { const r = (p[2] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), w = u.w / 2, d = u.d / 2; return [[-w, -d], [w, -d], [w, d], [-w, d]].map(q => [p[0] + q[0] * c - q[1] * s, p[1] + q[0] * s + q[1] * c]); }
function overlap(a, b) {   // separating axes of two rectangles
  for (const poly of [a, b]) for (let i = 0; i < 4; i++) { const p = poly[i], q = poly[(i + 1) % 4], nx = q[1] - p[1], ny = p[0] - q[0];
    let amin = 1e9, amax = -1e9, bmin = 1e9, bmax = -1e9; for (const v of a) { const t = v[0] * nx + v[1] * ny; amin = Math.min(amin, t); amax = Math.max(amax, t); } for (const v of b) { const t = v[0] * nx + v[1] * ny; bmin = Math.min(bmin, t); bmax = Math.max(bmax, t); }
    if (amax <= bmin + 1e-9 || bmax <= amin + 1e-9) return false; }
  return true;
}
let bad = 0, n = 0, skipped = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort()) {
  const slug = f.slice(0, -5); if (only.length && !only.includes(slug)) continue;
  const E = []; let sc; try { sc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log('== ' + slug + '\n  not JSON: ' + e.message); bad++; continue; }
  n++;
  if (sc.skip || sc.hold) { skipped++; const why = sc.skip || sc.hold; console.log('== ' + slug + ': ' + (sc.skip ? 'SKIP' : 'HOLD') + ' (' + why + ')'); if (String(why).length < 30) { console.log('  the reason is a full sentence'); bad++; } continue; }
  const af = path.join(wp, (sc.article || slug) + '.txt'); if (!fs.existsSync(af)) { console.log('== ' + slug + '\n  no article ' + af); bad++; continue; }
  const art = norm(fs.readFileSync(af, 'utf8'));
  const quote = (q, what) => { if (!q || String(q).split(/\s+/).length < 5) E.push(what + ': a quotation of at least five words is needed'); else if (!art.includes(norm(q))) E.push(what + ': the quotation is not in the article: "' + String(q).slice(0, 70) + '"'); };
  const inField = (p, m) => p[0] >= m && p[0] <= W - m && p[1] >= m && p[1] <= H - m;
  if (sc.slug !== slug) E.push('slug is not the file name');
  if (!sc.name) E.push('no name');
  if (!Array.isArray(sc.sides) || sc.sides.length < 2 || sc.sides.length > 4) E.push('two to four sides');
  const sides = new Set((sc.sides || []).map(s => s.id)); (sc.sides || []).forEach(s => { if (!s.id || !s.name) E.push('a side needs id and name'); });
  for (const t of sc.terrain || []) {
    const lab = 'terrain ' + (t.name || t.k);
    if (AREAS.includes(t.k)) { if (!Array.isArray(t.at) || t.at.length < 4 || typeof t.at[0] === 'number') E.push(lab + ': an area needs four or more points'); }
    else if (LINES.includes(t.k)) { if (!Array.isArray(t.at) || t.at.length < 2 || typeof t.at[0] === 'number') E.push(lab + ': a line needs two or more points'); }
    else if (PLACES.includes(t.k)) { if (!Array.isArray(t.at) || typeof t.at[0] !== 'number') E.push(lab + ': a place is one point'); else if (!inField(t.at, 1)) E.push(lab + ': outside the plan'); }
    else E.push(lab + ': unknown kind ' + t.k);
    quote(t.quote, lab);
    if (t.name && !art.includes(norm(t.name)) && !t.unnamed) E.push(lab + ': the name is not in the article (set "unnamed": true for a describing word such as Highlands)');
  }
  const units = {}; if (!Array.isArray(sc.units) || sc.units.length < 2 || sc.units.length > 14) E.push('2 to 14 formations');
  for (const u of sc.units || []) {
    const lab = 'formation ' + u.id;
    if (!u.id || units[u.id]) E.push(lab + ': id missing or used twice'); units[u.id] = u;
    if (!sides.has(u.side)) E.push(lab + ': unknown side'); if (!KINDS.includes(u.k)) E.push(lab + ': unknown kind ' + u.k);
    if (!u.name || u.name.length > 30) E.push(lab + ': a name of at most 30 characters'); if (!u.short || u.short.length > 10) E.push(lab + ': a short name of at most 10 characters');
    u.w = u.w || (u.k === 'ships' ? 5 : u.k === 'camp' ? 6 : 10); u.d = u.d || (u.k === 'ships' ? 2.4 : u.k === 'camp' ? 5 : 3);
    if (u.w < 3 || u.w > 22 || u.d < 1.5 || u.d > 7) E.push(lab + ': width 3-22, depth 1.5-7');
    if (u.leader && u.leader.length > 30) E.push(lab + ': a leader of at most 30 characters');
    if (u.leader && !art.includes(norm(u.leader).replace(/^(sultan|king|emperor|general|duke|prince|count|lord|sir|marshal|admiral|consul) /, ''))) E.push(lab + ': the leader ' + u.leader + ' is not named in the article');
    quote(u.quote, lab);
  }
  const P = sc.phases || []; if (P.length < 3 || P.length > 7) E.push('three to seven phases (' + P.length + ')');
  const pos = {}, state = {};
  P.forEach((p, i) => {
    const lab = 'phase ' + (i + 1);
    if (!p.title || p.title.length > 60 || /[.]$/.test(p.title)) E.push(lab + ': a title of at most 60 characters, no full stop');
    if (!p.text || p.text.length < 110 || p.text.length > 340) E.push(lab + ': text of 110 to 340 characters (' + (p.text || '').length + ')');
    quote(p.quote, lab);
    const words = (p.title || '') + ' ' + (p.text || '') + ' ' + (p.when || '');
    if (HYPE.test(words)) E.push(lab + ': a praise word: ' + words.match(HYPE)[0]);
    if (/\b(the article|the account says|according to the article|the source|wikipedia)\b/i.test(words)) E.push(lab + ': the text speaks of its source');
    if (/[—]| – | - /.test(words)) E.push(lab + ': a dash as punctuation');
    if (/\b\d+ (BC|AD)\b|\bAD \d/.test(words)) E.push(lab + ': BCE/CE, not BC/AD');
    for (const m of words.matchAll(/\d[\d,.]*\d|\d/g)) { const v = m[0].replace(/[.,]$/, ''); if (!art.includes(v) && !art.includes(v.replace(/,/g, ''))) E.push(lab + ': the number ' + v + ' is not in the article'); }
    for (const m of (p.text || '').matchAll(/(?<![.!?]\s|^)\b([A-Z][\p{L}'’-]{2,})/gu)) { const w = norm(m[1]).replace(/'s$/, ''); if (!art.includes(w)) E.push(lab + ': the name ' + m[1] + ' is not in the article'); }
    let changed = i === 0;
    for (const id in p.at || {}) { if (!units[id]) { E.push(lab + ': unknown formation ' + id); continue; } const a = p.at[id]; if (!Array.isArray(a) || a.length < 2) { E.push(lab + ': a place is [x, y, facing]'); continue; } if (!pos[id] && a[2] == null) E.push(lab + ': ' + id + ' needs a facing where it first stands');
      pos[id] = [a[0], a[1], a[2] != null ? a[2] : pos[id] ? pos[id][2] : 0]; if (state[id] === 'hidden' && !(p.state || {})[id]) state[id] = 'shown'; if (!state[id]) state[id] = 'shown'; changed = true; }
    for (const id in p.state || {}) { if (!units[id]) E.push(lab + ': state of an unknown formation ' + id); else if (!STATE.includes(p.state[id])) E.push(lab + ': unknown state ' + p.state[id]); else { if (!pos[id]) E.push(lab + ': ' + id + ' has a state before it has a place'); state[id] = p.state[id]; changed = true; } }
    for (const id in p.how || {}) { if (!units[id]) E.push(lab + ': how of an unknown formation ' + id); else if (!HOW.includes(p.how[id])) E.push(lab + ': unknown way of moving ' + p.how[id]); else if (!(p.at || {})[id]) E.push(lab + ': ' + id + ' has a way of moving but does not move'); }
    for (const hh of p.hits || []) { if (!units[hh[0]] || !units[hh[1]]) E.push(lab + ': a hit names an unknown formation'); else { if (!pos[hh[0]] || !pos[hh[1]]) E.push(lab + ': a hit on or by a formation not on the field'); else if (units[hh[0]].side === units[hh[1]].side) E.push(lab + ': ' + hh[0] + ' strikes its own side'); if (state[hh[1]] === 'gone' || state[hh[0]] === 'gone' || (state[hh[0]] === 'destroyed' && (p.state || {})[hh[0]] !== 'destroyed') || (state[hh[1]] === 'destroyed' && (p.state || {})[hh[1]] !== 'destroyed')) E.push(lab + ': a hit on or by a formation that has gone or was destroyed earlier'); changed = true; } }
    if (!changed) E.push(lab + ': nothing moves, strikes or changes');
    const here = Object.keys(pos).filter(id => state[id] !== 'gone' && state[id] !== 'destroyed');
    for (const id of here) { const m = Math.max(units[id].w, units[id].d) / 2; for (const c of corners(units[id], pos[id])) if (c[0] < 1 || c[0] > W - 1 || c[1] < 1 || c[1] > H - 1) { E.push(lab + ': ' + id + ' reaches outside the plan'); break; } }
    for (let a = 0; a < here.length; a++) for (let b = a + 1; b < here.length; b++) if (units[here[a]].k !== 'camp' && units[here[b]].k !== 'camp' && overlap(corners(units[here[a]], pos[here[a]]), corners(units[here[b]], pos[here[b]]))) E.push(lab + ': ' + here[a] + ' and ' + here[b] + ' overlap');
  });
  if (P[0]) { const first = Object.keys(P[0].at || {}); if (first.length < 2) E.push('phase 1 places the formations as they first stood'); if (!first.some(id => units[id] && units[id].side === (sc.sides[0] || {}).id) || !first.some(id => units[id] && units[id].side !== (sc.sides[0] || {}).id)) E.push('phase 1 shows both sides'); }
  for (const id in units) if (!pos[id]) E.push('formation ' + id + ' never stands on the field');
  if (sc.note && /\b(the article|wikipedia)\b/i.test(sc.note)) E.push('the note speaks of its source: say "the accounts"');
  console.log('== ' + slug + ': ' + (E.length ? E.length + ' faults' : 'clean') + '  (' + (sc.units || []).length + ' formations, ' + P.length + ' phases)'); E.forEach(e => console.log('  ' + e)); if (E.length) bad++;
}
console.log(n + ' checked, ' + skipped + ' skipped, ' + bad + ' with faults'); process.exit(bad ? 1 : 0);
