// Writes the accepted section pictures of the second wave's cities into scripts/kinds/pick.txt (run in the repository).
//   node city-picks.js <prop.json>
const fs = require('fs'), p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = 'scripts/kinds/pick.txt'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const head = '# Cities, second wave (23 Nov 2026): proposed per section (a monument, a site or an object the section links, else a'; if (t.includes(head)) throw new Error('already written');
t += head + nl + '# person, a text or an event) and looked at on sheets, five rounds: no maps, flags, arms, logos, modern city views, modern' + nl +
  '# statues and busts, later imagined portraits, generic terms, or pictures of another place than the one meant' + nl + p.map(r => r[1] + '\t' + r[2] + '\t' + r[3]).join(nl) + nl;
fs.writeFileSync(f, t); console.log(p.length + ' picks for ' + new Set(p.map(r => r[1])).size + ' profiles');
