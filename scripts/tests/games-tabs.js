const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8804), b = await edge(), errs = [], base = 'http://localhost:8804';
  const st = p => p.evaluate(() => { const sel = [...document.querySelectorAll('.gm-tab[aria-selected="true"]')], ink = document.querySelector('.gm-tab-ink').getBoundingClientRect(), t = sel[0] && sel[0].getBoundingClientRect(); return { sel: sel.map(x => x.id), inkOn: !!t && Math.abs(ink.left - t.left) < 3 && Math.abs(ink.top - t.top) < 3, shown: [...document.querySelectorAll('.gm-game, [id^="game-"]')].filter(x => x.id && x.id.indexOf('game-') === 0 && !x.hidden).map(x => x.id), pressed: (document.querySelector('.gm-seg[data-for="first"] button[aria-pressed="true"]') || {}).textContent, lasted: document.getElementById('first-duel').classList.contains('is-lasted'), cards: document.querySelectorAll('#first-duel .gm-fc').length, hash: location.hash, wide: document.documentElement.scrollWidth - innerWidth, focus: document.activeElement.id }; });
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const W = vp.width + ': ';
    await p.goto(base + '/games#pairs'); await p.waitForTimeout(1500);
    let s = await st(p); ok(W + 'opens on Emblem Pairs', s.sel.join() === 'tab-pairs' && s.inkOn && s.wide <= 0, s);
    const names = await p.$$eval('.gm-tab .gm-tab-t', e => e.map(x => x.textContent)); ok(W + 'the bar names Longer or Shorter? after Which Came First?', names.length >= 14 && names[5] === 'Longer or Shorter?' && names[4] === 'Which Came First?', names);
    await p.click('#tab-lasted'); await p.waitForTimeout(900);
    s = await st(p); ok(W + 'its tab opens the game', s.sel.join() === 'tab-lasted' && s.inkOn && s.shown.join() === 'game-first' && s.lasted && s.cards === 2 && s.pressed === 'Longer or shorter' && s.hash === '#first-lasted', s);
    await p.screenshot({ path: path.join(out, 'lasted-tab-' + vp.width + '.png') });
    await p.click('#tab-first'); await p.waitForTimeout(900);
    s = await st(p); ok(W + 'Which Came First? leaves the mode', s.sel.join() === 'tab-first' && s.inkOn && !s.lasted && s.pressed === 'Daily Ten' && s.hash === '#first', s);
    await p.click('.gm-seg[data-for="first"] button[data-v="lasted"]'); await p.waitForTimeout(700);
    s = await st(p); ok(W + 'the mode button marks the tab too', s.sel.join() === 'tab-lasted' && s.inkOn && s.lasted, s);
    await p.click('.gm-seg[data-for="first"] button[data-v="people"]'); await p.waitForTimeout(700);
    s = await st(p); ok(W + 'and another mode marks Which Came First?', s.sel.join() === 'tab-first' && s.inkOn && !s.lasted && s.cards === 2, s);
    await p.click('#tab-lasted'); await p.waitForTimeout(700); await p.click('#tab-order'); await p.waitForTimeout(700);
    s = await st(p); ok(W + 'another game unmarks it', s.sel.join() === 'tab-order' && s.inkOn && s.shown.join() === 'game-order', s);
    await p.reload(); await p.waitForTimeout(1500); await p.click('#tab-lasted'); await p.waitForTimeout(900);
    s = await st(p); ok(W + 'from another game after a reload', s.sel.join() === 'tab-lasted' && s.lasted && s.cards === 2 && s.shown.join() === 'game-first', s);
    await p.reload(); await p.waitForTimeout(1500);
    s = await st(p); ok(W + 'a reload comes back to it', s.sel.join() === 'tab-lasted' && s.inkOn && s.lasted && s.cards === 2, s);
    if (vp.width > 500) {
      await p.focus('#tab-lasted'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(700);
      s = await st(p); ok(W + 'ArrowLeft goes to Which Came First?', s.sel.join() === 'tab-first' && s.focus === 'tab-first' && !s.lasted, s);
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
      s = await st(p); ok(W + 'ArrowRight comes back', s.sel.join() === 'tab-lasted' && s.focus === 'tab-lasted' && s.lasted, s);
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(700);
      s = await st(p); ok(W + 'ArrowRight again: Picture Puzzle', s.sel.join() === 'tab-puzzle' && s.focus === 'tab-puzzle', s);
    }
    await p.goto(base + '/games#first-daily'); await p.reload(); await p.waitForTimeout(1500);
    s = await st(p); ok(W + '#first-daily still opens the Daily Ten', s.sel.join() === 'tab-first' && s.pressed === 'Daily Ten' && !s.lasted, s);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
