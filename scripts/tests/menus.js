// The menus by subject (shared-nav.js MENUS): People, Places, Events, Ideas, Play and More. No column holds more than
// eight items; every panel fits a 1366 x 700 window and a 1180 px wide one; the bar stands on one line down to 1161 px;
// every address in a menu is a page of the site; the phone menu opens with a folding group for each menu.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const fs = require('fs'), path = require('path'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 400) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8834), b = await edge(), errs = [], base = 'http://localhost:8834';
  const open = async (vp, url) => { const phone = vp.width < 700, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); return p; };
  const IDS = ['people', 'places', 'events', 'ideas', 'play', 'more'];
  for (const vp of [{ width: 1366, height: 700 }, { width: 1180, height: 700 }]) {
    const p = await open(vp, '/about');
    const bar = await p.evaluate(() => { const l = document.querySelector('.nav-links'), kids = [...l.children].filter(c => c.offsetParent), tops = kids.map(c => Math.round(c.getBoundingClientRect().top)), r = l.getBoundingClientRect(), t = document.querySelector('.nav-toggles').getBoundingClientRect(), logo = document.querySelector('.nav-logo').getBoundingClientRect();
      return { names: kids.map(c => c.textContent.replace(/\s+/g, ' ').trim().replace(/ ▾.*$/, '').replace(/New$/, '')), oneLine: Math.max.apply(0, tops) - Math.min.apply(0, tops) < 6, clearRight: Math.round(t.left - r.right), clearLeft: Math.round(r.left - logo.right) }; });
    ok(vp.width + ' px: the bar is Discover, Encyclopedia and the six menus, on one line, clear of the name and the buttons', bar.names.join('|') === 'Discover|Encyclopedia|People|Places|Events|Ideas|Play|More' && bar.oneLine && bar.clearRight >= 8 && bar.clearLeft >= 8, bar);
    const bad = [];
    for (const id of IDS) { await p.click('#nav-' + id + '-btn'); await p.waitForTimeout(350);
      const m = await p.evaluate(id => { const n = document.getElementById('nav-' + id + '-menu'), r = n.getBoundingClientRect(), cols = [...n.querySelectorAll('.nav-col')].map(c => c.querySelectorAll('a:not(.nav-surprise):not(.nav-all)').length), all = n.querySelector('.nav-all');
        return { shown: getComputedStyle(n).display !== 'none', top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), cols, all: all ? all.getAttribute('href') : '', vw: innerWidth, vh: innerHeight, open: [...document.querySelectorAll('.nav-group-wrap.open')].length }; }, id);
      if (!m.shown || m.bottom > m.vh - 4 || m.left < 4 || m.right > m.vw - 4 || m.cols.some(c => c > 8 || c < 1) || m.open !== 1 || m.all !== (id === 'more' ? '' : '/explore/' + id)) bad.push([id, m]);
      if (vp.width === 1366) await p.screenshot({ path: path.join(out, 'menu-' + id + '.png') }); }
    ok(vp.width + ' x ' + vp.height + ': every panel opens alone, inside the window, with at most eight items a column and a link to its group on Explore Everything', !bad.length, bad);
    await p.context().close();
  }
  // every address of the menus is a page of the site
  const p = await open({ width: 1366, height: 700 }, '/about');
  const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('.nav-links a[href]')].map(a => a.getAttribute('href')))]);
  const miss = links.filter(h => { if (h === '#' || h.startsWith('/#')) return false; const f = h.split(/[?#]/)[0].replace(/\/$/, '/index').replace(/^\//, ''); return !fs.existsSync(path.join(R, f || 'index')); });
  ok('every address in the menus is a page of the site (' + links.length + ')', !miss.length && links.length >= 45, miss);
  const act = await (async () => { const q = await open({ width: 1366, height: 700 }, '/atlas'); const r = await q.evaluate(() => [...document.querySelectorAll('.nav-parent-btn.active-group')].map(b => b.textContent.replace(/\s*▾.*/, '').trim())); await q.context().close(); return r; })();
  ok('the menu that holds the present page is marked (Atlas: Places)', act.join() === 'Places', act);
  const hub = fs.readFileSync(path.join(R, 'research'), 'utf8'), noGroup = IDS.filter(id => id !== 'more' && !hub.includes('id="hub-' + id + '"'));
  ok('Explore Everything has a group for each subject', !noGroup.length, noGroup);
  // the footer: a column for each menu, the same pages
  const ft = await p.evaluate(() => { const cols = [...document.querySelectorAll('#site-footer .footer-col')].map(c => [c.querySelector('.footer-col-title').textContent, [...c.querySelectorAll('a')].map(a => a.getAttribute('href'))]); const menu = [...document.querySelectorAll('.nav-links .nav-col a[href]:not(.nav-all)')].map(a => a.getAttribute('href')).filter(h => h !== '#' && h.indexOf('/#') !== 0);
    const all = [].concat.apply([], cols.map(c => c[1])), tops = [...document.querySelectorAll('#site-footer .footer-col')].map(c => Math.round(c.getBoundingClientRect().top)); return { titles: cols.map(c => c[0]), missing: menu.filter(h => all.indexOf(h) < 0), dup: all.filter((h, i) => all.indexOf(h) !== i), oneRow: Math.max.apply(0, tops) - Math.min.apply(0, tops) < 4, wide: document.documentElement.scrollWidth - innerWidth }; });
  ok('the footer has a column for each menu, with every page of the menus, on one row at 1366 px', ft.titles.join('|') === 'People|Places|Events|Ideas|Play|Read|The Institute' && !ft.missing.length && !ft.dup.length && ft.oneRow && ft.wide <= 0, ft);
  await p.context().close();
  // the phone menu
  const ph = await open({ width: 390, height: 800 }, '/atlas'); await ph.click('#nav-hamburger'); await ph.waitForTimeout(500);
  const dd = await ph.evaluate(() => { const d = document.getElementById('nav-dropdown'), secs = [...d.querySelectorAll('details.nav-dd-sec')]; return { shown: d.offsetParent !== null, secs: secs.map(s => s.querySelector('summary').textContent.trim()), open: secs.filter(s => s.open).map(s => s.querySelector('summary').textContent.trim()), wide: document.documentElement.scrollWidth - innerWidth, top: [...d.querySelectorAll(':scope > a')].map(a => a.textContent.trim().replace(/New$/, '')) }; });
  ok('phone: the menu has a folding group for each menu, the present page\'s group open, nothing wider than the screen', dd.shown && dd.secs.join('|') === 'People|Places|Events|Ideas|Play|More' && dd.open.join() === 'Places' && dd.wide <= 0, dd);
  await ph.screenshot({ path: path.join(out, 'menu-phone.png') });
  await ph.click('#nav-hamburger'); await ph.waitForTimeout(400);
  const pf = await ph.evaluate(() => { const f = document.querySelector('#site-footer .footer-links'); f.scrollIntoView({ block: 'start', behavior: 'instant' }); const r = [...f.children].map(c => c.getBoundingClientRect()); return { cols: new Set(r.map(x => Math.round(x.left))).size, right: Math.max.apply(0, r.map(x => Math.round(x.right))), vw: innerWidth, wide: document.documentElement.scrollWidth - innerWidth }; });
  ok('phone: the footer stands in two columns inside the screen', pf.cols === 2 && pf.right <= pf.vw && pf.wide <= 0, pf); await ph.screenshot({ path: path.join(out, 'footer-phone.png') }); await ph.context().close();
  ok('no script error', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
