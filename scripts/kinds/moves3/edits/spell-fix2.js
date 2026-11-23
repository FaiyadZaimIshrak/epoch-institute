// British spelling in the drafts' public texts, never inside quotation marks:  node spell-fix2.js <out dir>
// -ize/-ization to -ise/-isation (lower-case words; capitalised ones only from the list below or at a sentence's start),
// program to programme, laborers to labourers.
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const KEEP = /^(size|sizes|sized|seize|seized|seizes|seizing|prize|prizes|prized|capsize\w*|citizen\w*|maize|horizon\w*|bizarre|frieze|assize\w*)$/i;
const CAPS = new Set(['Industrialization', 'Arabization', 'Alawitization', 'Stalinization', 'Japanization', 'Modernizations']);
let n = 0;
const conv = w => w.replace(/iz(e|es|ed|ing|ation|ations)$/, 'is$1');
const fixPlain = s => s.replace(/(^|[^\w-])([A-Za-z]+iz(?:e|es|ed|ing|ation|ations))(?![\w-])/g, (m, pre, w, off, str) => {
  if (KEEP.test(w)) return m; const cap = /^[A-Z]/.test(w);
  if (cap && !CAPS.has(w)) { const before = str.slice(0, off + pre.length); if (!/(^|[.!?]\s+|>\s*)$/.test(before)) return m; }
  n++; return pre + conv(w); })
  .replace(/(^|[^\w-])(p)rogram(s?)(?![\w-])/gi, (m, pre, p, s) => { n++; return pre + p + 'rogramme' + s; })
  .replace(/(^|[^\w-])(l)abor(ers?|)(?![\w-])/g, (m, pre, l, s) => { n++; return pre + l + 'abour' + s; });
const fix = s => s.split(/("[^"]*"|“[^”]*”)/).map((p, i) => i % 2 ? p : fixPlain(p)).join('');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json'))) { const p = path.join(dir, f), j = JSON.parse(fs.readFileSync(p, 'utf8')); const b = n;
  for (const k of ['info', 'summary', 'dyk']) if (typeof j[k] === 'string') j[k] = fix(j[k]); for (const k in j.facts) j.facts[k] = fix(j.facts[k]); j.t = (j.t || []).map(fix); j.ev = (j.ev || []).map(e => [e[0], fix(e[1])]); for (const k in j.sections) j.sections[k] = fix(j.sections[k]);
  if (n > b) { fs.writeFileSync(p, JSON.stringify(j, null, 1) + '\n'); console.log(f + ': ' + (n - b)); } }
