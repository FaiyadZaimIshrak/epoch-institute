// The editor's changes to the plans of the second wave's first twenty, after reading each sheet.
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'scen2');
const load = s => JSON.parse(fs.readFileSync(path.join(D, s + '.json'), 'utf8')), save = (s, j) => fs.writeFileSync(path.join(D, s + '.json'), JSON.stringify(j, null, 1) + '\n');
const last = j => j.phases[j.phases.length - 1];
let j;
// Thermopylae: most of the Thebans surrendered; they leave the plan, they are not shown killed
j = load('battle-of-thermopylae'); if (last(j).state.thebes !== 'destroyed') throw new Error('thermopylae'); last(j).state.thebes = 'gone'; last(j).hits = (last(j).hits || []).filter(h => h[1] !== 'thebes'); save('battle-of-thermopylae', j);
// Zama: the article says the line collapsed with a great massacre and Hannibal escaped: broken, not wiped out
j = load('battle-of-zama'); { let n = 0; for (const k of Object.keys(last(j).state)) if (last(j).state[k] === 'destroyed') { last(j).state[k] = 'routed'; n++; } if (!n) throw new Error('zama'); } save('battle-of-zama', j);
// Karbala: Husayn's death is told in the words; the plan shows the Kufans closing on him, without a cross
j = load('battle-of-karbala'); if (!last(j).state || last(j).state.husayn !== 'destroyed') throw new Error('karbala'); delete last(j).state.husayn; if (!Object.keys(last(j).state).length) delete last(j).state; save('battle-of-karbala', j);
// Salamis: the text does not speak of the plan; the island is land
j = load('battle-of-salamis'); { const p = last(j), a = ' The plan ends with the island taken.'; if (!p.text.includes(a)) throw new Error('salamis text'); p.text = p.text.replace(a, '');
  const t = j.terrain.find(x => /Psyttaleia/.test(x.name || '')); if (!t || typeof t.at[0] !== 'number') throw new Error('salamis island'); const [x, y] = t.at;
  t.k = 'land'; t.at = [[x - 4.5, y - 1], [x - 2, y - 3], [x + 2.5, y - 3], [x + 5, y - 0.5], [x + 3, y + 2.5], [x - 3, y + 2.5]]; t.lab = [x, y - 4.2]; } save('battle-of-salamis', j);
// Kursk: tank armies and corps are armour
j = load('battle-of-kursk'); { let n = 0; for (const u of j.units) if (/Panzer|Tank/.test(u.name)) { u.k = 'armour'; n++; } if (!n) throw new Error('kursk'); console.log('kursk: ' + n + ' armoured formations: ' + j.units.filter(u => u.k === 'armour').map(u => u.name).join(', ')); } save('battle-of-kursk', j);
console.log('ok');
