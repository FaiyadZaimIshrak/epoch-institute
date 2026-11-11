// the looks, end to end: the head snippet (stored and seasonal), the panel, snow, canvases, Kids mode, phone
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x) : '')); if (!c) fails++; };
const clock = d => "Date = class extends Date { constructor(...a) { if (a.length) super(...a); else super('" + d + "'); } };";
(async () => {
  const srv = await serve(8791), b = await edge(); const base = 'http://localhost:8791';
  const errs = [];
  async function page(opts, init) {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1280, height: 900 } }, opts || {}));
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); return p;
  }
  const get = p => p.evaluate(() => ({ skin: document.documentElement.getAttribute('data-skin'), th: document.documentElement.getAttribute('data-theme'),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(), body: getComputedStyle(document.body).backgroundColor,
    meta: (document.querySelector('meta[name="theme-color"]') || {}).content, snow: !!document.querySelector('.snow-canvas') }));
  // 1 no choice, outside the season: classic
  let p = await page({}, clock('2026-11-15T12:00:00Z') + "localStorage.setItem('epoch-theme','dark')");
  await p.goto(base + '/encyclopedia/battle-of-hastings'); await p.waitForTimeout(600);
  let s = await get(p); ok('November, nothing stored: classic', s.skin === null && s.bg === '#0b0c10' && !s.snow, s);
  await p.click('#theme-toggle'); ok('panel opens', await p.isVisible('#look-menu'));
  await p.screenshot({ path: path.join(out, 'panel-classic.png') });
  for (const k of ['winter', 'illuminated', 'marble', 'contrast']) {
    await p.click('.look-opt[data-skin="' + k + '"]'); await p.waitForTimeout(250); s = await get(p);
    ok('choose ' + k, s.skin === k && s.bg !== '#0b0c10' && s.meta === s.bg && (k === 'winter') === s.snow, s);
    await p.screenshot({ path: path.join(out, 'entry-' + k + '-dark.png') });
    await p.click('[data-th="light"]'); await p.waitForTimeout(250); s = await get(p);
    ok(k + ' light', s.th === 'light' && s.meta === s.bg, s);
    await p.screenshot({ path: path.join(out, 'entry-' + k + '-light.png') });
    await p.click('[data-th="dark"]');
  }
  await p.click('.look-opt[data-skin="winter"]'); await p.waitForTimeout(200);
  await p.uncheck('#look-snow'); await p.waitForTimeout(100); ok('snow off', !(await get(p)).snow);
  await p.check('#look-snow'); await p.waitForTimeout(100); ok('snow on again', (await get(p)).snow);
  await p.keyboard.press('Escape'); ok('Escape closes', !(await p.isVisible('#look-menu')));
  // the stored look applies before the first paint on the next page (the head snippet)
  await p.goto(base + '/empire/roman-empire', { waitUntil: 'commit' });
  const early = await p.evaluate(() => document.documentElement.getAttribute('data-skin')); ok('snippet sets the stored look at once', early === 'winter', early);
  await p.waitForTimeout(700); await p.screenshot({ path: path.join(out, 'profile-winter-dark.png') });
  await p.click('#theme-toggle'); await p.click('.look-opt[data-skin="classic"]'); s = await get(p); ok('classic again', s.skin === null && s.bg === '#0b0c10', s);
  await p.click('.look-opt[data-skin=""]'); ok('seasonal stores nothing', await p.evaluate(() => localStorage.getItem('epoch-skin')) === null);
  await p.context().close();
  // 2 the season: 1 Dec to 6 Jan, UTC
  for (const [d, want] of [['2026-11-30T23:00:00Z', null], ['2026-12-01T00:30:00Z', 'winter'], ['2026-12-25T12:00:00Z', 'winter'], ['2027-01-06T23:00:00Z', 'winter'], ['2027-01-07T00:30:00Z', null]]) {
    p = await page({}, clock(d));
    await p.goto(base + '/', { waitUntil: 'commit' }); const e = await p.evaluate(() => document.documentElement.getAttribute('data-skin'));
    await p.waitForTimeout(500); s = await get(p); ok('season ' + d, e === want && s.skin === want && s.snow === (want === 'winter'), [e, s.skin, s.snow]);
    if (d.startsWith('2026-12-25')) {
      await p.waitForTimeout(2500); await p.screenshot({ path: path.join(out, 'home-winter-dark.png') });
      await p.click('#theme-toggle'); await p.click('[data-th="light"]'); await p.keyboard.press('Escape'); await p.waitForTimeout(1200); await p.screenshot({ path: path.join(out, 'home-winter-light.png') });
      await p.click('#theme-toggle'); await p.click('.look-opt[data-skin="classic"]'); s = await get(p); ok('Classic chosen in December stays classic', s.skin === null && !s.snow, s);
    }
    await p.context().close();
  }
  // 3 reduced motion: winter without snow; Kids mode keeps its own colours
  p = await page({ reducedMotion: 'reduce' }, "localStorage.setItem('epoch-skin','winter')");
  await p.goto(base + '/songs/'); await p.waitForTimeout(500); s = await get(p); ok('reduced motion: no snow', s.skin === 'winter' && !s.snow, s); await p.context().close();
  p = await page({}, "localStorage.setItem('epoch-skin','illuminated'); localStorage.setItem('epoch-kids','1'); localStorage.setItem('epoch-theme','dark')");
  await p.goto(base + '/encyclopedia/battle-of-hastings'); await p.waitForTimeout(500); s = await get(p); ok('Kids mode keeps its colours', s.bg === '#17123a', s);
  await p.click('#theme-toggle'); ok('Kids note shown', await p.isVisible('#look-kids')); await p.context().close();
  // 4 canvases repaint: the atlas globe follows the look
  p = await page({}, "localStorage.setItem('epoch-theme','dark')");
  await p.goto(base + '/atlas'); await p.waitForTimeout(2500); await p.evaluate(() => window.epochLook.set('marble')); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(out, 'atlas-marble-dark.png') }); await p.context().close();
  // 5 phone: the Display row has Look, which opens the panel
  p = await page({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }, "localStorage.setItem('epoch-skin','winter')");
  await p.goto(base + '/encyclopedia/battle-of-hastings'); await p.waitForTimeout(500);
  await p.click('#nav-hamburger'); await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, 'phone-menu.png') });
  const rowW = await p.evaluate(() => { const r = document.querySelector('.nav-dd-display'); return [r.scrollWidth, r.clientWidth, [...r.children].map(c => Math.round(c.getBoundingClientRect().height))]; });
  ok('phone Display row fits', rowW[0] <= rowW[1], rowW);
  await p.click('#nav-dd-look'); await p.waitForTimeout(300); ok('phone: Look opens the panel', await p.isVisible('#look-menu'));
  const box = await p.evaluate(() => { const r = document.getElementById('look-menu').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), innerWidth, innerHeight]; });
  ok('phone: panel on screen', box[0] >= 0 && box[1] <= box[4] && box[3] <= box[5], box);
  await p.screenshot({ path: path.join(out, 'phone-panel.png') }); await p.context().close();
  ok('no script errors', errs.length === 0, errs.slice(0, 5));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
