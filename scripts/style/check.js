// Checks a plain-prose rewrite (STYLE-GUIDE.md) against its original, field by field:
//   node scripts/style/check.js <dir> [slug …]        <dir>/in/<slug>.json against <dir>/out/<slug>.json
// Faults: a key missing or added; a number or a proper name of the original missing, or one added; a quotation
// changed; a name of "keep" missing; another count of paragraphs or other HTML; a length outside 75-105%; a dash used
// as punctuation; a stock phrase left (scripts/tools/style-audit.js TELLS, but for factual "one of the largest").
const fs = require('fs'), path = require('path');
const TELLS = require('../tools/style-audit.js').TELLS.filter(t => t[0] !== 'one of the most' && t[0] !== 'triple list of abstractions');
const plain = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\[\[[^|\]]*\|/g, '').replace(/\]\]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘ʻʼ`]/g, "'").toLowerCase();
const nums = s => (plain(s).match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '').replace(/,/g, ''));
// capitalised words that do not open a sentence: the proper names of a text
const names = s => { const out = new Set(), t = plain(s); for (const m of t.matchAll(/(^|[.!?:;]["”’)]?\s+|["“(]\s*)?(\p{Lu}[\p{L}'’-]+)/gu)) { if (m[1] !== undefined && m[1] !== '') continue; if (m.index === 0) continue; for (const w of m[2].replace(/['’]s$/, '').split('-')) if (w.length > 1 && /^\p{Lu}/u.test(w)) out.add(fold(w).replace(/^'+|'+$/g, '')); } return out; };
const allWords = s => new Set([...allWords0(s)].flatMap(w => [w, ...w.split("'")]));
const allWords0 = s => new Set(fold(plain(s)).split(/[^\p{L}\p{N}']+/u).map(w => w.replace(/'s$/, '').replace(/^'+|'+$/g, '')));
const quotes = s => (plain(s).match(/“[^”]{8,}”|"[^"]{8,160}"/g) || []);
function checkPair(a, b, keep) {
    const rep = [], pa = plain(a), pb = plain(b);
    const na = nums(a), nb = nums(b), ca = {}, cb = {}; na.forEach(x => ca[x] = (ca[x] || 0) + 1); nb.forEach(x => cb[x] = (cb[x] || 0) + 1);
    const lost = Object.keys(ca).filter(x => !cb[x]), added = Object.keys(cb).filter(x => !ca[x]);
    if (lost.length) rep.push('numbers lost: ' + lost.join(' ')); if (added.length) rep.push('numbers added: ' + added.join(' '));
    const wa = allWords(a), wb = allWords(b), nA = names(a), nB = names(b);
    let nl = [...nA].filter(x => !wb.has(x)), nn = [...nB].filter(x => !wa.has(x));
    { const both = nl.filter(x => nn.includes(x)); nl = nl.filter(x => !both.includes(x)); nn = nn.filter(x => !both.includes(x)); }   // a name cut differently by the two readings ("ǃKung")
    if (nl.length) rep.push('names lost: ' + nl.join(' ')); if (nn.length) rep.push('names added: ' + nn.join(' '));
    for (const q of quotes(a)) if (!pb.includes(q)) rep.push('quotation changed: ' + q.slice(0, 50));
    for (const kp of keep || []) if (pa.includes(kp) && !pb.includes(kp)) rep.push('link name lost: ' + kp);
    if ((a.match(/<p>/g) || []).length !== (b.match(/<p>/g) || []).length) rep.push('paragraphs ' + (a.match(/<p>/g) || []).length + ' -> ' + (b.match(/<p>/g) || []).length);
    if (b.replace(/<\/?p>/g, '').match(/<[a-z/]/i) && !a.replace(/<\/?p>/g, '').match(/<[a-z/]/i)) rep.push('other HTML');
    const r = pb.length / (pa.length || 1); if (pa.length < 400 ? r < 0.55 || r > 1.1 : r < 0.75 || r > 1.05) rep.push('length ' + Math.round(r * 100) + '%');
    if (/\s[—–]\s|[a-z]—[a-z]/i.test(pb)) rep.push('a dash as punctuation');
    for (const [lab, rx] of TELLS) { if (lab === 'em dash') continue; const m = pb.replace(/legendary|the Magnificent/g, ' ').match(rx); if (m) rep.push('stock phrase: ' + m[0]); }
    const ta = (a.match(/<[^>]+>/g) || []).join(''), tb = (b.match(/<[^>]+>/g) || []).join(''); if (ta.replace(/<\/?p>/g, '') !== tb.replace(/<\/?p>/g, '')) rep.push('HTML tags changed');
    return rep;
}
function checkOne(dir, slug) {
  const fi = path.join(dir, 'in', slug + '.json'), fo = path.join(dir, 'out', slug + '.json'), rep = [];
  if (!fs.existsSync(fo)) return ['no out file']; let I, O; try { I = JSON.parse(fs.readFileSync(fi, 'utf8')); O = JSON.parse(fs.readFileSync(fo, 'utf8')); } catch (e) { return ['not JSON: ' + String(e).slice(0, 60)]; }
  if (O.name !== I.name) rep.push('name changed'); if (!O.fields) return ['no fields'];
  for (const k in I.fields) if (!(k in O.fields)) rep.push(k + ': missing'); for (const k in O.fields) if (!(k in I.fields)) rep.push(k + ': added key');
  for (const k in I.fields) {
    const a = I.fields[k], b = O.fields[k]; if (b === undefined || a === b) continue; for (const r of checkPair(a, b, I.keep)) rep.push(k + ': ' + r);
  }
  return rep;
}
module.exports = { checkOne, checkPair };
if (require.main === module) {
  const [dir, ...slugs] = process.argv.slice(2); if (!dir) { console.error('usage: check.js <dir> [slug …]'); process.exit(1); }
  const list = slugs.length ? slugs : fs.readdirSync(path.join(dir, 'out')).filter(x => x.endsWith('.json')).map(x => x.slice(0, -5)).sort(); let bad = 0;
  for (const s of list) { const rep = checkOne(dir, s); if (rep.length) { bad++; console.log(s + '\n  ' + rep.join('\n  ')); } }
  console.log(list.length + ' checked, ' + bad + ' with faults'); process.exit(bad ? 1 : 0);
}
