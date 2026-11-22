// The references of the twelve lives: books about the person, chosen by the editor from each article's own bibliography
// (refs-all.json: the first fourteen of each list; refs-full.json: the whole list where Wikipedia answered). Each pick is
// the start of a line of those files, and the line is copied whole.   node scripts/kinds/lives3/refs.js
const fs = require('fs'), path = require('path'), rd = f => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const A = rd('refs-all.json'), B = rd('refs-full.json');
const PICK = {
  'jesus': ['E. P. Sanders, The Historical Figure of Jesus', 'Gerd Theissen, The Historical Jesus: A Comprehensive Guide', 'James D. G. Dunn, Jesus Remembered', 'Geza Vermes, Jesus the Jew', 'Bart Ehrman, Jesus: Apocalyptic Prophet', 'Robert E. Van Voorst, Jesus Outside the New Testament'],
  'muhammad': ['Sean W. Anthony, Muhammad and the Empires of Faith', 'Karen Armstrong, Muhammad: A Prophet for Our Time', 'Clinton Bennett, In search of Muhammad', 'Abu Jafar Muhammad ibn Jarir Al-Tabari, The History of al-'],
  'the-buddha': ['Karen Armstrong, Buddha', 'Patrick Olivelle, Life of the Buddha by Ashva-ghosha', 'André Bareau, Recherches sur la biographie du Buddha', 'Carol Anderson, Pain and Its Ending'],
  'moses': ['Jan Assmann, Moses the Egyptian', 'Martin Buber, Moses: The Revelation and the Covenant', 'John Van Seters, The Life of Moses', 'Carol Meyers, Exodus', 'Thomas B. Dozeman, Commentary on Exodus'],
  'zoroaster': ['Mary Boyce, A History of Zoroastrianism: Volume I', 'Mary Boyce, Zoroastrians: Their Religious Beliefs and Practices', 'A. V. Williams Jackson, Zoroaster, the prophet of ancient Iran', 'Martin Litchfield West, The Hymns of Zoroaster', 'Michael Stausberg, The Wiley-Blackwell Companion to Zoroastrianism'],
  'guru-nanak': ['Khushwant Singh, A History of the Sikhs', 'William Owen Cole, The Sikhs: Their Religious Beliefs and Practices', 'Louise E. Fenech, The Oxford Handbook of Sikh Studies', 'Hari Ram Gupta, History of the Sikhs: The Sikh Gurus'],
  'laozi': ['Max Kaltenmark, Lao Tzu and Taoism', 'Holmes Hinkley Jr. Welch, Taoism: The Parting of the Way', 'Roel Sterckx, Ways of Heaven'],
  'mahavira': ['Piotr Balcerowicz, Early Asceticism in India', 'John E. Cort, Jains in the World', 'Lawrence A. Babb, Absent Lord', 'Naomi Appleton, Narrating Karma and Rebirth'],
  'paul-the-apostle': ['Frederick Fyvie Bruce, Paul: Apostle of the Heart Set Free', 'E.P. Sanders, Paul and Palestinian Judaism', 'Martin Hengel, Paul Between Damascus and Antioch', 'Daniel Boyarin, A Radical Jew', 'David G. Horrell, An Introduction to the Study of Paul', 'Krister Stendahl, Paul Among Jews and Gentiles'],
  'ali-ibn-abi-talib': ["H. Abbas, The Prophet's Heir", 'A. Afsaruddin, The First Muslims', 'M.M. Ayoub, The Crisis of Muslim History', "F. Daftary, A History of Shi'i Islam", 'M.M. Dakake, The Charismatic Community'],
  'abraham': ['Ronald Hendel, Remembering Abraham', 'Jon Douglas Levenson, Inheriting Abraham', 'Thomas L. Thompson, The Historicity of the Patriarchal Narratives', 'William G. Dever, What Did the Biblical Writers Know'],
  'mary-mother-of-jesus': ['Stephen Shoemaker, Ancient Traditions of the Virgin Mary', 'Alphonsus Liguori, The Glories of Mary']
};
for (const s in PICK) {
  const pool = [...(B[s] || []), ...(A[s] || [])], refs = PICK[s].map(p => { const r = pool.find(x => x.startsWith(p)); if (!r) throw new Error(s + ': no line starts ' + p); return r; });
  for (const f of [path.join(__dirname, 'out', s + '.json'), path.join(__dirname, '..', 'src', s + '.json')]) { const o = JSON.parse(fs.readFileSync(f, 'utf8')); o.references = refs; fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); }
  console.log(s.padEnd(22) + refs.length);
}
