// The home page recovers when one of its scripts does not arrive (12 Nov 2026: with shared-data.js missing it showed
// no quiz, no globe and empty "Born on This Day" tiles). A file that fails once or twice is asked for again and the
// page fills in; with a file that never arrives the rest of the page (menu, History Now) still works.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8873), b = await edge();
  const visit = async (kill, times) => {
    const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), seen = {};
    if (kill) for (const k of kill.split('|')) await p.route('**/' + k + '*', r => { seen[k] = (seen[k] || 0) + 1; if (seen[k] <= times) r.abort(); else r.continue(); });
    await p.goto('http://localhost:8873/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(11000);
    const i = await p.evaluate(() => ({ menu: document.querySelectorAll('#site-nav a').length, globe: !!document.querySelector('.home-map canvas:not([hidden])'), quiz: (document.getElementById('quiz') || {}).innerText.length, born: document.querySelectorAll('.home-born img').length, now: document.querySelectorAll('.now-list li').length }));
    await p.context().close(); return i;
  };
  const whole = i => i.menu > 50 && i.globe && i.quiz > 20 && i.born >= 1 && i.now > 0;
  let i = await visit(null, 0); ok('every file arrives: menu, globe, quiz, born today, History Now', whole(i), i);
  for (const [f, t] of [['shared-data.js', 1], ['shared-data.js', 2], ['home-data.js', 1], ['shared-nav.js', 1], ['quiz.js', 1], ['shared-data.js|quiz.js', 1]]) { i = await visit(f, t); ok(f + ' fails ' + t + ' time(s): the page fills in all the same', whole(i), i); }
  i = await visit('shared-data.js', 99); ok('shared-data.js never arrives: the menu and History Now still work', i.menu > 50 && i.now > 0, i);
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
