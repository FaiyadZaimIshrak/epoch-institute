// The editor's exact changes to profile drafts: node apply-fixes.js <fixes.js> [drafts dir, default prof2/out]
// fixes.js exports {slug: [[old, new], …], …} and optionally {slug: {span: '…'}} under the key "_set".
// Each pair must match exactly once in the draft's public texts (not its notes); a pair already applied is skipped.
const fs = require('fs'), path = require('path'), FIX = require(path.resolve(process.argv[2])), D = path.resolve(process.argv[3] || path.join(__dirname, 'prof2', 'out'));
function fields(j) { const out = []; const add = (o, k) => { if (typeof o[k] === 'string') out.push([o, k]); };
  for (const k of ['info', 'summary', 'dyk', 'span']) add(j, k); for (const k of Object.keys(j.facts || {})) add(j.facts, k);
  (j.t || []).forEach((_, i) => add(j.t, i)); (j.ev || []).forEach(e => { add(e, 0); add(e, 1); }); for (const k of Object.keys(j.sections || {})) add(j.sections, k); return out; }
let done = 0, skip = 0, bad = 0;
for (const [slug, pairs] of Object.entries(FIX)) { if (slug === '_set' || slug === '_ev') continue; const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')), fl = fields(j);
  for (const [a, b] of pairs) { let hit = 0; for (const [o, k] of fl) { const n = o[k].split(a).length - 1; if (n) { hit += n; if (hit === 1) o[k] = o[k].replace(a, () => b); } }
    if (hit === 1) done++; else if (!hit && (!b || fl.some(([o, k]) => o[k].includes(b)))) skip++; else { bad++; console.log('!! ' + slug + ': ' + hit + ' x ' + a.slice(0, 90)); } }
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); }
for (const [slug, set] of Object.entries(FIX._set || {})) { const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')); Object.assign(j, set); fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); done++; }
// "_ev": {slug: [[label, text], …]} replaces a draft's key events whole
for (const [slug, ev] of Object.entries(FIX._ev || {})) { const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')); j.ev = ev; fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); done++; }
console.log(done + ' changed, ' + skip + ' already done, ' + bad + ' faults');
