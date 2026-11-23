// Writes the accepted section pictures of the fourth wave of works and lives into scripts/kinds/pick.txt (run in the repository).
//   node scripts/kinds/works4/pics/wl-picks.js <prop.json>
const fs = require('fs'), p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = 'scripts/kinds/pick.txt'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const head = '# Works and lives, fourth wave (23 Nov 2026): proposed per section (wl-propose.js) and looked at on sheets, three rounds:'; if (t.includes(head)) throw new Error('already written');
t += head + nl + '# no maps, flags, arms, logos, modern views, modern statues, later imagined portraits (Sima Qian, Sun Tzu, Cao Cao), generic' + nl +
  '# terms, or namesakes (the Lion Gate of Mycenae on Sigiriya, the Maya city Naranjo on Cordoba, the American John Marshall on Sanchi)' + nl + p.map(r => r[1] + '\t' + r[2] + '\t' + r[3]).join(nl) + nl;
fs.writeFileSync(f, t); console.log(p.length + ' picks for ' + new Set(p.map(r => r[1])).size + ' profiles');
