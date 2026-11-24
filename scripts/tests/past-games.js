// Past games (/past-games and /games#<game>-<n>): the calendar's ranges and results, and every daily game opening the
// puzzle asked for by its number.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8817), b = await edge(), errs = [], base = 'http://localhost:8817';
  const Q = Math.floor(Date.now() / 864e5), d0 = (m, d) => Math.floor(Date.UTC(2026, m, d) / 864e5);
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');if(!localStorage.getItem('epoch-games'))localStorage.setItem('epoch-games',JSON.stringify({'conn-3':{s:[0,1,2,3],m:1,h:[],k:[],done:true},'said-2':{m:'11010',done:true},'daily-" + (d0(9, 26) + 4) + "':{m:'1101110111'}}))}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/past-games'); await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, 'past-games-' + vp.width + '.png') });
    ok(vp.width + ': no sideways scroll', (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    ok(vp.width + ': ten games to choose from', (await p.$$('.pg-game')).length === 10);
    ok(vp.width + ': the Daily Ten is shown first, a cell for every day since 26 October', (await p.$$('.pg-day')).length === Q - d0(9, 26) + 1, (await p.$$('.pg-day')).length);
    const five = await p.$eval('a.pg-day[href="/games#first-daily-5"]', a => [a.className, a.textContent]);
    ok(vp.width + ': a day played shows its result', /is-done/.test(five[0]) && /8\/10/.test(five[1]), five);
    ok(vp.width + ': today is marked and opens today\'s game', (await p.$eval('.pg-day.is-today', a => a.getAttribute('href'))) === '/games#first-daily');
    await p.click('.pg-game[data-k="conn"]'); await p.waitForTimeout(200);
    ok(vp.width + ': Connections chosen, kept in the address', p.url().endsWith('#conn') && (await p.$eval('.pg-game[data-k="conn"]', x => x.getAttribute('aria-pressed'))) === 'true');
    const c3 = await p.$eval('a.pg-day[href="/games#conn-3"]', a => [a.className, a.textContent]); ok(vp.width + ': Connections #3 shows as solved', /is-done/.test(c3[0]) && /Solved/.test(c3[1]), c3);
    await p.click('.pg-game[data-k="line"]'); await p.waitForTimeout(200);
    ok(vp.width + ': Finish the Line starts on 15 November', (await p.$$('.pg-day')).length === Q - d0(10, 15) + 1 && (await p.$$('.pg-month')).length === 1);
    // every game opens the number asked for
    for (const [hash, id, num] of [['conn-2', 'conn-num', 2], ['cross-2', 'cw-num', 2], ['said-3', 'said-num', 3], ['songq-2', 'songq-num', 2], ['six-2', 'six-num', 2], ['cipher-1', 'cp-num', 1], ['line-1', 'line-num', 1]]) {
      await p.goto(base + '/games#' + hash); await p.waitForTimeout(1500);
      const t = await p.textContent('#' + id), lobby = await p.$eval('#main', m => m.classList.contains('is-lobby'));
      ok(vp.width + ': /games#' + hash + ' opens that puzzle', !lobby && /Earlier/.test(t) && t.includes('#' + num), t);
    }
    await p.goto(base + '/games#conn-3'); await p.waitForTimeout(1200);
    ok(vp.width + ': a puzzle played before shows its result', (await p.textContent('#conn-done')).includes('Connections #3'), (await p.textContent('#conn-done')).slice(0, 80));
    await p.goto(base + '/games#first-daily-5'); await p.waitForTimeout(1500);
    const fd = await p.textContent('#first-done'); ok(vp.width + ': the Daily Ten of an earlier day', fd.includes('Daily Ten #5') && fd.includes('8 of 10'), fd.slice(0, 90));
    await p.goto(base + '/games#first-daily'); await p.waitForTimeout(1200);
    ok(vp.width + ': the plain address deals today\'s ten again', await p.$eval('#first-done', d => d.hidden || !d.textContent.includes('Daily Ten #5')));
    await p.goto(base + '/games#conn'); await p.waitForTimeout(1000);
    ok(vp.width + ': the plain address is today\'s puzzle', /Today/.test(await p.textContent('#conn-num')));
    const streak = await p.evaluate(() => JSON.parse(localStorage.getItem('epoch-games'))['conn-streak'] || null); ok(vp.width + ': an earlier puzzle starts no run of days', !streak, streak);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
