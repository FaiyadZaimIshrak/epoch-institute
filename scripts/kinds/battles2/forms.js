// Profile-only short names on the battle profiles of the second wave (23 Nov 2026): a battle's text names its commanders in full once and
// then by one name ("Wellington", "Clive", "Menelik", "Ieyasu"). Those bare names mean many people or places elsewhere
// ("Wellington" is the city of the encyclopedia), so they are forms of added-entries.json, never patterns.
// Prints the rows with the sections where each name stands; --write inserts the new ones, as text, at the end of "forms".
//   node scripts/kinds/battles2/forms.js [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..', '..');
// [entry, text, the profiles where the bare name means it]
const F = [
  ["marcus-vipsanius-agrippa","Agrippa",["Battle of Actium"]],
  ["mark-antony","Antony",["Battle of Actium"]],
  ["cleopatra-vii","Cleopatra",["Battle of Actium"]],
  ["alfonso-viii","Alfonso",["Battle of Alarcos"]],
  ["yaqub-al-mansur","al-Mansur",["Battle of Alarcos"]],
  ["titus-labienus","Labienus",["Battle of Alesia"]],
  ["julius-caesar","Caesar",["Battle of Alesia","Battle of Thapsus"]],
  ["louis-nicolas-davout","Davout",["Battle of Austerlitz"]],
  ["francisco-de-paula-santander","Santander",["Battle of Boyacá"]],
  ["antonio-jose-de-sucre","Sucre",["Battle of Ayacucho"]],
  ["marcus-licinius-crassus","Crassus",["Battle of Carrhae"]],
  ["publius-licinius-crassus","Publius",["Battle of Carrhae"]],
  ["vytautas-the-great","Vytautas",["Battle of Grunwald"]],
  ["ulrich-von-jungingen","Jungingen",["Battle of Grunwald"]],
  ["darius-iii","Darius",["Battle of Issus"]],
  ["lazar-of-serbia","Lazar",["Battle of Kosovo"]],
  ["vuk-brankovic","Branković",["Battle of Kosovo"]],
  ["bayezid-i","Bayezid",["Battle of Kosovo","Battle of Nicopolis"]],
  ["murad-i","Murad",["Battle of Kosovo"]],
  ["jozef-poniatowski","Poniatowski",["Battle of Leipzig"]],
  ["karl-philipp-prince-of-schwarzenberg","Schwarzenberg",["Battle of Leipzig"]],
  ["francis-ii-holy-roman-emperor","Francis I",["Battle of Leipzig"]],
  ["cleombrotus-i","Cleombrotus",["Battle of Leuctra"]],
  ["eumenes-ii","Eumenes",["Battle of Magnesia"]],
  ["antiochus-iii-the-great","Antiochus",["Battle of Magnesia","Battle of Raphia"]],
  ["romanos-iv-diogenes","Romanos",["Battle of Manzikert"]],
  ["manuel-i-komnenos","Manuel",["Battle of Myriokephalon"]],
  ["kilij-arslan-ii","Kilij Arslan",["Battle of Myriokephalon"]],
  ["oda-nobunaga","Nobunaga",["Battle of Nagashino"]],
  ["sigismund-holy-roman-emperor","Sigismund",["Battle of Nicopolis"]],
  ["pausanias-general","Pausanias",["Battle of Plataea"]],
  ["lucius-aemilius-paullus-macedonicus","Paullus",["Battle of Pydna"]],
  ["perseus-of-macedon","Perseus",["Battle of Pydna"]],
  ["ptolemy-iv-philopator","Ptolemy",["Battle of Raphia"]],
  ["rostam-farrokhzad","Rustam",["Battle of al-Qadisiyyah"]],
  ["yusuf-ibn-tashfin","Yusuf",["Battle of Sagrajas"]],
  ["alfonso-vi-of-castile","Alfonso",["Battle of Sagrajas"]],
  ["antonio-lopez-de-santa-anna","Santa Anna",["Battle of San Jacinto"]],
  ["theodoric-i","Theodoric",["Battle of the Catalaunian Plains"]],
  ["george-armstrong-custer","Custer",["Battle of the Little Bighorn"]],
  ["horatio-nelson","Nelson",["Battle of the Nile","Battle of Trafalgar"]],
  ["james-wolfe","Wolfe",["Battle of the Plains of Abraham"]],
  ["louis-joseph-de-montcalm","Montcalm",["Battle of the Plains of Abraham"]],
  ["publius-quinctilius-varus","Varus",["Battle of the Teutoburg Forest"]],
  ["khalid-ibn-al-walid","Khalid",["Battle of the Yarmuk","Battle of Uhud"]],
  ["abu-ubayda-ibn-al-jarrah","Abu Ubayda",["Battle of the Yarmuk"]],
  ["leonidas-i","Leonidas",["Battle of Thermopylae"]],
  ["jan-iii-sobieski","Sobieski",["Battle of Vienna (1683)"]],
  ["kara-mustafa-pasha","Kara Mustafa",["Battle of Vienna (1683)"]],
  ["jozef-pilsudski","Piłsudski",["Battle of Warsaw (1920)"]],
  ["gaius-laelius","Laelius",["Battle of Zama"]],
  ["pedro-de-alvarado","Alvarado",["Fall of Tenochtitlan"]],
  ["godfrey-of-bouillon","Godfrey",["Siege of Jerusalem (1099)"]],
  ["tancred-prince-of-galilee","Tancred",["Siege of Jerusalem (1099)"]],
  ["raymond-iv-of-toulouse","Raymond",["Siege of Jerusalem (1099)"]],
  ["al-afdal-shahanshah","al-Afdal",["Siege of Jerusalem (1099)"]]
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
