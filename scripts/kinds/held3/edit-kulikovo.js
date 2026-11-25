// The editor's changes to the Kulikovo draft (24 Nov 2026): Mamai's death as both saved articles allow (Crimea, not
// Caffa itself), no idiom, Dmitry's wound left to the sources section, where the tellings disagree on it.
const fs = require('fs'), f = 'out/battle-of-kulikovo.json'; let t = fs.readFileSync(f, 'utf8');
const R = [
  ['He fled again to Caffa and was killed there.', 'He fled again to Crimea and was killed there.'],
  ['For six days the victorious army stood on the bones.', 'For six days the victorious army stayed on the field among the dead.'],
  ['Dmitry, wounded and exhausted, was found among the corpses.', 'Dmitry was found among the corpses, exhausted.'],
  ['and Dmitry was found wounded among the corpses.', 'and Dmitry was found among the corpses.'],
];
for (const [a, b] of R) { if (t.split(a).length !== 2) throw new Error(a.slice(0, 60)); t = t.replace(a, () => b); }
JSON.parse(t); fs.writeFileSync(f, t); console.log('ok');
