// Checks drafted Today in History events (DAYS-GUIDE.md) against their saved articles, for the drafter and the editor:
// the keys, title 30-75 and description 150-260 characters, no date in the title, hype words, the year as a number,
// links to entries that exist, a profile that exists and was alive that year, and every number and capitalised name of
// the title and description that the article (or the On this day line, if the batch file is given) does not contain.
//   node scripts/days/check-events.js <events.json> <articles dir> [<batch.tsv>]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [file, dir, batchF] = process.argv.slice(2);
if (!file || !dir) { console.error('usage: check-events.js <events.json> <articles dir> [<batch.tsv>]'); process.exit(1); }
const ENC = new Set(new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')().map(e => e.slug));
const ctx = {}; new Function('ctx', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';ctx.E = EMPIRES; ctx.span = profileSpan; ctx.url = profileUrl;')(ctx);
const PROF = new Map(ctx.E.filter(e => !e.kind).map(e => [e.name, { url: ctx.url(e), sp: ctx.span(e) }]));
const HYPE = /\b(famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|stunning|magnificent|greatest|on this day)\b/i;
const MON = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
const lines = {}; if (batchF) for (const l of fs.readFileSync(batchF, 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[1]) lines[c[0] + '_' + c[1]] = c[3] + ' ' + (c[5] || ''); }
let n = 0, bad = 0, skipped = 0;
for (const e of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  n++; const out = [], key = e.day + '_' + e.year;
  if (e.skip) { skipped++; continue; }
  for (const k of ['day', 'year', 'title', 'description']) if (!(k in e)) out.push('no ' + k);
  if (typeof e.year !== 'number') out.push('year is not a number');
  const t = e.title || '', d = e.description || '';
  if (t.length < 30 || t.length > 75) out.push('title ' + t.length + ' chars'); if (d.length < 150 || d.length > 260) out.push('description ' + d.length + ' chars');
  if (MON.test(t) || /\b\d{3,4}\b/.test(t)) out.push('a date in the title'); const h = (t + ' ' + d).match(HYPE); if (h) out.push('hype: ' + h[0]);
  if (/\b(BC|AD)\b/.test(t + ' ' + d)) out.push('BC/AD (write BCE/CE)');
  for (const l of e.links || []) if (!ENC.has(l[0])) out.push('no entry ' + l[0]);
  if ((e.links || []).length > 4) out.push((e.links || []).length + ' links');
  if (e.profile) { const p = PROF.get(e.profile[0]); if (!p) out.push('no profile ' + e.profile[0]); else { if (p.url !== e.profile[1]) out.push('profile address should be ' + p.url); if (e.year < p.sp[0] || e.year > p.sp[1]) out.push('profile not alive in ' + e.year); } }
  const af = path.join(dir, key + '.txt'), more = fs.readdirSync(dir).filter(f => f.startsWith(key + '~')).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join(' ');
  if (!fs.existsSync(af)) out.push('NO ARTICLE ' + key);
  else {
    const art = fold(fs.readFileSync(af, 'utf8') + ' ' + more + ' ' + (lines[key] || ''));
    const txt = t + ' ' + d;
    const nums = [...new Set((txt.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => x !== String(Math.abs(e.year)) && !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
    if (nums.length) out.push('numbers not in article: ' + nums.join(' '));
    const names = [...new Set(txt.match(/\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gu) || [])]
      .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(w => art.includes(fold(w))));
    if (names.length) out.push('names not in article: ' + names.join(' | '));
  }
  if (out.length) { bad++; console.log(key + ': ' + out.join('; ')); }
}
console.log(`${n} events checked (${skipped} skipped), ${bad} with something to read`);
