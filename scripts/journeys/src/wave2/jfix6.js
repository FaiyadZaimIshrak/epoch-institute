// Two stop texts over fifty words, trimmed (the journeys test allows 12 to 50). Applied to the work folder's draft and to
// the repository's copies:  node jfix6.js <repo>
const fs = require('fs'), path = require('path'), R = process.argv[2];
const PAIRS = [
  ['Rain made water easy to find and the Aboriginal people were peaceful. Wills found', 'Rain made water easy to find, and the Aboriginal people were peaceful. Wills found'],
  ['They may have viewed the Gulf on 11 February, though there is no documentary evidence.', 'They may have viewed the Gulf on 11 February, though no document shows it.'],
  ['found the depot deserted, nine hours after Brahe left, and dug up the cache.', 'found the depot deserted nine hours after Brahe left and dug up the cache.'],
  ['Burke later fired over Yandruwandha heads and knocked fish from their hands.', 'Burke fired over Yandruwandha heads and knocked fish from their hands.'],
];
for (const f of [path.join(__dirname, 'out', 'burke-wills.json'), path.join(R, 'scripts/journeys/burke-wills.json'), path.join(R, 'scripts/journeys/src/out/burke-wills.json')]) {
  let t = fs.readFileSync(f, 'utf8'), n = 0; for (const [a, b] of PAIRS) { if (t.split(a).length === 2) { t = t.replace(a, () => b); n++; } else if (!t.includes(b)) throw new Error(f + ': ' + a.slice(0, 50)); }
  fs.writeFileSync(f, t); const j = JSON.parse(t); for (const l of j.legs) for (const s of l.stops) { const w = s.text.split(/\s+/).filter(Boolean).length; if (w > 50 || w < 12) console.log('  still ' + w + ' words: ' + s.place); } console.log(n + ' changed in ' + f); }
