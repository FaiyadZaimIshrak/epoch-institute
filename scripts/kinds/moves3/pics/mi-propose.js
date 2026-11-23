// (movements, third wave, and ideologies, second wave; from the works and lives proposer, itself made from the cities' proposer by mk-propose.js)
// Proposes section pictures, for the editor's eye: per section the first pictured entry it
// links that is a monument, else a site or an artefact, else a person, a text, an event; never another city, a region, a
// river, a state or a term (maps, flags, modern views), never the city's own entry, no picture twice in a profile.
//   node city-propose.js <report.tsv> <names file> <out dir> [rejects file]     (run in the repository)
// Writes <out dir>/prop-<k>.html (numbered cells, 90 a sheet, for shot-file.js), prop.json ([n, profile, section, slug])
// and legend.txt (n, profile, section, slug, the entry's name and subtype); with a rejects file (numbers), the next
// candidate is tried for each rejected cell. REFUSE=<file of slugs> refuses entries wherever they stand.
const fs = require('fs'), path = require('path'); const [rep, namesF, out, rejF] = process.argv.slice(2);
const E = new Function(fs.readFileSync('encyclopedia-data.js', 'utf8') + ';return ENCYCLOPEDIA')(); const by = new Map(E.map(e => [e.slug, e]));
const self = new Map(fs.readFileSync('scripts/kinds/self.tsv', 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t')));
const rows = fs.readFileSync(rep, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));
const names = fs.readFileSync(namesF, 'utf8').split(/\r?\n/).filter(Boolean), SECS = ['background', 'aims', 'events', 'people', 'outcomes', 'origins', 'ideas', 'spread', 'power', 'critiques', 'legacy'];
const EX = new Set(fs.readFileSync('scripts/kinds/link-exclusions.tsv', 'utf8').split(/\r?\n/).map(l => l.split('\t').slice(0, 2).join('|')));
const NEVER = new Set(['muhammad', 'ali-ibn-abi-talib', 'husayn-ibn-ali', 'hasan-ibn-ali', 'fatima', 'battle-of-uhud', 'battle-of-badr', 'companions-of-the-prophet']);
const bad = new Set(); fs.mkdirSync(out, { recursive: true });
const stateF = path.join(out, 'refused.json'); if (fs.existsSync(stateF)) for (const k of JSON.parse(fs.readFileSync(stateF, 'utf8'))) bad.add(k);
if (rejF) { const prev = JSON.parse(fs.readFileSync(path.join(out, 'prop.json'), 'utf8')); const rej = new Set(fs.readFileSync(rejF, 'utf8').split(/\s+/).filter(Boolean).map(Number));
  for (const [n, p, s, slug] of prev) if (rej.has(n)) { bad.add(p + '|' + s + '|' + slug); bad.add(p + '|*|' + slug); } fs.writeFileSync(stateF, JSON.stringify([...bad])); }
if (process.env.REFUSE) for (const s of fs.readFileSync(process.env.REFUSE, 'utf8').split(/\s+/).filter(Boolean)) NEVER.add(s);
const SC = { monument: 0, site: 1, artifact: 1, infrastructure: 2, person: 3, text: 4, work: 4, institution: 5, event: 6, battle: 6, siege: 6, revolt: 6, disaster: 6, treaty: 7 };
const score = e => { const k = e.subtype || e.type; return k in SC ? SC[k] : e.type === 'person' ? 3 : 99; };
const css = '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:6px;font:11px Arial;background:#181818;color:#eee;display:flex;flex-wrap:wrap;gap:3px}.c{position:relative;width:122px;height:92px}.c img{width:122px;height:76px;object-fit:cover;object-position:center 25%;display:block}.c b{position:absolute;left:0;top:0;background:#000c;color:#fff;padding:0 3px;font-size:12px}.c i{display:block;font-style:normal;font-size:10px;line-height:15px;white-space:nowrap;overflow:hidden;color:#ccc}.n{width:100%;font-size:11px;color:#e8c97a}</style>';
const prop = [], legend = []; let n = 0, cells = [];
for (const p of names) { const used = new Set([self.get(p)]); const mine = [];
  for (const s of SECS) { const seen = new Set(), c = [];
    for (const r of rows) if (r[0] === p && r[1] === s && !seen.has(r[2]) && !EX.has(p + '|' + r[2])) { seen.add(r[2]); const e = by.get(r[2]); if (e && e.img && !NEVER.has(e.slug) && score(e) < 99 && !bad.has(p + '|' + s + '|' + e.slug) && !bad.has(p + '|*|' + e.slug)) c.push(e); }
    c.sort((a, b) => score(a) - score(b)); const e = c.find(x => !used.has(x.slug) && !used.has(x.img)); if (!e) continue; used.add(e.slug); used.add(e.img);
    n++; prop.push([n, p, s, e.slug]); legend.push([n, p, s, e.slug, e.name, e.subtype || e.type, c.length].join('\t'));
    mine.push('<div class="c"><img src="' + e.img + '"><b>' + n + '</b><i>' + e.name.replace(/</g, '&lt;') + '</i></div>'); }
  if (mine.length) cells.push(['<div class="n">' + p + '</div>'].concat(mine)); }
// sheets of about 90 cells, never cutting a city in two
let k = 0, cur = [], cnt = 0; const flush = () => { if (cur.length) { fs.writeFileSync(path.join(out, 'prop-' + k + '.html'), css + cur.join('')); k++; cur = []; cnt = 0; } };
for (const c of cells) { if (cnt + c.length - 1 > 60) flush(); cur.push(...c); cnt += c.length - 1; } flush();
fs.writeFileSync(path.join(out, 'prop.json'), JSON.stringify(prop)); fs.writeFileSync(path.join(out, 'legend.txt'), legend.join('\n') + '\n');
console.log(n + ' proposals for ' + new Set(prop.map(x => x[1])).size + ' of ' + names.length + ' profiles on ' + k + ' sheets; ' + bad.size + ' refused so far');
