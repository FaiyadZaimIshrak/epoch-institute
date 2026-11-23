// Wave 2a: the commanders' entries, matched by hand (the name and the years must be the same person), and the editor's
// yes or no to each entry's picture as a banner portrait, looked at on battles2/portraits-sheet.png.
// Writes leaderEntry into scen2/*.json and appends the new rows to portraits.tsv (a row already there is left alone).
const fs = require('fs'), path = require('path');
const WHO = {
  'battle-of-actium': { agr: 'marcus-vipsanius-agrippa', ant: 'mark-antony', esc: 'mark-antony', cleo: 'cleopatra-vii' },
  'battle-of-alesia': { besieged: 'vercingetorix', caesar: 'julius-caesar', labi: 'titus-labienus' },
  'battle-of-austerlitz': { davout: 'louis-nicolas-davout', murat: 'joachim-murat', reserve: 'napoleon' },
  'battle-of-grunwald': { lit: 'vytautas-the-great', tevG: 'ulrich-von-jungingen' },
  'battle-of-issus': { hyp: 'alexander-the-great', comp: 'alexander-the-great', darius: 'darius-iii' },
  'battle-of-leipzig': { fn: 'michel-ney', fs: 'jozef-poniatowski', bl: 'gebhard-leberecht-von-blucher', bo: 'karl-philipp-prince-of-schwarzenberg', cj: 'charles-xiv-john' },
  'battle-of-manzikert': { bc: 'romanos-iv-diogenes' },
  'battle-of-mohacs': { hsec: 'louis-ii-of-hungary', ocen: 'pargali-ibrahim-pasha' },
  'battle-of-plataea': { gspar: 'pausanias-general', gath: 'aristides', pers: 'mardonius' },
  'battle-of-poltava': { rinf: 'peter-the-great' },
  'battle-of-salamis': { arist: 'aristides' },
  'battle-of-the-catalaunian-plains': { rom: 'flavius-aetius', hun: 'attila', theo: 'theodoric-i', gep: 'ardaric' },
  'battle-of-thermopylae': { sparta: 'leonidas-i' },
  'battle-of-trafalgar': { nelson: 'horatio-nelson' },
  'battle-of-zama': { rlael: 'gaius-laelius', rmas: 'masinissa', cl3: 'hannibal' },
};
const PIC = [
  ['marcus-vipsanius-agrippa', 'yes', 'a Roman portrait bust of his time'],
  ['mark-antony', 'yes', 'a coin of his own'],
  ['cleopatra-vii', 'yes', 'a marble portrait of her time'],
  ['vercingetorix', 'yes', 'a gold coin struck in his name'],
  ['julius-caesar', 'yes', 'a Roman portrait bust'],
  ['louis-nicolas-davout', 'yes', 'a copy of a portrait of his time'],
  ['joachim-murat', 'yes', 'the portrait by François Gérard'],
  ['napoleon', 'yes', 'the portrait by Jacques-Louis David'],
  ['vytautas-the-great', 'yes', 'his own seal'],
  ['ulrich-von-jungingen', 'no', 'a modern drawing of arms'],
  ['michel-ney', 'yes', 'the portrait by François Gérard'],
  ['jozef-poniatowski', 'yes', 'the portrait by Josef Grassi'],
  ['gebhard-leberecht-von-blucher', 'yes', 'the portrait by George Dawe'],
  ['karl-philipp-prince-of-schwarzenberg', 'yes', 'a portrait of his time'],
  ['charles-xiv-john', 'yes', 'a portrait of his lifetime'],
  ['romanos-iv-diogenes', 'yes', 'a coin of his reign'],
  ['alp-arslan', 'no', 'a miniature of centuries later'],
  ['louis-ii-of-hungary', 'yes', 'the portrait by Hans Krell, of 1526'],
  ['pargali-ibrahim-pasha', 'no', 'a miniature whose date within the century is not known'],
  ['pausanias-general', 'no', 'a bust whose naming is doubted'],
  ['aristides', 'no', 'a modern statue'],
  ['peter-the-great', 'yes', 'a portrait of 1717'],
  ['flavius-aetius', 'no', 'a relief whose naming is doubted'],
  ['attila', 'no', 'an imagined portrait of a thousand years later'],
  ['theodoric-i', 'no', 'a painting of the 17th century'],
  ['leonidas-i', 'no', 'a statue whose naming is doubted'],
  ['horatio-nelson', 'yes', 'the portrait by Lemuel Francis Abbott'],
  ['masinissa', 'no', 'a bust whose naming is doubted'],
  ['scipio-africanus', 'no', 'a bust whose naming is doubted'],
  ['themistocles', 'no', 'a modern drawing of a bust'],
];
const D = path.join(__dirname, process.env.SCEN || 'scen2'); let n = 0;
for (const slug of Object.keys(WHO)) { const f = path.join(D, slug + '.json'), s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(WHO[slug])) { const u = s.units.find(x => x.id === id); if (!u) throw new Error(slug + ': no formation ' + id); if (!u.leader) throw new Error(slug + ': ' + id + ' has no leader'); u.leaderEntry = WHO[slug][id]; delete u.pic; n++; }
  fs.writeFileSync(f, JSON.stringify(s, null, 1) + '\n'); }
const pf = path.join(__dirname, 'portraits.tsv'); let t = fs.readFileSync(pf, 'utf8'); if (!t.endsWith('\n')) t += '\n'; const have = new Set(t.split(/\r?\n/).map(l => l.split('\t')[0])); let add = 0;
for (const r of PIC) if (!have.has(r[0])) { t += r.join('\t') + '\n'; add++; }
fs.writeFileSync(pf, t);
console.log(n + ' commanders matched to entries; ' + add + ' rows added to portraits.tsv (' + PIC.filter(r => r[1] === 'yes').length + ' yes, ' + PIC.filter(r => r[1] === 'no').length + ' no)');
