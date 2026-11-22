// The editor's changes to the battle drafts: node edit.js <battles dir>   (out/*.json -> final/*.json)
// [slug, old, new]: the old text stands exactly once in the profile's public text (all strings but notes);
// ['slug', 'ev-', 'date text'] drops the key event with that date; ['slug', 'ev=', 'old date', 'new date'] re-dates one.
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const ED = [
  // the page never remarks on what its source lacks
  ['battle-of-kadesh', 'No total strength is given for either army; chariots on both sides together are put at 5,000 to 6,000', 'Chariots on both sides together are put at 5,000 to 6,000'],
  ['battle-of-kadesh', 'No total strength is recorded for either army. The battle', 'The battle'],
  ['battle-of-kadesh', 'No casualty figures are given, but Hittite records indicate', 'Hittite records indicate'],
  // regnal years are no dates the timeline can place
  ['battle-of-kadesh', 'ev-', 'Year 4 of Ramesses II'],
  ['battle-of-kadesh', 'ev-', 'Years 8 and 9 of Ramesses II'],
  ['battle-of-gaugamela', 'No casualty totals are given for either army, apart from the sixty Companions killed.', 'Sixty of the Companions were killed.'],
  ['battle-of-gaugamela', 'The Livius.org site favours a reconstruction that relies heavily on the Babylonian astronomical diaries.', 'One modern reconstruction relies heavily on the Babylonian astronomical diaries.'],
  ['battle-of-gaugamela', 'disagree on the size of the Persian army, the numbers above, and on why', 'disagree on the size of the Persian army and on why'],
  ['battle-of-red-cliffs', ' No casualty figures are given for either side.', ''],
  ['battle-of-stalingrad', ' No overall figure for the Axis forces at the start is given.', ''],
  ['battle-of-badr', 'given as around 1300 men with 100 horses in one passage and as nearly one thousand in another', 'given as nearly one thousand or as around 1,300 men, with 100 horses'],
  ['battle-of-badr', 'ev=', 'Six years later', '630'],
  // a date before the battle itself (the source's slip)
  ['battle-of-sekigahara', 'Ieyasu spared the clan on 10 October but cut', 'Ieyasu spared the clan but cut'],
  ['battle-of-agincourt', "Agincourt, with Crécy and Poitiers, stands among England's great victories in the Hundred Years' War.", "Agincourt is counted with Crécy and Poitiers among the English victories of the Hundred Years' War."],
  ['fall-of-constantinople', 'after which the city was sacked, Emperor Constantine XI was lost and the city became the Ottoman capital', 'after which the city was sacked and became the Ottoman capital; the fate of Emperor Constantine XI is unknown'],
  // the treaty's own clause is "Article 17"
  ['battle-of-adwa', 'ALL', 'Clause 17', 'Article 17'],
  ['battle-of-adwa', 'A decisive Ethiopian victory: over 6,000', 'An Ethiopian victory: over 6,000'],
  ['battle-of-gettysburg', '(75,000 in one figure given, 72,000 in another)', '(between 72,000 and 75,000 men)'],
  ['battle-of-plassey', 'with 3,000 soldiers in the summary figure (about 750 European infantry, 2,100 sepoys and artillery in the detailed one)', 'with about 3,000 soldiers (some 750 European infantry, 2,100 sepoys and artillery)'],
  ['battle-of-plassey', 'with about 50,000 soldiers including defectors, 40 cannon and 10 war elephants in the summary figure, or 30,000 infantry, 20,000 cavalry and 300 pieces of artillery in the detailed one.', 'with about 50,000 soldiers including the defectors (30,000 infantry and 20,000 cavalry by the fuller count), 10 war elephants, and artillery put at anything from 40 to 300 pieces.'],
  ['battle-of-waterloo', 'and are given as entering it on 7 July', 'and entered it on 7 July'],
];
try { for (const r of JSON.parse(fs.readFileSync(path.join(dir, 'edit-more.json'), 'utf8'))) ED.push(r); } catch (e) {}
fs.mkdirSync(path.join(dir, 'final'), { recursive: true });
const walk = (o, fn, k) => { if (typeof o === 'string') return fn(o); if (Array.isArray(o)) return o.map(x => walk(x, fn)); if (o && typeof o === 'object') { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = kk === 'notes' || kk === 'name' || kk === 'region' ? v : walk(v, fn, kk); return r; } return o; };
let n = 0;
for (const f of fs.readdirSync(path.join(dir, 'out')).filter(f => f.endsWith('.json'))) {
  const slug = f.slice(0, -5); let J = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8'));
  for (const e of ED.filter(e => e[0] === slug)) {
    if (e[1] === 'set') { J[e[2]] = e[3]; n++; continue; }
    if (e[1] === 'ev-') { const k = J.ev.findIndex(x => x[0] === e[2]); if (k < 0) throw new Error(slug + ': no event dated ' + e[2]); J.ev.splice(k, 1); n++; continue; }
    if (e[1] === 'ev=') { const k = J.ev.findIndex(x => x[0] === e[2]); if (k < 0) throw new Error(slug + ': no event dated ' + e[2]); J.ev[k][0] = e[3]; n++; continue; }
    const all = e[1] === 'ALL', a = all ? e[2] : e[1], b = all ? e[3] : e[2]; let hits = 0;
    J = walk(J, s => { const c = s.split(a).length - 1; hits += c; return c ? s.split(a).join(b) : s; });
    if (!hits || (!all && hits !== 1)) throw new Error(slug + ': found ' + hits + ' times: ' + a.slice(0, 60)); n++;
  }
  fs.writeFileSync(path.join(dir, 'final', f), JSON.stringify(J, null, 1) + '\n');
}
console.log(n + ' changes applied; final/ written');
