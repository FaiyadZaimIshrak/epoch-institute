// Candidate entries: proper names that the profiles of the given kinds use and the encyclopedia lacks (A7, Nov 2026).
// Every run of two to five capitalised words (with "of", "the", "al-", "ibn", "de" … inside) in the profiles' sections
// is counted with the number of profiles using it; a name that folds to an entry's name, alias or slug is dropped, and
// so is a name inside a longer one that is kept. The list is for the editor: many hits are phrases, not subjects.
//   node scripts/entries/harvest-names.js <out.tsv> [kind …]     (default: every kind but polity)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const [out, ...kinds] = process.argv.slice(2);
const SD = new Function(rd('shared-data.js') + ';return {EMPIRES}')();
const P = new Function(rd('empire-profiles.js').replace(/^\s*const /m, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return EMPIRE_PROFILES')();
const ENC = new Function(rd('encyclopedia-data.js') + ';return ENCYCLOPEDIA')();
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’'`]/g, '').toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, ' ').trim();
const have = new Set(); for (const e of ENC) { have.add(fold(e.name)); have.add(fold(e.slug.replace(/-/g, ' '))); for (const a of e.aka || []) have.add(fold(a)); }
for (const e of SD.EMPIRES) have.add(fold(e.name));
const want = kinds.length ? kinds : [...new Set(SD.EMPIRES.map(e => e.kind).filter(Boolean))];
const CAP = "[A-ZÀ-Þ][\\wÀ-ɏ’'.-]*";
const LINK = "(?:of|the|de|del|da|di|du|von|van|al|el|ibn|bin|bint|la|le|and|y|und)";
const RX = new RegExp(`${CAP}(?:\\s+(?:${LINK}\\s+)*${CAP}){1,4}`, 'g');
const STOP = /^(The|A|An|In|On|At|By|For|From|With|After|Before|During|Under|Its|His|Her|Their|This|These|Those|When|While|As|Some|Many|Most|Other|Both|Each|Every|Such|Since|Until|Through|Between|Among|Although|But|And|Or|Yet|So|If|Where|Which|Who|What|How|Why|Today|Later|Early|Late|Modern|Ancient|Medieval)\s+/;
const cnt = new Map(), prof = new Map(), ex = new Map();
for (const e of SD.EMPIRES) {
  if (!want.includes(e.kind || 'polity')) continue; const p = P[e.name]; if (!p) continue;
  const text = Object.entries(p).filter(([k]) => k !== 'references').map(([, v]) => typeof v === 'string' ? v : '').join(' ').replace(/<[^>]+>/g, ' ');
  const seen = new Set();
  for (let m of text.match(RX) || []) {
    m = m.replace(STOP, '').replace(/[’']s$/, '').replace(/\.$/, '').trim(); if (m.split(/\s+/).length < 2) continue;
    const f = fold(m); if (!f || have.has(f)) continue;
    cnt.set(m, (cnt.get(m) || 0) + 1); if (!seen.has(m)) { seen.add(m); prof.set(m, (prof.get(m) || 0) + 1); if (!ex.has(m)) ex.set(m, e.name); }
  }
}
let rows = [...cnt.keys()].map(m => [m, cnt.get(m), prof.get(m), ex.get(m)]);
const keep = new Set(rows.filter(r => r[1] >= 2 || r[2] >= 2).map(r => r[0]));
rows = rows.filter(r => keep.has(r[0]) && ![...keep].some(k => k !== r[0] && k.includes(r[0]) && cnt.get(k) >= r[1]));
rows.sort((a, b) => b[2] - a[2] || b[1] - a[1] || a[0].localeCompare(b[0]));
fs.writeFileSync(out, 'name\tmentions\tprofiles\tfirst profile\n' + rows.map(r => r.join('\t')).join('\n') + '\n');
console.log(rows.length + ' candidate names (kinds: ' + want.join(', ') + ') written to ' + out);
