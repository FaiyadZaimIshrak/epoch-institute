// After texts were restyled and the profiles regenerated: which profile pages link an entry less (or more) than
// the committed page did? Reads the gold links (a.enc-link) of every changed profile page and of its HEAD version.
//   node scripts/style/links-kept.js        prints page, lost links, gained links
const fs = require('fs'), path = require('path'), cp = require('child_process'), R = path.join(__dirname, '..', '..');
const run = c => cp.execSync(c, { cwd: R, maxBuffer: 1 << 28 }).toString();
const links = h => { const s = {}; for (const m of h.matchAll(/<a class="enc-link" href="\/encyclopedia\/([^"#]+)"/g)) s[m[1]] = (s[m[1]] || 0) + 1; return s; };
const dirs = ['empire', 'religion', 'language', 'culture', 'movement', 'government', 'ideology', 'work', 'life'];
const changed = run('git diff --name-only -- ' + dirs.join(' ')).split('\n').filter(Boolean); let lost = 0, gained = 0;
for (const f of changed) { const a = links(run('git show HEAD:' + f)), b = links(fs.readFileSync(path.join(R, f), 'utf8'));
  const l = Object.keys(a).filter(k => !b[k]), g = Object.keys(b).filter(k => !a[k]); lost += l.length; gained += g.length;
  if (l.length || g.length) console.log(f + (l.length ? '\n  lost: ' + l.join(' ') : '') + (g.length ? '\n  gained: ' + g.join(' ') : '')); }
console.log(changed.length + ' pages changed, ' + lost + ' links lost, ' + gained + ' gained');
