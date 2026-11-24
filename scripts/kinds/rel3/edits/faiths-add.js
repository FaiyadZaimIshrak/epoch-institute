// Appends the third wave's faith-map blocks to scripts/faiths.tsv and adds the new works, lives and one religion to
// scripts/faiths-side.tsv.   node faiths-add.js     (run in the repository)
const fs = require('fs');
let t = fs.readFileSync('scripts/faiths.tsv', 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const slugs = fs.readFileSync('scripts/kinds/rel3/names.tsv', 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t')[0]);
for (const s of slugs) { if (t.includes(nl + '@' + s + nl)) throw new Error('there already: ' + s);
  const b = fs.readFileSync('scripts/kinds/rel3/out/' + s + '.faith.tsv', 'utf8').split(/\r?\n/).filter(l => l.trim()); if (b[0] !== '@' + s) throw new Error('first line of ' + s);
  for (const l of b.slice(1)) { const c = l.split('\t'), n = { area: [7, 8], route: [4, 4], mark: [6, 6], note: [3, 3], src: [2, 2] }[c[0]]; if (!n || c.length < n[0] || c.length > n[1]) throw new Error(s + ': fields ' + l.slice(0, 60)); }
  t += nl + b.join(nl) + nl; }
fs.writeFileSync('scripts/faiths.tsv', t);
let f = fs.readFileSync('scripts/faiths-side.tsv', 'utf8'); const rep = (a, b) => { if (f.split(a).length !== 2) throw new Error('not once: ' + a); f = f.replace(a, () => b); };
rep('Christianity\tJesus; Mary, mother of Jesus; Paul the Apostle\tHebrew Bible; New Testament', 'Christianity\tJesus; Mary, mother of Jesus; Paul the Apostle; Augustine of Hippo\tHebrew Bible; New Testament; Book of Kells; Gutenberg Bible; Notre-Dame de Paris; St. Peter\'s Basilica; Sistine Chapel ceiling');
rep('Islam\tMuhammad; Ali ibn Abi Talib\tQuran', 'Islam\tMuhammad; Ali ibn Abi Talib\tQuran; Dome of the Rock; Süleymaniye Mosque; Great Mosque of Djenné');
rep('Sikhism\tGuru Nanak\tGuru Granth Sahib', 'Sikhism\tGuru Nanak\tGuru Granth Sahib; Golden Temple');
rep('Buddhism\tThe Buddha; Ashoka\tPali Canon; Lotus Sutra', 'Buddhism\tThe Buddha; Ashoka\tPali Canon; Lotus Sutra; Edicts of Ashoka; Sanchi; Ajanta Caves; Mogao Caves; Bagan; Tōdai-ji');
if (!f.endsWith('\n')) f += '\n'; f += 'Vedic religion\t-\tRigveda; Upanishads\n';
fs.writeFileSync('scripts/faiths-side.tsv', f); console.log(slugs.length + ' blocks appended; side table updated');
