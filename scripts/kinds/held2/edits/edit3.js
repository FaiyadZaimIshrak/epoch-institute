// The editor's changes to the Serer religion draft (24 Nov 2026): no speaking of the source, two cuts, events in order.
const fs = require('fs'), f = 'out/serer-religion.json'; let t = fs.readFileSync(f, 'utf8');
const R = [
  ['The history of the Serer notes that this exodus affected only', 'This exodus affected only'],
  ['The history of the Serer notes that their long resistance to Islamisation has created', 'Their long resistance to Islamisation has created'],
  ['The Serer people are described as having originated in the Senegal River valley, at the border of present-day Senegal and Mauritania, and as having moved south', 'The Serer people are held to have originated in the Senegal River valley, at the border of present-day Senegal and Mauritania, and to have moved south'],
  [', most of the newly converted joining the Sufi brotherhoods, particularly the Mouride and Tijaniyyah', ''],
  [', and the non-Serer Lebou, a distinct group, still revere the religious practices of their Serer ancestors', ''],
];
for (const [a, b] of R) { if (t.split(a).length !== 2) throw new Error(a.slice(0, 60)); t = t.replace(a, () => b); }
const j = JSON.parse(t), i = j.ev.findIndex(e => e[0] === '1030s'); if (i !== 1 || j.ev[0][0] !== '11th century') throw new Error('events');
[j.ev[0], j.ev[1]] = [j.ev[1], j.ev[0]];
fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); console.log('ok', j.ev.map(e => e[0]).join(' | '));
