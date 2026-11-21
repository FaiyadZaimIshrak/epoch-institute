// "How to use it" on the tool pages (scripts/tools/make-howto.js): shown at the first paint, folded by "Got it" and
// remembered, brought back by its button; nothing moves when the page loads.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const PAGES = ['/atlas', '/timeline', '/explorer', '/connections', '/race', '/inventions', '/faiths', '/write', '/compare', '/flashcards', '/quiz'];
(async () => {
  const srv = await serve(8875), b = await edge();
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const W = vp.width + ': ', ctx = await b.newContext({ viewport: vp });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no')}catch(e){} window.__cls=0; try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)window.__cls+=e.value})}).observe({type:'layout-shift',buffered:true})}catch(e){}");
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
    const st = () => p.evaluate(() => { const h = document.getElementById('howto'), o = document.getElementById('howto-open');
      return { strip: !!h && !h.hidden && h.getBoundingClientRect().height > 40, open: !!o && !o.hidden, steps: h ? h.querySelectorAll('li').length : 0 }; });
    for (const u of PAGES) {
      await p.goto('http://localhost:8875' + u, { waitUntil: 'domcontentloaded' });
      const s = await st(); ok(W + u + ': three steps shown on a first visit', s.strip && s.steps === 3 && !s.open, s);
    }
    await p.goto('http://localhost:8875/atlas', { waitUntil: 'load' }); await p.waitForTimeout(800);
    await p.click('.howto-x'); let s = await st(); ok(W + 'Got it folds the steps into a button', !s.strip && s.open, s);
    await p.reload({ waitUntil: 'domcontentloaded' }); s = await st(); ok(W + 'folded steps stay folded on the next visit', !s.strip && s.open, s);
    s = await p.evaluate(() => document.querySelector('#quiz-x, .x') ? 1 : 0);
    await p.goto('http://localhost:8875/quiz', { waitUntil: 'domcontentloaded' }); s = await st(); ok(W + 'another tool still shows its own steps', s.strip, s);
    await p.goto('http://localhost:8875/atlas', { waitUntil: 'domcontentloaded' }); await p.click('#howto-open'); s = await st(); ok(W + 'the button brings the steps back', s.strip && !s.open, s);
    await p.goto('http://localhost:8875/flashcards', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const cls = await p.evaluate(() => window.__cls); ok(W + 'nothing moves while the page loads', cls < 0.02, cls);
    ok(W + 'no page errors', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
