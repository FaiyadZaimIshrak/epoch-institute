// The explorer's point notes (point-descs.js) are telegraphic and used a dash for every pause (528 notes, Nov 2026).
// Rewrites each: a pair of dashes round an aside becomes commas; one dash becomes a comma before a conjunction, a
// relative word, a participle or an appositive ("a deal reversed in 1674"), else a colon (a semicolon where the
// sentence has a colon already). Labels in capitals are written in sentence case ("Absolute peak:").
//   node scripts/style/note-dashes.js [--write] [--sample=N]
const fs = require('fs'), path = require('path'), F = path.join(__dirname, '..', '..', 'point-descs.js');
let t = fs.readFileSync(F, 'utf8'), n = 0; const samples = [];
const COMMA = /^(?:but|and|yet|though|although|while|whereas|or|so|which|who|whose|where|when|as|a|an|one|some|not|now|still|only|even|all|both|its|his|her|their|with|without|from|in|at|by|after|before|until|despite|including|especially|\w+ing|\w+ed)\b/;
const fixSentence = s => {
  const parts = s.split(/\s+—\s+/); if (parts.length === 1) return s;
  if (/^[A-Z][A-Z' -]+$/.test(parts[0])) { parts[0] = parts[0][0] + parts[0].slice(1).toLowerCase(); return parts[0] + ': ' + parts.slice(1).join(', '); }
  if (parts.length === 3 && !/[.!?]$/.test(parts[1])) return parts[0] + ', ' + parts[1] + ', ' + parts[2];
  let out = parts[0]; for (let i = 1; i < parts.length; i++) out += (COMMA.test(parts[i]) ? ', ' : /[:;]/.test(out) ? '; ' : ': ') + parts[i]; return out;
};
t = t.replace(/^(\s*"[^"]+":\s*")((?:[^"\\]|\\.)*)(",?\s*)$/gm, (m, a, body, z) => {
  if (!body.includes('—')) return m; const b2 = body.split(/(?<=[.!?])\s+(?=[A-Z("“])/).map(fixSentence).join(' ').replace(/([a-z])—([a-z])/gi, '$1, $2');
  if (b2 !== body) { n++; if (n % (+((process.argv.find(x => x.startsWith('--sample=')) || '').slice(9)) || 25) === 0) samples.push(body + '\n   -> ' + b2); } return a + b2 + z; });
new Function(t.replace(/^const /m, 'var '));
console.log(samples.join('\n\n')); console.log(n + ' notes changed, ' + (t.match(/—/g) || []).length + ' dashes left');
if (process.argv.includes('--write')) { fs.writeFileSync(F, t); console.log('written'); }
