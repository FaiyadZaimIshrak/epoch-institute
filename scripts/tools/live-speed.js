// Speed of the live site, measured in headless Edge as a reader on a phone-like connection would get it: for each page,
// a first visit (cold: empty cache) and a repeat visit (warm: the browser's cache and, once it is deployed and has taken
// control, the service worker), with time to first byte, first contentful paint, largest contentful paint, layout
// shift (CLS), long-task blocking and the bytes sent. Prints a table; --json=<file> keeps the numbers to compare later.
//   node scripts/tools/live-speed.js [--base=https://the-epoch-institute.org] [--net=4g|3g|none] [--runs=1] [path …]
const fs = require('fs'), { edge } = require('./lib');
const argv = process.argv.slice(2), opt = (k, d) => ((argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d);
const BASE = opt('base', 'https://the-epoch-institute.org'), NET = opt('net', '4g'), RUNS = +opt('runs', 1);
const PATHS = argv.filter(a => !a.startsWith('--')).length ? argv.filter(a => !a.startsWith('--')) :
  ['/', '/profiles', '/empire/roman-empire', '/culture/thracians', '/encyclopedia/', '/encyclopedia/battle-of-hastings', '/today-in-history/july-14',
   '/years/1453', '/songs/', '/songs/arirang', '/games', '/atlas'];
const NETS = { '4g': { latency: 150, downloadThroughput: 1.6e6 / 8 * 4, uploadThroughput: 750e3 / 8 * 4 }, '3g': { latency: 300, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 } };
const OBS = () => {
  window.__m = { lcp: 0, cls: 0, tbt: 0 };
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
};
(async () => {
  const b = await edge(), out = [];
  for (const p of PATHS) for (let run = 0; run < RUNS; run++) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const pg = await ctx.newPage(), cdp = await ctx.newCDPSession(pg);
    await cdp.send('Network.enable'); if (NETS[NET]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await pg.addInitScript(OBS);
    const row = { path: p };
    for (const visit of ['cold', 'warm']) {
      let bytes = 0; const onResp = e => { bytes += e.encodedDataLength || 0; }; cdp.on('Network.loadingFinished', onResp);
      const t0 = Date.now();
      try { await pg.goto(BASE + p, { waitUntil: 'load', timeout: 90000 }); } catch (e) { row[visit] = { error: e.message.slice(0, 60) }; cdp.off('Network.loadingFinished', onResp); continue; }
      await pg.waitForTimeout(2500);
      const m = await pg.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], fcp = performance.getEntriesByName('first-contentful-paint')[0];
        return { ttfb: Math.round(n.responseStart), fcp: Math.round(fcp ? fcp.startTime : 0), lcp: Math.round(window.__m.lcp), cls: +window.__m.cls.toFixed(3), tbt: Math.round(window.__m.tbt), load: Math.round(n.loadEventEnd) }; });
      cdp.off('Network.loadingFinished', onResp);
      row[visit] = { ...m, kb: Math.round(bytes / 1024), wall: Date.now() - t0 };
      if (visit === 'cold') await pg.waitForTimeout(3000);   // give a service worker its idle moment to install before the repeat visit
    }
    out.push(row); await ctx.close();
    const f = v => v && !v.error ? `ttfb ${String(v.ttfb).padStart(5)}  fcp ${String(v.fcp).padStart(5)}  lcp ${String(v.lcp).padStart(5)}  cls ${String(v.cls).padStart(5)}  tbt ${String(v.tbt).padStart(4)}  ${String(v.kb).padStart(5)} KB` : (v ? v.error : '-');
    console.log(p.padEnd(34), 'COLD', f(row.cold)); console.log(''.padEnd(34), 'WARM', f(row.warm));
  }
  if (opt('json', '')) fs.writeFileSync(opt('json', ''), JSON.stringify({ base: BASE, net: NET, at: new Date().toISOString(), rows: out }, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
