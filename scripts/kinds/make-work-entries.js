// Encyclopedia entries for the great works that had none (Nov 2026), as make-ideology-entries.js does for the ideologies:
// written ONLY from each work's checked profile (its summary's first sentences, at most ~420 characters), into
// scripts/added-entries.json "entries" (work: true; a re-run adds only the works not there yet, as text at the end of
// the list, so the others keep their pictures and the file its layout), applied by apply-added-entries.ps1, their
// pictures chosen by eye with scripts/entries/pictures.js. Link patterns only for names that mean the work alone;
// self.tsv makes each profile's own entry claimed, not linked. Read pattern-count.js before they go live.
//   node scripts/kinds/make-work-entries.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(rd('shared-data.js').replace(/^const /gm, 'var ') + ';return {EMPIRES}')();
const P = new Function(rd('empire-profiles.js').replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return EMPIRE_PROFILES')();
// work: [entry slug, subtype, dates as the profile gives them, link patterns]
const WORKS = {
  'One Thousand and One Nights': ['one-thousand-and-one-nights', 'text', '8th–19th century', [['One Thousand and One Nights', 0], ['Thousand and One Nights', 0], ['Arabian Nights', 0]]],
  'The Tale of Genji': ['the-tale-of-genji', 'text', 'early 11th century', [['The Tale of Genji', 0], ['Tale of Genji', 0]]],
  'Terracotta Army': ['terracotta-army', 'artifact', 'c. 246–209 BCE', [['Terracotta Army', 0], ['terracotta army', 1]]],
  // works3 (22 Nov 2026). "Yijing" alone stays the monk's name (the entry yijing): on the profiles where it means the
  // book it is a profile-only form of this entry.
  // works4 (23 Nov 2026). "The Republic" alone begins too many sentences about states: only the forms with Plato's name link.
  'The Republic': ['the-republic', 'text', 'c. 375 BCE', [["Plato's Republic", 0], ['Plato’s Republic', 0], ['Republic of Plato', 0]]],
  'Histories of Herodotus': ['histories-of-herodotus', 'text', 'c. 430 BCE', [['Histories of Herodotus', 0], ["Herodotus's Histories", 0], ['Herodotus’s Histories', 0], ["Herodotus' Histories", 0]]],
  'Notre-Dame de Paris': ['notre-dame-de-paris', 'monument', '1163–1260', [['Notre-Dame de Paris', 0], ['Notre Dame de Paris', 0], ['Notre-Dame Cathedral', 0]]],
  'Sistine Chapel ceiling': ['sistine-chapel-ceiling', 'artifact', '1508–1512', [['Sistine Chapel ceiling', 0]]],
  'Mona Lisa': ['mona-lisa', 'artifact', 'c. 1503–1517', [['Mona Lisa', 0]]],
  'Palace of Versailles': ['palace-of-versailles', 'monument', '1623', [['Palace of Versailles', 0], ['Château de Versailles', 0]]],
  'Lascaux': ['lascaux', 'monument', 'Upper Palaeolithic', [['Lascaux', 0]]],
  'Gutenberg Bible': ['gutenberg-bible', 'text', 'c. 1455', [['Gutenberg Bible', 0]]],
  'Statue of Liberty': ['statue-of-liberty', 'monument', '1886', [['Statue of Liberty', 0]]],
  'Moai': ['moai', 'monument', 'c. 1250–1500', [['moai', 2]]],
  'Tomb of Tutankhamun': ['tomb-of-tutankhamun', 'monument', 'c. 1323 BCE', [['Tomb of Tutankhamun', 0], ['tomb of Tutankhamun', 0], ['KV62', 0]]],
  'Göbekli Tepe': ['gobekli-tepe', 'monument', 'c. 9500–8000 BCE', [['Göbekli Tepe', 0], ['Gobekli Tepe', 0]]],
  'Great Mosque of Djenné': ['great-mosque-of-djenne', 'monument', '1907', [['Great Mosque of Djenné', 0]]],
  'Sanchi': ['sanchi', 'monument', '3rd century BCE', [['Sanchi', 0]]],
  'Prambanan': ['prambanan', 'monument', '9th century', [['Prambanan', 0]]],
  'Bagan': ['bagan', 'monument', '9th–13th century', [['Bagan', 0]]],
  'Sigiriya': ['sigiriya', 'monument', '5th century', [['Sigiriya', 0]]],
  'Panchatantra': ['panchatantra', 'text', 'c. 300', [['Panchatantra', 0]]],
  'The Art of War': ['the-art-of-war', 'text', '5th century BCE', [['The Art of War', 0], ['Art of War', 0]]],
  'Dream of the Red Chamber': ['dream-of-the-red-chamber', 'text', '18th century', [['Dream of the Red Chamber', 0], ['Story of the Stone', 0]]],
  'Journey to the West': ['journey-to-the-west', 'text', '16th century', [['Journey to the West', 0]]],
  'Himeji Castle': ['himeji-castle', 'monument', '1333–1609', [['Himeji Castle', 0]]],
  // a great life without an entry (lives4): the fifth field makes the entry a person
  'Truganini': ['truganini', '', 'c. 1812–1876', [['Truganini', 0]], 'person'],
  'I Ching': ['i-ching', 'text', '10th–4th century BCE', [['I Ching', 0], ['Book of Changes', 0], ['Classic of Changes', 0], ['Zhou yi', 0], ['Zhouyi', 0]]],
};
function lede(t) {
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  return t.slice(0, cut).trim();
}
const out = [];
for (const [name, [slug, subtype, dates, links, type]] of Object.entries(WORKS)) {
  const e = SD.EMPIRES.find(x => x.name === name && x.kind === (type ? 'life' : 'work')); if (!e) throw new Error('no profile ' + name);
  const p = P[name]; if (!p || !p.summary) throw new Error('no summary ' + name);
  out.push(type ? { slug, name, type, dates, desc: lede(p.summary), links, work: true } : { slug, name, type: 'work', subtype, dates, desc: lede(p.summary), links, work: true });
}
const AE = path.join(R, 'scripts', 'added-entries.json'); let txt = fs.readFileSync(AE, 'utf8'); const A = JSON.parse(txt), nl = txt.includes('\r\n') ? '\r\n' : '\n';
const add = out.filter(o => !A.entries.some(x => x.slug === o.slug));
if (add.length) { const i = txt.indexOf(nl + ' ],' + nl + ' "patterns": ['); if (i < 0) throw new Error('end of entries not found');
  txt = txt.slice(0, i) + add.map(o => ',' + nl + JSON.stringify(o, null, 1).split('\n').map(l => '  ' + l).join(nl)).join('') + txt.slice(i);
  if (JSON.parse(txt).entries.length !== A.entries.length + add.length) throw new Error('count'); fs.writeFileSync(AE, txt); }
console.log(add.length + ' work entries added to scripts/added-entries.json (' + (out.length - add.length) + ' were there)');
for (const o of add) console.log(' ', o.slug.padEnd(30), o.dates.padEnd(20), o.desc.slice(0, 110));
