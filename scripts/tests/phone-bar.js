// The phone bar (shared-nav.js .tab-bar): Home, Search, Today, Play, Menu at the foot of screens of 600 px and below.
// Not on wide screens, not on the tool pages; Search opens the search, Menu the menu; it steps aside while a field is
// typed in; the cookie question stands above it; the footer's end can still be reached.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8820), b = await edge(), errs = [], base = 'http://localhost:8820';
  const open = async (vp, url, consent) => { const phone = vp.width < 700, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{" + (consent ? '' : "localStorage.setItem('epoch-consent','no');") + "localStorage.setItem('epoch-skin','classic')}catch(e){}"); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(url + ' ' + e)); await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500); return p; };
  const bar = p => p.evaluate(() => { const n = document.querySelector('.tab-bar'), r = n && n.getBoundingClientRect(); return { there: !!n, shown: !!n && getComputedStyle(n).display !== 'none', items: n ? [...n.children].map(c => c.textContent.trim()) : [], bottom: r ? Math.round(innerHeight - r.bottom) : null, h: r ? Math.round(r.height) : 0, cur: n && n.querySelector('[aria-current]') ? n.querySelector('[aria-current]').textContent.trim() : '', wide: document.documentElement.scrollWidth - innerWidth, toTop: (() => { const t = document.querySelector('.to-top'); return !!t && getComputedStyle(t).display !== 'none'; })() }; });
  const PH = { width: 390, height: 800 };
  let p = await open(PH, '/encyclopedia/napoleon'); let s = await bar(p);
  ok('phone, entry: five places at the foot of the screen', s.shown && s.items.join() === 'Home,Search,Today,Play,Menu' && s.bottom === 0 && s.h >= 56 && s.wide <= 0 && !s.toTop, s);
  await p.click('.tab-bar [data-tab="search"]'); await p.waitForTimeout(600);
  const srch = await p.evaluate(() => { const i = document.querySelector('.site-search input, #site-search-input, .ss-input'); return [!!i && i.offsetParent !== null, document.activeElement && document.activeElement.tagName, getComputedStyle(document.querySelector('.tab-bar')).display]; });
  ok('phone: Search opens the search, and the bar steps aside for the keyboard', srch[0] && srch[1] === 'INPUT' && srch[2] === 'none', srch);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(200);
  ok('phone: the bar is back when the field is left', (await bar(p)).shown);
  await p.click('.tab-bar [data-tab="menu"]'); await p.waitForTimeout(500);
  ok('phone: Menu opens the menu', await p.evaluate(() => document.getElementById('nav-hamburger').getAttribute('aria-expanded') === 'true' && document.getElementById('nav-dropdown').offsetParent !== null));
  await p.click('#nav-hamburger'); await p.waitForTimeout(300);
  await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(900); await p.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })); await p.waitForTimeout(400);
  const foot = await p.evaluate(() => { const f = document.getElementById('site-footer') || document.querySelector('footer'), last = f.querySelector('a:last-of-type') || f, all = [...f.querySelectorAll('a, button')].filter(x => x.offsetParent), el = all[all.length - 1] || last, r = el.getBoundingClientRect(), b = document.querySelector('.tab-bar').getBoundingClientRect(); return [Math.round(r.bottom), Math.round(b.top)]; });
  ok('phone: the end of the footer stands above the bar', foot[0] <= foot[1] + 1, foot);
  await p.screenshot({ path: path.join(out, 'phone-bar.png') }); await p.context().close();
  p = await open(PH, '/'); s = await bar(p); ok('phone, home: Home is marked', s.shown && s.cur === 'Home', s.cur); await p.context().close();
  p = await open(PH, '/today-in-history/'); s = await bar(p); ok('phone, Today in History: Today is marked', s.shown && s.cur === 'Today', s.cur); await p.context().close();
  for (const u of ['/games', '/atlas', '/inventions']) { p = await open(PH, u); s = await bar(p); ok('phone, ' + u + ': no bar (a tool with its own controls)', !s.there, s.there); await p.context().close(); }
  p = await open(PH, '/encyclopedia/napoleon', true); await p.waitForTimeout(2500);
  const cb = await p.evaluate(() => { const c = document.querySelector('.consent-bar'), t = document.querySelector('.tab-bar'); return c && getComputedStyle(c).display !== 'none' ? [Math.round(c.getBoundingClientRect().bottom), Math.round(t.getBoundingClientRect().top)] : null; });
  ok('phone: the cookie question stands above the bar', cb && cb[0] <= cb[1], cb); await p.context().close();
  p = await open(PH, '/kids'); s = await bar(p); ok('phone, Kids corner: the bar, nothing too wide', s.shown && s.wide <= 0, s.cur); await p.context().close();
  p = await open({ width: 1366, height: 800 }, '/encyclopedia/napoleon'); s = await bar(p); ok('wide screen: no bar, Back to top as before', !s.shown && s.wide <= 0, s); await p.context().close();
  p = await open({ width: 768, height: 900 }, '/encyclopedia/napoleon'); s = await bar(p); ok('tablet: no bar', !s.shown, s.shown); await p.context().close();
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
