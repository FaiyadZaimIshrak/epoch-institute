// Two names that linked a namesake where the entry is right elsewhere on the page, so the sentence is reworded
// instead of excluding the entry:   node fix-city8.js <repo>
//   Karakorum: "Batu-Möngke Dayan Khan" linked Möngke Khan inside the name; the encyclopedia's entry is "Dayan Khan".
//   Kaifeng: "Emperor Taizu of Liang" linked Emperor Taizu of Song.
const fs = require('fs'), path = require('path'), R = process.argv[2];
const PAIRS = [
  ['Batu-Möngke Dayan Khan made it a capital', 'Dayan Khan made it a capital', ['empire-profiles.js', 'scripts/kinds/src/karakorum.json']],
  ['In the Five Dynasties period Emperor Taizu of Liang made Bianzhou his capital', 'In the Five Dynasties period the first Later Liang emperor made Bianzhou his capital', ['empire-profiles.js', 'scripts/kinds/src/kaifeng.json']],
];
for (const [a, b, files] of PAIRS) for (const f of files) {
  const p = path.join(R, f); let t = fs.readFileSync(p, 'utf8'); const n = t.split(a).length - 1;
  if (!n) { if (t.includes(b)) { console.log('done already: ' + f); continue; } throw new Error(f + ': ' + a); }
  t = t.split(a).join(b); fs.writeFileSync(p, t); console.log(n + ' in ' + f + ': ' + a.slice(0, 40));
}
