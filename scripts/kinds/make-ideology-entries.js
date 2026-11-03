// Encyclopedia entries for the ideologies that had none (A6, Nov 2026), as make-form-entries.js does for the forms of
// government: written ONLY from each ideology's checked profile (its summary's first sentences, at most ~420 characters;
// its span as the dates), into scripts/added-entries.json "entries" (ideology: true; a re-run replaces them), applied by
// apply-added-entries.ps1. Link patterns only for words that name the ideology alone (lower-case terms, mode 1; proper
// names, mode 0); self.tsv makes each profile's own entry claimed, not linked. Read pattern-count.js before they go live.
//   node scripts/kinds/make-ideology-entries.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(rd('shared-data.js').replace(/^const /gm, 'var ') + ';return {EMPIRES, EMPIRE_INFO, profileSpanText}')();
const P = new Function(rd('empire-profiles.js').replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return EMPIRE_PROFILES')();
// ideology: [entry slug, link patterns]
const IDEOLOGIES = {
  'Anarchism': ['anarchism', [['anarchism', 1]]],
  'Capitalism': ['capitalism', [['capitalism', 1]]],
  'Communism': ['communism', [['communism', 1]]],
  'Conservatism': ['conservatism', [['conservatism', 1]]],
  'Feminism': ['feminism', [['feminism', 1]]],
  'Hindutva': ['hindutva', [['Hindutva', 0]]],
  'Imperialism': ['imperialism', [['imperialism', 1]]],
  'Islamism': ['islamism', [['Islamism', 0]]],
  'Kemalism': ['kemalism', [['Kemalism', 0]]],
  'Liberalism': ['liberalism', [['liberalism', 1]]],
  'Maoism': ['maoism', [['Maoism', 0]]],
  'Social democracy': ['social-democracy', [['social democracy', 1]]],
};
function lede(t) {
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  return t.slice(0, cut).trim();
}
const out = [];
for (const [name, [slug, links]] of Object.entries(IDEOLOGIES)) {
  const e = SD.EMPIRES.find(x => x.name === name && x.kind === 'ideology'); if (!e) throw new Error('no profile ' + name);
  const p = P[name]; if (!p || !p.summary) throw new Error('no summary ' + name);
  out.push({ slug, name, type: 'idea', subtype: 'ideology', dates: SD.profileSpanText(e), desc: lede(p.summary), links, ideology: true });
}
const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
A.entries = A.entries.filter(x => !x.ideology).concat(out);
fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
console.log(out.length + ' ideology entries written to scripts/added-entries.json');
for (const o of out) console.log(' ', o.slug.padEnd(18), o.dates.padEnd(20), o.desc.slice(0, 100));
