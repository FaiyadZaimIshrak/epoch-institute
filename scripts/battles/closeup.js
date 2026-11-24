// A close look at one or more phases of a battle plan, full width (made from sheet.js), for judging the drawing itself.
//   node closeup.js <scenario dir> <slug> [--at=0,3] [--out=<dir>] [--light] [--phone]
// Serves the repository's styles and battle-map.js; writes <out>/<slug>-sheet.png (out: by default a folder in the
// system's temp directory, printed)
// (with --phone: <slug>-phone.png, the first, the middle and the last phase at 390 px).
const fs = require('fs'), path = require('path'), http = require('http');
const HERE = __dirname, INREPO = fs.existsSync(path.join(HERE, '..', '..', 'shared.css')), REPO = INREPO ? path.resolve(HERE, '..', '..') : (process.env.EPOCH_REPO || 'C:/Users/OMEN 16/Documents/epoch-institute');
const { edge } = require(path.join(REPO, 'scripts', 'tools', 'lib.js'));
const args = process.argv.slice(2), plain = args.filter(a => !a.startsWith('--')), dir = path.resolve(plain[0]), slug = plain[1], opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const out = opt('out') || (INREPO ? path.join(require('os').tmpdir(), 'epoch-battle-sheets') : path.join(dir, 'sheets')), light = args.includes('--light'), phone = args.includes('--phone'), compact = args.includes('--compact'); fs.mkdirSync(out, { recursive: true });
const TYPES = { '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const sc = JSON.parse(fs.readFileSync(path.join(dir, slug + '.json'), 'utf8'));
for (const u of sc.units) if (u.leaderEntry && !u.pic && fs.existsSync(path.join(REPO, 'images', 'encyclopedia', 'thumbs', u.leaderEntry + '.jpg'))) u.pic = '/images/encyclopedia/thumbs/' + u.leaderEntry + '.jpg';
const css = INREPO ? '' : '<link rel="stylesheet" href="/_p/battle-map.css">', js = INREPO ? '/battle-map.js' : '/_p/battle-map.js';
const page = () => '<!doctype html><html lang="en" data-theme="' + (light ? 'light' : 'dark') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/css/pages.css">' + css +
  '<style>body{margin:0;padding:12px;background:var(--bg);color:var(--text)}.bfs-grid{display:grid;grid-template-columns:' + '1fr' + ';gap:' + (compact ? 6 : 12) + 'px}' + (compact ? '.bf-cap{display:none}.bfs-cell h4{color:var(--text)}' : '') + '.bfs-cell h4{margin:0 0 4px;font:600 14px Arial}.bf-bar,.bf-key,.bf-note{display:none}.bf-cap{min-height:0}.battle-field{margin:0}</style></head><body><div class="bfs-grid" id="g"></div>' +
  '<script src="' + js + '"></script><script>var D=' + JSON.stringify(sc).replace(/</g, '\\u003c') + ';var want=' + JSON.stringify((opt('at')||'0').split(',').map(Number)) + ';window._m=[];want.forEach(function(i){var c=document.createElement("div");c.className="bfs-cell";if(' + compact + '){var hh=document.createElement("h4");hh.textContent=(i+1)+". "+D.phases[i].title;c.appendChild(hh);}var s=document.createElement("section");s.className="battle-field";s.id="b"+i;c.appendChild(s);document.getElementById("g").appendChild(c);var m=BattleMap.mount(s,JSON.parse(JSON.stringify(D)));m.go(i);window._m.push(m);});window._ok=1;</script></body></html>';
const srv = http.createServer((req, rsp) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/_sheet') { rsp.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return rsp.end(page()); }
  const f = p.startsWith('/_p/') ? path.join(HERE, p.slice(4)) : path.join(REPO, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
  rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(rsp);
});
srv.listen(0, 'localhost', async () => {
  const port = srv.address().port, b = await edge(); let code = 0;
  try {
    const ctx = await b.newContext({ viewport: { width: phone ? 390 : 1060, height: 900 }, deviceScaleFactor: phone ? 2 : 1 });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    await pg.goto('http://localhost:' + port + '/_sheet', { waitUntil: 'load' }); await pg.waitForFunction(() => window._ok, null, { timeout: 15000 });
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
    if (args.includes('--probe')) console.log(JSON.stringify(await pg.evaluate(() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const c = getComputedStyle(e); return [c.stroke, c.strokeWidth, c.fill, c.opacity, c.display]; }; return { mk: q('.bf-u:not(.is-hidden) .bf-mk'), camp: q('.bf-camp'), ar: q('.bf-ar-hit'), ink: getComputedStyle(document.documentElement).getPropertyValue('--bf-ink'), n: document.querySelectorAll('.bf-ar-hit').length, d: (document.querySelector('.bf-ar-hit') || { getAttribute() {} }).getAttribute('d') }; })));
    const file = path.join(out, slug + '-close' + (phone ? '-phone' : '') + (light ? '-light' : '') + '.png'); await pg.screenshot({ path: file, fullPage: true });
    console.log(file + (errs.length ? '\nerrors: ' + errs.slice(0, 4).join(' | ') : ''));
  } catch (e) { console.log('FAILED ' + e); code = 1; }
  await b.close(); srv.close(); process.exit(code);
});
