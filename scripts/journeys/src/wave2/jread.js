// The editor's read: node jread.js <from> <count>
const fs = require('fs'); const [from, count] = process.argv.slice(2).map(Number);
for (const f of fs.readdirSync('out').filter(x => x.endsWith('.json')).sort().slice(from, from + count)) { const j = JSON.parse(fs.readFileSync('out/' + f, 'utf8'));
  console.log('\n== ' + j.slug + ' | ' + j.title + ' | ' + j.years + ' | ' + j.traveller + '\n I ' + j.intro);
  j.legs.forEach((l, i) => { console.log(' LEG ' + (i + 1) + ': ' + l.title); l.stops.forEach(s => console.log('  - ' + s.place + ' [' + (s.date || 'no date') + ', ' + s.by + '] ' + s.text)); });
  console.log(' E ' + j.ending); }
