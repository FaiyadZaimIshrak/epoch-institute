// What a reading-path stop's own page says, for writing its "why" (PATHS-GUIDE.md): a profile's teaser, its three
// takeaways and key events; an entry's name, type, dates and description. Also finds stops by a word.
//   node scripts/paths/stop.js /empire/mali-empire | /culture/jomon-culture | /encyclopedia/mansa-musa …
//   node scripts/paths/stop.js --find <word>      profiles and entries whose name holds the word, with their addresses
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const c = {}; new Function('c', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';c.I = EMPIRE_INFO; c.E = EMPIRES; c.u = profileUrl; c.t = profileSpanText;')(c);
const G = new Function(fs.readFileSync(path.join(R, 'empire-glance.js'), 'utf8') + ';return GLANCE')();
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const byUrl = new Map(c.E.map(e => [c.u(e), e])), bySlug = new Map(ENC.map(e => [e.slug, e]));
// Git Bash turns /culture/x into C:/.../culture/x: keep the address from its folder on (a bare culture/x works too)
const FOLDER = /^(?:.*?[\/\\])?(empire|religion|language|culture|movement|government|ideology|encyclopedia)[\/\\]/;
const norm = h => h.replace(FOLDER, '/$1/');
const a = process.argv.slice(2);
if (a[0] === '--find') {
  const w = (a[1] || '').toLowerCase();
  for (const e of c.E) if (e.name.toLowerCase().includes(w)) console.log(c.u(e) + '\t' + e.name + '\t' + c.t(e) + '\t' + (e.kind || 'polity'));
  for (const e of ENC) if (e.name.toLowerCase().includes(w)) console.log('/encyclopedia/' + e.slug + '\t' + e.name + '\t' + (e.dates || '') + '\t' + e.type);
} else for (const h0 of a) {
  const h = norm(h0), p = byUrl.get(h);
  if (p) { const g = G[p.name] || {}; console.log(`== ${h} | ${p.name} | ${c.t(p)} | ${p.kind || 'polity'}\n${c.I[p.name] || ''}\n` + (g.t || []).map(x => '- ' + x).join('\n') + '\n' + (g.ev || []).map(x => '  ' + x[0] + ': ' + x[1]).join('\n')); continue; }
  const m = h.match(/^\/encyclopedia\/(.+)$/), e = m && bySlug.get(m[1]);
  if (e) { console.log(`== ${h} | ${e.name} | ${e.type}${e.dates ? ' | ' + e.dates : ''}\n${e.desc}`); continue; }
  console.log('== ' + h + ' NOT FOUND');
}
