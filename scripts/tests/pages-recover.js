// The hand pages that need shared-data.js load themselves again when it, or shared-nav.js, did not arrive
// (scripts/tools/page-recover.js, 26 Nov 2026): once failed, the page comes back whole; never arriving, it stops after
// two tries; arriving at once, nothing is reloaded.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8875), b = await edge();
  const visit = async (page, kill, times) => {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }), p = await ctx.newPage(); let cut = 0, loads = 0;
    if (kill) await p.route('**/' + kill + '*', r => { cut++; if (cut <= times) r.abort(); else r.continue(); });
    p.on('request', r => { if (r.isNavigationRequest() && r.frame() === p.mainFrame()) loads++; });   // not framenavigated: a page that rewrites its address counts there too
    await p.goto('http://localhost:8875/' + page, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(kill ? 6500 : 2000);
    const i = await p.evaluate(() => ({ data: typeof EMPIRES !== 'undefined', nav: typeof initNav === 'function', menu: document.querySelectorAll('#site-nav a').length, left: sessionStorage.getItem('epoch-again') }));
    await ctx.close(); return Object.assign(i, { loads });
  };
  for (const page of ['profiles', 'explorer', 'quiz', 'faiths', 'passport', 'search', 'compare', 'race']) {
    const i = await visit(page, 'shared-data.js', 1);
    ok('/' + page + ': shared-data.js fails once, the page comes back whole', i.data && i.nav && i.menu > 50 && i.loads === 2 && i.left === null, i);
  }
  let i = await visit('profiles', null, 0); ok('every file arrives: no reload', i.data && i.loads === 1 && i.left === null, i);
  i = await visit('compare', 'shared-nav.js', 1); ok('shared-nav.js fails once: the page comes back whole', i.nav && i.menu > 50 && i.loads === 2, i);
  i = await visit('quiz', 'shared-data.js', 2); ok('fails twice: the third load is whole', i.data && i.loads === 3 && i.left === null, i);
  i = await visit('race', 'shared-data.js', 99); ok('never arrives: two tries, then it stops', !i.data && i.loads === 3 && i.left === '2', i);
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
