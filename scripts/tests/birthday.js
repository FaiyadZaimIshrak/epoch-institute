const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8801), b = await edge(), errs = [], base = 'http://localhost:8801';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/today-in-history/'); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.getElementById('birthday').scrollIntoView({ block: 'start', behavior: 'instant' }); scrollBy(0, -90); }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, 'bday-' + vp.width + '.png') });
    const wide = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(vp.width + ': no sideways scroll', wide <= 0, wide);
    await p.selectOption('#bday-d', '31'); await p.selectOption('#bday-m', '3'); await p.click('#bday-form button'); await p.waitForTimeout(200);
    ok(vp.width + ': 31 April refused', (await p.textContent('#bday-note')) === 'April has only 30 days.' && p.url().endsWith('/today-in-history/'));
    await p.selectOption('#bday-d', '29'); await p.selectOption('#bday-m', '1'); await p.click('#bday-form button'); await p.waitForTimeout(200);
    const links = await p.$$eval('#bday-note a', a => a.map(x => x.getAttribute('href'))); ok(vp.width + ': 29 February offers its neighbours', links.join() === '/today-in-history/february-28,/today-in-history/march-1', links);
    await p.selectOption('#bday-d', '5'); await p.selectOption('#bday-m', '10'); await Promise.all([p.waitForNavigation(), p.click('#bday-form button')]);
    ok(vp.width + ': 5 November opens its day page', p.url().endsWith('/today-in-history/november-5') && (await p.textContent('h1')).includes('5 November'), p.url());
    await p.goto(base + '/today-in-history/'); await p.waitForTimeout(800);
    ok(vp.width + ': the day is remembered', (await p.textContent('#bday-note')).includes('5 November in history') && (await p.inputValue('#bday-m')) === '10');
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
