// Rulers of the profiled states and empires, from the encyclopedia's own people (structure round R2, Nov 2026;
// Wikidata names a head of state for only 300 of 4,452 states: see CLAUDE.md).
//   node scripts/tools/state-rulers.js [--report=file.txt] [--only=<profile slug>,…]
// A person is proposed as a ruler of a profile when all of these hold:
//   - the profile's own text names them (the entry's "empires" list has the profile),
//   - the first sentence of their entry says what they were ("X was Roman emperor from…", "was ruler of the Mali Empire"):
//     that predicate, up to its first comma or relative clause, holds a ruler's title and the state's name, or its core
//     word ("France" of the Kingdom of France, "Ottoman", "Mughal" …); or the sentence says they founded the state. So
//     a minister "of the Mughal emperor", a general or a foreign king the profile mentions is not taken,
//   - their years (people-data.js: a reign, a lifespan or years of activity) overlap the profile's own.
// Where several profiles claim a person (the Kingdom of England and the Angevin Empire), each keeps them: a ruler may
// have ruled both. scripts/state-rulers-manual.tsv is the editor's: "profile slug TAB entry slug TAB -" takes a person
// off a profile, "profile slug TAB entry slug TAB +" adds one the rule misses.
// Writes scripts/state-rulers.tsv: profile slug TAB the rulers' slugs in order of their first year, | between; and
// scripts/state-rulers.js (STATE_RULERS {profile name: [[slug, name, dates]]}) for generator.html, which shows them as
// "Rulers and leaders in the encyclopedia" after the profile's governance section: regenerate the profiles after a run.
// A profile needs three rulers to be listed.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8'), arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const E = new Function(read('encyclopedia-data.js') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
const sd = {}; vm.runInNewContext(read('shared-data.js') + '\n;this.EMPIRES = EMPIRES; this.toSlug = toSlug;', sd);
const pd = {}; vm.runInNewContext(read('people-data.js'), pd); const yrs = {}; for (const p of pd.PEOPLE) yrs[p[0]] = [p[3], p[4], p[5]];
const first = s => { const m = String(s || '').match(/^(.*?[.!?])(?=\s+[A-Z“"(]|$)/); return (m ? m[1] : String(s || '')).replace(/\b([A-Z])\.\s/g, '$1 '); };
const TITLE = /\b(king|queen|emperor|empress|sultan|sultana|caliph|shah|shahanshah|khan|khagan|great khan|pharaoh|tsar|tsarina|czar|doge|emir|negus|mansa|sapa inca|tlatoani|shogun|president|prime minister|chancellor|regent|ruler|founder|grand prince|grand duke|raja|maharaja|peshwa|stadtholder|consul|dictator|general secretary|first secretary|monarch|sovereign|oba|asantehene|kabaka|mwami|alaafin|ooni|mai|askia|kaiser|ilkhan|voivode|ban|despot|lord protector|premier|head of state|high king|vizier-king|khedive|bey|dey|hetman|governor-general|viceroy)\b/i;
// the predicate of the first sentence: what the person "was", up to the first comma, bracket or relative clause
const predicate = f => { const m = f.match(/\b(?:was|is|were|became)\s+(.*)$/); if (!m) return ''; return m[1].split(/,|;|\(|\bwho\b|\bwhose\b|\bthat\b|\bunder whom\b|\band\s+(?:then|later|a|an|the)\b/)[0]; };
const NOUN = /\b(Nazi|Empire|Kingdom|Sultanate|Caliphate|Khanate|Khaganate|Dynasty|dynasty|Republic|Confederation|Confederacy|Union|Commonwealth|State|States|Duchy|Principality|Emirate|Shogunate|Federation|Realm|Imperial|Great|Grand|Holy|United|First|Second|Third|New|Old|Middle|Later|Early|Late|Eastern|Western|Northern|Southern|of|the|and|People's|Democratic|Socialist|Soviet|Federal|Colonial|Kingdoms|Period|Era)\b/g;
const cores = name => { const c = name.replace(/\([^)]*\)/g, ' ').replace(NOUN, ' ').replace(/\s+/g, ' ').trim(); const out = new Set([name]); if (c.length >= 4) { out.add(c); if (/ia$/.test(c)) out.add(c.slice(0, -1) + 'n'); } return [...out]; };
const ADJ = { French: ['France'], Spanish: ['Spain', 'Castile'], Portuguese: ['Portugal'], British: ['Great Britain', 'Britain', 'the United Kingdom', 'United Kingdom', 'England'], Swedish: ['Sweden'], Danish: ['Denmark'], Polish: ['Poland'], Japanese: ['Japan'], Belgian: ['Belgium', 'the Belgians'], Italian: ['Italy'], France: ['French'], England: ['English'], Spain: ['Spanish'], Portugal: ['Portuguese'], Sweden: ['Swedish'], Denmark: ['Danish'], Poland: ['Polish'], Hungary: ['Hungarian'], Scotland: ['Scottish', 'Scots'], Ireland: ['Irish'], Japan: ['Japanese'], China: ['Chinese'], Korea: ['Korean'], Egypt: ['Egyptian'], Greece: ['Greek'], Rome: ['Roman'], Roman: ['Rome'], Byzantine: ['Byzantium', 'Eastern Roman'], Ottoman: ['Ottomans'], Mongol: ['Mongols', 'Mongolian'], Russia: ['Russian', 'Russians'], Russian: ['Russia'], Germany: ['German'], German: ['Germany'], Italy: ['Italian'], Netherlands: ['Dutch'], Dutch: ['Netherlands'], Persia: ['Persian'], Achaemenid: ['Persian', 'Persia'], Sasanian: ['Sassanid', 'Sasanid', 'Persian'], Assyrian: ['Assyria'], Babylonian: ['Babylon', 'Babylonia'], Mali: ['Malian'], Songhai: ['Songhay'], Ethiopia: ['Ethiopian'], Ethiopian: ['Ethiopia', 'Abyssinia'], Aztec: ['Tenochtitlan', 'Mexica'], Inca: ['Incas', 'Sapa Inca'], Mughal: ['Mughals'], Maurya: ['Mauryan'], Gupta: ['Guptas'], Abbasid: ['Abbasids'], Umayyad: ['Umayyads'], Fatimid: ['Fatimids'], Seljuk: ['Seljuks', 'Seljuq'], Safavid: ['Safavids'], Timurid: ['Timurids'], Carolingian: ['Franks', 'Frankish'], Frankish: ['Franks'], Macedonian: ['Macedon', 'Macedonia'], Hittite: ['Hittites'], Khmer: ['Angkor'], Soviet: ['USSR'], Austria: ['Austrian'], Austrian: ['Austria'], Habsburg: ['Austria', 'Austrian'], Prussia: ['Prussian'], Brazil: ['Brazilian'], Mexico: ['Mexican'] };
const manual = fs.existsSync(path.join(R, 'scripts', 'state-rulers-manual.tsv')) ? read('scripts/state-rulers-manual.tsv').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t')) : [];
const off = new Set(manual.filter(r => r[2] === '-').map(r => r[0] + ' ' + r[1])), plus = manual.filter(r => r[2] === '+');
const ONLY = arg('only') ? new Set(arg('only').split(',')) : null, REPORT = arg('report');
const mentionsOf = {}; for (const e of E) if (e.type === 'person') for (const m of (e.empires || [])) (mentionsOf[m.name] = mentionsOf[m.name] || []).push(e.slug);
const out = [], rep = [];
for (const P of sd.EMPIRES) {
  if (!P.points || !P.points.length) continue;   // states and empires only
  const slug = sd.toSlug(P.name); if (ONLY && !ONLY.has(slug)) continue;
  const lo = P.points[0][0], hi = P.points[P.points.length - 1][0];
  const names = new Set(); for (const c of cores(P.name)) { names.add(c); for (const a of (ADJ[c] || [])) names.add(a); for (const w of c.split(' ')) for (const a of (ADJ[w] || [])) names.add(a); }
  const N = [...names].sort((x, y) => y.length - x.length).map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), T = TITLE.source.replace(/^\\b\(/, '').replace(/\)\\b$/, '');
  const ADJTITLE = new RegExp('(?<![\\p{L}])(?:' + N + ")(?:'s|’s)?\\s+(?:(?!under\\b|of\\b|to\\b|by\\b|for\\b|and\\b|or\\b|in\\b|at\\b|from\\b|with\\b|who\\b)[a-z-]+\\s+)?(?:" + T + ')(?![\\p{L}])|(?<![\\p{L}])(?:' + N + ')\\s+leader(?![\\p{L}])', 'iu');
  const TITLEOF = new RegExp('(?<![\\p{L}])(?:' + T + ')\\s+(?:of|over)\\s+(?:the\\s+)?(?:[\\p{Lu}][\\p{L}-]+(?:,\\s+[\\p{Lu}][\\p{L}-]+)*\\s+and\\s+(?:the\\s+)?)?(?:' + N + ')(?![\\p{L}])', 'iu');
  const FOUNDED = new RegExp('\\b(?:founded|established|proclaimed)\\s+(?:the\\s+)?(?:' + N + ')(?![\\p{L}])', 'u'), FOUNDER = new RegExp('\\bfounder\\s+of\\s+(?:the\\s+)?(?:' + N + ")(?![\\p{L}'’])", 'u');
  const got = [];
  for (const s of (mentionsOf[P.name] || [])) {
    const e = by[s], y = yrs[s]; if (!y || off.has(slug + ' ' + s)) continue;
    // their own description calls them the ruler of this state, title and state side by side ("Roman emperor", "king of
    // France", "ruler of the Mali Empire", "king of Umma and Uruk"), or says they founded it ("who founded the Mughal
    // Empire"; "founder of" only as what the person was, not of someone named after a comma)
    const f = first(e.desc), pr = predicate(f);
    // the title must be the person's own: not what follows "of the", "under the", "to the" ("minister of the Mughal emperor Akbar")
    const own = rx0 => { const m = rx0.exec(pr); return !!m && !/\b(?:of|to|under|for|by|with|against|from)\s+(?:[\p{L}'’-]+\s+){0,3}$/iu.test(pr.slice(0, m.index)); };
    const ruler = own(ADJTITLE) || own(TITLEOF), founded = FOUNDED.test(f) || own(FOUNDER);
    if (!ruler && !founded) continue;
    if (/\b(wife|consort|married|widow|mother|daughter|sister)\b/i.test(f) && /\b(queen|empress|sultana|tsarina)\b/i.test(pr) && !/\b(regnant|in her own right|ruled|reigned|regent)\b/i.test(f)) continue;   // a queen by marriage
    // their years meet the state's: a reign or years of activity as they are, a lifespan from the age of fifteen
    if (y[1] < lo - 5 || y[0] + (y[2] === 0 ? 15 : 0) > hi + 2) continue;
    got.push(s);
  }
  for (const r of plus) if (r[0] === slug && by[r[1]] && yrs[r[1]] && !got.includes(r[1])) got.push(r[1]);
  got.sort((a, b) => yrs[a][0] - yrs[b][0] || yrs[a][1] - yrs[b][1] || a.localeCompare(b));
  if (got.length >= 3) out.push([slug, got]);
  rep.push('######## ' + P.name + ' (' + lo + ' to ' + hi + '): ' + got.length + (got.length < 3 ? ' (not listed)' : '') + '\n' + got.map(s => '   ' + by[s].name + ' [' + by[s].dates + '] ' + first(by[s].desc).slice(0, 150)).join('\n'));
}
out.sort((a, b) => a[0].localeCompare(b[0]));
if (!ONLY) fs.writeFileSync(path.join(R, 'scripts', 'state-rulers.tsv'), '# profile slug\tthe rulers among the people of the encyclopedia, oldest first, | between (written by scripts/tools/state-rulers.js; corrections in state-rulers-manual.tsv)\n' + out.map(r => r[0] + '\t' + r[1].join('|')).join('\n') + '\n');
if (REPORT) fs.writeFileSync(REPORT, rep.join('\n\n') + '\n');
// for generator.html: the rulers of each profile, by the profile's name
const nameOf = {}; for (const P of sd.EMPIRES) nameOf[sd.toSlug(P.name)] = P.name;
if (!ONLY) { const js = '// scripts/state-rulers.js - written by scripts/tools/state-rulers.js. Do not edit. Read by generator.html: the rulers and leaders of each\n// profile among the people of the encyclopedia, oldest first: [entry slug, name, dates].\nvar STATE_RULERS = {\n' + out.map(r => JSON.stringify(nameOf[r[0]]) + ':' + JSON.stringify(r[1].map(s2 => [s2, by[s2].name, by[s2].dates || '']))).join(',\n') + '\n};\n'; const jf = path.join(R, 'scripts', 'state-rulers.js'); if (!fs.existsSync(jf) || fs.readFileSync(jf, 'utf8') !== js) fs.writeFileSync(jf, js); }
const n = out.reduce((a, r) => a + r[1].length, 0);
console.log('rulers: ' + out.length + ' profiles with three or more (' + n + ' rulers in all; ' + new Set(out.flatMap(r => r[1])).size + ' people)');
