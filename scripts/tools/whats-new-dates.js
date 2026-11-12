// A release note may not be dated after the day it was written (12 Nov 2026: the notes of a busy fortnight had each
// been given the day after the one before, and ran to 27 November, so "New here" showed days that had not come).
// Sets every note dated after today (UTC) to the day its row was first committed (today for a row not yet committed).
//   node scripts/tools/whats-new-dates.js [--write]      exits 1 when a note is dated in the future (without --write)
const fs = require('fs'), path = require('path'), cp = require('child_process'), R = path.join(__dirname, '..', '..'), F = path.join(R, 'scripts', 'whats-new.tsv');
const today = new Date().toISOString().slice(0, 10), t = fs.readFileSync(F, 'utf8'), nl = t.includes('\r\n') ? '\r\n' : '\n'; let n = 0;
const out = t.split(nl).map(l => { const m = l.match(/^(\d{4}-\d\d-\d\d)\t([^\t]+)\t/); if (!m || m[1] <= today) return l;
  let d = ''; try { d = cp.execFileSync('git', ['log', '--format=%ad', '--date=short', '-S' + m[2], '--', 'scripts/whats-new.tsv'], { cwd: R }).toString().trim().split('\n').pop(); } catch (e) {}
  if (!d || d > today) d = today; n++; console.log(m[1] + ' -> ' + d + '  ' + m[2].slice(0, 60)); return d + l.slice(10); });
console.log(n + ' notes dated after ' + today);
if (process.argv.includes('--write')) fs.writeFileSync(F, out.join(nl)); else process.exit(n ? 1 : 0);
