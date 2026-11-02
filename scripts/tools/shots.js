// Screenshots for the look audit: one page of every kind (lib.js KINDS, or the paths given), in a mode (light, dark or
// kids) at a width, either full pages (--full) or contact sheets of each page's first screens (--sheet), several pages to
// a sheet, so the whole site can be read by eye in a few images.
//   node scripts/tools/shots.js <out dir> [--width=1280] [--mode=light|dark|kids] [--height=1800] [--per=6] [--full] [path …]
const fs = require('fs'), path = require('path'), { serve, edge, KINDS } = require('./lib');
const argv = process.argv.slice(2), opt = (k, d) => ((argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d);
const out = argv.find(a => !a.startsWith('--')); const paths = argv.filter(a => !a.startsWith('--') && a !== out);
const W = +opt('width', 1280), MODE = opt('mode', 'light'), H = +opt('height', 1800), PER = +opt('per', 6), FULL = argv.includes('--full');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const srv = await serve(), b = await edge(), ctx = b.contexts()[0] || await b.newContext(), pg = await ctx.newPage();
  await pg.setViewportSize({ width: W, height: 900 });
  await pg.goto('http://localhost:8765/about', { waitUntil: 'load' });
  await pg.evaluate(m => { try { localStorage.setItem('epoch-theme', m === 'dark' ? 'dark' : 'light'); if (m === 'kids') localStorage.setItem('epoch-kids', '1'); else localStorage.removeItem('epoch-kids'); localStorage.setItem('epoch-start-seen', '1'); } catch (e) {} }, MODE);
  const shots = [];
  for (const p of (paths.length ? paths : KINDS)) {
    try { await pg.goto('http://localhost:8765' + p, { waitUntil: 'load', timeout: 60000 }); } catch (e) { console.log('LOAD', p); continue; }
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
    const name = (p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home') + '-' + W + '-' + MODE + '.png';
    const buf = await pg.screenshot(FULL ? { fullPage: true } : { clip: { x: 0, y: 0, width: W, height: Math.min(H, await pg.evaluate(() => document.documentElement.scrollHeight)) } });
    if (FULL) fs.writeFileSync(path.join(out, name), buf); else shots.push([p, buf]);
  }
  // contact sheets: PER pages side by side, each scaled to a column, its address above it
  for (let i = 0; i < shots.length; i += PER) {
    const grp = shots.slice(i, i + PER);
    const url = await pg.evaluate(async ([items, W, H, COL]) => {
      const col = COL, sc = col / W, c = document.createElement('canvas'); c.width = items.length * (col + 12); c.height = Math.round(H * sc) + 28;
      const g = c.getContext('2d'); g.fillStyle = '#777'; g.fillRect(0, 0, c.width, c.height);
      for (let k = 0; k < items.length; k++) { const im = new Image(); await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + items[k][1]; });
        g.drawImage(im, k * (col + 12), 28, col, Math.round(im.height * sc)); g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.fillText(items[k][0], k * (col + 12) + 4, 19); }
      return c.toDataURL('image/png');
    }, [grp.map(([p, buf]) => [p, buf.toString('base64')]), W, H, +opt('col', 420)]);
    fs.writeFileSync(path.join(out, 'sheet-' + W + '-' + MODE + '-' + String(i / PER + 1).padStart(2, '0') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log((FULL ? (paths.length || KINDS.length) + ' pages' : Math.ceil(shots.length / PER) + ' sheets') + ' in ' + out);
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
