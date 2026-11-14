// The features' own tests, kept with the site (Nov 2026: until then each lived in a session's scratch folder and was lost
// with it). Each test serves the repository on localhost and drives headless Edge (scripts/tools/lib.js: EPOCH_PW = a
// folder with playwright-core), at desktop and phone width, and exits 1 on a failed check.
//   node scripts/tests/run.js [names…]        e.g. node scripts/tests/run.js games-lobby birthday
// mail needs PHP: EPOCH_PHP = php.exe (the handler is run by PHP's own server with EPOCH_MAIL_TEST); skipped without it.
// Screenshots go to a folder in the system's temp directory, printed at the end. Run them one at a time (as here): each
// starts its own server.
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..', '..'), out = fs.mkdtempSync(path.join(os.tmpdir(), 'epoch-tests-'));
const TESTS = ['looks', 'advent', 'birthday', 'games-lobby', 'games-tabs', 'longer-or-shorter', 'quote-cipher', 'finish-the-line', 'history-now', 'page-toc', 'long-lists', 'phone-bar', 'page-useful', 'home-recovers', 'today-page', 'born-where', 'atlas-born', 'safe-keys', 'mail'];
const want = process.argv.slice(2), list = want.length ? TESTS.filter(t => want.includes(t)) : TESTS;
let failed = [];
for (const t of list) {
  if (t === 'mail' && !process.env.EPOCH_PHP) { console.log('── mail: skipped (set EPOCH_PHP to php.exe)'); continue; }
  console.log('── ' + t);
  const r = spawnSync(process.execPath, [path.join(__dirname, t + '.js'), ROOT, t === 'mail' ? process.env.EPOCH_PHP : out], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', timeout: 600000 });
  const lines = (r.stdout || '').split(/\r?\n/).filter(Boolean);
  lines.filter(l => !/^ok /.test(l)).forEach(l => console.log('   ' + l.slice(0, 400)));
  console.log('   ' + lines.filter(l => /^ok /.test(l)).length + ' checks passed' + (r.status ? ', FAILED (exit ' + r.status + ')' : ''));
  if (r.status) failed.push(t);
}
console.log(failed.length ? 'FAILED: ' + failed.join(', ') : 'all tests passed'); console.log('screenshots: ' + out);
process.exit(failed.length ? 1 : 0);
