// The atlas's "What was here?" also lists the people of the encyclopedia born within 250 km (data/born-near.json):
// at Paris a list of chips linking entries that exist; in mid-ocean none; the states list is there as before.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const B = JSON.parse(fs.readFileSync(path.join(R, 'data', 'born-near.json'), 'utf8'));
  ok('data: ' + B.length + ' people with a point, each an entry', B.length > 2000 && B.every(p => p[0] && p[1] && Math.abs(p[3]) <= 90 && Math.abs(p[4]) <= 180) && B.slice(0, 200).every(p => fs.existsSync(path.join(R, 'encyclopedia', p[0]))));
  const srv = await serve(8823), b = await edge(), errs = [], base = 'http://localhost:8823';
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ', ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    const st = () => p.evaluate(() => { const b = document.getElementById('atl-here-born'); return { states: document.querySelectorAll('#atl-here-list li').length, note: b ? (b.querySelector('.atl-here-note') || {}).textContent || '' : null, chips: b ? [...b.querySelectorAll('a')].map(a => a.getAttribute('href')) : [], wide: document.documentElement.scrollWidth - innerWidth }; });
    await p.goto(base + '/atlas?at=48.85,2.35', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
    let s = await st();
    ok(W + 'Paris: the states as before, and the people born within 250 km', s.states > 5 && /^Born within 250 km of this place \(\d+ people/.test(s.note) && s.chips.length >= 10 && s.chips.every(h => fs.existsSync(path.join(R, decodeURIComponent(h).slice(1)))) && s.wide <= 0, [s.states, s.note, s.chips.slice(0, 3)]);
    if (!phone) { await p.evaluate(() => document.getElementById('atl-here-born').scrollIntoView()); await p.screenshot({ path: path.join(out, 'atlas-born.png') }); }
    await p.goto(base + '/atlas?at=-45,-130', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4000); s = await st();
    ok(W + 'mid-ocean: nobody', s.chips.length === 0 && !s.note, s.note);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
