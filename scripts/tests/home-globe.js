// The home globe survives files that do not arrive (21 Nov 2026: after every deploy Cloudflare is purged, the globe's
// files come cold from the slow host, and when one failed the worker died silently and the flat map stayed). A file
// that fails is asked for again; when the worker cannot be made to work the page draws the globe itself; when nothing
// arrives the flat map stays and the page shows no error.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8874), b = await edge();
  const visit = async (kill, times, wait) => {
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }), seen = {}, errs = [];
    // the context's route also catches the worker's own requests
    if (kill) for (const k of kill.split('|')) await ctx.route('**/' + k + '*', r => { seen[k] = (seen[k] || 0) + 1; if (seen[k] <= times) r.abort(); else r.continue(); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto('http://localhost:8874/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait || 14000);
    const i = await p.evaluate(() => {
      const cv = document.querySelector('.home-map canvas'), flat = document.querySelector('.home-map svg');
      return { globe: !!cv && !cv.hasAttribute('hidden'), flat: !!flat && getComputedStyle(flat).display !== 'none' };
    });
    i.errors = errs.length; i.tries = seen; await ctx.close(); return i;
  };
  let i = await visit(null, 0); ok('every file arrives: the globe replaces the flat map', i.globe && !i.flat && !i.errors, i);
  i = await visit('globe-land.js', 2); ok('the outlines fail twice: the globe still comes', i.globe && !i.flat && !i.errors, i);
  i = await visit('d3-geo.js', 1); ok('d3 fails once: the globe still comes', i.globe && !i.flat && !i.errors, i);
  i = await visit('home-globe.js', 1); ok('the worker itself fails to load: the page draws the globe', i.globe && !i.flat && !i.errors, i);
  i = await visit('globe-land.js', 99, 30000); ok('the outlines never come: the flat map stays, no error', !i.globe && i.flat && !i.errors, i);
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
