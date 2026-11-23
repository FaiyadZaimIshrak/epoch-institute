// Encyclopedia entries for profiles of the "idea" kinds (movements, ideologies) that have none, as make-ideology-entries.js
// and make-work-entries.js do: written ONLY from each profile's checked text (its summary's first sentences, at most ~420
// characters; its span as the dates), added as text at the end of scripts/added-entries.json "entries" (kindEntry: the
// wave's name; a re-run adds only those not there yet), applied by apply-added-entries.ps1.
//   node scripts/kinds/make-kind-entries.js <rows.json>
// rows.json: {"wave": "moves3", "rows": {"<profile name>": ["<slug>", "<subtype: movement | ideology>", [[pattern, mode], …]]}}
// Link patterns only for words that name the subject alone (mode 0 exact, 1 lower-case term, 2 either-case first letter).
// Read scripts/kinds/pattern-count.js <slugs> before they go live; self.tsv makes each profile's own entry claimed, not linked.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const { wave, rows } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SD = new Function(rd('shared-data.js').replace(/^const /gm, 'var ') + ';return {EMPIRES, profileSpanText}')();
const P = new Function(rd('empire-profiles.js').replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return EMPIRE_PROFILES')();
const ED = rd('encyclopedia-data.js');
function lede(t) {
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  return t.slice(0, cut).trim();
}
const out = [];
for (const [name, [slug, subtype, links]] of Object.entries(rows)) {
  const e = SD.EMPIRES.find(x => x.name === name && x.kind === subtype); if (!e) throw new Error('no ' + subtype + ' profile ' + name);
  const p = P[name]; if (!p || !p.summary) throw new Error('no summary ' + name);
  if (new RegExp('slug:\\s*"' + slug + '"').test(ED) && !JSON.parse(rd('scripts/added-entries.json')).entries.some(x => x.slug === slug)) throw new Error('the encyclopedia has an entry ' + slug);
  out.push({ slug, name, type: 'idea', subtype, dates: SD.profileSpanText(e), desc: lede(String(p.summary).replace(/<[^>]+>/g, '')), links, kindEntry: wave });
}
const AE = path.join(R, 'scripts', 'added-entries.json'); let txt = fs.readFileSync(AE, 'utf8'); const A = JSON.parse(txt), nl = txt.includes('\r\n') ? '\r\n' : '\n';
const add = out.filter(o => !A.entries.some(x => x.slug === o.slug));
if (add.length) { const i = txt.indexOf(nl + ' ],' + nl + ' "patterns": ['); if (i < 0) throw new Error('end of entries not found');
  txt = txt.slice(0, i) + add.map(o => ',' + nl + JSON.stringify(o, null, 1).split('\n').map(l => '  ' + l).join(nl)).join('') + txt.slice(i);
  if (JSON.parse(txt).entries.length !== A.entries.length + add.length) throw new Error('count'); fs.writeFileSync(AE, txt); }
console.log(add.length + ' entries added to scripts/added-entries.json (' + (out.length - add.length) + ' were there)');
for (const o of add) console.log(' ', o.slug.padEnd(30), o.dates.padEnd(22), o.desc.slice(0, 100));
