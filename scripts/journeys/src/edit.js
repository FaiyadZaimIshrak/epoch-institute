// The editor's changes to the journey drafts: node edit.js <journeys dir>   (out/*.json -> final/*.json)
// Stops are named "leg.stop" as in the drafts. A stop whose place has no article with coordinates of its own is
// dropped (a river's article gives its source or mouth, not the crossing); "wp" names the article the point is read from.
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const WP = {   // the place's own article, where the draft's title was a disambiguation page or a river
  alexander: { '1.1': 'Mount Ossa (Greece)', '2.2': 'Battle of the Granicus', '2.4': 'Issus (Cilicia)', '4.4': 'Battle of the Hydaspes', '4.5': 'Alexandria Hyphasis' },
  columbus: { '4.5': 'Almirante District' },
  cook: { '2.4': 'Queen Charlotte Sound / Tōtaranui' },
  'lewis-and-clark': { '2.3': 'Lolo Pass (Idaho–Montana)', '3.2': 'Camp Chopunnish', '3.3': 'Two Medicine Fight Site', '3.4': 'Missouri-Yellowstone Confluence Interpretive Center' },
  'long-march': { '3.3': 'Xiaojin County', '3.4': 'Zoigê Marsh' },
};
const DROP = {   // no article of the place itself with a point
  alexander: ['4.2'], columbus: ['4.6'], 'long-march': ['1.3', '1.4', '2.3', '3.1'],
};
const SET = [   // [journey, stop, field, value]
  ['lewis-and-clark', '1.4', 'place', 'The Bad River, near Fort Pierre'],
  ['ibn-battuta', '5.7', 'by', 'land'],
];
const TEXT = [];   // [journey, stop, old, new]: wording, each old text found once
try { for (const r of JSON.parse(fs.readFileSync(path.join(dir, 'edit-texts.json'), 'utf8'))) TEXT.push(r); } catch (e) {}
fs.mkdirSync(path.join(dir, 'final'), { recursive: true });
for (const f of fs.readdirSync(path.join(dir, 'out')).filter(f => f.endsWith('.json'))) {
  const slug = f.slice(0, -5), J = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8')); let n = 0;
  J.legs.forEach((l, i) => l.stops.forEach((s, k) => { s._id = (i + 1) + '.' + (k + 1); }));
  for (const [id, t] of Object.entries(WP[slug] || {})) { const s = J.legs.flatMap(l => l.stops).find(s => s._id === id); if (!s) throw new Error(slug + ' ' + id); s.wp = t; n++; }
  for (const [j, id, k, v] of SET) if (j === slug) { const s = J.legs.flatMap(l => l.stops).find(s => s._id === id); if (!s) throw new Error(slug + ' ' + id); s[k] = v; n++; }
  for (const [j, id, a, b] of TEXT) if (j === slug) { const s = id === 'intro' || id === 'ending' || id === 'title' ? null : J.legs.flatMap(l => l.stops).find(s => s._id === id), o = s || J, k = s ? 'text' : id;
    if (!o || String(o[k]).split(a).length !== 2) throw new Error(slug + ' ' + id + ': text not found once: ' + a.slice(0, 50)); o[k] = o[k].replace(a, () => b); n++; }
  for (const l of J.legs) l.stops = l.stops.filter(s => !(DROP[slug] || []).includes(s._id));
  J.legs = J.legs.filter(l => l.stops.length); J.legs.forEach(l => l.stops.forEach(s => { delete s._id; }));
  fs.writeFileSync(path.join(dir, 'final', f), JSON.stringify(J, null, 1) + '\n');
  console.log(slug + ': ' + n + ' changes, ' + (DROP[slug] || []).length + ' dropped, ' + J.legs.reduce((a, l) => a + l.stops.length, 0) + ' stops');
}
