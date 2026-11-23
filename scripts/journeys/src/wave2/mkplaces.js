// places.tsv for the journey writers: the place entries that have a map point (entry slug, name).  node mkplaces.js <repo>
const fs = require('fs'), R = process.argv[2]; const src = fs.readFileSync(R + '/encyclopedia-data.js', 'utf8'); const names = {};
for (const line of src.split('\n')) { const m = /^\s*\{slug:"([^"]+)",name:"((?:[^"\\]|\\.)*)",type:"([^"]*)"/.exec(line); if (m) names[m[1]] = [m[2], m[3]]; }
const out = []; for (const l of fs.readFileSync(R + '/scripts/entry-coords.tsv', 'utf8').split(/\r?\n/)) { if (!l || l[0] === '#') continue; const s = l.split('\t')[0]; if (names[s] && names[s][1] === 'place') out.push(s + '\t' + names[s][0]); }
fs.writeFileSync(__dirname + '/places.tsv', out.join('\n') + '\n'); console.log(out.length + ' places');
