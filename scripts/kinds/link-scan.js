// Gold links of the profiles: which encyclopedia entries a profile's page links, found with generator.html's OWN linkify
// (its source is read from generator.html and run here, instrumented only to record what it chose), so the lists match the
// pages exactly. The parts scanned are the ones the template links: the six sections, the summary (or the teaser), the
// facts, the takeaways, the "Did you know?" and the key events.
//   node scripts/kinds/link-scan.js [--write] [--report=file.tsv] <profile name> …     (or --kind=culture --from=N:
//        every profile of that kind from its N-th, 0-based, in EMPIRES order)
// Without --write: prints a report (profile, section, entry, the text linked, its context) for reading by eye; wrong matches
// go into ENC_LINKS.ex (scripts/kinds/link-exclusions.tsv, applied by --write).
// --write sets, for each profile scanned:
//   ENC_LINKS.byEmpire[name] = its profile-only form rows first (rows from fs on, kept in their order), then every other
//     row that matched anything in its text (claimed text included: a row that claims "Abbasid Caliphate" must stay so
//     that "Caliphate" inside it is not linked on its own), so the page links exactly what this scan saw;
//   the "empires" list of each entry the page links: {name, slug, sections} (sections where it is linked; the facts,
//     takeaways, events and summary count as "summary"); an entry no longer linked loses the profile.
// ENC_LINKS.self (the profile's own entry, claimed but never linked) is honoured, not written: set it by hand.
const fs = require('fs'), path = require('path');
// the patterns tried compile to machine code that stays (about 25 KB each): a long run needs more than the default heap
if (!process.execArgv.some(a => a.startsWith('--max-old-space-size'))) {
  const r = require('child_process').spawnSync(process.execPath, ['--max-old-space-size=6144', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status === null ? 1 : r.status);
}
const R = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const WRITE = argv.includes('--write');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const sdT = rd('shared-data.js');
const SD = new Function(sdT.replace(/^const /gm, 'var ') + ';return {EMPIRES, EMPIRE_INFO, PROFILE_KINDS, toSlug, profileKind}')();
const ev = (f, v) => new Function(rd(f).replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return ' + v)();
const P = ev('empire-profiles.js', 'EMPIRE_PROFILES'), G = ev('empire-glance.js', 'GLANCE'), F = ev('empire-facts.js', 'EMPIRE_FACTS');
const elT = rd('encyclopedia-links.js');
const LK = new Function(elT + ';return {ENC_LINKS, ENC_FN}')(); const ENC_LINKS = LK.ENC_LINKS, ENC_FN = LK.ENC_FN;
// exclusions recorded in link-exclusions.tsv (profile TAB slug TAB why) go into ENC_LINKS.ex before the scan
const exF = path.join(__dirname, 'link-exclusions.tsv');
let nExAdd = 0;
if (fs.existsSync(exF)) for (const l of fs.readFileSync(exF, 'utf8').split(/\r?\n/)) {
  if (!l || l.startsWith('#')) continue; const [p, s] = l.split('\t'); const a = (ENC_LINKS.ex[p] = ENC_LINKS.ex[p] || []);
  if (!a.includes(s)) { a.push(s); nExAdd++; }
}
// a profile's own entry (self.tsv: profile TAB slug): claimed in its text, never linked
const selfF = path.join(__dirname, 'self.tsv');
if (fs.existsSync(selfF)) for (const l of fs.readFileSync(selfF, 'utf8').split(/\r?\n/)) {
  if (!l || l.startsWith('#')) continue; const [p, s] = l.split('\t'); if (ENC_LINKS.self[p] !== s) { ENC_LINKS.self[p] = s; nExAdd++; }
}
// generator.html's own functions
const gh = rd('generator.html');
const grab = name => { const i = gh.indexOf('function ' + name + '('); if (i < 0) throw new Error('generator.html: no ' + name);
  let d = 0, j = gh.indexOf('{', i); for (; j < gh.length; j++) { if (gh[j] === '{') d++; else if (gh[j] === '}' && !--d) break; } return gh.slice(i, j + 1); };
let lk = grab('linkify');
const A = 'cands.push({ p: p, s: s, e: e, slug: slug });', B = '  Object.keys(chosen).forEach(function (p) {';
if (!lk.includes(A) || !lk.includes(B)) throw new Error('linkify changed: update link-scan.js');
lk = lk.replace(A, 'cands.push({ p: p, s: s, e: e, slug: slug, row: i }); __S.rows[i] = 1;')
  .replace(B, '  Object.keys(chosen).forEach(function (p) { chosen[p].forEach(function (c) { if (c.slug !== self) __S.hits.push({ slug: c.slug, row: c.row, txt: parts[p].slice(c.s, c.e), ctx: parts[p].slice(Math.max(0, c.s - 50), c.e + 50) }); }); });\n' + B);
const env = new Function('ENC_LINKS', 'ENC_FN', 'EMPIRES', '__S',
  'var ENC_RX = null;\n' + grab('encCompile') + '\n' + grab('yearsOf') + '\n' + grab('encCtx') + '\n' + grab('esc') + '\n' + lk + '\nreturn { linkify: linkify, esc: esc };');

const fsRow = ENC_LINKS.fs;
const KEYS = ENC_LINKS.e.map(en => en[1].map(pt => { const w = (pt[0].match(/[\p{L}\p{N}]+/gu) || [pt[0]]).sort((x, y) => y.length - x.length)[0].toLowerCase(); return w.length > 2 && /y$/.test(w) ? w.slice(0, -1) : w; }));
// --entries=<file of slugs>: only those entries' rows are added (see the loop)
const ADD = opt('entries') ? (() => { const want = new Set(fs.readFileSync(opt('entries'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
  const s = new Set(); ENC_LINKS.e.forEach((r, i) => { if (i < fsRow && (want.has(r[0]) || (r[0] === '@g' && r[2].some(x => want.has(x))))) s.add(i); }); return s; })() : null;
const ADDSLUGS = opt('entries') ? new Set(fs.readFileSync(opt('entries'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean)) : null;
// one compiled copy of the patterns for the whole run (ENC_RX lives inside it)
const S = { rows: {}, hits: [] }, L = env(ENC_LINKS, ENC_FN, SD.EMPIRES, S);
let names = argv.filter(a => !a.startsWith('--'));
if (opt('kind')) names = SD.EMPIRES.filter(e => SD.profileKind(e) === opt('kind')).slice(+(opt('from') || 0), +(opt('from') || 0) + (+(opt('count')) || 1e9)).map(e => e.name);   // --count=N: a slice
const report = [['profile', 'section', 'entry', 'text', 'context'].join('\t')];
const results = {};
for (const n of names) {
  const e = SD.EMPIRES.find(x => x.name === n); if (!e) { console.error('no profile ' + n); process.exit(1); }
  const kind = SD.PROFILE_KINDS[SD.profileKind(e)], p = P[n] || {}, g = G[n], f = F[n] || {};
  // every row but the other profiles' short forms: this profile's own forms (already in byEmpire) stay
  const own = (ENC_LINKS.byEmpire[n] || []).filter(i => i >= fsRow);
  // only rows that can match: the longest word of one of their names (lower case; a final y may be ies) is in the text. Running
  // all 38,000 patterns would compile each to machine code (over 1 GB) for the same result
  const hay = [...kind.sections.map(s => p[s[0]] || ''), p.summary || '', SD.EMPIRE_INFO[n] || '', ...Object.values(f), ...(g ? [...g.t, g.dyk, ...g.ev.map(x => x[1])] : [])].join(' | ').toLowerCase();
  const all = []; for (let i = 0; i < fsRow; i++) if ((!ADD || ADD.has(i)) && KEYS[i].some(k => hay.includes(k))) all.push(i);
  const saved = ENC_LINKS.byEmpire[n];
  // --entries: append only. The rows the profile has keep their places and only the given entries' rows are tried, so
  // nothing linked before moves (a profile scanned long ago keeps the links its page has)
  const old = ADD ? (saved || []).filter(i => i < fsRow) : [];
  ENC_LINKS.byEmpire[n] = own.concat(old, all.filter(i => !old.includes(i)));
  const rows = {}, secs = {};
  const run = (sec, html) => { if (!html) return; const hits = []; S.rows = rows; S.hits = hits; L.linkify(html, n);
    for (const h of hits) { (secs[h.slug] = secs[h.slug] || new Set()).add(sec); report.push([n, sec, h.slug, h.txt, h.ctx.replace(/\s+/g, ' ')].join('\t')); } };
  const E = L.esc;
  for (const [k] of kind.sections) run(k, p[k]);
  if (p.summary) run('summary', E(p.summary)); else run('summary', E(SD.EMPIRE_INFO[n]));
  const facts = kind.facts ? kind.facts.map(r => r[0]) : ['capital', 'founder'];   // a polity's predecessor/successor go through linkStates
  for (const k of facts) run('summary', E(f[k]));
  if (g) { for (const t of g.t) run('summary', E(t)); run('summary', E(g.dyk)); for (const x of g.ev) run('summary', E(x[1])); }
  ENC_LINKS.byEmpire[n] = saved;
  const found = Object.keys(rows).map(Number).filter(i => i < fsRow).sort((a, b) => a - b);
  results[n] = { rows: ADD ? own.concat(old, found.filter(i => !old.includes(i) && ADD.has(i))) : own.concat(found), secs, slug: SD.toSlug(n) };
  console.log(n.padEnd(34), Object.keys(secs).length, 'entries linked;', results[n].rows.length, 'rows');
}
if (opt('report')) fs.writeFileSync(opt('report'), report.join('\n') + '\n');
if (!WRITE) { if (nExAdd) console.log('(' + nExAdd + ' exclusions from link-exclusions.tsv not yet in encyclopedia-links.js: --write adds them)'); process.exit(0); }

// encyclopedia-links.js: the JSON on line 5, written as PowerShell's EncJson writes it (JavaScriptStringEncode)
const JSE = new RegExp('[\\\\"\'<>&\\x00-\\x1f' + String.fromCharCode(0x85, 0x2028, 0x2029) + ']', 'g');
const ESC1 = { '\\': '\\\\', '"': '\\"', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t' };
const jse = s => s.replace(JSE, c => ESC1[c] || '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const enc = v => v === null || v === undefined ? 'null' : typeof v === 'string' ? '"' + jse(v) + '"' : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : Array.isArray(v) ? '[' + v.map(enc).join(',') + ']' : '{' + Object.keys(v).map(k => enc(k) + ':' + enc(v[k])).join(',') + '}';
const i0 = elT.indexOf('var ENC_LINKS = ') + 16, i1 = elT.indexOf('};\n', i0);
// the writer must give back the same data when nothing changed (escapes may differ: some keys were written with a plain
// apostrophe, most with ' as PowerShell writes them)
const orig = new Function(elT + ';return ENC_LINKS')();
if (JSON.stringify(JSON.parse(enc(orig))) !== JSON.stringify(orig)) throw new Error('the JSON writer does not reproduce encyclopedia-links.js: stop');
for (const [n, r] of Object.entries(results)) ENC_LINKS.byEmpire[n] = r.rows;
fs.writeFileSync(path.join(R, 'encyclopedia-links.js'), elT.slice(0, i0) + enc(ENC_LINKS) + elT.slice(i1 + 1));
// encyclopedia-data.js: one entry a line, "empires:[{name:…,slug:…,sections:[…]}]" at its end
let ed = rd('encyclopedia-data.js'), nAdd = 0, nDrop = 0;
const nameJ = s => JSON.stringify(s).replace(/[<>&']/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));   // as ConvertTo-Json writes a name
ed = ed.replace(/^(  \{slug:"([^"]+)".*?empires:\[)(.*)(\]\},?)$/gm, (all, head, slug, inner, tail) => {
  let items = inner ? inner.split(/,(?=\{name:)/) : [];
  for (const [n, r] of Object.entries(results)) {
    if (ADDSLUGS && !ADDSLUGS.has(slug)) continue;   // append mode: only the given entries' lists change
    const at = items.findIndex(x => x.startsWith('{name:' + nameJ(n) + ','));
    const s = r.secs[slug];
    if (!s) { if (at >= 0) { items.splice(at, 1); nDrop++; } continue; }
    const order = [...SD.PROFILE_KINDS[SD.profileKind(SD.EMPIRES.find(x => x.name === n))].sections.map(x => x[0]), 'summary'];
    const it = '{name:' + nameJ(n) + ',slug:"' + r.slug + '",sections:[' + order.filter(k => s.has(k)).map(k => '"' + k + '"').join(',') + ']}';
    if (at >= 0) items[at] = it; else { items.push(it); nAdd++; }
  }
  return head + items.join(',') + tail;
});
fs.writeFileSync(path.join(R, 'encyclopedia-data.js'), ed);
console.log('written: byEmpire for ' + Object.keys(results).length + ' profiles; entry mentions added ' + nAdd + ', removed ' + nDrop + '; exclusions added ' + nExAdd);
