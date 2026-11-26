// The home page's "Continue where you left off" (26 Nov 2026): the next unread stop of the reading path being followed
// comes first, and a reader on a run of days sees it, linked to /today. A first-time reader sees neither.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8874), b = await edge();
  const visit = async (store, width) => {
    const ctx = await b.newContext({ viewport: { width: width || 1366, height: 900 } }), p = await ctx.newPage();
    await ctx.addInitScript(s => { for (const k in s) localStorage.setItem(k, typeof s[k] === 'string' ? s[k] : JSON.stringify(s[k])); localStorage.setItem('epoch-consent', 'no'); }, store);
    await p.goto('http://localhost:8874/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
    const i = await p.evaluate(() => { const s = document.getElementById('home-continue'), c = document.getElementById('home-continue-path'), r = document.getElementById('home-continue-run');
      return { shown: !s.hidden, cards: s.querySelectorAll('.home-continue-card').length, path: c ? [c.getAttribute('href'), c.textContent] : null, first: s.querySelector('.home-continue-card') === c,
        run: r.hidden ? null : r.textContent, runHref: r.getAttribute('href'), banner: !document.getElementById('home-start-banner').hidden, wide: document.documentElement.scrollWidth > innerWidth + 1 }; });
    return { i, p, ctx };
  };
  const day = Math.floor(Date.now() / 864e5);
  const path = { s: 'the-mongol-world', t: 'The Mongol World', i: 0, steps: [['/life/genghis-khan', 'Genghis Khan'], ['/empire/mongol-empire', 'Mongol Empire'], ['/encyclopedia/karakorum', 'Karakorum']] };
  const recent = [{ u: '/empire/roman-empire', n: 'Roman Empire', t: 'Profile' }, { u: '/encyclopedia/cicero', n: 'Cicero', t: 'Entry' }, { u: '/state/kingdom-of-kush', n: 'Kingdom of Kush', t: 'State' }];

  let v = await visit({}); ok('a first visit: no continue block, the banner instead', !v.i.shown && v.i.banner && !v.i.path && !v.i.run, v.i); await v.ctx.close();

  v = await visit({ 'epoch-path': path, 'epoch-seen': ['/life/genghis-khan'], 'epoch-recent': recent, 'epoch-visits': [day - 2, day - 1, day] });
  ok('the path card comes first and names the next unread stop', v.i.shown && v.i.first && v.i.path && v.i.path[0] === '/empire/mongol-empire' && /Next stop: Mongol Empire/.test(v.i.path[1]) && /stop 2 of 3/.test(v.i.path[1]), v.i);
  ok('recent pages follow it, six cards at most', v.i.cards === 4, v.i.cards);
  ok('three days in a row are said, linked to /today', v.i.run && /^3 days in a row/.test(v.i.run) && v.i.runHref === '/today', v.i.run);
  // the click is kept from leaving the page: the stored path is read where it was written
  const kept = await v.p.evaluate(() => { const c = document.getElementById('home-continue-path'); c.addEventListener('click', e => e.preventDefault()); c.click();
    try { return JSON.parse(localStorage.getItem('epoch-path')).i; } catch (e) { return null; } });
  ok('opening the stop moves the path on to it', kept === 1, kept); await v.ctx.close();

  v = await visit({ 'epoch-path': path, 'epoch-seen': [] });
  ok('a path alone shows the block, with its first stop', v.i.shown && v.i.cards === 1 && /First stop: Genghis Khan/.test(v.i.path[1]) && !v.i.banner, v.i); await v.ctx.close();

  v = await visit({ 'epoch-path': path, 'epoch-seen': path.steps.map(s => s[0]), 'epoch-recent': recent });
  ok('a path read to its end leaves no card', v.i.shown && !v.i.path && v.i.cards === 3, v.i); await v.ctx.close();

  v = await visit({ 'epoch-recent': recent, 'epoch-visits': [day - 5, day] });
  ok('a single day is no run', v.i.shown && !v.i.run, v.i.run); await v.ctx.close();

  v = await visit({ 'epoch-recent': recent, 'epoch-visits': [day - 3, day - 2, day - 1] });
  ok('yesterday\'s run counts today in', /^4 days in a row/.test(v.i.run || ''), v.i.run); await v.ctx.close();

  v = await visit({ 'epoch-path': path, 'epoch-seen': ['/life/genghis-khan'], 'epoch-recent': recent, 'epoch-visits': [day - 1, day] }, 390);
  ok('on a phone the block fits the screen', v.i.shown && !v.i.wide && !!v.i.run, v.i); await v.ctx.close();

  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
