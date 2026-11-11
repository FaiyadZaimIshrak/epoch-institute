const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
const clock = d => "Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super('" + d + "'); } };try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-snow','off')}catch(e){}";
(async () => {
  const srv = await serve(8799), b = await edge(), errs = [], base = 'http://localhost:8799';
  async function page(vp, init) { const ctx = await b.newContext({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 }); await ctx.addInitScript(init); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); return p; }
  const st = p => p.evaluate(() => ({ doors: document.querySelectorAll('.adv-door').length, disabled: document.querySelectorAll('.adv-door:disabled').length, open: document.querySelectorAll('.adv-door.is-open').length, today: (document.querySelector('.adv-door.is-today .adv-big, .adv-door.is-today .adv-num') || {}).textContent || null, n: document.getElementById('adv-n').textContent, note: document.getElementById('adv-note').textContent, wide: document.documentElement.scrollWidth - innerWidth }));
  // 5 December: doors 1-5 ready, the rest wait
  let p = await page({ width: 1280, height: 950 }, clock('2026-12-05T10:00:00Z'));
  await p.goto(base + '/advent'); await p.waitForTimeout(700); let s = await st(p);
  ok('5 December: 24 doors, 19 waiting, today is 5', s.doors === 24 && s.disabled === 19 && s.today === '5' && s.open === 0, s);
  await p.click('.adv-grid li:nth-child(3) .adv-door'); await p.waitForTimeout(300); s = await st(p);
  ok('opening door 3 shows its line', s.open === 1 && s.n === '1 of 24 opened' && await p.isVisible('#adv-detail') && (await p.textContent('.adv-d-title')) === 'Dongzhi', s.n);
  await p.click('.adv-grid li:nth-child(5) .adv-door'); await p.waitForTimeout(300);
  ok('a waiting door cannot be opened', await p.isDisabled('.adv-grid li:nth-child(6) .adv-door'));
  const href = await p.getAttribute('#adv-detail a', 'href'); ok('the detail links the page', href === '/encyclopedia/sinterklaas', href);
  await p.screenshot({ path: path.join(out, 'advent-dec5.png') });
  await p.reload(); await p.waitForTimeout(600); s = await st(p); ok('opened doors are kept', s.open === 2, s.n);
  await p.goto(base + '/advent', { waitUntil: 'load' }); await p.context().close();
  // 30 December and 3 January: every door; a new year starts empty; 7 January and November: out of season, all openable
  for (const [d, dis, want] of [['2026-12-30T10:00:00Z', 0, 'Every door'], ['2027-01-03T10:00:00Z', 0, 'Every door'], ['2026-11-15T10:00:00Z', 0, 'Out of season'], ['2026-12-01T00:10:00Z', 23, 'the first door']]) {
    p = await page({ width: 1280, height: 950 }, clock(d)); await p.goto(base + '/advent'); await p.waitForTimeout(600); s = await st(p);
    ok(d + ': ' + dis + ' waiting', s.disabled === dis && s.note.includes(want), [s.disabled, s.note]); await p.context().close();
  }
  // phone, every door opened, Kids mode
  p = await page({ width: 390, height: 800 }, clock('2026-12-24T10:00:00Z') + "localStorage.setItem('epoch-kids','1')");
  await p.goto(base + '/advent'); await p.waitForTimeout(700);
  for (let i = 1; i <= 24; i++) await p.click('.adv-grid li:nth-child(' + i + ') .adv-door');
  await p.waitForTimeout(600); s = await st(p); ok('phone: all 24 open, no sideways scroll', s.open === 24 && s.wide <= 0 && s.n === '24 of 24 opened', s);
  const broken = await p.evaluate(() => [...document.querySelectorAll('.adv-door img')].filter(i => i.complete && !i.naturalWidth).length); ok('no broken pictures', broken === 0, broken);
  await p.evaluate(() => scrollTo({ top: 250, behavior: 'instant' })); await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, 'advent-phone-kids.png') }); await p.context().close();
  p = await page({ width: 1280, height: 950 }, clock('2026-12-24T10:00:00Z') + "localStorage.setItem('epoch-theme','dark')");
  await p.goto(base + '/advent'); await p.waitForTimeout(700); for (let i = 1; i <= 24; i++) await p.click('.adv-grid li:nth-child(' + i + ') .adv-door');
  await p.evaluate(() => scrollTo({ top: 330, behavior: 'instant' })); await p.waitForTimeout(500); await p.screenshot({ path: path.join(out, 'advent-all-winter-dark.png') }); await p.context().close();
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
