// Profile-only short names on the battle profiles (22 Nov 2026): a battle's text names its commanders in full once and
// then by one name ("Wellington", "Clive", "Menelik", "Ieyasu"). Those bare names mean many people or places elsewhere
// ("Wellington" is the city of the encyclopedia), so they are forms of added-entries.json, never patterns.
// Prints the rows with the sections where each name stands; --write inserts the new ones, as text, at the end of "forms".
//   node scripts/kinds/battles1/forms.js [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..', '..');
// [entry, text, the profiles where the bare name means it]
const F = [
  ['arthur-wellesley-1st-duke-of-wellington', 'Wellington', ['Battle of Waterloo']],
  ['michel-ney', 'Ney', ['Battle of Waterloo']], ['gebhard-leberecht-von-blucher', 'Blücher', ['Battle of Waterloo']],
  ['robert-clive', 'Clive', ['Battle of Plassey']], ['siraj-ud-daulah', 'Siraj', ['Battle of Plassey']],
  ['menelik-ii', 'Menelik', ['Battle of Adwa']], ['oreste-baratieri', 'Baratieri', ['Battle of Adwa']],
  ['georgy-zhukov', 'Zhukov', ['Battle of Stalingrad']], ['joseph-stalin', 'Stalin', ['Battle of Stalingrad']],
  ['harold-godwinson', 'Harold', ['Battle of Hastings']],
  ['henry-v-of-england', 'Henry', ['Battle of Agincourt']],
  ['tokugawa-ieyasu', 'Ieyasu', ['Battle of Sekigahara']], ['ishida-mitsunari', 'Mitsunari', ['Battle of Sekigahara']],
  ['toyotomi-hideyoshi', 'Hideyoshi', ['Battle of Sekigahara']], ['kobayakawa-hideaki', 'Hideaki', ['Battle of Sekigahara']],
  ['ahmad-shah-abdali', 'Abdali', ['Third Battle of Panipat']], ['sadashivrao-bhau', 'Bhau', ['Third Battle of Panipat']],
  ['shuja-ud-daula', 'Shuja', ['Third Battle of Panipat']],
  ['hulagu-khan', 'Hulagu', ['Battle of Ain Jalut']],
  ['robert-e-lee', 'Lee', ['Battle of Gettysburg']], ['ulysses-s-grant', 'Grant', ['Battle of Gettysburg']],
  ['alexander-the-great', 'Alexander', ['Battle of Gaugamela']], ['darius-iii', 'Darius', ['Battle of Gaugamela']],
  ['ramesses-ii', 'Ramesses', ['Battle of Kadesh']], ['muwatalli-ii', 'Muwatalli', ['Battle of Kadesh']],
  ['mehmed-ii', 'Mehmed', ['Fall of Constantinople']],
  ['guy-of-lusignan', 'Guy', ['Battle of Hattin']], ['raynald-of-chatillon', 'Raynald', ['Battle of Hattin']],
  ['raymond-iii-of-tripoli', 'Raymond', ['Battle of Hattin']],
  ['charles-martel', 'Charles', ['Battle of Tours']]
];
const SD = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {toSlug}')();
const ENT = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
const texts = {};   // profile -> {section: plain text}; facts, takeaways, events and summary count as "summary"
for (const n of new Set(F.flatMap(f => f[2]))) { const o = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'kinds', 'src', SD.toSlug(n) + '.json'), 'utf8')), t = {};
  for (const k in o.sections) t[k] = o.sections[k].replace(/<[^>]+>/g, ' ');
  t.summary = [o.summary, Object.values(o.facts).join(' '), o.t.join(' '), o.dyk, o.ev.map(e => e[1]).join('. ')].join(' '); texts[n] = t; }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), rows = [];
for (const [slug, text, profs] of F) {
  if (!ENT.includes('slug:"' + slug + '",')) { console.log('(no entry: ' + slug + ')'); continue; }
  // the bare name, not inside a longer one ("Henry IV", "Guy of Lusignan", "Charles Oman", "Fitzhugh Lee")
  const re = new RegExp('(?<![\\p{L}\\p{N}-])(?<!\\p{Lu}\\p{Ll}+ )' + esc(text) + '(?:[\'’]s)?(?![\\p{L}\\p{N}-])(?! (?:\\p{Lu}|of |ibn |bin |al-|the ))', 'u'), where = {};
  for (const p of profs) { const secs = Object.keys(texts[p]).filter(k => re.test(texts[p][k])); if (secs.length) where[p] = secs; }
  if (Object.keys(where).length) rows.push([slug, text, 0, where]); else console.log('(nowhere: ' + text + ')');
}
for (const r of rows) console.log(r[1].padEnd(12) + ' -> ' + r[0].padEnd(42) + Object.entries(r[3]).map(([p, s]) => p + ': ' + s.join(',')).join(' | '));
if (process.argv.includes('--show')) for (const [slug, text, profs] of F) for (const p of profs) for (const k in texts[p]) { const m = texts[p][k].match(new RegExp('.{0,40}' + esc(text) + '.{0,30}', 'gu')) || []; for (const x of m.slice(0, 2)) console.log(text + ' | ' + p + ' | ' + k + ' | ' + x); }
if (process.argv.includes('--write')) {
  const f = path.join(R, 'scripts', 'added-entries.json'), t = fs.readFileSync(f, 'utf8'), A = JSON.parse(t), nl = t.includes('\r\n') ? '\r\n' : '\n';
  const add = rows.filter(r => !A.forms.some(x => x[0] === r[0] && x[1] === r[1]));
  const keys = Object.keys(A), next = keys[keys.indexOf('forms') + 1], start = t.indexOf(nl + ' "forms": ['), end = t.indexOf(nl + ' ],' + nl + ' "' + next + '":', start);
  if (start < 0 || end < 0) throw new Error('forms array not found');
  if (add.length) { const out = t.slice(0, end) + ',' + nl + add.map(r => JSON.stringify(r, null, 1).split('\n').map(l => '  ' + l).join(nl)).join(',' + nl) + t.slice(end);
    const B = JSON.parse(out); if (B.forms.length !== A.forms.length + add.length) throw new Error('forms count'); fs.writeFileSync(f, out); }
  console.log(add.length + ' forms inserted');
}
