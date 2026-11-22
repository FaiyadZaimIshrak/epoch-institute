// Keeps scripts/added-entries.json in the layout it is kept in, after a tool has re-written it whole.
// merge-entries.js, pictures.js apply and pics-into-data.js write JSON.stringify(A, null, 1), which re-flows the
// thousands of rows that were laid by hand or inserted one to a line ("fixes"). This puts the new CONTENT back into
// the OLD text: every item of every top-level list that did not change keeps its old text byte for byte; a changed
// or new item is written as JSON.stringify(item, null, 1), indented two spaces.
//   copy the file first, run the tool, then:  node scripts/entries/relay.js <copy before> [scripts/added-entries.json]
// It stops if a list lost items or if the result does not parse to exactly the new content.
const fs = require('fs'), path = require('path');
const [before, afterArg] = process.argv.slice(2), after = afterArg || path.join(__dirname, '..', 'added-entries.json');
if (!before) { console.error('usage: relay.js <copy before> [file]'); process.exit(1); }
const oldT = fs.readFileSync(before, 'utf8'), O = JSON.parse(oldT), A = JSON.parse(fs.readFileSync(after, 'utf8')), nl = oldT.includes('\r\n') ? '\r\n' : '\n';
// the end of the JSON value that starts at i
function end(t, i) { let d = 0; for (let j = i; j < t.length; j++) { const c = t[j];
  if (c === '"') { j++; while (t[j] !== '"') { if (t[j] === '\\') j++; j++; } if (!d) return j + 1; }
  else if (c === '[' || c === '{') d++; else if (c === ']' || c === '}') { d--; if (!d) return j + 1; }
  else if (!d && /[\s,\]}]/.test(c)) return j; } return t.length; }
const skip = (t, i) => { while (/\s/.test(t[i])) i++; return i; };
let out = oldT, changed = 0, added = 0;
for (const key of Object.keys(A)) {
  if (!(key in O)) throw new Error('a new top-level key: ' + key);
  if (JSON.stringify(A[key]) === JSON.stringify(O[key])) continue;
  if (!Array.isArray(A[key])) throw new Error(key + ' changed and is not a list');
  if (A[key].length < O[key].length) throw new Error(key + ' lost items');
  const at = out.indexOf(nl + ' ' + JSON.stringify(key) + ': ['); if (at < 0) throw new Error('list not found: ' + key);
  let i = out.indexOf('[', at) + 1; const spans = [];   // the old items' texts
  for (;;) { i = skip(out, i); if (out[i] === ']') break; const e = end(out, i); spans.push([i, e]); i = skip(out, e); if (out[i] === ',') i++; }
  if (spans.length !== O[key].length) throw new Error(key + ': ' + spans.length + ' items read, ' + O[key].length + ' expected');
  const ind = s => JSON.stringify(s, null, 1).split('\n').map(l => '  ' + l).join(nl);
  let t = '';
  for (let k = A[key].length - 1; k >= 0; k--) {
    if (k >= spans.length) { continue; }
    if (JSON.stringify(A[key][k]) !== JSON.stringify(O[key][k])) { out = out.slice(0, spans[k][0]) + ind(A[key][k]).trimStart() + out.slice(spans[k][1]); changed++; }
  }
  if (A[key].length > spans.length) {   // new items go after the last old one, as text
    const j = out.indexOf('[', out.indexOf(nl + ' ' + JSON.stringify(key) + ': [')) + 1; let p = j, last = j; for (let k = 0; k < spans.length; k++) { p = skip(out, p); last = end(out, p); p = skip(out, last); if (out[p] === ',') p++; }
    t = A[key].slice(spans.length).map(ind).join(',' + nl); added += A[key].length - spans.length;
    out = out.slice(0, last) + (spans.length ? ',' : '') + nl + t + out.slice(last);
  }
}
if (JSON.stringify(JSON.parse(out)) !== JSON.stringify(A)) throw new Error('the result is not the new content');
fs.writeFileSync(after, out); console.log(changed + ' items changed, ' + added + ' added; layout kept');
