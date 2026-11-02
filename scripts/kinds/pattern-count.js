// How often the link patterns of given entries match in the encyclopedia's descriptions and the day events, with a few
// sample contexts each: a check before new patterns go live (a common word or a name inside longer names shows up here).
//   node scripts/kinds/pattern-count.js <slug> … | --added-since=<slug>   (every entry after that one in the file)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const L = new Function(rd('encyclopedia-links.js') + ';return {ENC_LINKS, ENC_FN}')();
const ed = rd('encyclopedia-data.js');
const descs = [...ed.matchAll(/^  \{slug:"([^"]+)".*?desc:("(?:[^"\\]|\\.)*")/gm)].map(m => [m[1], JSON.parse(m[2])]);
const days = JSON.parse(rd('data/history.json')); const evs = [];
for (const k of Object.keys(days)) for (const e of (days[k].events || days[k])) if (e && e.description) evs.push(['day ' + k, (e.title || '') + ' ' + e.description]);
const texts = descs.concat(evs);
let slugs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const since = (process.argv.find(a => a.startsWith('--added-since=')) || '').slice(14);
if (since) { const i = descs.findIndex(d => d[0] === since); slugs = descs.slice(i + 1).map(d => d[0]); }
const rows = L.ENC_LINKS.e;
for (const s of slugs) {
  const row = rows.find(r => r[0] === s); if (!row) continue;
  const rxs = row[1].map(p => L.ENC_FN.rx(p[0], p[1]));
  const hits = [];
  for (const [w, t] of texts) { if (w === s) continue; for (const rx of rxs) { rx.lastIndex = 0; const m = rx.exec(t); if (m) { hits.push(w + ': …' + t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30) + '…'); break; } } }
  console.log(String(hits.length).padStart(5), s, '|', row[1].map(p => p[0]).join(' / '));
  for (const h of hits.slice(0, 3)) console.log('        ', h.replace(/\s+/g, ' '));
}
