// Encyclopedia entries for the forms of government that had none (Nov 2026: the roadmap's open item, so the encyclopedia's
// own texts can link the forms). Written ONLY from each form's checked profile: its summary (the first sentences, at most
// ~420 characters), its span as the dates. Added to scripts/added-entries.json "entries" (form: true; a re-run replaces
// them); apply-added-entries.ps1 writes them. Link patterns: lower-case terms (mode 1) only where the word names the form
// alone ("oligarchy", "theocracy", "city-state"); none for "republic", "tyranny", "colonial rule" or "federation", which
// stand in names ("Republic of Venice") or everyday speech. self.tsv makes each profile's own entry claimed, not linked.
//   node scripts/kinds/make-form-entries.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(rd('shared-data.js').replace(/^const /gm, 'var ') + ';return {EMPIRES, EMPIRE_INFO, profileSpanText}')();
const P = new Function(rd('empire-profiles.js').replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return EMPIRE_PROFILES')();
// form: [entry slug, link patterns]
const FORMS = {
  'Absolute monarchy': ['absolute-monarchy', [['absolute monarchy', 1]]],
  'Tyranny': ['tyranny-ancient-greece', []],
  'Dictatorship': ['dictatorship', [['dictatorship', 1]]],
  'Aristocracy': ['aristocracy', [['aristocracy', 1]]],
  'Oligarchy': ['oligarchy', [['oligarchy', 1]]],
  'Theocracy': ['theocracy', [['theocracy', 1]]],
  'Military junta': ['military-junta', [['military junta', 1]]],
  'One-party state': ['one-party-state', [['one-party state', 1]]],
  'Direct democracy': ['direct-democracy', [['direct democracy', 1]]],
  'Parliamentary democracy': ['parliamentary-democracy', [['parliamentary democracy', 1], ['parliamentary system', 1]]],
  'Presidential democracy': ['presidential-democracy', [['presidential system', 1], ['presidential democracy', 1]]],
  'Republic': ['republic', []],
  'Chiefdom': ['chiefdom', [['chiefdom', 1]]],
  'Nomadic confederation': ['nomadic-confederation', [['nomadic confederation', 1]]],
  'City-state': ['city-state', [['city-state', 1]]],
  'Colonial rule': ['colonial-rule', []],
};
const ed = rd('encyclopedia-data.js');
function lede(t) {
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  return t.slice(0, cut).trim();
}
const out = [];
for (const [name, [slug, links]] of Object.entries(FORMS)) {
  const e = SD.EMPIRES.find(x => x.name === name && x.kind === 'government'); if (!e) throw new Error('no profile ' + name);
  if (ed.includes('{slug:"' + slug + '",')) throw new Error('entry exists: ' + slug);
  const p = P[name]; if (!p || !p.summary) throw new Error('no summary ' + name);
  out.push({ slug, name: name === 'Tyranny' ? 'Tyranny (ancient Greece)' : name, type: 'term', subtype: 'government', dates: SD.profileSpanText(e), desc: lede(p.summary), links, form: true });
}
const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
A.entries = A.entries.filter(x => !x.form).concat(out);
fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
console.log(out.length + ' form entries written to scripts/added-entries.json');
for (const o of out) console.log(' ', o.slug.padEnd(26), o.dates.padEnd(24), o.desc.slice(0, 90));
