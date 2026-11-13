// Shared by the test and audit tools in scripts/tools: a static server for the repository as the host serves it
// (extensionless pages as HTML, folder index pages, /folder -> /folder/), and headless Edge through Playwright.
// Playwright: npm install --prefix scripts playwright-core, or EPOCH_PW = a folder whose node_modules has it.
// The server answers on localhost only (not 127.0.0.1).
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.join(__dirname, '..', '..');
const pw = require(require.resolve('playwright-core', { paths: [path.join(ROOT, 'scripts'), process.env.EPOCH_PW || ROOT] }));
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain' };
// opts.fontDelay: hold the font files back that many ms (a slow connection: the layout must not move when they come)
function serve(port, opts = {}) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      let f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { rsp.writeHead(403); return rsp.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
        if (!p.endsWith('/')) { rsp.writeHead(301, { Location: p + '/' }); return rsp.end(); }
        f = path.join(f, 'index');
      }
      if (!fs.existsSync(f)) { f = path.join(ROOT, '404.html'); rsp.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); return fs.createReadStream(f).pipe(rsp); }
      const ext = path.extname(f), send = () => { rsp.writeHead(200, { 'Content-Type': ext ? (TYPES[ext] || 'application/octet-stream') : 'text/html; charset=utf-8' }); fs.createReadStream(f).pipe(rsp); };
      if (opts.fontDelay && ext === '.woff2') setTimeout(send, opts.fontDelay); else send();
    });
    srv.listen(port || 8765, 'localhost', () => res(srv));
  });
}
// headless Edge over a debugging port (Edge 156 closes Playwright's pipe at start-up); close() also deletes its profile
async function edge() {
  const exe = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
  const port = 9400 + Math.floor(Math.random() * 500), ud = path.join(require('os').tmpdir(), 'pw-edge-' + port);
  require('child_process').spawn(exe, ['--headless', '--no-first-run', '--disable-sync', '--hide-scrollbars', '--remote-debugging-port=' + port, '--user-data-dir=' + ud, 'about:blank'], { stdio: 'ignore' });
  // a run that is stopped or times out never reaches close(): its profile (about 0.5 GB) then stayed in the Temp folder
  // (91 such folders, 7 GB, by 13 Nov 2026). The process removes its own profile when it ends, however it ends.
  process.once('exit', () => { try { fs.rmSync(ud, { recursive: true, force: true }); } catch (e) {} });
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.once(sig, () => process.exit(1));
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 250));
    try {
      const b = await pw.chromium.connectOverCDP('http://127.0.0.1:' + port), close = b.close.bind(b);
      b.close = async () => { try { await (await b.newBrowserCDPSession()).send('Browser.close'); } catch (e) {} try { await close(); } catch (e) {} await new Promise(r => setTimeout(r, 500)); try { fs.rmSync(ud, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch (e) {} };
      return b;
    } catch (e) {}
  }
  throw new Error('Edge did not start');
}
// one page of every kind, for the screenshot and layout audits
const KINDS = ['/', '/profiles', '/empire/roman-empire', '/culture/nok-culture', '/religion/buddhism', '/government/absolute-monarchy',
  '/encyclopedia/', '/encyclopedia/battle-of-hastings', '/encyclopedia/glossary', '/state/', '/state/akusha-dargo-union', '/today-in-history/',
  '/today-in-history/july-14', '/countries/', '/countries/france', '/centuries/', '/centuries/15th-century', '/years/', '/years/1453',
  '/people/', '/people/15th-century', '/paths/', '/paths/silk-road', '/speeches/', '/speeches/lincoln-gettysburg-address', '/songs/',
  '/songs/arirang', '/societies/', '/societies/ancient-rome', '/teachers/', '/research-series', '/essays/who-should-rule',
  '/atlas', '/timeline', '/explorer', '/connections', '/quiz', '/games', '/flashcards', '/race', '/inventions', '/governance', '/faiths',
  '/write', '/kids', '/passport', '/start', '/search?q=rome', '/about', '/research', '/dataset', '/community', '/contributors', '/contact'];
module.exports = { serve, edge, pw, ROOT, KINDS };
