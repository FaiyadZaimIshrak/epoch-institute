// Profile-only short names on the sacred lives (22 Nov 2026): "Peter", "Mary", "Ali", "Isaac", "Tao" … mean one person
// or thing on these pages and many others elsewhere, so they are forms of added-entries.json, never patterns.
// Prints the rows with the sections where each name stands; --write inserts the new ones, as text, at the end of "forms".
//   node scripts/kinds/lives3/forms.js [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..', '..');
const SLUG = { 'Jesus': 'jesus', 'Muhammad': 'muhammad', 'The Buddha': 'the-buddha', 'Moses': 'moses', 'Zoroaster': 'zoroaster', 'Guru Nanak': 'guru-nanak', 'Laozi': 'laozi', 'Mahavira': 'mahavira',
  'Paul the Apostle': 'paul-the-apostle', 'Ali ibn Abi Talib': 'ali-ibn-abi-talib', 'Abraham': 'abraham', 'Mary, mother of Jesus': 'mary-mother-of-jesus' };
// [entry, text, the profiles where the bare name means it]
const F = [
  ['saint-peter', 'Peter', ['Jesus', 'Paul the Apostle', 'Mary, mother of Jesus']],
  ['paul-the-apostle', 'Paul', ['Jesus', 'Mary, mother of Jesus']],
  ['mary-mother-of-jesus', 'Mary', ['Jesus', 'Paul the Apostle']],
  ['saint-joseph', 'Joseph', ['Jesus', 'Mary, mother of Jesus']],
  ['judas-iscariot', 'Judas', ['Jesus']],
  ['pontius-pilate', 'Pilate', ['Jesus', 'Mary, mother of Jesus', 'Paul the Apostle']],
  ['calvary', 'Calvary', ['Jesus', 'Mary, mother of Jesus']], ['calvary', 'Golgotha', ['Jesus', 'Mary, mother of Jesus']],
  ['khadija-bint-khuwaylid', 'Khadija', ['Muhammad', 'Ali ibn Abi Talib']],
  ['abu-talib-ibn-abd-al-muttalib', 'Abu Talib', ['Muhammad', 'Ali ibn Abi Talib']],
  ['ali-ibn-abi-talib', 'Ali', ['Muhammad']],
  ['abu-bakr-al-siddiq', 'Abu Bakr', ['Muhammad', 'Ali ibn Abi Talib']],
  ['umar-ibn-al-khattab', 'Umar', ['Muhammad', 'Ali ibn Abi Talib']],
  ['uthman-ibn-affan', 'Uthman', ['Muhammad', 'Ali ibn Abi Talib']],
  ['muawiya-i', "Mu'awiya", ['Ali ibn Abi Talib']],
  ['hasan-ibn-ali', 'Hasan', ['Ali ibn Abi Talib']], ['husayn-ibn-ali', 'Husayn', ['Ali ibn Abi Talib']],
  ['hagar', 'Hagar', ['Abraham', 'Muhammad']], ['ishmael', 'Ishmael', ['Abraham', 'Muhammad']], ['isaac', 'Isaac', ['Abraham', 'Moses']],
  ['sarah', 'Sarah', ['Abraham']], ['sarah', 'Sarai', ['Abraham']], ['jacob', 'Jacob', ['Abraham', 'Moses']],
  ['aaron', 'Aaron', ['Moses']], ['miriam', 'Miriam', ['Moses']], ['joshua', 'Joshua', ['Moses']], ['tabernacle', 'Tabernacle', ['Moses']],
  ['ananda', 'Ānanda', ['The Buddha']], ['ananda', 'Ananda', ['The Buddha']], ['maya-mother-of-the-buddha', 'Maya', ['The Buddha']], ['maya-mother-of-the-buddha', 'Māyā', ['The Buddha']],
  ['gautama-buddha', 'Buddha', ['Mahavira', 'Laozi']],
  ['tao', 'Tao', ['Laozi']], ['tao', 'Dao', ['Laozi']], ['daodejing', 'Dào Dé Jīng', ['Laozi']],
  ['bhai-mardana', 'Mardana', ['Guru Nanak']], ['guru-angad', 'Bhai Lehna', ['Guru Nanak']]
];
const texts = {};   // profile -> {section: plain text}; facts, takeaways, events and summary count as "summary"
for (const n in SLUG) { const o = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', SLUG[n] + '.json'), 'utf8')), t = {};
  for (const k in o.sections) t[k] = o.sections[k].replace(/<[^>]+>/g, ' ');
  t.summary = [o.summary, Object.values(o.facts).join(' '), o.t.join(' '), o.dyk, o.ev.map(e => e[1]).join('. ')].join(' '); texts[n] = t; }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), rows = [];
for (const [slug, text, profs] of F) {
  // the bare name, not inside a longer one ("Mary Magdalene", "Joseph of Arimathea", "Ali ibn Abi Talib", "Tao Te Ching")
  const re = new RegExp('(?<![\\p{L}\\p{N}-])(?<!\\p{Lu}\\p{Ll}+ )' + esc(text) + '(?:[\'’]s)?(?![\\p{L}\\p{N}-])(?! (?:\\p{Lu}|of |ibn |bin |bint |al-|the Apostle))', 'u'), where = {};
  for (const p of profs) { const secs = Object.keys(texts[p]).filter(k => re.test(texts[p][k])); if (secs.length) where[p] = secs; }
  if (Object.keys(where).length) rows.push([slug, text, 0, where]); else console.log('(nowhere: ' + text + ')');
}
for (const r of rows) console.log(r[1].padEnd(12) + ' -> ' + r[0].padEnd(30) + Object.entries(r[3]).map(([p, s]) => p + ': ' + s.join(',')).join(' | '));
if (process.argv.includes('--write')) {
  const f = path.join(R, 'scripts', 'added-entries.json'), t = fs.readFileSync(f, 'utf8'), A = JSON.parse(t), nl = t.includes('\r\n') ? '\r\n' : '\n';
  const add = rows.filter(r => !A.forms.some(x => x[0] === r[0] && x[1] === r[1]));
  const keys = Object.keys(A), next = keys[keys.indexOf('forms') + 1], start = t.indexOf(nl + ' "forms": ['), end = t.indexOf(nl + ' ],' + nl + ' "' + next + '":', start);
  if (start < 0 || end < 0) throw new Error('forms array not found');
  if (add.length) { const out = t.slice(0, end) + ',' + nl + add.map(r => JSON.stringify(r, null, 1).split('\n').map(l => '  ' + l).join(nl)).join(',' + nl) + t.slice(end);
    const B = JSON.parse(out); if (B.forms.length !== A.forms.length + add.length) throw new Error('forms count'); fs.writeFileSync(f, out); }
  console.log(add.length + ' forms inserted');
}
