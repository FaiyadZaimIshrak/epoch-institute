// Appends the faith-map blocks of Inca and Serer religion to scripts/faiths.tsv and gives scripts/faiths-side.tsv the
// Inca religion's life and work and Buddhism the Potala Palace.   node faiths-add.js     (run in the repository)
const fs = require('fs');
let t = fs.readFileSync('scripts/faiths.tsv', 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; if (!t.endsWith(nl)) t += nl;
for (const s of ['inca-religion', 'serer-religion']) { if (t.includes(nl + '@' + s + nl)) throw new Error('there already: ' + s);
  const b = fs.readFileSync('scripts/kinds/held2/out/' + s + '.faith.tsv', 'utf8').split(/\r?\n/).filter(l => l.trim()); if (b[0] !== '@' + s) throw new Error('first line of ' + s);
  for (const l of b.slice(1)) { const c = l.split('\t'), n = { area: [7, 8], route: [4, 4], mark: [6, 6], note: [3, 3], src: [2, 2] }[c[0]]; if (!n || c.length < n[0] || c.length > n[1]) throw new Error(s + ': fields ' + l.slice(0, 60)); }
  t += nl + b.join(nl) + nl; }
fs.writeFileSync('scripts/faiths.tsv', t);
let f = fs.readFileSync('scripts/faiths-side.tsv', 'utf8'); const m = f.match(/^Buddhism\t[^\t]*\t[^\r\n]*/m); if (!m || m[0].includes('Potala')) throw new Error('Buddhism row');
f = f.replace(m[0], () => m[0] + '; Potala Palace'); if (!f.endsWith('\n')) f += '\n'; f += 'Inca religion\tPachacuti\tMachu Picchu\n';
fs.writeFileSync('scripts/faiths-side.tsv', f); console.log('2 blocks appended; side table updated');
