// History Now (/now and the home page's Now card): the headlines (a stand-in /feeds/news.json), the coming anniversaries,
// what is new; the card keeps its height whatever it holds; without headlines, with a stale file and in Kids mode it
// opens on the anniversaries and shows no headline.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const D = JSON.parse(fs.readFileSync(path.join(R, 'data', 'now.json'), 'utf8')), DAY = D.a[Math.min(20, D.a.length - 1)][0];   // a day inside the data
  const until = new Date(Date.parse(DAY) + 30 * 864e5).toISOString().slice(0, 10), due = D.a.filter(a => a[0] >= DAY && a[0] <= until);
  ok('data: anniversaries in date order, each on a page that exists, six notes', D.a.length > 50 && D.a.every((a, i) => (!i || D.a[i - 1][0] <= a[0]) && a[1] >= 20 && fs.existsSync(path.join(R, a[4].slice(1))) && /^[ebd]$/.test(a[5])) && D.n.length === 6 && D.n.every(n => n[2][0] === '/'), [D.a.length, due.length]);
  const NEWS = { t: DAY + 'T06:00Z', items: [] }, back = n => new Date(Date.parse(DAY) - n * 864e5).toISOString().slice(0, 10);   // the test's "today" is DAY (?nowday=)
  const bgs = [['/culture/maya-civilisation', 'Maya civilisation'], ['/empire/roman-empire', 'Roman Empire'], ['/encyclopedia/egypt', 'Egypt'], ['/culture/scythians', 'Scythians'], ['/encyclopedia/france', 'France'], ['/encyclopedia/iron-age', 'Iron Age'], ['/encyclopedia/pompeii', 'Pompeii'], ['/encyclopedia/italy', 'Italy']];
  bgs.forEach((b, i) => NEWS.items.push(['A test headline about ' + b[1] + ' that is long enough to run over two lines on a narrow screen, number ' + (i + 1) + ' <b>&', 'https://example.org/story-' + i, 'Test Source', back(i), b[0], b[1]]));
  // pictures: a publisher's thumbnail that loads, one that does not (falls back to the entry's own), a forged outside
  // address (never asked for: the entry's own instead), a profile's emblem, and none
  const T = s => '/images/encyclopedia/thumbs/' + s + '.jpg', PIC = { 1: ['/logos/thumbs/Roman%20Empire.png', 0, '/logos/thumbs/Roman%20Empire.png'], 2: ['/feeds/n-missing.jpg', 1, T('egypt')], 4: ['https://evil.example/x.jpg', 1, T('france')], 7: ['/feeds/n-ok.jpg', 1, T('italy')] };
  NEWS.items.forEach((it, i) => { const q = PIC[i] || ['', 0, '']; it.push(q[0], q[1], q[2]); });
  NEWS.items.push(['A headline with a bad link', 'javascript:alert(1)', 'Test Source', NEWS.items[0][3], '/encyclopedia/egypt', 'Egypt']);
  const srv = await serve(8812), b = await edge(), errs = [], base = 'http://localhost:8812';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ';
    const open = async (url, news, kids) => {
      const ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
      await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');" + (kids ? "localStorage.setItem('epoch-kids','1');" : '') + '}catch(e){}');
      const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
      await p.route('**/feeds/n-ok.jpg', r => r.fulfill({ status: 200, contentType: 'image/jpeg', body: fs.readFileSync(path.join(R, 'images/encyclopedia/thumbs/italy.jpg')) }));
      await p.route('**/feeds/n-missing.jpg', r => r.fulfill({ status: 404, body: 'none' }));
      await p.route('https://evil.example/**', r => { errs.push('asked another site: ' + r.request().url()); r.abort(); });
      await p.route('**/feeds/news.json', r => news === 'wait' ? 0 : news ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(news) }) : r.fulfill({ status: 404, body: 'none' }));
      if (news === 'wait') await p.route('**/now.js*', r => r.abort());
      await p.goto(base + url); await p.waitForTimeout(news === 'wait' ? 1500 : 2500); return p;
    };
    const card = p => p.evaluate(() => { const c = document.querySelector('.now-card'), vis = l => [...l.children].filter(x => x.offsetParent !== null); const lists = {}; c.querySelectorAll('[data-now]').forEach(l => { lists[l.getAttribute('data-now')] = { n: l.children.length, vis: l.offsetParent ? vis(l).length : 0, shown: l.offsetParent !== null, cut: vis(l).filter(x => x.getBoundingClientRect().bottom > l.getBoundingClientRect().bottom + 1).length }; }); return { h: Math.round(c.getBoundingClientRect().height), sel: [...c.querySelectorAll('[role="tab"][aria-selected="true"]')].map(x => x.getAttribute('data-now-tab')).join(), tabs: [...c.querySelectorAll('[role="tab"]')].filter(x => x.offsetParent !== null).length, lists, wide: document.documentElement.scrollWidth - innerWidth, hrefs: [...c.querySelectorAll('[data-now="news"] a')].map(a => a.getAttribute('href')), html: c.querySelector('[data-now="news"]').innerHTML.indexOf('<b>&') }; });
    // the home card: empty (the script kept away), then filled
    let p = await open('/?nowday=' + DAY, 'wait'); const empty = await card(p); await p.context().close();
    p = await open('/?nowday=' + DAY, NEWS); let c = await card(p); const want = phone ? 4 : 6;
    ok(W + 'the card opens on the headlines: ' + want + ' shown, none cut', c.sel === 'news' && c.tabs === 3 && c.lists.news.n === 6 && c.lists.news.vis === want && c.lists.news.cut === 0 && c.wide <= 0, c.lists);
    ok(W + 'the card is as tall empty as filled', empty.h === c.h && empty.h > 200, [empty.h, c.h]);
    ok(W + 'headlines link out by https, backgrounds to pages that exist, the text escaped', c.hrefs.length === 12 && c.hrefs.every((h, i) => i % 2 ? fs.existsSync(path.join(R, h.slice(1))) : /^https:\/\/example\.org\//.test(h)) && c.html < 0, c.hrefs.slice(0, 4));
    await p.screenshot({ path: path.join(out, 'now-' + vp.width + '-card.png'), clip: await p.evaluate(() => { const r = document.querySelector('.now-card').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 10), width: innerWidth, height: r.height + 20 }; }), fullPage: true });
    await p.click('[data-now-tab="ann"]'); await p.waitForTimeout(200); let a = await card(p);
    ok(W + 'Coming anniversaries: the next thirty days, the same height', a.sel === 'ann' && a.lists.ann.shown && !a.lists.news.shown && a.lists.ann.n === Math.min(6, due.length) && a.lists.ann.cut === 0 && a.h === c.h, [a.lists.ann, a.h]);
    await p.screenshot({ path: path.join(out, 'now-' + vp.width + '-ann.png'), clip: await p.evaluate(() => { const r = document.querySelector('.now-card').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 10), width: innerWidth, height: r.height + 20 }; }), fullPage: true });
    await p.click('[data-now-tab="new"]'); await p.waitForTimeout(200); a = await card(p);
    ok(W + 'New here: the release notes, the same height', a.sel === 'new' && a.lists.new.shown && a.lists.new.n === 6 && a.lists.new.cut === 0 && a.h === c.h, [a.lists.new, a.h]);
    await p.focus('[data-now-tab="new"]'); await p.keyboard.press('ArrowRight'); a = await card(p); ok(W + 'the arrow keys move between the tabs', a.sel === 'news', a.sel);
    await p.context().close();
    // no headlines: a missing file, a stale one
    p = await open('/?nowday=' + DAY, null); c = await card(p); ok(W + 'no file: the card opens on the anniversaries, same height', c.sel === 'ann' && c.lists.news.n === 1 && c.h === empty.h, [c.sel, c.h]); await p.context().close();
    p = await open('/?nowday=' + DAY, { t: back(12) + 'T06:00Z', items: NEWS.items }); c = await card(p); ok(W + 'a file twelve days old is not shown', c.sel === 'ann' && !c.hrefs.some(h => /^https:/.test(h)), c.hrefs); await p.context().close();
    // Kids mode: no headlines, no tab for them, gentle anniversaries only
    p = await open('/?nowday=' + DAY, NEWS, true); c = await card(p);
    const kd = await p.evaluate(() => ({ req: performance.getEntriesByType('resource').some(r => /news\.json/.test(r.name)), deaths: epochNow.anniversaries(99).filter(x => /Died /.test(x)).length, all: epochNow.anniversaries(99).length }));
    ok(W + 'Kids mode: two tabs, the anniversaries, the headlines never asked for', c.sel === 'ann' && c.tabs === 2 && !c.hrefs.some(h => /^https:/.test(h)) && !kd.req && kd.deaths === 0 && kd.all <= due.length && c.wide <= 0, [c.tabs, kd]);
    await p.screenshot({ path: path.join(out, 'now-' + vp.width + '-kids.png'), clip: await p.evaluate(() => { const r = document.querySelector('.now-card').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 10), width: innerWidth, height: r.height + 20 }; }), fullPage: true });
    await p.context().close();
    // the page
    p = await open('/now?nowday=' + DAY, NEWS);
    const pg = await p.evaluate(() => ({ h1: document.querySelector('h1').textContent, news: document.querySelectorAll('[data-now="news"] .now-it').length, ann: document.querySelectorAll('[data-now="ann"] .now-it').length, notes: document.querySelectorAll('#new .wn-note').length, src: document.querySelectorAll('.now-src a').length, wide: document.documentElement.scrollWidth - innerWidth, menu: !!document.querySelector('a[href="/now"]'), top: document.querySelector('.ref-crumbs').getBoundingClientRect().top }));
    ok(W + '/now: the headlines, the anniversaries, six notes, the sources named', pg.h1 === 'History Now' && pg.news === 8 && pg.ann === Math.min(40, due.length) && pg.notes === 6 && pg.src >= 5 && pg.wide <= 0 && pg.menu && pg.top > 50, pg);
    await p.evaluate(() => scrollTo(0, document.querySelector('[data-now="news"]').getBoundingClientRect().top + scrollY - 100)); await p.waitForTimeout(1500);
    const pics = await p.evaluate(() => [...document.querySelectorAll('[data-now="news"] .now-it')].map(li => { const im = li.querySelector('img.now-pic'), fr = li.querySelector('.now-pic-none'); return { src: im ? im.getAttribute('src') : '', ok: im ? im.complete && im.naturalWidth > 0 : false, frame: !!fr, w: Math.round((im || fr || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width), credit: /picture Test Source/.test(li.textContent) }; }));
    const pe = i => pics[i] || {};
    ok(W + 'pictures: a thumbnail or an empty frame on every headline, all the same size', pics.length === 8 && pics.every(x => (x.src && x.ok) || x.frame) && pics.every(x => x.w === pics[0].w && x.w >= 60), pics.map(x => x.src || 'frame'));
    ok(W + 'the publisher\'s thumbnail shows, credited; a missing one falls back to the entry\'s picture; an outside address is never used', pe(7).src === '/feeds/n-ok.jpg' && pe(7).credit && pe(2).src === '/images/encyclopedia/thumbs/egypt.jpg' && !pe(2).credit && pe(4).src === '/images/encyclopedia/thumbs/france.jpg' && !pe(4).credit && /logos/.test(pe(1).src) && pe(0).frame, [pe(0), pe(2), pe(4), pe(7)].map(x => [x.src, x.ok, x.frame, x.credit]));
    await p.screenshot({ path: path.join(out, 'now-' + vp.width + '-page.png'), fullPage: true }); await p.context().close();
    p = await open('/now?nowday=' + DAY, NEWS, true);
    const pk = await p.evaluate(() => ({ news: (document.querySelector('.now-sec-news') || {}).offsetParent !== null, ann: document.querySelectorAll('[data-now="ann"] .now-it').length, wide: document.documentElement.scrollWidth - innerWidth }));
    ok(W + '/now in Kids mode: no headlines', pk.news === false && pk.ann > 0 && pk.wide <= 0, pk); await p.context().close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
