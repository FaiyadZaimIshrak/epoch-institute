// The editor's changes to the plans of the second and third batches of wave 2, after reading each sheet.
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'scen2');
const load = s => JSON.parse(fs.readFileSync(path.join(D, s + '.json'), 'utf8')), save = (s, j) => fs.writeFileSync(path.join(D, s + '.json'), JSON.stringify(j, null, 1) + '\n');
let j;
// Tsushima: the island's name is disputed between two present-day states; the plan does not need it
j = load('battle-of-tsushima'); { const n = j.terrain.length; j.terrain = j.terrain.filter(t => t.name !== 'Takeshima'); const p = j.phases[j.phases.length - 1], a = ' south of Takeshima,';
  if (j.terrain.length === n - 1) { if (!p.text.includes(a)) throw new Error('tsushima text'); p.text = p.text.replace(a, ','); } else if (JSON.stringify(j.phases.map(x => x.text)).includes('Takeshima')) throw new Error('tsushima'); } save('battle-of-tsushima', j);
// Little Bighorn: a plainer short name
j = load('battle-of-the-little-bighorn'); { const u = j.units.find(x => x.short === 'Vs Custer' || x.short === 'Pursuers'); if (!u) throw new Error('bighorn'); u.short = 'Pursuers'; } save('battle-of-the-little-bighorn', j);
console.log('ok');
