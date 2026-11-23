// Writes the accepted section pictures of the third wave of movements and the second of ideologies into scripts/kinds/pick.txt.
//   node scripts/kinds/moves3/pics/mi-picks.js <prop.json>      (run in the repository)
const fs = require('fs'), p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), f = 'scripts/kinds/pick.txt'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
const head = '# Movements, third wave, and ideologies, second wave (23 Nov 2026): proposed per section (mi-propose.js) and looked at on'; if (t.includes(head)) throw new Error('already written');
t += head + nl + '# sheets, three rounds: no logos, flags, party or state emblems, generic pictures (Jesus, the Bible, the Quran), present-day' + nl +
  '# leaders, Hitler, the dead child of Soweto, or namesakes (the Fatimid caliph al-Aziz for Abd al-Aziz ibn Baz)' + nl + p.map(r => r[1] + '\t' + r[2] + '\t' + r[3]).join(nl) + nl;
fs.writeFileSync(f, t); console.log(p.length + ' picks for ' + new Set(p.map(r => r[1])).size + ' profiles');
