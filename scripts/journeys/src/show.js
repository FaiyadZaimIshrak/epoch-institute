// prints journeys for the editor's read: node show.js <dir> <slug …>
const fs = require('fs'), path = require('path'), dir = process.argv[2];
for (const slug of process.argv.slice(3)) { const J = JSON.parse(fs.readFileSync(path.join(dir, 'final', slug + '.json'), 'utf8'));
  console.log('\n##### ' + J.title + ' | ' + J.years + ' | ' + J.traveller + '\nINTRO: ' + J.intro + '\nEND: ' + J.ending);
  J.legs.forEach((l, i) => { console.log('-- ' + l.title); l.stops.forEach((s, k) => console.log((i + 1) + '.' + (k + 1) + ' ' + s.place + (s.entry ? ' [' + s.entry + ']' : '') + ' | ' + s.date + ' | ' + s.by + ' | ' + s.text)); });
  if (process.env.NOTES) console.log('NOTES: ' + J.notes); }
