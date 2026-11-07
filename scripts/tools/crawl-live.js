// Asks the live site for a sample of its addresses and lists what the server gets wrong: a status other than the one
// expected, a page not sent as text/html, a script or stylesheet without its type, a missing cache header, a redirect to
// the wrong place, and every sitemap file's URLs that answer 404 (a sample of each). Slow host: one request at a time.
//   node scripts/tools/crawl-live.js [--per=3] [--base=https://the-epoch-institute.org]
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const opt = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=?(.*)$/); return m ? [m[1], m[2] || true] : [a, true]; }));
const BASE = opt.base || 'https://the-epoch-institute.org', PER = +opt.per || 3;
const UA = { 'User-Agent': 'EpochInstitute-check/1.0 (site self-check)' };
const ROOTP = fs.readFileSync(path.join(R, 'scripts', 'deploy.sh'), 'utf8').match(/^PAGES=\(([^)]+)\)/m)[1].split(/\s+/).filter(Boolean);
const checks = [];
for (const p of ROOTP) checks.push([p === 'index' ? '/' : '/' + p, 200, /text\/html/]);
const FOLDERS = ['encyclopedia', 'state', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'teachers',
  'societies', 'songs', 'empire', 'religion', 'language', 'culture', 'movement', 'government', 'ideology', 'work', 'essays'];
let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (const f of FOLDERS) {
  const d = path.join(R, f); if (!fs.existsSync(d)) continue;
  if (fs.existsSync(path.join(d, 'index'))) { checks.push(['/' + f + '/', 200, /text\/html/]); checks.push(['/' + f, 301, null, '/' + f + '/']); }
  const all = fs.readdirSync(d).filter(n => !n.startsWith('.') && n !== 'index' && !path.extname(n));
  for (let i = 0; i < PER && all.length; i++) checks.push(['/' + f + '/' + all.splice(Math.floor(rnd() * all.length), 1)[0], 200, /text\/html/]);
}
for (const [u, t] of [['/shared.css', /text\/css/], ['/shared-nav.js', /javascript/], ['/css/pages.css', /text\/css/], ['/data/days/01-01.json', /javascript/],
  ['/sitemap.xml', /xml/], ['/feeds/today.xml', /xml/], ['/llms.txt', /text\/plain/], ['/favicon.ico', /icon/], ['/manifest.json', /json|javascript/], ['/sw.js', /javascript/]]) checks.push([u, 200, t]);
checks.push(['/no-such-page-' + Date.now(), 404, /text\/html/]);
checks.push(['/generator.html', 404, null]);
checks.push(['/articles/sati-pratha', 410, null]);
(async () => {
  const bad = [];
  for (const [u, status, type, loc] of checks) {
    let r; try { r = await fetch(BASE + u, { headers: UA, redirect: 'manual' }); } catch (e) { bad.push(u + ' :: ' + e.message); continue; }
    const ct = r.headers.get('content-type') || '', cc = r.headers.get('cache-control') || '';
    if (r.status !== status) bad.push(u + ' :: status ' + r.status + ', expected ' + status + (r.headers.get('location') ? ' -> ' + r.headers.get('location') : ''));
    else if (type && !type.test(ct)) bad.push(u + ' :: content-type "' + ct + '"');
    if (loc && r.headers.get('location') && !r.headers.get('location').endsWith(loc)) bad.push(u + ' :: redirects to ' + r.headers.get('location'));
    if (status === 200 && !cc && !/xml|ico/.test(ct)) bad.push(u + ' :: no Cache-Control');
    try { await r.arrayBuffer(); } catch (e) {}
  }
  // sitemaps: a sample of each file's addresses must answer 200
  const idx = await (await fetch(BASE + '/sitemap.xml', { headers: UA })).text();
  for (const sm of [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])) {
    const xml = await (await fetch(sm, { headers: UA })).text(); const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    for (let i = 0; i < Math.min(PER * 2, locs.length); i++) {
      const u = locs[Math.floor(rnd() * locs.length)];
      const r = await fetch(u, { headers: UA, redirect: 'manual' }); try { await r.arrayBuffer(); } catch (e) {}
      if (r.status !== 200) bad.push('sitemap ' + sm.replace(BASE, '') + ': ' + u.replace(BASE, '') + ' :: ' + r.status);
    }
  }
  console.log(checks.length + ' addresses checked, ' + bad.length + ' problems');
  for (const b of bad) console.log('  ' + b);
})();
