// A stop's date that gives a day and month without its year gets the year the stop already carries.  node dateyear.js [--write]
const fs = require('fs'); const W = process.argv.includes('--write'); let n = 0;
for (const f of fs.readdirSync('out').filter(x => x.endsWith('.json'))) { const j = JSON.parse(fs.readFileSync('out/' + f, 'utf8')); let ch = 0;
  for (const l of j.legs) for (const s of l.stops) if (typeof s.date === 'string' && typeof s.year === 'number' && s.year > 0 && !s.date.includes(String(s.year)) && !/[0-9]{3,4}/.test(s.date)) { console.log(j.slug + ': ' + s.place + ' | ' + s.date + ' -> ' + s.date + ' ' + s.year); s.date = s.date + ' ' + s.year; ch++; n++; }
  if (W && ch) fs.writeFileSync('out/' + f, JSON.stringify(j, null, 1) + '\n'); }
console.log(n + (W ? ' dates completed' : ' dates would be completed'));
