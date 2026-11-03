// Checks drafted encyclopedia entries (ENTRIES-GUIDE.md) against their saved articles, for the editor to read first:
// missing or extra keys, a type or subtype outside the list, a desc outside 380-700 characters or with HTML, dates
// with five digits, "BC"/"AD", a day-first date, hype words, and every number and capitalised name of the entry that
// its article does not contain (accents and case folded; a year range is also matched by its two ends).
//   node scripts/entries/check-entries.js <wp dir> <out.json> [<out.json> …]
const fs = require('fs'), path = require('path');
const [wp, ...files] = process.argv.slice(2);
if (!wp || !files.length) { console.error('usage: check-entries.js <wp dir> <out.json> …'); process.exit(1); }
const TYPES = { person: [''], place: ['', 'city', 'region', 'site', 'river', 'island', 'mountain', 'sea', 'lake'],
  event: ['', 'battle', 'war', 'treaty', 'revolt', 'revolution', 'siege', 'campaign', 'conquest', 'disaster', 'other'],
  work: ['', 'text', 'monument', 'artifact', 'infrastructure', 'song', 'other'], group: [''], institution: [''],
  term: ['', 'title', 'office', 'language', 'script', 'weapon', 'currency', 'government'],
  idea: ['', 'religion', 'concept', 'deity', 'movement', 'period', 'ideology'], polity: [''] };
const KEYS = ['slug', 'name', 'type', 'subtype', 'aka', 'dates', 'desc'];
const HYPE = /\b(famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|stunning|magnificent|greatest)\b/i;
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
let nBad = 0, n = 0;
for (const f of files) {
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const e of arr) {
    n++; const out = [];
    const keys = Object.keys(e); for (const k of KEYS) if (!(k in e)) out.push('no ' + k); for (const k of keys) if (!KEYS.includes(k)) out.push('extra key ' + k);
    if (!TYPES[e.type]) out.push('type ' + e.type); else if (!TYPES[e.type].includes(e.subtype || '')) out.push('subtype ' + e.subtype);
    const d = e.desc || ''; if (d.length < 380 || d.length > 700) out.push('desc ' + d.length + ' chars'); if (/<[a-z]/i.test(d)) out.push('HTML in desc');
    if (/\d{5}/.test(e.dates || '')) out.push('five-digit date'); if (/\b(BC|AD)\b/.test((e.dates || '') + ' ' + d)) out.push('BC/AD');
    if (/^\d{1,2} [A-Z][a-z]+ \d/.test(e.dates || '')) out.push('day-first date'); const h = d.match(HYPE); if (h) out.push('hype: ' + h[0]);
    const af = path.join(wp, e.slug + '.txt'); if (!fs.existsSync(af)) { out.push('NO ARTICLE'); }
    else {
      const art = fold(fs.readFileSync(af, 'utf8'));
      const txt = [e.name, e.dates, d, ...(e.aka || [])].join(' ');
      const nums = [...new Set((txt.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
      if (nums.length) out.push('numbers not in article: ' + nums.join(' '));
      const names = [...new Set(txt.match(/\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gu) || [])]
        .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(w => art.includes(fold(w))));
      if (names.length) out.push('names not in article: ' + names.join(' | '));
    }
    if (out.length) { nBad++; console.log(e.slug + ': ' + out.join('; ')); }
  }
}
console.log(n + ' entries checked, ' + nBad + ' with something to read');
