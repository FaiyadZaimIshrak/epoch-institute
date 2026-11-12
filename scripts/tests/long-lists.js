// Long lists cut to a first screenful (Nov 2026): /profiles' ages and /songs/' ages show twelve until "Show all";
// a search or filter shows every match; /kids' themes show four cards, a theme named in the address all; a country's
// long timeline is cut until asked for; the hub's cards stand two to a row on phones.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8819), b = await edge(), errs = [], base = 'http://localhost:8819';
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ', ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    const screens = () => p.evaluate(() => +(document.documentElement.scrollHeight / innerHeight).toFixed(1));
    // profiles
    await p.goto(base + '/profiles'); await p.waitForTimeout(1500);
    let r = await p.evaluate(() => [...document.querySelectorAll('.profile-era-group')].map(g => [g.querySelectorAll('.empire-thumb').length, +(g.querySelector('.profile-era-n') || {}).textContent, !!g.querySelector('[data-more]')]));
    const s0 = await screens();
    ok(W + '/profiles: every age shows twelve of its profiles and a button', r.length >= 4 && r.every(g => g[1] <= 15 ? g[0] === g[1] && !g[2] : g[0] === 12 && g[2]) && s0 < (phone ? 30 : 12), [r, s0]);
    await p.click('[data-more]'); await p.waitForTimeout(300);
    const r2 = await p.evaluate(() => { const g = document.querySelector('.profile-era-group'); return [g.querySelectorAll('.empire-thumb').length, +g.querySelector('.profile-era-n').textContent, !!g.querySelector('[data-more]'), document.activeElement.className]; });
    ok(W + '/profiles: Show all gives the whole age and moves the focus to the first new card', r2[0] === r2[1] && !r2[2] && /empire-thumb/.test(r2[3]), r2);
    await p.fill('#profile-search', 'kingdom'); await p.waitForTimeout(400);
    const r3 = await p.evaluate(() => [document.querySelectorAll('.empire-thumb').length, document.querySelectorAll('[data-more]').length, document.getElementById('profile-count').textContent]);
    ok(W + '/profiles: a search shows every match', r3[0] > 30 && r3[1] === 0 && r3[2].indexOf(r3[0] + ' of') === 0, r3);
    await p.goto(base + '/profiles?kind=religion'); await p.waitForTimeout(1200);
    ok(W + '/profiles: a kind from the address is shown whole', await p.evaluate(() => document.querySelectorAll('[data-more]').length === 0 && document.querySelectorAll('.empire-thumb').length >= 30));
    // songs
    await p.goto(base + '/songs/'); await p.waitForTimeout(1500);
    r = await p.evaluate(() => ({ eras: [...document.querySelectorAll('.sg-era')].map(s => [s.querySelectorAll('.sg-card:not([hidden])').length, s.querySelectorAll('.sg-card').length, !!s.querySelector('.profile-more:not([hidden])')]), count: document.getElementById('sg-count').textContent }));
    ok(W + '/songs/: every age shows twelve songs and a button, the count is the whole list', r.eras.every(e => e[1] <= 15 ? e[0] === e[1] : e[0] === 12 && e[2]) && /^\d+ songs$/.test(r.count), r);
    await p.click('.sg-era .profile-more'); await p.waitForTimeout(300);
    ok(W + '/songs/: Show all gives the whole age', await p.evaluate(() => { const s = document.querySelector('.sg-era'); return s.querySelectorAll('.sg-card:not([hidden])').length === s.querySelectorAll('.sg-card').length && s.querySelector('.profile-more-row').hidden; }));
    await p.fill('#sg-q', 'hymn'); await p.waitForTimeout(500);
    const sq = await p.evaluate(() => [epochSongs.shown().length, [...document.querySelectorAll('.profile-more-row')].filter(x => !x.hidden).length, document.getElementById('sg-count').textContent]);
    ok(W + '/songs/: a search shows every match', sq[0] > 12 && sq[1] === 0 && sq[2].indexOf('Showing ' + sq[0] + ' of') === 0, sq);
    // kids
    await p.goto(base + '/kids'); await p.waitForTimeout(1500);
    r = await p.evaluate(() => [...document.querySelectorAll('.kd-sec')].filter(s => s.querySelector('.kd-cards')).map(s => [[...s.querySelectorAll('.kd-cards > li')].filter(li => li.offsetParent).length, s.querySelectorAll('.kd-cards > li').length]));
    ok(W + '/kids: every theme shows four cards', r.length >= 20 && r.every(t => t[1] < 7 ? t[0] === t[1] : t[0] === 4), r.slice(0, 6));
    await p.click('.kd-sec .profile-more'); await p.waitForTimeout(300);
    ok(W + '/kids: Show all opens the theme', await p.evaluate(() => { const s = [...document.querySelectorAll('.kd-sec')].find(x => x.querySelector('.kd-cards')); return [...s.querySelectorAll('.kd-cards > li')].every(li => li.offsetParent) && !s.querySelector('.profile-more'); }));
    const tid = await p.evaluate(() => [...document.querySelectorAll('.kd-sec')].filter(s => s.querySelector('.kd-cards') && s.querySelectorAll('.kd-cards > li').length >= 7)[2].id);
    await p.goto(base + '/kids#' + tid); await p.reload(); await p.waitForTimeout(1200);
    ok(W + '/kids: a theme named in the address is whole', await p.evaluate(id => { const s = document.getElementById(id); return [...s.querySelectorAll('.kd-cards > li')].every(li => li.offsetParent); }, tid), tid);
    // a country's timeline
    await p.goto(base + '/countries/france'); await p.waitForTimeout(1500);
    r = await p.evaluate(() => { const s = document.querySelector('.fold-long'); return s ? [+(s.getBoundingClientRect().height / innerHeight).toFixed(1), !!s.nextElementSibling.querySelector('.profile-more'), s.nextElementSibling.textContent] : null; }); const fr0 = await screens();
    ok(W + 'France: the timeline is cut to a screen and a half', r && r[0] <= 1.6 && r[1] && /whole timeline \(\d+ states\)/.test(r[2]), [r, fr0]);
    await p.click('.fold-long + .profile-more-row button'); await p.waitForTimeout(300); const fr1 = await screens();
    ok(W + 'France: Show the whole timeline opens it', fr1 > fr0 + 3 && await p.evaluate(() => !document.querySelector('.fold-long') && !document.querySelector('.cty-page .profile-more')), [fr0, fr1]);
    await p.goto(base + '/countries/iceland'); await p.waitForTimeout(1000); ok(W + 'a short country history is not cut', await p.evaluate(() => !!document.querySelector('.cty-page') && !document.querySelector('.fold-long')));
    // the hub
    await p.goto(base + '/research'); await p.waitForTimeout(1200);
    r = await p.evaluate(() => { const c = [...document.querySelectorAll('.hub-group .hub-card')].slice(0, 2).map(x => Math.round(x.getBoundingClientRect().top)); return [c[0] === c[1], document.documentElement.scrollWidth - innerWidth]; });
    ok(W + 'the hub: cards side by side, nothing too wide', r[0] && r[1] <= 0, r);
    if (phone) await p.screenshot({ path: path.join(out, 'lists-research.png') });
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
