// /discover (discover.js): the picture wall, its filters kept in the address, Show more, the quick look with Previous,
// Next, Esc and Back, a click with Ctrl going to the page, Kids mode dealing only gentle cards; desktop and phone.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8876), b = await edge(), base = 'http://localhost:8876';
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800, isMobile: true, hasTouch: true }]) {
    const W = vp.width + ': ', ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no')}catch(e){} window.__cls=0; try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)window.__cls+=e.value})}).observe({type:'layout-shift',buffered:true})}catch(e){}");
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/discover', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    let s = await p.evaluate(() => ({ cards: document.querySelectorAll('.dc-card').length, total: epochDiscover.list().length, more: !document.getElementById('dc-more').hidden, cls: window.__cls }));
    ok(W + 'the wall shows 48 cards and Show more', s.cards === 48 && s.total > 1000 && s.more, s);
    ok(W + 'nothing moves while the wall loads', s.cls < 0.02, s.cls);
    const first = await p.evaluate(() => epochDiscover.list().slice(0, 24).every(c => kidsGentle(c[1], c[3])));
    ok(W + 'the first screen has no grim subjects', first);
    await p.click('#dc-more'); s = await p.evaluate(() => document.querySelectorAll('.dc-card').length); ok(W + 'Show more adds 48', s === 96, s);
    await p.click('.dc-chip[data-k="people"]'); s = await p.evaluate(() => ({ url: location.search, all: epochDiscover.list().every(c => c[0] === 'people'), n: epochDiscover.list().length }));
    ok(W + 'a kind chip filters and is kept in the address', s.all && s.n > 50 && s.url === '?k=people', s);
    await p.selectOption('#dc-era', '0'); s = await p.evaluate(() => ({ url: location.search, all: epochDiscover.list().every(c => c[5] === 0) }));
    ok(W + 'the age select filters too', s.all && /era=0/.test(s.url), s);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
    s = await p.evaluate(() => ({ k: epochDiscover.state.k, era: epochDiscover.state.era, pressed: document.querySelector('.dc-chip[aria-pressed="true"]').getAttribute('data-k') }));
    ok(W + 'the address brings the filters back', s.k === 'people' && s.era === '0' && s.pressed === 'people', s);
    const t0 = await p.evaluate(() => epochDiscover.list()[0][1]);
    await p.click('.dc-card[data-i="0"]'); await p.waitForTimeout(300);
    s = await p.evaluate(() => ({ open: !document.getElementById('dc-ql').hidden, t: document.getElementById('dc-ql-t').textContent, go: document.getElementById('dc-ql-go').getAttribute('href'), page: location.pathname }));
    ok(W + 'a tap opens the quick look, not the page', s.open && s.t === t0 && s.page === '/discover' && /^\/(life|encyclopedia)\//.test(s.go), s);
    await p.click('#dc-ql-next'); s = await p.evaluate(() => document.getElementById('dc-ql-t').textContent); ok(W + 'Next shows the next card', s !== t0, s);
    await p.keyboard.press('Escape'); s = await p.evaluate(() => document.getElementById('dc-ql').hidden); ok(W + 'Esc closes it', s);
    await p.click('.dc-card[data-i="2"]'); await p.waitForTimeout(200); await p.goBack(); await p.waitForTimeout(300);
    s = await p.evaluate(() => ({ hidden: document.getElementById('dc-ql').hidden, page: location.pathname })); ok(W + 'Back closes it and stays on the page', s.hidden && s.page === '/discover', s);
    await p.click('#dc-surprise'); await p.waitForTimeout(200); s = await p.evaluate(() => !document.getElementById('dc-ql').hidden); ok(W + 'Surprise me opens a card', s);
    await p.keyboard.press('Escape');
    ok(W + 'no page errors', errs.length === 0, errs.slice(0, 2));
    await ctx.close();
  }
  const kctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await kctx.addInitScript("try{localStorage.setItem('epoch-kids','1');localStorage.setItem('epoch-consent','no')}catch(e){}");
  const kp = await kctx.newPage(); await kp.goto(base + '/discover', { waitUntil: 'load' }); await kp.waitForTimeout(1500);
  const k = await kp.evaluate(() => ({ n: epochDiscover.list().length, gentle: epochDiscover.list().every(c => kidsGentle(c[1], c[3])) }));
  ok('Kids mode deals only gentle cards', k.gentle && k.n > 500, k);
  await kctx.close(); await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
