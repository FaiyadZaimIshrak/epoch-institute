// Checks drafted state histories (scripts/states/STATES-GUIDE.md) against their saved articles, for the writer and then
// the editor to read: missing or extra keys, lengths, [[s:id|…]] links to ids the batch does not allow, any other link,
// month-first dates, BC/AD, stock and praise phrases, and every number and capitalised name not in the article
// (accents and case folded; a year range is matched by its two ends).
//   node scripts/states/check-states.js <wave dir> <out.json> [<out.json> …]
// <wave dir> holds wp/<id>.txt (the articles) and batch-*.tsv (id TAB name TAB allowed ids, comma-separated).
const fs = require('fs'), path = require('path');
const [dir, ...files] = process.argv.slice(2);
if (!dir || !files.length) { console.error('usage: check-states.js <wave dir> <out.json> …'); process.exit(1); }
const ALLOW = {}; for (const f of fs.readdirSync(dir).filter(f => /^batch-.*\.tsv$/.test(f)))
  for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/)) { const p = l.split('\t'); if (p[0] && !l.startsWith('#')) ALLOW[p[0]] = new Set((p[2] || '').split(',').filter(Boolean)); }
const KEYS = ['t', 'o', 'r', 'e', 'ru', 're', 'la'], LEN = { t: [40, 160], o: [250, 500], r: [350, 700], e: [200, 450] };
const STOCK = /\b(testament to|pivotal|tapestry|stands as|played an? (?:key|important|crucial|vital|central|major) role|famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|stunning|magnificent|greatest|vibrant|boasts?|nestled|as of \d{4}|authoritarian|corrupt|the article|the source|according to wikipedia)\b/i;
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
const MONTH = '(January|February|March|April|May|June|July|August|September|October|November|December)';
let n = 0, bad = 0;
for (const f of files) {
  const all = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(all)) {
    n++; const s = all[id], out = [];
    for (const k of KEYS) if (!(k in s)) out.push('no ' + k); for (const k of Object.keys(s)) if (!KEYS.includes(k)) out.push('extra key ' + k);
    if (!(id in ALLOW)) out.push('id not in any batch');
    for (const k in LEN) { const t = (s[k] || '').replace(/\[\[s:[^|\]]+\|([^\]]+)\]\]/g, '$1'); if (t.length < LEN[k][0] || t.length > LEN[k][1]) out.push(k + ' ' + t.length + ' chars'); }
    const prose = ['t', 'o', 'r', 'e'].map(k => s[k] || '').join(' ');
    for (const m of prose.matchAll(/\[\[([^\]]*)\]\]/g)) { const x = /^s:([^|]+)\|/.exec(m[1]); if (!x) out.push('link not allowed: [[' + m[1] + ']]'); else if (!(ALLOW[id] || new Set()).has(x[1])) out.push('state not allowed: ' + x[1]); }
    if (/<[a-z]/i.test(prose)) out.push('HTML');
    if (/\b(BC|AD)\b/.test(prose)) out.push('BC/AD');
    if (new RegExp('\\b' + MONTH + ' \\d{1,2},? \\d{3,4}').test(prose)) out.push('month-first date');
    const st = prose.match(STOCK); if (st) out.push('phrase: ' + st[0]);
    if (/ — .* — /.test(prose)) out.push('paired dashes');
    if (!Array.isArray(s.ru)) out.push('ru is not a list'); else if (s.ru.length > 5) out.push('more than five leaders');
    const af = path.join(dir, 'wp', id + '.txt');
    if (!fs.existsSync(af)) out.push('NO ARTICLE');
    else {
      const art = fold(fs.readFileSync(af, 'utf8')), plain = prose.replace(/\[\[s:[^|\]]+\|([^\]]+)\]\]/g, '$1');
      const txt = [plain, ...(s.ru || []), s.re || '', s.la || ''].join(' ; ');   // a name never runs on into the next
      const nums = [...new Set((txt.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
      if (nums.length) out.push('numbers not in article: ' + nums.join(' '));
      const names = [...new Set(txt.match(/\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gu) || [])]
        .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(w => art.includes(fold(w))));
      if (names.length) out.push('names not in article: ' + names.join(' | '));
    }
    if (out.length) { bad++; console.log(id + ': ' + out.join('; ')); }
  }
}
console.log(n + ' states checked, ' + bad + ' with something to fix');
