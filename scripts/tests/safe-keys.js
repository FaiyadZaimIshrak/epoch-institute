const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
(async () => {
  const srv = await serve(8807), b = await edge(), base = 'http://localhost:8807'; let bad = 0;
  const ctx = await b.newContext(); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no')}catch(e){}");
  for (const u of ['/search?q=rome&k=constructor', '/search?q=rome&k=__proto__', '/search?q=rome&k=profile', '/contact?topic=constructor', '/contact?topic=toString', '/contact?topic=correction&page=/about']) {
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + u); await p.waitForTimeout(2500);
    const info = await p.evaluate(() => ({ results: document.querySelectorAll('.sr-item, .search-result, [class*="sr-"] a').length, topic: (document.querySelector('.ct-topic[aria-pressed="true"], .ct-topic.is-on, [name="topic"]:checked') || {}).value || (document.querySelector('input[name="topic"]') || {}).value }));
    console.log(errs.length ? 'FAIL' : 'ok  ', u, JSON.stringify(info), errs.slice(0, 2).join(' | ')); if (errs.length) bad++; await p.close();
  }
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
