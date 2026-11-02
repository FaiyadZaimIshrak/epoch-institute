// Tests the service worker (sw.js) in headless Edge against the local server (localhost is a secure context, so it can be
// registered there by hand; shared-nav.js registers it only on the live host):
//   1. registered, it takes control of the page
//   2. a page read with the network is kept, and opens offline
//   3. a page never read gives /offline.html offline, which lists the kept pages
//   4. a versioned file comes from the cache offline; an unversioned shared file too (kept on first load)
//   5. back online, a page is fetched fresh (network first), not the kept copy
//   node scripts/tools/sw-test.js
const { serve, edge } = require('./lib');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
(async () => {
  const srv = await serve(), b = await edge(), ctx = b.contexts()[0] || await b.newContext(), pg = await ctx.newPage();
  const base = 'http://localhost:8765';
  await pg.goto(base + '/encyclopedia/battle-of-hastings', { waitUntil: 'load' });
  await pg.evaluate(() => navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready));
  await pg.reload({ waitUntil: 'load' });
  ok(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'the page is controlled after a reload');
  // read two pages with the network (kept), and load a versioned script
  await pg.goto(base + '/songs/arirang', { waitUntil: 'load' });
  await pg.goto(base + '/encyclopedia/battle-of-hastings', { waitUntil: 'load' }); await pg.waitForTimeout(500);
  const kept = await pg.evaluate(() => caches.keys().then(ks => caches.open(ks.find(k => k.startsWith('pages-'))).then(c => c.keys())).then(r => r.map(x => new URL(x.url).pathname)));
  ok(kept.includes('/songs/arirang') && kept.includes('/encyclopedia/battle-of-hastings') && kept.includes('/offline.html'), 'pages kept: ' + kept.join(' '));
  await ctx.setOffline(true);
  await pg.goto(base + '/songs/arirang', { waitUntil: 'domcontentloaded' });
  ok((await pg.title()).includes('Arirang'), 'a page read before opens offline (title: ' + await pg.title() + ')');
  ok(await pg.evaluate(() => getComputedStyle(document.body).backgroundColor !== 'rgba(0, 0, 0, 0)'), 'its stylesheet came from the cache');
  await pg.goto(base + '/encyclopedia/battle-of-actium', { waitUntil: 'domcontentloaded' });
  ok((await pg.title()).startsWith('Offline'), 'a page never read gives the offline page (title: ' + await pg.title() + ')');
  await pg.waitForTimeout(800);
  const listed = await pg.evaluate(() => [...document.querySelectorAll('#off-list a')].map(a => a.getAttribute('href')));
  ok(listed.includes('/songs/arirang'), 'the offline page lists the kept pages: ' + listed.slice(0, 4).join(' '));
  await ctx.setOffline(false);
  // network first: a page changed on the server is fetched fresh when online
  const fs = require('fs'), path = require('path'), f = path.join(require('./lib').ROOT, 'songs', 'arirang'), orig = fs.readFileSync(f, 'utf8');
  try {
    fs.writeFileSync(f, orig.replace('<title>', '<title>FRESH '));
    await pg.goto(base + '/songs/arirang', { waitUntil: 'domcontentloaded' });
    ok((await pg.title()).startsWith('FRESH'), 'online, the page comes from the network, not the kept copy');
  } finally { fs.writeFileSync(f, orig); }
  await pg.evaluate(() => navigator.serviceWorker.getRegistrations().then(rs => Promise.all(rs.map(r => r.unregister()))));
  console.log(pass + ' passed, ' + fail + ' failed');
  await b.close(); srv.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
