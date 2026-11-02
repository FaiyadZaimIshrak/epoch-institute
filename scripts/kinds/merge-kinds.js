// Profiles of the other kinds (cultures, movements, religions …): appends checked profiles to the data files.
//   node scripts/kinds/merge-kinds.js <kind> <slug> [<slug> …]      (reads scripts/kinds/src/<slug>.json)
//   node scripts/kinds/merge-kinds.js <kind> --replace <slug> …     (rewrites profiles merged before, in place)
// A source file holds {name, region, start, end, circa, endCirca, info, facts {…}, t [3], dyk, ev [[date, text]],
// sections {…}, summary, references [], notes []} (notes are the editor's and are not merged). The section and fact keys
// must be the kind's own (PROFILE_KINDS in shared-data.js). Writes:
//   shared-data.js       an EMPIRES row {name, region, kind, start, end, circa?, endCirca?} and EMPIRE_INFO[name] = info
//   empire-profiles.js   EMPIRE_PROFILES[name] = {sections …, summary, references}
//   empire-glance.js     GLANCE[name] = {t, dyk, ev}
//   empire-facts.js      EMPIRE_FACTS[name] = facts
// Each file keeps its line endings (shared-data.js LF with its lone CR, the others CRLF). Without --replace a name
// already present in any file stops the run before anything is written, so a re-run never doubles a profile.
// Then: section pictures (section-pictures.js), emblems, home-pictures.tsv, regen-profiles.ps1, a full build.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), SRC = path.join(__dirname, 'src');
const args = process.argv.slice(2), kind = args.shift(), replace = args[0] === '--replace'; if (replace) args.shift();
if (!kind || !args.length) { console.error('usage: merge-kinds.js <kind> [--replace] <slug> …'); process.exit(1); }
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const files = { sd: rd('shared-data.js'), pr: rd('empire-profiles.js'), gl: rd('empire-glance.js'), fa: rd('empire-facts.js') };
// the kind's sections and facts, read from PROFILE_KINDS itself
const pk = new Function(files.sd.slice(files.sd.indexOf('const PROFILE_KINDS'), files.sd.indexOf('function profileKind')) + ';return PROFILE_KINDS')()[kind];
if (!pk) { console.error('no kind ' + kind); process.exit(1); }
const SECS = pk.sections.map(s => s[0]), FACTS = (pk.facts || []).map(f => f[0]);
const REGIONS = JSON.parse(files.sd.match(/const REGIONS = (\[[^\]]*\])/)[1]);
const J = s => JSON.stringify(s);
const bad = [], srcs = [];
for (const slug of args) {
  const f = path.join(SRC, slug + '.json'); if (!fs.existsSync(f)) { bad.push(slug + ': no ' + f); continue; }
  const s = JSON.parse(fs.readFileSync(f, 'utf8')); srcs.push(s);
  const n = s.name;
  if (!REGIONS.includes(s.region)) bad.push(n + ': region ' + s.region);
  if (!Number.isInteger(s.start) || !(s.end === null || Number.isInteger(s.end))) bad.push(n + ': start/end');
  for (const k of SECS) if (!s.sections || !/^<p>[\s\S]*<\/p>$/.test(s.sections[k] || '')) bad.push(n + ': section ' + k);
  for (const k of Object.keys(s.sections || {})) if (!SECS.includes(k)) bad.push(n + ': unknown section ' + k);
  for (const k of FACTS) if (!s.facts || !s.facts[k]) bad.push(n + ': fact ' + k);
  if (!Array.isArray(s.t) || s.t.length !== 3) bad.push(n + ': t');
  if (!s.dyk || !s.info || !s.summary) bad.push(n + ': dyk/info/summary');
  if (!Array.isArray(s.ev) || s.ev.length < 5 || s.ev.some(e => e.length !== 2)) bad.push(n + ': ev');
  if (!Array.isArray(s.references)) bad.push(n + ': references');   // may be empty: an article that names no works (Yangshao)
  const there = [['shared-data.js', files.sd.includes('{"name": ' + J(n) + ',')], ['empire-profiles.js', files.pr.includes('\n  ' + J(n) + ': {')],
    ['empire-glance.js', files.gl.includes('\n  ' + J(n) + ': {')], ['empire-facts.js', files.fa.includes('\n  ' + J(n) + ': {')]].filter(x => x[1]).map(x => x[0]);
  if (!replace && there.length) bad.push(n + ': already in ' + there.join(', '));
  if (replace && there.length !== 4) bad.push(n + ': --replace, but in ' + (there.join(', ') || 'no file'));
}
if (bad.length) { console.error(bad.length + ' problems:\n  ' + bad.join('\n  ')); process.exit(1); }

