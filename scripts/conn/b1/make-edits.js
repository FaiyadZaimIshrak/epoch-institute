// The editor's decisions on the B1 proposals, written as edits.json for scripts/conn/assemble.js.
const fs = require('fs'), B = process.argv[2] || __dirname;   // node scripts/conn/b1/make-edits.js
const files = ['ancient', 'modern', 'culture', 'americas', 'eastasia', 'southasia', 'islamafrica', 'europe'];
const G = files.flatMap(f => JSON.parse(fs.readFileSync(B + '/p-' + f + '.json', 'utf8')));
const names = new Set(G.map(g => g.name));
const slugOf = (group, label) => { const g = G.find(x => x.name === group); const t = g && g.tiles.find(x => x.label === label); if (!t) throw new Error('no tile ' + group + ' / ' + label); return t.slug; };
const drop = [
  // loose or too broad
  'Empires of antiquity', 'Ancient inventions', "In Julius Caesar's story", 'Hitler\'s allies in the Second World War',
  'Defeats of colonial armies', 'Reformers and writers of the Arab Nahda', 'Begin with a Greek letter', 'Hide a weather word',
  // the same theme under another name in another file
  'Gods of Rome', 'Books of the Bible', 'Ancient statues', 'Carved out of the rock', 'Waterworks of the ancient and medieval world',
  'Dictators of Latin America', 'Figures of the Mexican Revolution', 'The civil rights movement', 'Abolitionists',
  'Pan-Africanists born in the Americas', 'Zulu kings', 'Founders of kingdoms in southern Africa', 'Rulers of Madagascar',
  'Qajar shahs', 'Kings of Kush', "Emperors of Vietnam's Nguyễn dynasty", 'Branches and schools of Buddhism',
  'Old names of African countries', 'Ottoman victories in the Balkans and Hungary', 'Mosques', 'Devotional saints of India',
];
const apart = [
  ['Pyramids', 'Pyramids of the Americas'], ['Famous inscriptions', 'Inscriptions in stone'], ['Cut into rock', 'Rock-cut caves of India'],
  ['Inventors', 'Inventors of the industrial age'], ['Inventions of the 1800s', 'Inventors of the industrial age'], ['Inventions of the 1800s', 'Inventors'],
  ['Leaders of Republican China', 'The end of imperial China, 1911–1912'], ['Campaigners for women\'s rights', 'The American women\'s movement'],
  ['Independence leaders of Southeast Asia', 'Founding leaders of Asian nations'], ['Independence leaders of Southeast Asia', 'Statesmen of Burma'],
  ['Founding leaders of Asian nations', 'Statesmen of Burma'], ['Took power in a coup', 'Leaders of Pakistan'], ['Took power in a coup', 'Arab leaders after 1950'],
  ['Took power in a coup', 'Strongmen of Latin America'], ['Took power in a coup', 'Rulers of Egypt in the 20th and 21st centuries'],
  ['Strongmen of Latin America', 'Strongmen of interwar Europe'], ['Wars fought by the United States', 'Wars in Vietnam'],
  ['Wars fought by the United States', 'The Vietnam War'], ['The Vietnam War', 'Wars in Vietnam'], ['China under Mao', 'Led China after Mao'],
  ['Religions', 'Schools of thought born in China'], ['Religions', 'Political ideologies'], ['Sufis of the Indian subcontinent', 'Mystics'],
  ['Poet-saints of the Bhakti movement', 'Mystics'], ['Fought apartheid', 'Under apartheid'], ['Rulers of Egypt in the 20th and 21st centuries', 'Arab leaders after 1950'],
  ['Muslim observances', 'Terms of Islamic law and learning'], ['Mamluk sultans', 'Slave soldiers who became rulers'], ['Took Jerusalem', 'Rashidun caliphs'],
  ['Conquered Egypt', 'Rashidun caliphs'], ['Conquered Egypt', 'Rulers of Kush'], ['Took Jerusalem', 'All in 1187'], ['Cities of Algeria', 'Roman cities of North Africa'],
  ['Cities of Turkey', 'Begin with a man\'s name'], ['Cities of Iran', 'Hide a vehicle'], ['African capitals', 'Hide a drink'], ['Cities of Turkey', 'Hide a drink'],
  ['Ottoman victories', 'Hide a country'], ['Composers of the Baroque', 'Born in 1685'], ['Philosophers of the 1600s', 'German philosophers'],
  ['Philosophers of the 1800s', 'German philosophers'], ['Scientists of the 1600s', 'Physicists'], ['Scientists of the 1600s', 'Invented in the 1600s'],
  ['Powerful women of the Middle Ages', 'Women who governed as regents'], ['Popes of the 1400s and 1500s', 'Members of the Medici family'],
  ['In the life of Alexander the Great', 'End in -ander'], ['Kings of the gods', 'Roman gods'], ['Queens who went to war', 'Queens of Africa'],
  ['Queens of ancient Egypt', 'Queens of Africa'], ['Wrote about their journeys to India', 'Travellers of the ancient world'],
  ['Wrote about their journeys to India', 'Seen by the pilgrim Xuanzang'], ['Travellers of the ancient world', 'Seen by the pilgrim Xuanzang'],
  ['Pirates and privateers', 'English seafarers under the Tudors'], ['Kings of the Zulu', 'Shaka\'s contemporaries in southern Africa'],
  ['Kings of the Zulu', 'Battles fought by the Zulu'], ['Monarchs of Madagascar', 'Queens of Africa'], ['Novels', 'Writers of the Renaissance'],
  ['Philosophers of the 1600s', 'Scientists of the 1600s'], ['Wars of the 1800s', 'Wars between South American countries'],
  ['Battles of the Pacific War', 'Wars of the Empire of Japan'], ['Countries of Southeast Asia', 'Capitals of Southeast Asia'],
  ['Leaders of the Soviet Union', 'Russia in 1917'], ['Sikhism', 'Rulers of the Sikh Empire'], ['Sikhism', '___ Singh'],
  ['Hindu temples of India', 'Rock-cut caves of India'], ['Landmarks of Delhi', 'Towers and minarets'], ['Famous mosques', 'Towers and minarets'],
  ['Built by the Almohads', 'Towers and minarets'], ['Cities of Pakistan', 'Leaders of Pakistan'], ['Peoples of East Asia', 'Peoples of Central Asia'],
  ['Battles of the Hundred Years\' War', 'Heroes of medieval Europe'], ['The French Revolution', 'All in 1789'],
];
const dropTile = {
  'Crises of the Cold War': [slugOf('Crises of the Cold War', 'Korean War')],
  'Rulers of the Sikh Empire': [slugOf('Rulers of the Sikh Empire', 'Jind Kaur')],
  'Both church and mosque': [slugOf('Both church and mosque', 'Palermo Cathedral')],
  'All in 1405': [slugOf('All in 1405', 'Otrar')],
  'Figures of the Hebrew Bible': [slugOf('Figures of the Hebrew Bible', 'Ark of the Covenant')],   // an object, not a figure
  'Romance languages': [slugOf('Romance languages', 'Old French')],   // beside French
  'Reformers and rulers of the late Ottoman Empire': [slugOf('Reformers and rulers of the late Ottoman Empire', 'Tanzimat')],   // an era, not a person
  'Rashidun caliphs': [slugOf('Rashidun caliphs', 'Hasan')],   // most lists stop at Ali
};
for (const n of drop) if (!names.has(n)) throw new Error('drop: no group ' + n);
for (const p of apart) for (const n of p) if (!names.has(n)) throw new Error('apart: no group ' + n);
const level = { 'At the court of Akbar': 4 };   // the level-4 pool ran one short: a sharp level-3 group moves up
fs.writeFileSync(B + '/edits.json', JSON.stringify({ drop, apart, dropTile, level }, null, 1));
console.log('edits: ' + drop.length + ' dropped, ' + apart.length + ' pairs apart');
