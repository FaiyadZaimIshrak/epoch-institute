// Before a wave is merged: how often each drafted entry's name and other names already stand in the encyclopedia's
// descriptions and the day events, with three sample contexts, so the editor can choose the link patterns (links.json
// for merge-entries.js) before any goes live. pattern-count.js does the same for patterns already applied.
//   node scripts/entries/name-count.js <out.json> [<out.json> …]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ed = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
const descs = [...ed.matchAll(/^  \{slug:"([^"]+)".*?desc:("(?:[^"\\]|\\.)*")/gm)].map(m => [m[1], JSON.parse(m[2])]);
const days = JSON.parse(fs.readFileSync(path.join(R, 'data', 'history.json'), 'utf8')), evs = [];
for (const k of Object.keys(days)) for (const e of (days[k].events || days[k])) if (e && e.description) evs.push(['day ' + k, (e.title || '') + ' ' + e.description]);
const texts = descs.concat(evs), esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const f of process.argv.slice(2)) for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  for (const n of [e.name, ...e.aka]) {
    const re = new RegExp('(?<![\\p{L}\\p{N}])' + esc(n) + '(?![\\p{L}\\p{N}])', 'u'); let c = 0; const s = [];
    for (const [id, t] of texts) { const m = re.exec(t); if (m) { c++; if (s.length < 3) s.push(id + ': …' + t.slice(Math.max(0, m.index - 30), m.index + n.length + 30).replace(/\s+/g, ' ') + '…'); } }
    if (c) console.log((n === e.name ? 'NAME ' : 'aka  ') + n + ' [' + e.slug + '] x' + c + '\n   ' + s.join('\n   '));
  }
}
