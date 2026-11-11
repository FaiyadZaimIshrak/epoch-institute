const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8803), b = await edge(), errs = [], base = 'http://localhost:8803';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/games#first-lasted'); await p.waitForTimeout(1500);
    const mode = await p.evaluate(() => ({ pressed: (document.querySelector('.gm-seg[data-for="first"] button[aria-pressed="true"]') || {}).textContent, lasted: document.getElementById('first-duel').classList.contains('is-lasted'), howto: document.getElementById('first-howto').textContent, cards: document.querySelectorAll('#first-duel .gm-fc').length }));
    ok(vp.width + ': #first-lasted opens the mode', mode.pressed === 'Longer or shorter' && mode.lasted && mode.cards === 2 && mode.howto.includes('lasted longer'), mode);
    // read the two names, find their spans in GAME_SPANS and answer rightly five times
    const dur = n => p.evaluate(nm => { const c = GAME_SPANS.find(x => x[1] === nm); return c[3] - c[2] - (c[2] < 0 && c[3] > 0 ? 1 : 0); }, n);
    let gaps = [];
    for (let r = 0; r < 5; r++) {
      const names = await p.$$eval('#first-duel .gm-fc-n', e => e.map(x => x.textContent)); const d0 = await dur(names[0]), d1 = await dur(names[1]); gaps.push(Math.abs(d0 - d1));
      if (r === 0) await p.screenshot({ path: path.join(out, 'lasted-' + vp.width + '-ask.png') });
      await p.click('#first-duel .gm-fc[data-i="' + (d0 > d1 ? 0 : 1) + '"]'); await p.waitForTimeout(350);
      const res = await p.evaluate(() => ({ v: document.querySelector('.gm-fc-v').textContent, y: [...document.querySelectorAll('.gm-fc-y')].map(x => x.textContent), first: document.querySelector('.gm-fc.is-first .gm-fc-n').textContent, streak: document.getElementById('first-streak').textContent }));
      if (r === 0) { ok(vp.width + ': a right answer is explained', res.v.startsWith('Right!') && res.v.includes('lasted') && res.v.includes('more than') && res.first === names[d0 > d1 ? 0 : 1] && res.y.every(t => /years · /.test(t)), res); await p.screenshot({ path: path.join(out, 'lasted-' + vp.width + '-right.png') }); }
      if (res.streak !== String(r + 1)) ok(vp.width + ': streak counts', false, res.streak);
      await p.click('.gm-fc-next'); await p.waitForTimeout(350);
    }
    ok(vp.width + ': five right in a row, gaps of 20 years or more', gaps.every(g => g >= 20), gaps);
    for (let r = 0; r < 3; r++) {   // three wrong answers end the game
      const names = await p.$$eval('#first-duel .gm-fc-n', e => e.map(x => x.textContent)); const d0 = await dur(names[0]), d1 = await dur(names[1]);
      await p.click('#first-duel .gm-fc[data-i="' + (d0 > d1 ? 1 : 0) + '"]'); await p.waitForTimeout(350);
      if (r < 2) { await p.click('.gm-fc-next'); await p.waitForTimeout(300); }
    }
    await p.waitForTimeout(1800);
    const fin = await p.evaluate(() => ({ shown: !document.getElementById('first-done').hidden, t: (document.querySelector('#first-done .gm-done-t') || {}).textContent, best: document.getElementById('first-best').textContent, saved: JSON.parse(localStorage.getItem('epoch-games'))['first-lasted'], wide: document.documentElement.scrollWidth - innerWidth }));
    ok(vp.width + ': three lives lost end the game with the score kept', fin.shown && fin.t === '5 in a row' && fin.saved === 5 && fin.wide <= 0, fin);
    await p.screenshot({ path: path.join(out, 'lasted-' + vp.width + '-done.png') });
    // the other modes still work
    await p.click('.gm-seg[data-for="first"] button[data-v="all"]'); await p.waitForTimeout(600);
    const other = await p.evaluate(() => ({ lasted: document.getElementById('first-duel').classList.contains('is-lasted'), cards: document.querySelectorAll('#first-duel .gm-fc').length }));
    ok(vp.width + ': Everything still deals pictures', !other.lasted && other.cards === 2, other);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
