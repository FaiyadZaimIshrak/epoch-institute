// "Was this page useful?" (shared-nav.js .page-useful): two buttons at the foot of entries, profiles and state pages.
// An answer is posted to /send.php as kind "feedback" with the page, kept in epoch-useful, and not asked again; "No"
// offers the correction form; never in Kids mode, on other kinds of page, or twice.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js');
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8826), b = await edge(), errs = [], base = 'http://localhost:8826', posts = [];
  const open = async (url, kids, vp) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 900 } });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');" + (kids ? "localStorage.setItem('epoch-kids','1');" : '') + "}catch(e){}");
    await ctx.route('**/send.php', r => { posts.push(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(url + ' ' + e)); await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); return p;
  };
  const state = p => p.evaluate(() => { const n = document.querySelector('.page-useful'), nr = document.querySelector('.next-read'), pn = document.querySelector('.ref-prevnext'); return { there: !!n, shown: !!n && getComputedStyle(n).display !== 'none', text: n ? n.textContent.trim() : '', buttons: n ? n.querySelectorAll('button').length : 0, beforeNext: !!(n && nr && (n.compareDocumentPosition(nr) & 4)), beforePrev: !!(n && pn && (n.compareDocumentPosition(pn) & 4)), link: n && n.querySelector('a') ? n.querySelector('a').getAttribute('href') : '', wide: document.documentElement.scrollWidth - innerWidth }; });

  let p = await open('/encyclopedia/battle-of-hastings'), s = await state(p);
  ok('an entry asks at its foot, above Next to read', s.there && s.shown && s.buttons === 2 && /^Was this page useful\?/.test(s.text) && (s.beforeNext || s.beforePrev), s);
  await p.click('.page-useful button[data-u="yes"]'); await p.waitForTimeout(400); s = await state(p);
  const kept = await p.evaluate(() => localStorage.getItem('epoch-useful'));
  ok('Yes is posted with the page, thanked and kept', posts.length === 1 && posts[0] === 'kind=feedback&useful=yes&page=%2Fencyclopedia%2Fbattle-of-hastings' && s.text === 'Thank you.' && s.buttons === 0 && kept === '{"/encyclopedia/battle-of-hastings":"y"}', [posts, s.text, kept]);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500); s = await state(p);
  ok('a page answered is not asked again', !s.there, s); await p.context().close();

  p = await open('/empire/roman-empire', false, { width: 390, height: 800 }); s = await state(p);
  ok('a profile asks, and fits a phone', s.there && s.shown && s.wide <= 0, s);
  await p.click('.page-useful button[data-u="no"]'); await p.waitForTimeout(400); s = await state(p);
  ok('No is posted and offers the correction form', posts.length === 2 && /useful=no&page=%2Fempire%2Froman-empire$/.test(posts[1]) && s.link === '/contact?topic=correction&page=%2Fempire%2Froman-empire', [posts[1], s]); await p.context().close();

  p = await open('/state/abadzekhs'); s = await state(p); const st = s.there; await p.context().close();
  p = await open('/encyclopedia/'); const idx = (await state(p)).there; await p.context().close();
  p = await open('/centuries/14th-century'); const cen = (await state(p)).there; await p.context().close();
  p = await open('/encyclopedia/dynasties'); const hub = (await state(p)).there; await p.context().close();
  ok('state pages ask; indexes, hubs and other kinds of page do not', st && !idx && !cen && !hub, [st, idx, cen, hub]);
  p = await open('/encyclopedia/zuo-zhuan', true); s = await state(p);
  ok('never shown in Kids mode', !s.shown, s); await p.context().close();
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
