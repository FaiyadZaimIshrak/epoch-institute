// Checks drafted inventions-tree nodes (scripts/inventions/INVENTIONS-GUIDE.md), for the drafter and the editor: the
// entry (keys, type, a desc of 380-700 characters, dates of four digits at most, praise words) and the row (lane, year,
// circa, label length, civ a profile or an entry, people entries or "=Name", parents on the tree or among the drafts
// given and dated no later than the node), and every number and capitalised name of the desc, date, place and
// contested note that the saved article does not contain. Several draft files may be given: parents are looked up in
// all of them.
//   node scripts/inventions/check-inventions.js <drafts.json> [<drafts.json> …] <wp dir>
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), wp = args.pop(), files = args;
if (!files.length || !wp) { console.error('usage: check-inventions.js <drafts.json> … <wp dir>'); process.exit(1); }
const ENC = new Set(new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')().map(e => e.slug));
const ctx = {}; new Function('ctx', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';ctx.E = EMPIRES;')(ctx);
const PROF = new Set(ctx.E.map(e => e.name));
const CATS = ['tools', 'farming', 'building', 'transport', 'weapons', 'writing', 'science', 'chemistry', 'medicine', 'energy', 'communication'];
const TYPES = ['person', 'place', 'event', 'work', 'group', 'institution', 'term', 'idea', 'polity'];
const TREE = new Map(fs.readFileSync(path.join(R, 'scripts', 'inventions.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')).map(c => [c[0], +c[3]]));
const HYPE = /\b(famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|revolutionary|groundbreaking|ingenious|stunning)\b/i;
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
const drafts = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const YEAR = new Map(drafts.filter(d => d.entry && d.row).map(d => [d.entry.slug, d.row.year]));
let n = 0, bad = 0, skipped = 0;
for (const d of drafts) {
  n++; if (d.skip) { skipped++; continue; }
  const out = [], e = d.entry || {}, r = d.row || {}, slug = e.slug;
  for (const k of ['slug', 'name', 'type', 'desc']) if (!e[k]) out.push('entry: no ' + k);
  for (const k of ['label', 'cat', 'year', 'date', 'source']) if (r[k] === undefined || r[k] === '') out.push('row: no ' + k);
  if (ENC.has(slug)) out.push('an entry ' + slug + ' exists already: use it (drop the entry) or choose another slug');
  if (e.type && !TYPES.includes(e.type)) out.push('type ' + e.type);
  const dl = String(e.desc || '').length; if (dl < 380 || dl > 700) out.push('desc ' + dl + ' chars');
  if (/\d{5}/.test(e.dates || '') || /\d{5}/.test(r.date || '')) out.push('a five-digit year (write it in words in the desc only)');
  if (/\b(BC|AD)\b/.test((e.desc || '') + ' ' + (e.dates || '') + ' ' + (r.date || ''))) out.push('BC/AD (write BCE/CE)');
  const h = ((e.desc || '') + ' ' + (r.contested || '')).match(HYPE); if (h) out.push('praise word: ' + h[0]);
  if (!CATS.includes(r.cat)) out.push('lane ' + r.cat);
  if (typeof r.year !== 'number') out.push('year is not a number');
  if (![0, 1].includes(r.circa)) out.push('circa is not 0 or 1');
  if (String(r.label || '').length > 28) out.push('label ' + r.label.length + ' chars');
  for (const c of r.civ || []) if (!PROF.has(c) && !ENC.has(c)) out.push('civ "' + c + '" is neither a profile nor an entry');
  for (const p of r.people || []) if (!String(p).startsWith('=') && !ENC.has(p)) out.push('person "' + p + '" is no entry (write "=Name")');
  for (const b of r.built || []) {
    const y = TREE.has(b) ? TREE.get(b) : YEAR.get(b);
    if (y === undefined) out.push('built on "' + b + '": not on the tree nor among the drafts');
    else if (y > r.year) out.push('built on ' + b + ' (' + y + '), dated after the node (' + r.year + ')');
  }
  const af = path.join(wp, slug + '.txt');
  if (!fs.existsSync(af)) out.push('NO ARTICLE ' + slug);
  else {
    const art = fold(fs.readFileSync(af, 'utf8'));
    const txt = [e.desc, e.dates, r.date, r.place, r.contested, ...(r.also || [])].join(' ');
    const nums = [...new Set((txt.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
    if (nums.length) out.push('numbers not in the article: ' + nums.join(' '));
    const names = [...new Set(txt.match(/\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gu) || [])]
      .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(w => art.includes(fold(w))));
    if (names.length) out.push('names not in the article: ' + names.join(' | '));
  }
  if (out.length) { bad++; console.log(slug + ': ' + out.join('; ')); }
}
console.log(`${n} nodes checked (${skipped} skipped), ${bad} with something to read`);
