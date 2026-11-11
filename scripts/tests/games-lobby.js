const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8806), b = await edge(), errs = [], base = 'http://localhost:8806';
  const st = p => p.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0; return { lobby: vis(document.getElementById('gm-lobby')), tabs: vis(document.querySelector('.gm-tabs')), back: vis(document.getElementById('gm-back')), shown: [...document.querySelectorAll('.gm-game')].filter(vis).map(x => x.id), sel: [...document.querySelectorAll('.gm-tab[aria-selected="true"]')].map(x => x.id), hash: location.hash, wide: document.documentElement.scrollWidth - innerWidth, y: Math.round(scrollY) }; });
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const W = vp.width + ': ';
    await p.goto(base + '/games'); await p.waitForTimeout(1500);
    let s = await st(p); ok(W + 'opens on the lobby', s.lobby && !s.tabs && !s.back && !s.shown.length && s.wide <= 0, s);
    const cards = await p.$$eval('.gm-lc', e => e.map(a => [a.getAttribute('href'), a.querySelector('.gm-lc-t').textContent, a.classList.contains('is-new'), a.querySelector('.gm-lc-s').textContent]));
    ok(W + 'a card for each game (a tab each too), the new ones marked', cards.length === (await p.$$eval('.gm-tab', t => t.length)) && cards.filter(c => c[2]).length <= 3, cards.map(c => c[1]));
    const clip = await p.$$eval('.gm-lc', e => e.filter(a => a.scrollWidth > a.clientWidth + 1 || [...a.children].some(c => c.getBoundingClientRect().right > a.getBoundingClientRect().right + 1)).length); ok(W + 'no card text spills', clip === 0, clip);
    await p.screenshot({ path: path.join(out, 'lobby-' + vp.width + '.png'), fullPage: true });
    for (const c of cards) {   // every card opens its game
      await p.goto(base + '/games'); await p.waitForTimeout(500);
      await p.click('.gm-lc[href="' + c[0] + '"]'); await p.waitForTimeout(700);
      s = await st(p); const g = c[0].slice(1).split('-')[0];
      if (!(s.shown.join() === 'game-' + g && s.tabs && s.back && !s.lobby && s.sel.length === 1 && s.sel[0] === (c[0] === '#first-lasted' ? 'tab-lasted' : 'tab-' + g))) ok(W + 'card ' + c[0], false, s);
    }
    ok(W + 'every card opens its game', true);
    await p.goto(base + '/games'); await p.waitForTimeout(600);
    await p.click('.gm-lc[href="#year"]'); await p.waitForTimeout(700);
    const top = await p.evaluate(() => Math.round(document.getElementById('gm-back').getBoundingClientRect().top)); ok(W + 'the game opens at its top', top >= 0 && top < 200, top);
    await p.screenshot({ path: path.join(out, 'lobby-game-' + vp.width + '.png') });
    await p.goBack(); await p.waitForTimeout(600); s = await st(p); ok(W + 'Back returns to the lobby', s.lobby && !s.shown.length && s.hash === '', s);
    await p.goForward(); await p.waitForTimeout(600); s = await st(p); ok(W + 'Forward reopens the game', s.shown.join() === 'game-year' && !s.lobby, s);
    await p.click('#gm-back'); await p.waitForTimeout(500); s = await st(p); ok(W + 'All games returns to the lobby at the top', s.lobby && !s.shown.length && s.hash === '' && s.y === 0, s);
    await p.click('.gm-lc[href="#year"]'); await p.waitForTimeout(600); await p.click('#tab-conn'); await p.waitForTimeout(600);
    s = await st(p); ok(W + 'tabs still switch games', s.shown.join() === 'game-conn' && s.sel.join() === 'tab-conn', s);
    // statuses from the records
    await p.evaluate(() => { const Q = Math.floor(Date.now() / 864e5), g = JSON.parse(localStorage.getItem('epoch-games') || '{}'); g['daily-' + Q] = { m: '1101111011' }; g['said-' + (Q - Math.floor(Date.UTC(2026, 9, 28) / 864e5) + 1)] = { m: '110' }; g['first-lasted'] = 7; g['cw-' + (Q - Math.floor(Date.UTC(2026, 9, 27) / 864e5) + 1)] = { done: 1, t: 300 }; localStorage.setItem('epoch-games', JSON.stringify(g)); });
    await p.goto(base + '/games'); await p.reload(); await p.waitForTimeout(900);
    const stt = await p.$$eval('.gm-lc', e => e.map(a => [a.getAttribute('data-g'), a.querySelector('.gm-lc-s').textContent, a.classList.contains('is-done')]).filter(x => ['first', 'said', 'lasted', 'cross', 'conn'].includes(x[0])));
    ok(W + 'cards show today’s results', JSON.stringify(stt) === JSON.stringify([['first', 'Daily Ten: 8/10', true], ['conn', 'Today’s puzzle is waiting', false], ['cross', 'Solved today', true], ['said', 'Today: 2/5 so far', false], ['lasted', 'Your best: 7 in a row', false]]), stt);
    await p.screenshot({ path: path.join(out, 'lobby-status-' + vp.width + '.png') });
    // deep links
    for (const [h, g, t] of [['#words-egypt', 'game-words', 'tab-words'], ['#first-lasted', 'game-first', 'tab-lasted'], ['#first-daily', 'game-first', 'tab-first'], ['#six', 'game-six', 'tab-six']]) {
      await p.goto(base + '/games' + h); await p.reload(); await p.waitForTimeout(1200); s = await st(p);
      if (!(s.shown.join() === g && s.sel.join() === t && !s.lobby && s.tabs)) ok(W + 'deep link ' + h, false, s);
    }
    ok(W + 'deep links open their games', true);
    await p.goto(base + '/games#first'); await p.reload(); await p.waitForTimeout(1200); s = await st(p); ok(W + '#first after Longer or Shorter? is Which Came First?', s.sel.join() === 'tab-first', s);
    // Kids mode
    await p.evaluate(() => localStorage.setItem('epoch-kids', '1')); await p.goto(base + '/games'); await p.reload(); await p.waitForTimeout(1200);
    s = await st(p); const clipK = await p.$$eval('.gm-lc', e => e.filter(a => [...a.children].some(c => c.getBoundingClientRect().right > a.getBoundingClientRect().right + 1)).length);
    ok(W + 'Kids mode lobby', s.lobby && s.wide <= 0 && clipK === 0, s); await p.screenshot({ path: path.join(out, 'lobby-kids-' + vp.width + '.png'), fullPage: true });
    await ctx.close();
  }
  // the menu: New tags and the birthday entry; the home page's line; the passport
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');localStorage.setItem('epoch-advent',JSON.stringify({2026:[1,2,3]}));localStorage.setItem('epoch-games',JSON.stringify({'first-lasted':12,pairs:30}))}catch(e){}");
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(base + '/about'); await p.waitForTimeout(1000); await p.click('#nav-play-btn'); await p.waitForTimeout(400);
  const menu = await p.$$eval('#nav-play-menu a', a => a.map(x => [x.getAttribute('href'), x.querySelector('b') ? x.querySelector('b').textContent : '']));
  ok('Play menu: birthday entry, New on it and on Advent', menu.some(m => m[0] === '/today-in-history/#birthday' && /New$/.test(m[1])) && menu.some(m => m[0] === '/advent' && /New$/.test(m[1])) && menu.filter(m => /New$/.test(m[1])).length === 2, menu);
  await p.screenshot({ path: path.join(out, 'menu-new.png') });
  await p.goto(base + '/'); await p.waitForTimeout(1500); const by = await p.evaluate(() => { const a = document.querySelector('.born-yours a'); a.scrollIntoView({ block: 'center', behavior: 'instant' }); return a.getAttribute('href'); }); ok('home: your birthday line', by === '/today-in-history/#birthday'); await p.waitForTimeout(600); await p.screenshot({ path: path.join(out, 'home-born.png') });
  await p.goto(base + '/passport'); await p.waitForTimeout(1500);
  const pass = await p.evaluate(() => ({ games: [...document.querySelectorAll('#pass-play li')].map(x => x.textContent).filter(t => /^Games/.test(t)), text: document.body.innerText.match(/The long view[^\n]*|Advent[^\n]*/g) }));
  ok('passport: 2 games played, the two stamps', /2 of 1\d played/.test(pass.games.join()) && pass.text && pass.text.length >= 2, pass);
  await ctx.close();
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
