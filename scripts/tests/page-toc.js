// On this page (shared-nav.js): the row of a long page's sections under the header. Away at the top, there once the
// reader is past the first section, the section in view marked, a tap jumps; none on short pages, the home page or
// where a profile's side list shows; nothing on the page moves when it appears.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8816), b = await edge(), errs = [], base = 'http://localhost:8816';
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ';
    const open = async (url, kids) => {
      const ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
      await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');" + (kids ? "localStorage.setItem('epoch-kids','1');" : '') + "}catch(e){} window.__cls=0; try{new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)window.__cls+=e.value})}).observe({type:'layout-shift',buffered:true})}catch(e){}");
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(url + ' ' + e)); await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500); return p;
    };
    const st = p => p.evaluate(() => { const n = document.querySelector('.page-toc'), s = window.epochPageToc ? epochPageToc.state() : null; return { nav: !!n && !n.hidden, on: !!n && n.classList.contains('is-on'), vis: n ? getComputedStyle(n).visibility : '', links: n ? n.querySelectorAll('a').length : 0, cur: n && n.querySelector('[aria-current]') ? n.querySelector('[aria-current]').textContent : '', top: n ? Math.round(n.getBoundingClientRect().top) : null, navBottom: Math.round(document.getElementById('site-nav').getBoundingClientRect().bottom), heads: s ? s.heads.length : 0, wide: document.documentElement.scrollWidth - innerWidth, cls: +window.__cls.toFixed(4) }; });
    // a long entry
    let p = await open('/encyclopedia/napoleon'); let s = await st(p);
    ok(W + 'entry: nothing shown at the top of the page', !s.on && s.vis !== 'visible', s);
    const cls0 = s.cls;
    await p.evaluate(() => { const h = document.querySelectorAll('main h2')[1]; window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 150); }); await p.waitForTimeout(600); s = await st(p);
    ok(W + 'entry: past the first section the row is there, under the header, the section marked', s.on && s.vis === 'visible' && s.links >= 5 && s.top === s.navBottom && !!s.cur && s.wide <= 0, s);
    ok(W + 'entry: nothing moved when it appeared', s.cls - cls0 < 0.005, [cls0, s.cls]);
    await p.screenshot({ path: path.join(out, 'toc-' + vp.width + '-entry.png') });
    const target = await p.evaluate(() => { const a = document.querySelectorAll('.page-toc a:not([data-top])')[2]; a.click(); return a.getAttribute('href').slice(1); }); await p.waitForTimeout(2500);
    const at = await p.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(), n = document.querySelector('.page-toc').getBoundingClientRect(); return [Math.round(r.top), Math.round(n.bottom), document.querySelector('.page-toc [aria-current]').getAttribute('href').slice(1)]; }, target);
    ok(W + 'entry: a tap goes to the section, clear of the row, and marks it', at[0] >= at[1] && at[0] < 400 && at[2] === target, at);
    await p.click('.page-toc a[data-top]'); await p.waitForTimeout(1200); s = await st(p); ok(W + 'entry: Top goes back and the row leaves', !s.on && (await p.evaluate(() => scrollY)) < 5, s);
    await p.context().close();
    // a profile: the side list on wide screens, the row elsewhere
    p = await open('/empire/roman-empire'); await p.evaluate(() => window.scrollTo(0, 2500)); await p.waitForTimeout(600); s = await st(p);
    ok(W + (vp.width >= 1300 ? 'profile: the side list, no row' : 'profile: the row on a phone'), vp.width >= 1300 ? !s.on && s.heads === 0 : s.on && s.links >= 6 && s.wide <= 0, s);
    if (phone) await p.screenshot({ path: path.join(out, 'toc-' + vp.width + '-profile.png') });
    await p.context().close();
    // a country history, a short state page, the home page
    p = await open('/countries/france'); await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(600); s = await st(p); ok(W + 'country history: the row', s.on && s.links >= 5 && s.wide <= 0, s); await p.context().close();
    p = await open('/'); await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(600); s = await st(p); ok(W + 'home page: none', !s.nav && !s.on, s); await p.context().close();
    p = await open('/games'); await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(500); s = await st(p); ok(W + 'games: none', !s.on, s); await p.context().close();
    // Kids mode: the folded story's sections join when it is opened
    p = await open('/empire/roman-empire', true); await p.evaluate(() => window.scrollTo(0, 1500)); await p.waitForTimeout(600); const k0 = await st(p);
    const opened = await p.evaluate(() => { const bt = document.querySelector('.kd-story button, button.kd-story, .kd-story'); if (bt) bt.click(); return !!bt; }); await p.waitForTimeout(700); await p.evaluate(() => window.scrollTo(0, 3000)); await p.waitForTimeout(600); const k1 = await st(p);
    ok(W + 'Kids mode: no errors, and the row follows the opened story', k1.wide <= 0 && (!opened || k1.heads >= k0.heads), [opened, k0.heads, k1.heads, k1.on]); await p.context().close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
