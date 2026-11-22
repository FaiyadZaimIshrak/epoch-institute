// Adds a wave of states to the register (data/polities.json) from a spec file such as scripts/states/ms1/register.js,
// and their Wikidata items to scripts/geo-qids.tsv (looked up from each row's Wikipedia title), so that
// scripts/fetch-geo.ps1 can place them. Refuses an id already in the register, a link to an id that is neither in the
// register nor in the spec, an unknown type or relation, and a region source that does not exist. The register is one
// line of JSON written by PowerShell (its escapes kept as they are): the new rows are inserted as text at the end of
// "nodes" and of "links", so nothing else in the file changes. Without --write it only checks and prints.
//   node scripts/states/merge-register.js <spec.js> [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [specF] = process.argv.slice(2).filter(a => !a.startsWith('--')), WRITE = process.argv.includes('--write');
const SPEC = require(path.resolve(specF));
const PF = path.join(R, 'data', 'polities.json'), text = fs.readFileSync(PF, 'utf8'), POL = JSON.parse(text);
const NODE = new Map(POL.nodes.map(n => [n.id, n])), NEW = new Map(SPEC.map(r => [r[0], r]));
const TYPES = new Set(POL.nodes.map(n => n.t)), RELS = new Set(POL.links.map(l => l.r).concat(['absorbed', 'followed-by']));
const bad = [], nodes = [], links = [];
for (const [id, n, t, s, e, c, mo, a, ls, regFrom, title] of SPEC) {
  if (NODE.has(id)) bad.push(id + ': already in the register');
  if (!/^[a-z0-9-]+$/.test(id)) bad.push(id + ': not a slug');
  if (!TYPES.has(t)) bad.push(id + ': type ' + t);
  const src = NODE.get(regFrom); if (!src) { bad.push(id + ': region source ' + regFrom); continue; }
  if (typeof s !== 'number' || (e != null && e < s)) bad.push(id + ': years ' + s + '-' + e);
  if (!title) bad.push(id + ': no Wikipedia title');
  const node = { id, n, t, b: src.b, s, e: e == null ? null : e };
  if (a && a.length) node.a = a;
  node.m = t === 'colony' ? 'colonial' : 'bureaucratic'; node.c = c; node.mo = mo; if (src.rg) node.rg = src.rg;
  nodes.push(node);
  for (const [r, to, y] of ls) {
    if (!RELS.has(r)) bad.push(id + ': relation ' + r);
    if (!NODE.has(to) && !NEW.has(to)) bad.push(id + ': link to unknown ' + to);
    // "absorbed": the target merged into the new state; "followed-by": the target (an existing state) succeeded it
    links.push(r === 'absorbed' ? { s: to, t: id, r: 'merged-into', f: y, u: y } : r === 'followed-by' ? { s: to, t: id, r: 'successor-of', f: y, u: y } : { s: id, t: to, r, f: y, u: y });
  }
}
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
console.log(nodes.length + ' states, ' + links.length + ' links: all checked');
(async () => {
  // the Wikidata items, from the English Wikipedia titles (50 a request)
  const titles = SPEC.map(r => r[10]), q = {};
  for (let i = 0; i < titles.length; i += 50) {
    const u = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(titles.slice(i, i + 50).join('|'));
    const j = await (await fetch(u, { headers: { 'User-Agent': 'EpochInstituteTools/1.0 (https://the-epoch-institute.org)' } })).json();
    const map = {}; for (const x of (j.query.normalized || []).concat(j.query.redirects || [])) map[x.from] = x.to;
    for (const p of j.query.pages) for (const t of titles) { let tt = t; while (map[tt]) tt = map[tt]; if (tt === p.title && p.pageprops) q[t] = p.pageprops.wikibase_item; }
  }
  const noQ = SPEC.filter(r => !q[r[10]]).map(r => r[0]); if (noQ.length) { console.log('no Wikidata item for: ' + noQ.join(', ')); process.exit(1); }
  const qrows = SPEC.map(r => r[0] + '\t' + q[r[10]]);
  if (!WRITE) { console.log(qrows.join('\n')); return; }
  const iN = text.indexOf('],"links":['), iL = text.lastIndexOf(']}');
  if (iN < 0 || iL < iN) throw new Error('data/polities.json: the arrays were not found');
  const out = text.slice(0, iN) + ',' + nodes.map(x => JSON.stringify(x)).join(',') + text.slice(iN, iL) + ',' + links.map(x => JSON.stringify(x)).join(',') + text.slice(iL);
  JSON.parse(out); fs.writeFileSync(PF, out);
  const gq = path.join(R, 'scripts', 'geo-qids.tsv'); let g = fs.readFileSync(gq, 'utf8'); const eol = g.includes('\r\n') ? '\r\n' : '\n';
  if (!g.endsWith(eol)) g += eol; fs.writeFileSync(gq, g + qrows.join(eol) + eol);
  console.log('written: data/polities.json (+' + nodes.length + ' states, +' + links.length + ' links), scripts/geo-qids.tsv (+' + qrows.length + ')');
})().catch(e => { console.error(e); process.exit(2); });
