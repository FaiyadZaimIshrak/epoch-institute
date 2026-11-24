// Writes the accepted section pictures of the third wave of religions into scripts/kinds/pick.txt.
//   node scripts/kinds/rel3/pics/rel-picks.js <prop.json>      (run in the repository)
const fs = require('fs'), p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = 'scripts/kinds/pick.txt'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const head = '# Religions, third wave (23 Nov 2026): proposed per section (rel-propose.js) and looked at on sheets, three rounds: no'; if (t.includes(head)) throw new Error('already written');
t += head + nl + '# generic pictures (Moses, Noah, the Kaaba, the New Testament on faiths that only name them), flags, later imagined portraits' + nl +
  '# or namesakes (the biblical Bethel for the Witnesses\' branch offices, Bahlul Lodi for ibn Bahlul, the prince-electors for the Caliph\'s)' + nl + p.map(r => r[1] + '\t' + r[2] + '\t' + r[3]).join(nl) + nl;
fs.writeFileSync(f, t); console.log(p.length + ' picks for ' + new Set(p.map(r => r[1])).size + ' profiles');
