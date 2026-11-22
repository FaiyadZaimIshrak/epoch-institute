// Today's states on the atlas (21 Nov 2026; the user saw "missing points … for current modern states in the world map
// atlas"): every present-day state of scripts/modern-states.tsv is a row of maps/atlas-data.js alive in 2025 with a
// placed (not approximate) point, and "What was here?" at Moscow, Tokyo, Accra and Warsaw lists the present state.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const rows = new Function(fs.readFileSync(path.join(R, 'maps', 'atlas-data.js'), 'utf8') + ';return ATLAS')();
  const by = {}; for (const r of (rows.rows || rows)) by[r[0]] = r;
  const ms = fs.readFileSync(path.join(R, 'scripts', 'modern-states.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const reg = ms.filter(m => m[5]).map(m => m[5]);
  const bad = reg.filter(id => !by[id] || by[id][3] != null || (by[id][6] & 2));
  ok('every present-day state on record (' + reg.length + ') is alive in 2025 with a placed point', reg.length >= 195 && !bad.length, bad.slice(0, 10));
  const srv = await serve(8825), b = await edge(), errs = [], base = 'http://localhost:8825';
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
  for (const [at, want] of [['55.75,37.62', 'Russia'], ['35.69,139.69', 'Japan'], ['5.56,-0.2', 'Ghana'], ['52.23,21.01', 'Poland']]) {
    await p.goto(base + '/atlas?year=2025&at=' + at, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(4500);
    const names = await p.evaluate(() => [...document.querySelectorAll('#atl-here-list li')].map(li => li.textContent));
    ok('What was here? at ' + at + ' lists ' + want, names.some(t => t.startsWith(want) || t.includes(want + ' ')), names.slice(0, 6));
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
