// Today at the Institute (/today): the day's event, births and song from the day file; the quiz and the eight daily
// games with this browser's results; the run of days; History Now's lists (a stand-in news.json); Kids mode without
// headlines; the phone bar marks Today.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8821), b = await edge(), errs = [], base = 'http://localhost:8821';
  const Q = Math.floor(Date.now() / 864e5), d = new Date(Q * 864e5), key = ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
  const DAY = fs.existsSync(path.join(R, 'data', 'days', key + '.json')) ? JSON.parse(fs.readFileSync(path.join(R, 'data', 'days', key + '.json'), 'utf8')) : null;
  const NEWS = { t: new Date().toISOString().slice(0, 16) + 'Z', items: [0, 1, 2, 3].map(i => ['A test headline number ' + (i + 1) + ' about the Roman Empire and more', 'https://example.org/s' + i, 'Test Source', new Date().toISOString().slice(0, 10), '/empire/roman-empire', 'Roman Empire']) };
  const seed = { ['daily-' + Q]: { m: '1011011101' }, ['conn-' + (Q - Math.floor(Date.UTC(2026, 9, 26) / 864e5) + 1)]: { s: [1, 2], m: 1 } };
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ';
    const open = async (url, kids, played) => {
      const ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
      await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');" + (kids ? "localStorage.setItem('epoch-kids','1');" : '') + (played ? "localStorage.setItem('epoch-games'," + JSON.stringify(JSON.stringify(seed)) + ");localStorage.setItem('epoch-visits','" + JSON.stringify([Q - 5, Q - 2, Q - 1, Q]) + "');localStorage.setItem('epoch-quiz','" + JSON.stringify({ day: Q, done: true, won: true, guesses: ['x'] }) + "');" : '') + '}catch(e){}');
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
      await p.route('**/feeds/news.json', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEWS) }));
      await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); return p;
    };
    const st = p => p.evaluate(() => ({ date: document.getElementById('td-date').textContent, hero: (document.querySelector('.td-hero-t') || {}).textContent || '', evs: document.querySelectorAll('.td-evs li').length, games: [...document.querySelectorAll('.td-game')].map(a => [a.querySelector('.td-game-n').textContent, a.querySelector('.td-game-s').textContent, a.classList.contains('is-done'), a.getAttribute('href')]), done: document.getElementById('td-done').textContent, run: document.getElementById('td-run').textContent, song: (document.querySelector('.td-songc .td-hero-t') || {}).textContent || '', born: document.querySelectorAll('.td-born li').length, news: [...document.querySelectorAll('[data-now="news"] .now-it')].length, newsShown: document.querySelector('.now-sec-news').offsetParent !== null, ann: document.querySelectorAll('[data-now="ann"] .now-it').length, wide: document.documentElement.scrollWidth - innerWidth, toc: !!document.querySelector('.page-toc.is-on'), cur: (() => { const c = document.querySelector('.tab-bar [aria-current]'); return c ? c.textContent.trim() : ''; })() }));
    let p = await open('/today'); let s = await st(p);
    ok(W + 'the date, the day’s event and three more', /\d{4}$/.test(s.date) && (!DAY || (s.hero.length > 5 && s.evs === Math.min(3, DAY.events.length - 1))) && s.wide <= 0, [s.date, s.hero, s.evs]);
    ok(W + 'the quiz and eight games, none played: each says Play', s.games.length === 9 && s.games.every(g => /^Play/.test(g[1]) && !g[2] && /^\/(quiz|games#)/.test(g[3])) && s.done === '0 of 9 done today', s.done);
    ok(W + 'the song of the day and the people born', (!DAY || !DAY.song || s.song === DAY.song[1]) && (!DAY || !DAY.born || s.born === Math.min(4, DAY.born.length)), [s.song, s.born]);
    ok(W + 'three headlines and the coming anniversaries', s.news === 3 && s.newsShown && s.ann >= 1 && s.ann <= 4, [s.news, s.ann]);
    await p.screenshot({ path: path.join(out, 'today-' + vp.width + '.png'), fullPage: true }); await p.context().close();
    p = await open('/today', false, true); s = await st(p);
    const g = Object.fromEntries(s.games.map(x => [x[0], x]));
    ok(W + 'with results: the quiz solved, the Daily Ten 7/10, Connections in progress, two done', g['Daily Quiz'][1] === 'Solved' && g['Daily Quiz'][2] && g['Daily Ten'][1] === '7/10' && g['Daily Ten'][2] && g['Connections'][1] === 'In progress' && !g['Connections'][2] && s.done === '2 of 9 done today', [g['Daily Quiz'], g['Daily Ten'], g['Connections'], s.done]);
    ok(W + 'the run of days: three in a row', /^3 days in a row/.test(s.run), s.run);
    if (phone) ok(W + 'the phone bar marks Today', s.cur === 'Today', s.cur);
    await p.context().close();
    p = await open('/today', true); s = await st(p);
    ok(W + 'Kids mode: no headlines, the rest there', !s.newsShown && s.games.length === 9 && s.wide <= 0, [s.newsShown, s.hero]); await p.context().close();
    p = await open('/today?day=01-01'); s = await st(p); ok(W + '?day= shows another day’s events', s.hero.length > 5, s.hero); await p.context().close();
    // Come back tomorrow: the newsletter line for a reader not signed up; from the second day a home-screen prompt
    const keep = p => p.evaluate(() => { const k = document.getElementById('td-keep'), i = document.getElementById('td-install'); return { shown: !k.hidden, form: !!k.querySelector('form[data-nl="today"]'), inst: !i.hidden, btn: !!i.querySelector('button'), wide: document.documentElement.scrollWidth - innerWidth }; });
    p = await open('/today'); let k = await keep(p); await p.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt'))); const k0 = await keep(p);
    ok(W + 'a first visit: the newsletter line, no home-screen prompt', k.shown && k.form && !k.inst && !k0.inst && k.wide <= 0, [k, k0]); await p.context().close();
    p = await open('/today', false, true); await p.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt'))); k = await keep(p);
    ok(W + 'a returning reader is offered the home screen when the browser allows it', k.shown && k.inst && k.btn && k.wide <= 0, k); await p.context().close();
    p = await open('/today', true, true); await p.evaluate(() => window.dispatchEvent(new Event('beforeinstallprompt'))); k = await keep(p);
    ok(W + 'Kids mode: neither', !k.shown && !k.form && !k.inst, k); await p.context().close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
