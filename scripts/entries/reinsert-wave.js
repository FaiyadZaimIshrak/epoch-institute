// rebuilds added-entries.json from the copy saved before merge-entries.js, inserting only the wave's entries as text
const fs = require('fs'), [before, now, wave] = process.argv.slice(2);
const oldT = fs.readFileSync(before, 'utf8'), A = JSON.parse(fs.readFileSync(now, 'utf8')), O = JSON.parse(oldT);
const add = A.entries.filter(e => e.wave === wave); if (O.entries.some(e => e.wave === wave)) throw new Error('wave already in the old copy');
const keys = Object.keys(O), next = keys[keys.indexOf('entries') + 1], nl = oldT.includes('\r\n') ? '\r\n' : '\n';
const start = oldT.indexOf(nl + ' "entries": ['), end = oldT.indexOf(nl + ' ],' + nl + ' "' + next + '":', start);
if (start < 0 || end < 0) throw new Error('entries array not found');
const txt = add.map(e => JSON.stringify(e, null, 1).split('\n').map(l => '  ' + l).join(nl)).join(',' + nl);
const out = oldT.slice(0, end) + ',' + nl + txt + oldT.slice(end);
const P = JSON.parse(out); if (JSON.stringify(P) !== JSON.stringify(A)) throw new Error('not the same data');
fs.writeFileSync(now, out); console.log(add.length + ' entries inserted as text');
