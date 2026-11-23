// The editor's exact changes to the journey drafts: node jfix.js <fixes.js>
// fixes.js exports {slug: [[old, new], …]} (each pair must match once in the journey's public texts; one already
// applied is skipped), and optionally _drop {slug: [[leg number, place], …]} (stops taken out) and
// _undate {slug: [[leg number, place], …]} (date and year set to null).
const fs = require('fs'), path = require('path'), FIX = require(path.resolve(process.argv[2])); let done = 0, skip = 0, bad = 0;
const load = s => JSON.parse(fs.readFileSync('out/' + s + '.json', 'utf8')), save = (s, j) => fs.writeFileSync('out/' + s + '.json', JSON.stringify(j, null, 1) + '\n');
for (const [slug, pairs] of Object.entries(FIX)) { if (slug[0] === '_') continue; const j = load(slug); const fields = [];
  for (const k of ['title', 'intro', 'ending', 'years', 'traveller']) if (typeof j[k] === 'string') fields.push([j, k]);
  for (const l of j.legs) { fields.push([l, 'title']); for (const s of l.stops) for (const k of ['text', 'place', 'date', 'wp']) if (typeof s[k] === 'string') fields.push([s, k]); }
  for (const [a, b] of pairs) { let hit = 0; for (const [o, k] of fields) { const n = o[k].split(a).length - 1; if (n) { hit += n; if (hit === 1) o[k] = o[k].replace(a, () => b); } }
    if (hit === 1) done++; else if (!hit && fields.some(([o, k]) => o[k].includes(b))) skip++; else { bad++; console.log('!! ' + slug + ': ' + hit + ' x ' + a.slice(0, 80)); } }
  save(slug, j); }
for (const [slug, list] of Object.entries(FIX._drop || {})) { const j = load(slug); for (const [leg, place] of list) { const st = j.legs[leg - 1].stops, i = st.findIndex(s => s.place === place); if (i < 0) { if (!(FIX._gone || []).includes(slug + '|' + place)) skip++; continue; } st.splice(i, 1); done++; } j.legs = j.legs.filter(l => l.stops.length); save(slug, j); }
for (const [slug, list] of Object.entries(FIX._undate || {})) { const j = load(slug); for (const [leg, place] of list) { const s = j.legs[leg - 1].stops.find(x => x.place === place); if (!s) { bad++; console.log('!! ' + slug + ': no stop ' + place); continue; } if (s.date === null && s.year === null) { skip++; continue; } s.date = null; s.year = null; done++; } save(slug, j); }
// _wp {slug: [[place, Wikipedia title], …]}: the article that gives the stop its point (every stop of that place)
for (const [slug, list] of Object.entries(FIX._wp || {})) { const j = load(slug); for (const [place, wp] of list) { const ss = j.legs.flatMap(l => l.stops).filter(s => s.place === place); if (!ss.length) { bad++; console.log('!! ' + slug + ': no stop ' + place); continue; } for (const s of ss) { if (s.wp === wp) skip++; else { s.wp = wp; done++; } } } save(slug, j); }
console.log(done + ' changed, ' + skip + ' already done, ' + bad + ' faults');
