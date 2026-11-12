// Opens pages in headless Edge from the local server (scripts/tools/lib.js) and lists what goes wrong in a browser:
// script errors, console errors, requests that fail or answer 4xx/5xx (same site), pictures that do not decode, and
// layout wider than the screen. Each page is scrolled to the end so lazy sections (Test yourself, maps, Next to read)
// load too. Pages: lib.js KINDS plus a seeded sample of each generated folder.
//   node scripts/tools/crawl-browser.js [--per=4] [--seed=7] [--phone] [--kids] [--dark] [--json=out.json] [paths…]
const fs = require('fs'), path = require('path');
const { serve, edge, ROOT, KINDS } = require('./lib');
const args = process.argv.slice(2), opt = {}, only = [];
for (const a of args) { const m = a.match(/^--([^=]+)=?(.*)$/); if (m) opt[m[1]] = m[2] || true; else only.push(a); }
const PER = +opt.per || 4, PORT = 8790 + Math.floor(Math.random() * 100);
let seed = +opt.seed || 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
function sample(dir, n) {
  const d = path.join(ROOT, dir); if (!fs.existsSync(d)) return [];
  const all = fs.readdirSync(d).filter(f => !f.startsWith('.') && f !== 'index' && !path.extname(f) && fs.statSync(path.join(d, f)).isFile());
  const out = []; for (let i = 0; i < n && all.length; i++) out.push('/' + dir + '/' + all.splice(Math.floor(rnd() * all.length), 1)[0]);
  return out;
}
const FOLDERS = ['encyclopedia', 'state', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'teachers',
  'societies', 'songs', 'essays', 'empire', 'religion', 'language', 'culture', 'movement', 'government', 'ideology', 'work', 'life'];
const pages = only.length ? only : [...new Set([...KINDS, '/weekly', '/compare?a=roman-empire&b=han-dynasty', '/new', '/today-card', '/404-test-page', ...FOLDERS.flatMap(f => sample(f, PER))])];
(async () => {
  const srv = await serve(PORT), b = await edge(), base = 'http://localhost:' + PORT;
  const ctx = await b.newContext(opt.phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(o => { try { if (o.kids) localStorage.setItem('epoch-kids', '1'); if (o.dark) localStorage.setItem('epoch-theme', 'dark'); } catch (e) {} }, { kids: !!opt.kids, dark: !!opt.dark });
  await ctx.route(/googletagmanager|google-analytics|youtube|genius\.com|nocookie/, r => r.abort());
  const res = {}; let n = 0;
  for (const p of pages) {
    const errs = []; const page = await ctx.newPage();
    page.on('pageerror', e => errs.push('script error: ' + e.message.split('\n')[0]));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    page.on('response', r => { const u = r.url(); if (u.startsWith(base) && r.status() >= 400 && !(p === '/404-test-page' && u === base + p)) errs.push(r.status() + ' ' + u.slice(base.length)); });
    page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(base) && !/net::ERR_ABORTED/.test(r.failure() && r.failure().errorText)) errs.push('failed ' + u.slice(base.length) + ' ' + (r.failure() || {}).errorText); });
    try {
      await page.goto(base + p, { waitUntil: 'load', timeout: 45000 });
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, document.body.scrollHeight); });
      await page.waitForTimeout(1500);
      const info = await page.evaluate(() => ({
        wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        broken: [...document.images].filter(i => i.complete && i.currentSrc && i.naturalWidth === 0 && i.loading !== 'lazy').map(i => i.currentSrc.replace(location.origin, '')).slice(0, 5),
      }));
      if (info.wide > 1) errs.push('page wider than the screen by ' + info.wide + ' px');
      for (const i of info.broken) errs.push('picture does not decode: ' + i);
    } catch (e) { errs.push('load: ' + e.message.split('\n')[0]); }
    await page.close();
    if (errs.length) res[p] = [...new Set(errs)];
    if (++n % 20 === 0) console.error(n + '/' + pages.length);
  }
  await b.close(); srv.close();
  const keys = Object.keys(res);
  console.log(pages.length + ' pages opened' + (opt.phone ? ' (phone)' : '') + (opt.kids ? ' (Kids mode)' : '') + (opt.dark ? ' (dark)' : '') + ', ' + keys.length + ' with problems');
  for (const k of keys) { console.log('\n' + k); for (const e of res[k]) console.log('  ' + e); }
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(res, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
