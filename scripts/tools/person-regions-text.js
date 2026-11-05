// The second half of the people's region audit (with person-regions-wd.js): for the people Wikidata could not place,
// the entry's own first sentence often names where they belong ("a Persian prophet", "a Roman general", "king of
// Kongo"). This reads the words of nationality and place in it, maps them to the site's regions (the Near East before
// and after 640, as the register files it) and lists the people whose region is none of those the sentence names.
//   node scripts/tools/person-regions-text.js <wikidata audit tsv> [--out=file.tsv]
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..');
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const WD = process.argv[2], OUT = arg('out') || 'person-regions-text.tsv';
const box = {}; require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'people-data.js'), 'utf8'), box);
const REG = box.PEOPLE_REGIONS, PEOPLE = box.PEOPLE;
// people the Wikidata audit placed (agreeing or listed) are not read again
const placed = new Set(); if (WD && fs.existsSync(WD)) for (const l of fs.readFileSync(WD, 'utf8').split(/\r?\n/)) if (l && !l.startsWith('#')) placed.add(l.split('\t')[0]);
// words that place a person; NE: the Near East (before 640 the Ancient Near East, after it the Islamic Caliphates)
const NE = 'NE', W = {
  'Europe': 'Greek Greece Athenian Spartan Macedonian Roman Rome Byzantine Constantinople English England British Britain Scottish Scotland Irish Ireland Welsh French France Frankish Gaul Gaulish German Germany Prussian Austrian Austria Habsburg Hungarian Hungary Polish Poland Lithuanian Czech Bohemian Slovak Russian Russia Muscovite Ukrainian Kievan Serbian Serbia Croatian Bulgarian Bulgaria Romanian Wallachian Moldavian Albanian Bosnian Italian Italy Venetian Florentine Genoese Milanese Neapolitan Sicilian Papal pope Spanish Spain Castilian Aragonese Catalan Portuguese Portugal Dutch Netherlands Flemish Belgian Danish Denmark Norwegian Norway Swedish Sweden Finnish Icelandic Viking Norse Swiss Celtic Etruscan Visigothic Ostrogothic Lombard Saxon Anglo-Saxon Merovingian Carolingian Norman Breton Burgundian Bavarian Holy Roman Estonian Latvian Livonian',
  'Egypt & North Africa': 'Egyptian Egypt pharaoh Ptolemaic Alexandrian Alexandria Libyan Carthaginian Carthage Numidian Berber Moroccan Morocco Algerian Algeria Tunisian Tunisia Nubian Kushite Sudanese Fatimid Mamluk Almohad Almoravid Marinid Maghreb',
  'Sub-Saharan Africa': 'Ethiopian Ethiopia Abyssinian Aksumite Somali Swahili Zanzibar Kongo Ndongo Angolan Zulu Xhosa Sotho Ashanti Asante Yoruba Igbo Hausa Fulani Malian Mali Songhai Ghanaian Ghana Benin Dahomey Oyo Kanem Bornu Mossi Buganda Rwandan Malagasy Madagascar Zimbabwe Mutapa Shona Ndebele Kenyan Nigerian Senegalese Wolof Sokoto Kilwa Mozambican Tanzanian Ugandan Congolese Liberian',
  [NE]: 'Persian Persia Iranian Iran Achaemenid Parthian Sasanian Sassanid Median Assyrian Assyria Babylonian Babylon Sumerian Sumer Akkadian Hittite Hurrian Mitanni Urartian Elamite Phoenician Canaanite Israelite Judean Judah Hebrew Aramean Nabataean Palmyrene Arab Arabian Arabia Syrian Syria Mesopotamian Mesopotamia Anatolian Armenian Armenia Georgian Georgia Iraqi Iraq Lebanese Jordanian Palestinian Israeli Yemeni Ottoman Turkish Turkey Seljuk Safavid Qajar Abbasid Umayyad Rashidun caliph Kurdish Azerbaijani Omani Hejaz Mecca Medina Baghdad Damascus Jerusalem',
  'Central & East Asia': 'Chinese China Han Tang Song Ming Qing Yuan Mongol Mongolian Japanese Japan Korean Korea Joseon Goryeo Silla Tibetan Tibet Manchu Jurchen Khitan Uyghur Turkic Kazakh Uzbek Kyrgyz Tajik Turkmen Afghan Afghanistan Timurid Bukhara Samarkand Khwarazmian Sogdian Xiongnu Hunnic shogun samurai daimyo',
  'South & Southeast Asia': 'Indian India Mughal Maratha Rajput Sikh Bengali Bengal Tamil Chola Gupta Maurya Vijayanagara Deccan Hyderabad Mysore Punjabi Nepali Nepalese Sri Lankan Sinhalese Ceylon Burmese Myanmar Thai Siamese Ayutthaya Khmer Cambodian Lao Laotian Vietnamese Vietnam Annamese Champa Malay Malaysian Malacca Javanese Java Sumatran Indonesian Balinese Majapahit Srivijaya Filipino Philippine Bruneian Pakistani Bangladeshi Delhi',
  'Americas': 'American Americas Mexican Mexico Aztec Mexica Maya Mayan Inca Peruvian Peru Brazilian Brazil Argentine Argentinian Chilean Colombian Venezuelan Bolivian Ecuadorian Uruguayan Paraguayan Cuban Haitian Jamaican Canadian Canada Caribbean Cherokee Iroquois Mohawk Lakota Sioux Apache Comanche Shawnee Powhatan Algonquian Muisca Toltec Zapotec Mixtec Purépecha Taíno Confederate',
  'Oceania': 'Hawaiian Hawaii Tahitian Tahiti Tongan Tonga Samoan Samoa Fijian Fiji Maori Māori Australian Australia Aboriginal Zealand Polynesian Melanesian Micronesian Papuan',
};
const map = new Map(); for (const [r, ws] of Object.entries(W)) for (const w of ws.split(' ')) map.set(w, r);
const rx = new RegExp('\\b(' + [...map.keys()].sort((a, b) => b.length - a.length).map(w => w.replace(/[-]/g, '\\-')).join('|') + ')\\b', 'g');
const prev = {};
const lede = slug => { const c = /^[a-z]/.test(slug[0]) ? slug[0] : '0'; if (!prev[c]) prev[c] = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'enc-preview', c + '.json'), 'utf8')); const p = prev[c][slug]; return p ? p.s.split(/(?<=[.!?])\s+(?=[A-Z])/)[0] : ''; };
const rows = []; let read = 0;
for (const [slug, name, dates, first, last, kind, ri] of PEOPLE) {
  if (placed.has(slug)) continue;
  const s = lede(slug); if (!s) continue; read++;
  const mid = Math.round((first + last) / 2), found = {};
  // only the words around the description of the person, not the whole sentence's places: the first 160 characters
  for (const m of s.slice(0, 160).matchAll(rx)) { let r = map.get(m[1]); if (r === NE) r = mid < 640 ? 'Ancient Near East' : 'Islamic Caliphates & Middle East'; found[r] = (found[r] || 0) + 1; }
  const regs = Object.keys(found); if (!regs.length) continue;
  const now = ri >= 0 ? REG[ri] : '(none)';
  if (regs.includes(now)) continue;
  rows.push([slug, name, dates, now, regs.join(' / '), s.slice(0, 220)].join('\t'));
}
fs.writeFileSync(OUT, '# slug\tname\tdates\tregion now\tregions the entry names\tfirst sentence\n' + rows.join('\n') + '\n');
console.log('read ' + read + ' entries not placed by Wikidata; listed ' + rows.length);
