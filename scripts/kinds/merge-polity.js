// State profiles (polities, Nov 2026): appends checked profile sources (scripts/kinds/src/<slug>.json, the format of
// POLITY-GUIDE.md) to every data file a state profile lives in. The counterpart of merge-kinds.js for the other kinds.
//   node scripts/kinds/merge-polity.js [--check] <slug> [<slug> …]      (--check: validate the sources and write nothing)
// Writes: shared-data.js (an EMPIRES row {name, region, points, id, color} and EMPIRE_INFO), empire-profiles.js,
// empire-glance.js, empire-facts.js, epoch-stats.js (EMPIRE_STATS: rank by overall among the profiles, overall = the
// mean of the eight stats, tags, stats), point-descs.js ("Name|year" for every point) and data/polities.json (the
// register node's p = /empire/<slug>, so the state page redirects to the profile and the register links it). A name
// already in any file stops the run before anything is written. Every file must still evaluate.
// Then: link-scan.js, section-pictures.js, emblems, home-pictures.tsv + home-pics.js, regen-profiles.ps1, posters, build.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), SRC = path.join(__dirname, 'src');
const checkOnly = process.argv.includes('--check'), slugs = process.argv.slice(2).filter(a => a !== '--check'); if (!slugs.length) { console.error('usage: merge-polity.js <slug> …'); process.exit(1); }
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const F = { sd: rd('shared-data.js'), pr: rd('empire-profiles.js'), gl: rd('empire-glance.js'), fa: rd('empire-facts.js'), st: rd('epoch-stats.js'), pd: rd('point-descs.js'), po: rd('data/polities.json') };
const SECS = ['foundation', 'socioeconomy', 'military', 'governance', 'impact', 'decline'], FACTS = ['capital', 'founder', 'predecessor', 'successor'];
const DIMS = ['militaryPower', 'territorialReach', 'economicStrength', 'tradeNetworks', 'administrativeSophistication', 'culturalIntellectualOutput', 'institutionalLongevity', 'historicalInfluence'];
const REGIONS = JSON.parse(F.sd.match(/const REGIONS = (\[[^\]]*\])/)[1]);
const J = s => JSON.stringify(s), toSlug = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const reg = JSON.parse(F.po), nodes = Object.fromEntries(reg.nodes.map(n => [n.id, n]));
const bad = [], srcs = [];
for (const slug of slugs) {
  const f = path.join(SRC, slug + '.json'); if (!fs.existsSync(f)) { bad.push(slug + ': no ' + f); continue; }
  const s = JSON.parse(fs.readFileSync(f, 'utf8')); srcs.push(s); const n = s.name;
  if (s.id !== slug) bad.push(n + ': id ' + s.id + ' is not ' + slug);
  const node = nodes[slug]; if (!node) bad.push(n + ': no register node ' + slug); else { if (node.p) bad.push(n + ': the register already links a profile ' + node.p); if (node.n !== n) bad.push(n + ': the register names it ' + node.n); }
  if (!REGIONS.includes(s.region)) bad.push(n + ': region ' + s.region);
  for (const k of SECS) if (!s.sections || !/^<p>[\s\S]*<\/p>$/.test(s.sections[k] || '')) bad.push(n + ': section ' + k);
  if (!s.facts || !s.facts.capital) bad.push(n + ': fact capital');   // founder, predecessor and successor may be left out (a living state has no successor), as empire-facts.js already has it
  if (!Array.isArray(s.t) || s.t.length !== 3) bad.push(n + ': t'); if (!s.dyk || !s.info || !s.summary) bad.push(n + ': dyk/info/summary');
  if (!Array.isArray(s.ev) || s.ev.length < 5) bad.push(n + ': ev'); if (!Array.isArray(s.references)) bad.push(n + ': references');
  if (!Array.isArray(s.points) || s.points.length < 5 || s.points.some(p => !(p.length === 2 && Number.isInteger(p[0]) && p[1] >= 1 && p[1] <= 10))) bad.push(n + ': points');
  else { for (let i = 1; i < s.points.length; i++) if (s.points[i][0] <= s.points[i - 1][0]) bad.push(n + ': points out of order'); for (const p of s.points) if (!s.pointDescs || !s.pointDescs[String(p[0])]) bad.push(n + ': no description for ' + p[0]); }
  for (const d of DIMS) if (!s.stats || !(s.stats[d] >= 1 && s.stats[d] <= 10)) bad.push(n + ': stat ' + d);
  if (!Array.isArray(s.tags) || s.tags.length !== 3) bad.push(n + ': tags');
  const there = [['shared-data.js', F.sd.includes('"name": ' + J(n) + ',') || F.sd.includes('{"name":' + J(n) + ',')], ['empire-profiles.js', F.pr.includes('\n  ' + J(n) + ': {')], ['empire-glance.js', F.gl.includes('\n  ' + J(n) + ': {')],
    ['empire-facts.js', F.fa.includes('\n  ' + J(n) + ': {')], ['epoch-stats.js', F.st.includes("  '" + n.replace(/'/g, "\\'") + "': {")], ['point-descs.js', F.pd.includes(J(n + '|'))]].filter(x => x[1]).map(x => x[0]);
  if (there.length) bad.push(n + ': already in ' + there.join(', '));
  if (toSlug(n) !== slug) bad.push(n + ': its slug would be ' + toSlug(n) + ', not ' + slug + ' (profile pages go to /empire/<toSlug(name)>)');
}
if (bad.length) { console.error(bad.length + ' problems:\n  ' + bad.join('\n  ')); process.exit(1); }
if (checkOnly) { console.log(srcs.length + ' sources valid; nothing written (--check)'); process.exit(0); }
function put(text, entry, eol) {   // appended before the object literal's closing "};" (its own line, whatever its line ending)
  const m = /\r?\n\};[^]*$/.exec(text); if (!m) throw new Error('no closing }; found'); let head = text.slice(0, m.index); const t = head.trimEnd(); if (!t.endsWith(',') && !t.endsWith('{')) head = t + ',';
  return head + eol + entry + eol + '};' + eol;
}
// the overall mark and the rank among the profiles (1 = highest overall); the others' ranks are not renumbered
const stAll = [...F.st.matchAll(/overall:([\d.]+)/g)].map(m => +m[1]);
const PAL = ['#c9a84c', '#8fb8de', '#d98b8b', '#9ccf9c', '#b39ddb', '#f0a090', '#7fc8c8', '#e0c070', '#c08fd0', '#a0d0a0'];
for (const s of srcs) {
  const n = s.name, E = '\r\n';
  const row = '{"name": ' + J(n) + ', "region": ' + J(s.region) + ', "points": ' + J(s.points) + ', "id": ' + J(s.id) + ', "color": ' + J(PAL[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length]) + '}';
  const i = F.sd.indexOf('];', F.sd.indexOf('const EMPIRES = [')); F.sd = F.sd.slice(0, i) + ', ' + row + F.sd.slice(i);
  const ia = F.sd.indexOf('const EMPIRE_INFO = {'), ib = F.sd.indexOf('\n};', ia);
  F.sd = F.sd.slice(0, ia) + put(F.sd.slice(ia, ib + 3), '  ' + J(n) + ': ' + J(s.info), '\n') + F.sd.slice(ib + 3);
  F.pr = put(F.pr, '  ' + J(n) + ': {' + E + SECS.map(k => '    ' + k + ': ' + J(s.sections[k]) + ',').join(E) + E + '    summary: ' + J(s.summary) + ',' + E + '    references: [' + E + s.references.map(r => '    ' + J(r)).join(',' + E) + E + '    ]' + E + '  }', E);
  F.gl = put(F.gl, '  ' + J(n) + ': {t:' + J(s.t) + ',dyk:' + J(s.dyk) + ',ev:' + J(s.ev) + '}', E);
  F.fa = put(F.fa, '  ' + J(n) + ': {' + FACTS.filter(k => s.facts[k]).map(k => k + ':' + J(s.facts[k])).join(',') + '}', E);
  const overall = +(DIMS.reduce((a, d) => a + s.stats[d], 0) / DIMS.length).toFixed(1), rank = stAll.filter(o => o > overall).length + 1;
  const stEol = F.st.includes('\r\n') ? '\r\n' : '\n';
  const stEntry = "  '" + n.replace(/'/g, "\\'") + "': { rank:" + rank + ', overall:' + overall + ", tags:['" + s.tags.join("','") + "']," + stEol + '    stats:{ ' + DIMS.map(d => d + ':' + s.stats[d]).join(', ') + ' } }';
  const st0c = F.st.indexOf('EMPIRE_STATS'), close = st0c + /\r?\n\};/.exec(F.st.slice(st0c)).index; let head = F.st.slice(0, close); const ht = head.trimEnd(); if (!ht.endsWith(',') && !ht.endsWith('{')) head = ht + ',';
  F.st = head + stEol + stEntry + F.st.slice(close);
  const pdEol = F.pd.includes('\r\n') ? '\r\n' : '\n';
  F.pd = put(F.pd, s.points.map(p => '  ' + J(n + '|' + p[0]) + ': ' + J(s.pointDescs[String(p[0])])).join(',' + pdEol), pdEol);
  nodes[s.id].p = '/empire/' + s.id;
}
// every file must still evaluate, and hold every profile
const ev = (t, v) => new Function(t.replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return ' + v)();
const P = ev(F.pr, 'EMPIRE_PROFILES'), G = ev(F.gl, 'GLANCE'), FA = ev(F.fa, 'EMPIRE_FACTS'), PD = ev(F.pd, 'POINT_DESCS');
const st0 = F.st.indexOf('var EMPIRE_STATS_BY_NAME'), st1 = F.st.indexOf('\n};', st0) + 3;
const ST = new Function(F.st.slice(0, st1) + ';return EMPIRE_STATS_BY_NAME')();
const SD = new Function(F.sd.replace(/const EVENTS[\s\S]*$/, '') + ';return [EMPIRES, EMPIRE_INFO]')();
for (const s of srcs) {
  for (const [o, w] of [[P, 'profiles'], [G, 'glance'], [FA, 'facts'], [SD[1], 'info'], [ST, 'stats']]) if (!o[s.name]) { console.error('lost ' + s.name + ' in ' + w); process.exit(1); }
  if (SD[0].filter(e => e.name === s.name).length !== 1) { console.error('EMPIRES row of ' + s.name); process.exit(1); }
  if (!PD[s.name + '|' + s.points[0][0]]) { console.error('point descriptions of ' + s.name); process.exit(1); }
}
// data/polities.json is written back with its own formatting kept (several nodes a line): only the node gains "p",
// put before its closing brace (a node holds arrays but no objects, so the first "}" after its id closes it)
let po = F.po;
for (const s of srcs) {
  const a = po.indexOf('{"id":' + J(s.id) + ','); if (a < 0) { console.error('register node of ' + s.id + ' not found'); process.exit(1); }
  const b = po.indexOf('}', a); if (b < 0 || po.slice(a + 1, b).includes('{')) { console.error('register node of ' + s.id + ' has an unexpected shape'); process.exit(1); }
  po = po.slice(0, b) + ',"p":' + J('/empire/' + s.id) + po.slice(b);
}
JSON.parse(po);
fs.writeFileSync(path.join(R, 'shared-data.js'), F.sd); fs.writeFileSync(path.join(R, 'empire-profiles.js'), F.pr); fs.writeFileSync(path.join(R, 'empire-glance.js'), F.gl);
fs.writeFileSync(path.join(R, 'empire-facts.js'), F.fa); fs.writeFileSync(path.join(R, 'epoch-stats.js'), F.st); fs.writeFileSync(path.join(R, 'point-descs.js'), F.pd); fs.writeFileSync(path.join(R, 'data/polities.json'), po);
console.log('merged ' + srcs.length + ' state profiles; EMPIRES now ' + SD[0].length);
