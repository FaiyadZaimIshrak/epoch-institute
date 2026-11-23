// A key event's label never starts with a day (the timeline reads the first number as the year).
const fs = require('fs'), f = __dirname + '/prof2/out/battle-of-the-trebia.json', j = JSON.parse(fs.readFileSync(f, 'utf8'));
const e = j.ev.find(x => x[0] === '22 or 23 December 218 BCE'); if (e) { e[0] = 'December 218 BCE'; if (!/22 or 23 December/.test(e[1])) e[1] = e[1].replace(/\.?$/, '') + ' (on 22 or 23 December)'; }
fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); console.log(j.ev.map(x => x[0] + ': ' + x[1]).join('\n'));
