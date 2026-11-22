// Link repairs that came with the sacred texts (works3, 22 Nov 2026), inserted as text into scripts/added-entries.json:
//   drop   "Agni" from Karashahr's names (the Vedic god is meant nearly everywhere; the city keeps the name on the
//          Tocharians' profile as a form) and "Hume" from Hummay's (David Hume, Wallace Hume Carothers)
//   forms  "Yijing" is the monk's name (entry yijing); on the profiles where it means the Book of Changes it is a
//          profile-only form of the entry i-ching
//   node scripts/kinds/works3/links.js [--write]      then scripts/apply-added-entries.ps1
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..', '..');
const ev = (f, n) => new Function(fs.readFileSync(path.join(R, f), 'utf8').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + n)();
const P = ev('empire-profiles.js', 'EMPIRE_PROFILES'), G = ev('empire-glance.js', 'GLANCE'), F = ev('empire-facts.js', 'EMPIRE_FACTS'), INFO = ev('shared-data.js', 'EMPIRE_INFO');
const where = (name, rx) => { const out = [], p = P[name]; if (!p) throw new Error('no profile ' + name);
  for (const k of Object.keys(p)) if (k !== 'summary' && k !== 'references' && rx.test(String(p[k]).replace(/<[^>]+>/g, ''))) out.push(k);
  if (rx.test(JSON.stringify([p.summary, G[name], F[name], INFO[name]]))) out.push('summary'); return out; };
const DROP = [['karashahr', 'Agni', 0], ['hummay', 'Hume', 0]];
const FORMS = [
  ['i-ching', 'Yijing', ['Confucianism', 'Self-Strengthening Movement', 'Chinese folk religion', 'Eastern Jin']],
  ['karashahr', 'Agni', ['Tocharians']]
].map(([slug, text, profs]) => { const m = {}; for (const p of profs) { const s = where(p, new RegExp('(?<![\\p{L}])' + text + '(?![\\p{L}])', 'u')); if (!s.length) throw new Error(text + ' not on ' + p); m[p] = s; } return [slug, text, 0, m]; });
const f = path.join(R, 'scripts', 'added-entries.json'); let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n', A = JSON.parse(t);
const lay = x => JSON.stringify(x, null, 1).split('\n').map(l => '  ' + l).join(nl);
const add = (key, next, rows) => { if (!rows.length) return; const i = t.indexOf(nl + ' ],' + nl + ' "' + next + '": ['); if (i < 0 || t.indexOf(' "' + key + '": [') > i) throw new Error('end of ' + key); t = t.slice(0, i) + rows.map(r => ',' + nl + lay(r)).join('') + t.slice(i); };
const newDrop = DROP.filter(d => !A.drop.some(x => x[0] === d[0] && x[1] === d[1])), newForms = FORMS.filter(d => !A.forms.some(x => x[0] === d[0] && x[1] === d[1]));
add('forms', 'drop', newForms); add('drop', 'exclude', newDrop);
const B = JSON.parse(t); for (const k of Object.keys(A)) if (Array.isArray(A[k]) && B[k].length < A[k].length) throw new Error(k + ' lost items');
console.log(JSON.stringify(newForms)); console.log(newDrop.length + ' drops, ' + newForms.length + ' forms' + (process.argv.includes('--write') ? ' written' : ' (dry run)'));
if (process.argv.includes('--write')) fs.writeFileSync(f, t);
