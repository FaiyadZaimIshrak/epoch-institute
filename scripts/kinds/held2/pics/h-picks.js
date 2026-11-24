// Writes the accepted section pictures of the profiles held back and written from a second source (24 Nov 2026) into
// scripts/kinds/pick.txt.   node scripts/kinds/held2/pics/h-picks.js <prop.json>      (run in the repository)
const fs = require('fs'), p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = 'scripts/kinds/pick.txt'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const head = '# Held profiles (24 Nov 2026: Juche, Potala Palace, Inca and Serer religion, Adrianople, the Somme): proposed per section'; if (t.includes(head)) throw new Error('already written');
t += head + nl + '# (h-propose.js) and looked at on sheets, two rounds: no rulers of the regime on Juche, no living Dalai Lama, no other place' + nl +
  '# or battle standing for the subject, no person the text only names' + nl + p.map(r => r[1] + '\t' + r[2] + '\t' + r[3]).join(nl) + nl;
fs.writeFileSync(f, t); console.log(p.length + ' picks for ' + new Set(p.map(r => r[1])).size + ' profiles');
