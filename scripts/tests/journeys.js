// Journeys on the Globe (/journeys): every journey of scripts/journeys has its stops with a point, a text that never
// speaks of its source, and entries that exist; the page shows one journey at a time beside the globe; Next, Play, a
// tap in the list and the picker work; the flat map draws the same route; Kids mode leaves out the journeys of war and
// conquest; the travellers' pages link their journeys.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const rows = fs.readFileSync(path.join(R, 'scripts/journeys/journeys.tsv'), 'utf8').split(/\r?\n/).filter(l => l.trim() && l[0] !== '#').map(l => l.split('\t'));
  const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), ent = new Set(E.map(e => e.slug));
  let bad = [], stops = 0;
  for (const [slug] of rows) { const j = JSON.parse(fs.readFileSync(path.join(R, 'scripts/journeys', slug + '.json'), 'utf8'));
    if (/\barticle\b/i.test(j.intro + ' ' + j.ending)) bad.push(slug + ' intro');
    for (const l of j.legs) for (const s of l.stops) { stops++; const w = String(s.text || '').split(/\s+/).filter(Boolean).length;
      if (!Array.isArray(s.ll) || Math.abs(s.ll[0]) > 90 || Math.abs(s.ll[1]) > 180 || w < 10 || w > 50 || /\barticle\b/i.test(s.text) || (s.entry && !ent.has(s.entry)) || !s.quote || /\b(BC|AD)\b/.test(s.text + ' ' + (s.date || ''))) bad.push(slug + ' ' + s.place); } }
  ok('data: ' + rows.length + ' journeys, ' + stops + ' stops, each with a point, a text of its own and a quotation from its article', rows.length >= 12 && stops > 200 && !bad.length, bad.slice(0, 5));
  const page = fs.readFileSync(path.join(R, 'journeys'), 'utf8'), arts = [...page.matchAll(/<article class="jr-j" id="([a-z0-9-]+)" data-kids="([01])">/g)].map(m => m[1]);
  ok('the page holds every journey in the file’s order, and is served, deployed and in the menu', arts.join() === rows.map(r => r[0]).join() && /\|journeys\|/.test(fs.readFileSync(path.join(R, '.htaccess'), 'utf8')) && /\bjourneys\b/.test(fs.readFileSync(path.join(R, 'scripts/deploy.sh'), 'utf8')) && fs.readFileSync(path.join(R, 'shared-nav.js'), 'utf8').includes("'/journeys', 'Journeys on the Globe'") && fs.existsSync(path.join(R, 'css/journeys.css')), arts.length);
  const hrefs = [...new Set([...page.slice(page.indexOf('<main'), page.indexOf('</main>')).matchAll(/href="\/((?:encyclopedia|life|empire)\/[a-z0-9-]+)"/g)].map(m => m[1]))], gone = hrefs.filter(h => !fs.existsSync(path.join(R, h)));
  ok('every entry and life the page links exists', hrefs.length > 80 && !gone.length, gone.slice(0, 5));
  const has = (f, s) => fs.existsSync(path.join(R, f)) && fs.readFileSync(path.join(R, f), 'utf8').includes(s);
  ok('the travellers’ pages link their journeys', has('encyclopedia/ibn-battuta', 'href="/journeys?j=ibn-battuta"') && has('life/ibn-battuta', 'href="/journeys?j=ibn-battuta"') && has('encyclopedia/ferdinand-magellan', 'href="/journeys?j=magellan"') && has('life/muhammad', 'href="/journeys?j=hijra"'));
  const srv = await serve(8833), b = await edge(), errs = [], base = 'http://localhost:8833';
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const V = vp.width + ': ';
    const st = () => p.evaluate(() => ({ s: epochJourneys.state(), shown: [...document.querySelectorAll('.jr-j')].filter(a => a.offsetParent).map(a => a.id), now: (document.querySelector('.jr-now-k') || {}).textContent || '', place: (document.querySelector('.jr-now-p') || {}).textContent || '',
      li: [...document.querySelectorAll('.jr-j.is-on .jr-stops > li')].findIndex(l => l.classList.contains('is-now')), wide: document.documentElement.scrollWidth - innerWidth, play: document.querySelector('#jr-play').textContent,
      ink: (() => { const c = document.querySelector('#jr-globe'); if (c.hidden || !c.width) return -1; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 400) if (d[i]) n++; return n; })() }));
    await p.goto(base + '/journeys?j=magellan', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.epochJourneys && epochJourneys.state().ready, null, { timeout: 15000 }); await p.waitForTimeout(700);
    let s = await st();
    ok(V + 'the address opens its journey alone, on its first stop, with the globe drawn', s.s.j === 'magellan' && s.s.i === 0 && s.shown.join() === 'magellan' && /^Stop 1 of 18/.test(s.now) && s.li === 0 && s.ink > 200 && s.s.dots > 0 && s.wide <= 0, [s.shown, s.now, s.ink, s.wide]);
    await p.click('#jr-next'); await p.waitForTimeout(1300); s = await st();
    ok(V + 'Next goes to the second stop and turns the globe to it', s.s.i === 1 && /^Stop 2 of 18/.test(s.now) && s.place === 'Tenerife' && s.li === 1 && Math.abs(s.s.rot[0] - 16.6) < 3, [s.now, s.place, s.s.rot]);
    await p.click('#jr-play'); await p.waitForTimeout(6200); s = await st();
    ok(V + 'Play walks the stops', s.s.playing && s.s.i >= 3 && s.play === 'Pause', [s.s.i, s.play]);
    await p.click('#jr-play'); await p.waitForTimeout(200); const at = (await st()).s.i; await p.waitForTimeout(3000); s = await st();
    ok(V + 'Pause holds it', !s.s.playing && s.s.i === at && s.play === 'Play the journey', [at, s.s.i]);
    await p.evaluate(() => document.querySelectorAll('.jr-j.is-on .jr-stops > li')[8].click()); await p.waitForTimeout(1300); s = await st();
    ok(V + 'a stop of the list is chosen by a tap, and the address keeps it', s.s.i === 8 && s.place === 'Guam' && /[?&]s=9\b/.test(await p.evaluate(() => location.search)), [s.s.i, s.place]);
    await p.screenshot({ path: path.join(out, 'journeys-' + vp.width + '-globe.png') });
    ok(V + 'the globe is the only view', await p.evaluate(() => !document.querySelector('.jr-views') && !document.querySelector('#jr-flat') && !document.querySelector('#jr-globe').hidden));
    const er = await p.evaluate(() => ({ ages: document.querySelectorAll('.jr-eras button').length, on: [...document.querySelectorAll('.jr-eras button.is-on')].map(b => b.getAttribute('data-era')).join(), offered: [...document.querySelectorAll('.jr-pick a')].filter(a => a.offsetParent).map(a => a.getAttribute('data-era')), all: document.querySelectorAll('.jr-pick a').length, h: Math.round(document.querySelector('.jr-pick').getBoundingClientRect().height) }));
    ok(V + 'the picker offers one age at a time (Magellan: 1500 to 1699), and stays low', er.ages === 5 && er.on === '1' && er.offered.length >= 3 && er.offered.every(e => e === '1') && er.all >= 60 && er.h < (vp.width < 700 ? 90 : 240), er);
    await p.click('.jr-eras button[data-era="0"]'); await p.waitForTimeout(300);
    await p.click('.jr-pick a[data-j="xuanzang"]'); await p.waitForTimeout(1200); s = await st();
    ok(V + 'the picker changes the journey', s.s.j === 'xuanzang' && s.s.i === 0 && s.shown.join() === 'xuanzang' && s.ink > 200 && s.wide <= 0, [s.shown, s.ink]);
    await p.goto(base + '/journeys?j=ibn-battuta&s=5', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.epochJourneys && epochJourneys.state().ready, null, { timeout: 15000 }); s = await st();
    ok(V + 'an address with a stop opens on it', s.s.j === 'ibn-battuta' && s.s.i === 4 && s.place === 'Baghdad', [s.s.i, s.place]);
    await p.evaluate(() => localStorage.setItem('epoch-kids', '1')); await p.goto(base + '/journeys?j=alexander', { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => window.epochJourneys && epochJourneys.state().ready, null, { timeout: 15000 }); await p.waitForTimeout(500); s = await st();
    const kp = await p.evaluate(() => [...document.querySelectorAll('.jr-pick a')].filter(a => a.offsetParent).map(a => a.getAttribute('data-j')));
    ok(V + 'Kids mode leaves out the journeys of war and conquest', s.s.j !== 'alexander' && kp.length >= 6 && !kp.includes('alexander') && !kp.includes('long-march') && !kp.includes('columbus') && s.shown.length === 1 && kp.includes(s.shown[0]) && s.wide <= 0, [s.s.j, kp]);
    await ctx.close();
  }
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
