// A hand page that needs shared-data.js or shared-nav.js loads itself again, at most twice, when one of them did not
// arrive (the host drops a connection now and then; the home page has its own loader, see "A script that does not
// arrive" in CLAUDE.md). This writes the one-line snippet after the page's shared-nav.js tag. Re-runnable.
//   node scripts/tools/page-recover.js [--check]
const fs = require('fs'), path = require('path'), R = path.resolve(__dirname, '..', '..');
const PAGES = ['profiles', 'explorer', 'quiz', 'faiths', 'passport', 'search', 'compare', 'race'];
const TAG = '<script src="/shared-nav.js"></script>';
const SNIP = '<script>/*recover*/(function(){var k="epoch-again",n=0;try{n=+sessionStorage.getItem(k)||0}catch(e){}' +
  'if(typeof EMPIRES==="undefined"||typeof initNav!=="function"){if(n<2){try{sessionStorage.setItem(k,n+1)}catch(e){return}' +
  'setTimeout(function(){location.reload()},700*(n+1))}}else if(n){try{sessionStorage.removeItem(k)}catch(e){}}})();</script>';
const CHECK = process.argv.includes('--check'); let bad = 0;
for (const p of PAGES) {
  const f = path.join(R, p); let t = fs.readFileSync(f, 'utf8');
  if (t.split(TAG).length !== 2) throw new Error(p + ': the shared-nav.js tag is not there once');
  const had = /<script>\/\*recover\*\/[\s\S]*?<\/script>\r?\n?/.exec(t);
  if (had && had[0].replace(/\r?\n$/, '') === SNIP) continue;
  if (CHECK) { console.log('without the recovery snippet: /' + p); bad++; continue; }
  if (had) t = t.replace(had[0], () => '');
  const nl = t.includes('\r\n') ? '\r\n' : '\n';
  t = t.replace(TAG, () => TAG + nl + SNIP); fs.writeFileSync(f, t); console.log('written: /' + p);
}
if (CHECK) process.exit(bad ? 1 : 0);
