// Encyclopedia entries for the great works that had none (Nov 2026), as make-ideology-entries.js does for the ideologies:
// written ONLY from each work's checked profile (its summary's first sentences, at most ~420 characters), into
// scripts/added-entries.json "entries" (work: true; a re-run replaces them), applied by apply-added-entries.ps1, their
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
};
function lede(t) {
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  return t.slice(0, cut).trim();
}
const out = [];
for (const [name, [slug, subtype, dates, links]] of Object.entries(WORKS)) {
  const e = SD.EMPIRES.find(x => x.name === name && x.kind === 'work'); if (!e) throw new Error('no profile ' + name);
  const p = P[name]; if (!p || !p.summary) throw new Error('no summary ' + name);
  out.push({ slug, name, type: 'work', subtype, dates, desc: lede(p.summary), links, work: true });
}
const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
A.entries = A.entries.filter(x => !x.work).concat(out);
fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
console.log(out.length + ' work entries written to scripts/added-entries.json');
for (const o of out) console.log(' ', o.slug.padEnd(30), o.dates.padEnd(20), o.desc.slice(0, 110));
