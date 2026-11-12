// The editor's changes to the first round of longer entries (12 Nov 2026): node scripts/entries/more1/edit.js
// Each [slug, old, new] must be found once. Why: the new text may not contradict the entry above it where the article
// itself is not settled (Pandara Vanniyan's end: the entry's "d. 1803", the article's lead "died battling", its Death
// section 1810; Kakusthavarma's Gupta marriage, which the entry hedges), and a label not in the article is taken out
// ("the archaeologist", "the historian(s)").
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'out');
const ED = [
  ['pandara-vanniyan', 'He remained there until September 1810, when British forces ambushed him, and he later died of his injuries.', 'Accounts of his end differ: by one he died fighting the British, by another he remained there until September 1810, when British forces ambushed him, and later died of his injuries.'],
  ['kakusthavarma', 'The marriage of one daughter into the imperial Gupta family is counted the most important.', 'The marriage of one daughter, read as a marriage into the imperial Gupta family, is counted the most important.'],
  ['ziusudra', 'the archaeologist Max Mallowan', 'Max Mallowan'],
  ['hawiye', 'the historian Lee Cassanelli', 'Lee Cassanelli']
];
for (const [slug, a, b] of ED) {
  const f = path.join(D, slug + '.json'); const s = fs.readFileSync(f, 'utf8'); const n = s.split(a).length - 1;
  if (n !== 1) { if (s.includes(b)) { console.log(slug + ': already done'); continue; } throw new Error(slug + ': found ' + n + ' times: ' + a.slice(0, 50)); }
  const t = s.replace(a, b); JSON.parse(t); fs.writeFileSync(f, t); console.log(slug + ': edited');
}
