// SEO audit of the built site (reads the files, no server): what check-site.ps1 does not look at, because it needs the
// whole site at once.
//   TITLE-LONG   a title over 70 characters (Google cuts it)          TITLE-DUP   two pages with the same title
//   DESC-SHORT   a description under 70 characters                   DESC-DUP    two pages with the same description
//   ORPHAN       a page no other page links to (only the sitemap leads there)
//   NOT-IN-MAP   an indexable page missing from the sitemaps           NOINDEX-IN-MAP  a noindex page listed in them
//   ALT          an <img> without an alt attribute (alt="" is right for a decoration and is not counted)
// Prints the counts and the first examples of each; --all prints every one.
//   node scripts/tools/seo-audit.js [--all]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ALL = process.argv.includes('--all');
const SITE = 'https://the-epoch-institute.org';
const HAND = ['index', 'research', 'research-series', 'about', 'contributors', 'dataset', 'explorer', 'profiles', 'community', 'connections', 'atlas', 'quiz',
  'contact', 'start', 'games', 'kids', 'search', 'timeline', 'passport', 'write', 'faiths', 'flashcards', 'race', 'inventions', 'governance'];
const FOLDERS = ['encyclopedia', 'state', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'essays', 'articles', 'teachers',
  'societies', 'songs', 'empire', 'religion', 'language', 'culture', 'movement', 'government', 'ideology', 'work'];
const files = HAND.map(f => [f, f === 'index' ? '/' : '/' + f]);
const walk = (dir, url) => { for (const e of fs.readdirSync(path.join(R, dir), { withFileTypes: true })) {
  if (e.isDirectory()) walk(dir + '/' + e.name, url + '/' + e.name);
  else if (!e.name.includes('.')) files.push([dir + '/' + e.name, e.name === 'index' ? url + '/' : url + '/' + e.name]); } };
for (const d of FOLDERS) if (fs.existsSync(path.join(R, d))) walk(d, '/' + d);
const issues = {}; const add = (k, s) => (issues[k] = issues[k] || []).push(s);
const titles = new Map(), descs = new Map(), inbound = new Map(), pages = new Map();
const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
for (const [f, url] of files) {
  const h = fs.readFileSync(path.join(R, f), 'utf8');
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(h);
  pages.set(url, { noindex });
  const t = (h.match(/<title>([^<]*)<\/title>/) || [])[1], d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!noindex) {
    if (t) { const tt = dec(t); if (tt.length > 70) add('TITLE-LONG', url + '  (' + tt.length + ') ' + tt); (titles.get(tt) || titles.set(tt, []).get(tt)).push(url); }
    if (d) { const dd = dec(d); if (dd.length < 70) add('DESC-SHORT', url + '  ' + dd); (descs.get(dd) || descs.set(dd, []).get(dd)).push(url); }
  }
  const body = h.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');   // nor what a comment holds
  for (const m of body.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) add('ALT', url + '  ' + m[0].slice(0, 90));
  for (const m of body.matchAll(/href="(\/[^"#?]*)/g)) { let u = m[1]; if (u !== url) inbound.set(u, (inbound.get(u) || 0) + 1); }
}
for (const [t, us] of titles) if (us.length > 1) add('TITLE-DUP', us.length + ' pages: ' + t + '  (' + us.slice(0, 3).join(', ') + ')');
for (const [d, us] of descs) if (us.length > 1) add('DESC-DUP', us.length + ' pages: ' + d.slice(0, 80) + '  (' + us.slice(0, 3).join(', ') + ')');
// the sitemaps
const inMap = new Set();
const smDir = path.join(R, 'sitemaps');
for (const f of fs.readdirSync(smDir)) for (const m of fs.readFileSync(path.join(smDir, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) inMap.add(m[1].replace(SITE, ''));
for (const [url, p] of pages) {
  if (!p.noindex && !inMap.has(url)) add('NOT-IN-MAP', url);
  if (p.noindex && inMap.has(url)) add('NOINDEX-IN-MAP', url);
  if (!p.noindex && url !== '/' && !inbound.get(url) && !inbound.get(url.replace(/\/$/, ''))) add('ORPHAN', url);
}
console.log(files.length + ' pages read');
for (const k of ['TITLE-LONG', 'TITLE-DUP', 'DESC-SHORT', 'DESC-DUP', 'ORPHAN', 'NOT-IN-MAP', 'NOINDEX-IN-MAP', 'ALT']) {
  const l = issues[k] || []; console.log(k.padEnd(15), l.length);
  for (const s of l.slice(0, ALL ? 1e9 : 6)) console.log('   ', s.slice(0, 170));
}