// one entry of an object literal that ends "\r\n};" (or "\n};"): appended before the close, or put in place of the old one
function put(text, name, entry, eol) {
  const key = '\n  ' + J(name) + ': {';
  if (replace) {
    const a = text.indexOf(key) + 1; let b = text.indexOf(eol + '  "', a); const close = text.lastIndexOf(eol + '};');
    if (b < 0 || b > close) b = close;
    const old = text.slice(a, b), comma = /,\s*$/.test(old) ? ',' : '';
    return text.slice(0, a) + entry + comma + text.slice(b);
  }
  const close = text.lastIndexOf(eol + '};'); let head = text.slice(0, close);
  const t = head.trimEnd(); if (!t.endsWith(',') && !t.endsWith('{')) head = t + ',';
  return head + eol + entry + text.slice(close);
}
for (const s of srcs) {
  const n = s.name;
  // shared-data.js: the EMPIRES row on line 3, then EMPIRE_INFO
  const row = { name: n, region: s.region, kind, start: s.start, end: s.end };
  if (s.circa) row.circa = true; if (s.endCirca) row.endCirca = true;
  const rowS = '{' + Object.entries(row).map(([k, v]) => J(k) + ': ' + J(v)).join(', ') + '}';
  if (replace) files.sd = files.sd.replace(new RegExp('\\{"name": ' + J(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ', [^}]*\\}'), () => rowS);
  else { const i = files.sd.indexOf('];', files.sd.indexOf('const EMPIRES = [')); files.sd = files.sd.slice(0, i) + ', ' + rowS + files.sd.slice(i); }
  const ia = files.sd.indexOf('const EMPIRE_INFO = {'), ib = files.sd.indexOf('\n};', ia);
  let info = files.sd.slice(ia, ib + 3); info = put(info, n, '  ' + J(n) + ': ' + J(s.info), '\n'); files.sd = files.sd.slice(0, ia) + info + files.sd.slice(ib + 3);
  // empire-profiles.js: one key a line, references one a line
  const E = '\r\n';
  const pe = '  ' + J(n) + ': {' + E + SECS.map(k => '    ' + k + ': ' + J(s.sections[k]) + ',').join(E) + E + '    summary: ' + J(s.summary) + ',' + E +
    '    references: [' + E + s.references.map(r => '    ' + J(r)).join(',' + E) + E + '    ]' + E + '  }';
  files.pr = put(files.pr, n, pe, E);
  files.gl = put(files.gl, n, '  ' + J(n) + ': {t:' + J(s.t) + ',dyk:' + J(s.dyk) + ',ev:' + J(s.ev) + '}', E);
  files.fa = put(files.fa, n, '  ' + J(n) + ': {' + FACTS.map(k => k + ':' + J(s.facts[k])).join(',') + '}', E);
}
// every file must still evaluate
const ev = (t, v) => new Function(t.replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return ' + v)();
const P = ev(files.pr, 'EMPIRE_PROFILES'), G = ev(files.gl, 'GLANCE'), F = ev(files.fa, 'EMPIRE_FACTS');
const SD = new Function(files.sd.replace(/const EVENTS[\s\S]*$/, '') + ';return [EMPIRES, EMPIRE_INFO]')();
for (const s of srcs) for (const [o, w] of [[P, 'profiles'], [G, 'glance'], [F, 'facts'], [SD[1], 'info']]) if (!o[s.name]) { console.error('lost ' + s.name + ' in ' + w); process.exit(1); }
for (const s of srcs) if (SD[0].filter(e => e.name === s.name).length !== 1) { console.error('EMPIRES row of ' + s.name); process.exit(1); }
fs.writeFileSync(path.join(R, 'shared-data.js'), files.sd); fs.writeFileSync(path.join(R, 'empire-profiles.js'), files.pr);
fs.writeFileSync(path.join(R, 'empire-glance.js'), files.gl); fs.writeFileSync(path.join(R, 'empire-facts.js'), files.fa);
console.log((replace ? 'replaced ' : 'merged ') + srcs.length + ' ' + kind + ' profiles; EMPIRES now ' + SD[0].length);
