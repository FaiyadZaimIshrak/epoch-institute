// Born Where? (a mode of Globe Hunt with a tab and a card of its own): the card opens it, a person is named with
// their dates, a pin gets the answer "was born in <place>", five rounds give a score kept as hunt-born; the plain Globe
// Hunt tab goes back to states; the data: every person has a point and a place.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const BORN = new Function(fs.readFileSync(path.join(process.argv[2], 'born-data.js'), 'utf8') + '; return BORN;')();
  ok('data: ' + BORN.length + ' people, each with dates, a point on the globe, a region, a place and an entry', BORN.length >= 200 && BORN.every(r => r[0] && r[1] && Math.abs(r[2]) <= 90 && Math.abs(r[3]) <= 180 && r[4] && r[5] && fs.existsSync(path.join(process.argv[2], 'encyclopedia', r[6]))) && new Set(BORN.map(r => r[4])).size >= 5);
  const srv = await serve(8822), b = await edge(), errs = [], base = 'http://localhost:8822';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ', ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    const st = () => p.evaluate(() => ({ tab: [...document.querySelectorAll('.gm-tab[aria-selected="true"]')].map(x => x.id).join(), q: document.getElementById('hunt-q').textContent, how: document.querySelector('#game-hunt .gm-howto').textContent.slice(0, 40), seg: (document.querySelector('.gm-seg[data-for="hunt"] [aria-pressed="true"]') || {}).textContent, hash: location.hash, res: document.getElementById('hunt-res').hidden ? '' : document.getElementById('hunt-res').textContent, done: document.getElementById('hunt-done').hidden ? '' : document.getElementById('hunt-done').textContent.slice(0, 60), wide: document.documentElement.scrollWidth - innerWidth }));
    await p.goto(base + '/games', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
    ok(W + 'the lobby has a card for it', await p.evaluate(() => !!document.querySelector('.gm-lc[data-g="born"]') && document.querySelectorAll('.gm-lc').length === 17));
    await p.click('.gm-lc[data-g="born"]'); await p.waitForTimeout(4500);
    let s = await st();
    ok(W + 'the card opens it: its own tab marked, a person named with dates', s.tab === 'tab-born' && s.hash === '#hunt-born' && s.seg === 'Born where?' && /Round 1 of 5: where was .+ \(.+\) born\?/.test(s.q) && /^A person of history/.test(s.how) && s.wide <= 0, s);
    const name = s.q.replace(/^Round 1 of 5: where was /, '').replace(/ \(.*$/, ''), row = BORN.find(r => r[0] === name);
    await p.screenshot({ path: path.join(out, 'born-' + vp.width + '-ask.png') });
    for (let k = 1; k <= 5; k++) {
      await p.focus('#hunt-globe'); await p.keyboard.press('Enter'); await p.waitForTimeout(2600);
      s = await st();
      if (k === 1) { ok(W + 'a pin: the answer names the birthplace and links the person', row && s.res.indexOf(name + ' was born in ' + row[5]) >= 0 && /km from your pin/.test(s.res) && await p.evaluate(sl => !!document.querySelector('#hunt-res a[href="/encyclopedia/' + sl + '"]'), row[6]), s.res.slice(0, 120)); await p.screenshot({ path: path.join(out, 'born-' + vp.width + '-answer.png') }); }
      await p.click('#hunt-res .gm-res-next'); await p.waitForTimeout(1300);
    }
    s = await st(); const rec = await p.evaluate(() => JSON.parse(localStorage.getItem('epoch-games'))['hunt-born']);
    ok(W + 'five rounds: a score out of 500, kept as the best of this game', /of 500 points/.test(s.done) && typeof rec === 'number' && rec >= 0 && rec <= 500, [s.done, rec]);
    await p.click('#tab-hunt'); await p.waitForTimeout(1500); s = await st();
    ok(W + 'the Globe Hunt tab goes back to states', s.tab === 'tab-hunt' && s.hash === '#hunt' && /where was the /.test(s.q) && /^Find where each state/.test(s.how), s);
    await p.click('#tab-born'); await p.waitForTimeout(1500); s = await st();
    ok(W + 'and its own tab comes back to people', s.tab === 'tab-born' && / born\?/.test(s.q), s.q);
    await p.goto(base + '/games'); await p.waitForTimeout(800);
    ok(W + 'the lobby card shows the best score (when there is one)', rec === 0 || await p.evaluate(() => /^Your best: \d+ of 500$/.test(document.querySelector('.gm-lc[data-g="born"] .gm-lc-s').textContent)));
    await p.goto(base + '/games#hunt-born'); await p.reload(); await p.waitForTimeout(4000); s = await st();
    ok(W + 'the address #hunt-born opens it', s.tab === 'tab-born' && / born\?/.test(s.q), s.q);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
