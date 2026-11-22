// Link patterns and the editor's fixes for the entries of wave lives3 (22 Nov 2026): the people, events, places and
// teachings the twelve sacred lives name. Writes entry-links.json and entry-fixes.json beside it, for
// scripts/entries/merge-entries.js. Bare names that mean other people or things get NO pattern (Isaac, Sarah, Aaron,
// Miriam, Joshua, Hagar, Ishmael, Ananda, Rahula, Tao, Calvary, Tabernacle, "Saint Peter", "Saint Paul", "the Twelve"):
// they link only as profile-only forms on the lives that mean them (added-entries.json "forms").
const fs = require('fs'), path = require('path');
const L = {
  'paul-the-apostle': [['Paul the Apostle', 0], ['Apostle Paul', 0], ['Paul of Tarsus', 0], ['Saul of Tarsus', 0]],
  'saint-peter': [['Peter the Apostle', 0], ['Simon Peter', 0], ['Apostle Peter', 0]],
  'pontius-pilate': [['Pontius Pilate', 0]],
  'mary-magdalene': [['Mary Magdalene', 0], ['Mary of Magdala', 0]],
  'saint-joseph': [['Joseph of Nazareth', 0]],
  'judas-iscariot': [['Judas Iscariot', 0]],
  'caiaphas': [['Caiaphas', 0]],
  'james-brother-of-jesus': [['James, brother of Jesus', 0], ['James the brother of Jesus', 0]],
  'apostles-in-the-new-testament': [['Apostles in the New Testament', 0]],
  'last-supper': [['Last Supper', 0]],
  'sermon-on-the-mount': [['Sermon on the Mount', 0]],
  'crucifixion-of-jesus': [['Crucifixion of Jesus', 2]],
  'resurrection-of-jesus': [['Resurrection of Jesus', 2]],
  'baptism-of-jesus': [['Baptism of Jesus', 2]],
  'lords-prayer': [["Lord's Prayer", 0], ['Lord’s Prayer', 0]],
  'calvary': [['Mount Calvary', 0], ['hill of Golgotha', 0]],
  'gethsemane': [['Gethsemane', 0]],
  'capernaum': [['Capernaum', 0]],
  'council-of-jerusalem': [['Council of Jerusalem', 0]],
  'conversion-of-paul-the-apostle': [['Conversion of Paul the Apostle', 0], ['conversion of Paul', 0]],
  'pauline-epistles': [['Pauline epistles', 2], ['Pauline letters', 2], ['Epistles of Paul', 0]],
  'annunciation': [['Annunciation', 0]],
  'assumption-of-mary': [['Assumption of Mary', 0], ['Assumption of the Virgin', 0], ['Dormition of the Mother of God', 0]],
  'khadija-bint-khuwaylid': [['Khadija bint Khuwaylid', 0], ['Khadijah bint Khuwaylid', 0]],
  'abu-talib-ibn-abd-al-muttalib': [['Abu Talib ibn Abd al-Muttalib', 0]],
  'battle-of-badr': [['Battle of Badr', 0]],
  'battle-of-the-trench': [['Battle of the Trench', 0], ['Battle of Khandaq', 0]],
  'conquest-of-mecca': [['Conquest of Mecca', 2]],
  'isra-and-miraj': [["Isra' and Mi'raj", 0], ['Isra’ and Mi’raj', 0], ["Isra and Mi'raj", 0], ['Night Journey', 0]],
  'farewell-pilgrimage': [['Farewell Pilgrimage', 0]],
  'jabal-al-nour': [['Jabal al-Nour', 0], ['Cave of Hira', 2]],
  'ghadir-khumm': [['Ghadir Khumm', 0]],
  'imam-ali-shrine': [['Imam Ali Shrine', 0], ['Shrine of Imam Ali', 0]],
  'ahl-al-bayt': [['Ahl al-Bayt', 0], ['Ahl al-bayt', 0]],
  'prophets-mosque': [["Prophet's Mosque", 0], ['Prophet’s Mosque', 0], ['Mosque of the Prophet', 0], ['Al-Masjid al-Nabawi', 2]],
  'hagar': [],
  'ishmael': [],
  'isaac': [],
  'sarah': [],
  'binding-of-isaac': [['Binding of Isaac', 2], ['Akedah', 0], ['Sacrifice of Isaac', 0]],
  'cave-of-the-patriarchs': [['Cave of the Patriarchs', 0], ['Cave of Machpelah', 0], ['Ibrahimi Mosque', 0]],
  'four-noble-truths': [['Four Noble Truths', 0]],
  'noble-eightfold-path': [['Noble Eightfold Path', 0], ['Eightfold Path', 0]],
  'bodhi-tree': [['Bodhi tree', 2], ['Bodhi Tree', 0]],
  'maya-mother-of-the-buddha': [['Queen Maya', 0], ['Mahāmāyā', 0], ['Māyādevī', 0]],
  'yasodhara': [['Yaśodharā', 0], ['Yasodhara', 0]],
  'rahula': [['Rāhula', 0]],
  'ananda': [],
  'devadatta': [['Devadatta', 0]],
  'buddhist-councils': [['Buddhist councils', 2], ['First Buddhist Council', 0], ['First Buddhist council', 2], ['Third Buddhist Council', 0], ['Third Buddhist council', 0]],
  'middle-way': [['Middle Way', 0]],
  'parinirvana': [['Parinirvana', 2]],
  'tirthankara': [['Tirthankara', 2], ['Tirthaṅkara', 2]],
  'kalpa-sutra': [['Kalpa Sūtra', 0], ['Kalpa Sutra', 0]],
  'anekantavada': [['Anekantavada', 2], ['Anekāntavāda', 2]],
  'gurdwara-darbar-sahib-kartarpur': [['Gurdwara Darbar Sahib Kartarpur', 0], ['Kartarpur Sahib', 0]],
  'bhai-mardana': [['Bhai Mardana', 0]],
  'guru-angad': [['Guru Angad', 0]],
  'nankana-sahib': [['Nankana Sahib', 0]],
  'mul-mantar': [['Mul Mantar', 0], ['Mool Mantar', 0]],
  'langar-sikhism': [['langar', 1]],
  'aaron': [],
  'miriam': [],
  'burning-bush': [['burning bush', 1], ['Burning Bush', 0]],
  'plagues-of-egypt': [['Plagues of Egypt', 2], ['Ten Plagues', 2]],
  'parting-of-the-red-sea': [['Parting of the Red Sea', 2], ['Crossing of the Red Sea', 2]],
  'golden-calf': [['Golden Calf', 0], ['golden calf', 1]],
  'mount-nebo': [['Mount Nebo', 0]],
  'tabernacle': [['Tent of Meeting', 0], ['Mishkan', 0]],
  'joshua': [['Joshua son of Nun', 0], ['Joshua, son of Nun', 0]],
  'midian': [['Midian', 0]],
  'zipporah': [['Zipporah', 0]],
  'gathas': [['Gathas', 0]],
  'vishtaspa': [['Vishtaspa', 0]],
  'amesha-spenta': [['Amesha Spenta', 0]],
  'yasna': [['Yasna', 0]],
  'ahriman': [['Ahriman', 0], ['Angra Mainyu', 0]],
  'wu-wei': [['wu wei', 1], ['Wu wei', 0]],
  'tao': [],
  'yinxi': [['Yinxi', 0]]
};
// [slug, field, old, new]: wording, and other names that belong to entries the site already has
const F = [
  ['hagar', 'desc', 'Islamic tradition does not name her in the Quran but describes Hajar as', 'The Quran does not name her, but Islamic tradition describes Hajar as'],
  ['four-noble-truths', 'desc', 'often present them as its central teaching', 'often present them as the central teaching of Buddhism'],
  ['joshua', 'desc', 'centuries after the supposed conquest', 'centuries after the events it describes'],
  ['nankana-sahib', 'desc', 'who was born and based there', 'who was born and lived there'],
  ['crucifixion-of-jesus', 'aka', '', []],                                  // "Passion of Jesus" is its own entry
  ['last-supper', 'aka', '', ['Mystical Supper']],                         // "Lord's Supper" is a name of the Eucharist entry
  ['ghadir-khumm', 'aka', '', []],                                         // Eid al-Ghadir is its own entry
  ['joshua', 'aka', '', ['Yehoshua', 'Joshua son of Nun', 'Yusha bin Nun']],   // Hoshea is the king of Israel's entry
  ['wu-wei', 'aka', '', ['non-action']],                                   // Wuwei is the city in Gansu
  ['devadatta', 'aka', '', []]
];
fs.writeFileSync(path.join(__dirname, 'entry-links.json'), JSON.stringify(L, null, 1) + '\n');
fs.writeFileSync(path.join(__dirname, 'entry-fixes.json'), JSON.stringify(F, null, 1) + '\n');
console.log(Object.keys(L).length + ' link sets, ' + F.length + ' fixes');
