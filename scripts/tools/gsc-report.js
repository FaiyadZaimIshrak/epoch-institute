// Search Console, read by kind of page (Nov 2026, the impressions plan): point it at a folder holding the CSV files of
// Search Console's exports (Performance > Export > CSV gives Queries.csv, Pages.csv, Dates.csv …; Indexing > Pages and each
// reason's own page give Table.csv / Chart.csv / "Critical issues.csv"; files may be renamed and kept in subfolders).
//   node scripts/tools/gsc-report.js <export folder> [--out=docs/SEO-BASELINE.md]
// Prints and writes: impressions, clicks, CTR and average position per kind of page (the first folder of the address:
// encyclopedia, empire, today-in-history, songs …; the root pages by name); the queries with the most impressions whose
// CTR is under 2% (their pages' titles and descriptions come first in the rewrites); the pages with most impressions;
// the indexing reasons with their counts and the kinds of the example URLs under each.
const fs = require('fs'), path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('usage: gsc-report.js <export folder> [--out=file.md]'); process.exit(1); }
const OUT = (process.argv.find(a => a.startsWith('--out=')) || '').slice(6);
// a small CSV reader (quoted fields, commas inside quotes)
function csv(t) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
const files = []; (function walk(d) { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.csv$/i.test(n)) files.push(p); } })(dir);
const num = s => +String(s || '').replace(/[%,\s]/g, '') || 0;
const kindOf = u => { try { const p = new URL(u).pathname.replace(/^\/|\/$/g, ''); if (!p) return 'home'; const a = p.split('/'); return a.length > 1 ? a[0] : 'root: ' + a[0]; } catch (e) { return 'other'; } };
const pages = [], queries = [], idx = [];
for (const f of files) {
  const r = csv(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')); if (!r.length) continue;
  const h = r[0].map(x => x.trim().toLowerCase()), col = n => h.findIndex(x => x === n || x.startsWith(n));
  if (col('top pages') >= 0 || (col('page') >= 0 && col('impressions') >= 0)) {
    const a = col('top pages') >= 0 ? col('top pages') : col('page');
    for (const x of r.slice(1)) pages.push({ u: x[a], c: num(x[col('clicks')]), i: num(x[col('impressions')]), p: num(x[col('position')]) });
  } else if (col('top queries') >= 0 || (col('query') >= 0 && col('impressions') >= 0)) {
    const a = col('top queries') >= 0 ? col('top queries') : col('query');
    for (const x of r.slice(1)) queries.push({ q: x[a], c: num(x[col('clicks')]), i: num(x[col('impressions')]), p: num(x[col('position')]) });
  } else if (col('reason') >= 0 && col('pages') >= 0) {
    for (const x of r.slice(1)) idx.push({ reason: x[col('reason')], n: num(x[col('pages')]), src: path.basename(f) });
  } else if (col('url') >= 0) {
    // a reason's own export: its URLs; the reason is the file's folder or name
    const reason = path.basename(path.dirname(f)) === path.basename(dir) ? path.basename(f, '.csv') : path.basename(path.dirname(f));
    for (const x of r.slice(1)) idx.push({ reason, url: x[col('url')] });
  }
}
const L = [], say = s => { L.push(s); };
const pct = (c, i) => i ? (100 * c / i).toFixed(1) + '%' : '-';
say('# Search Console baseline (' + new Date().toISOString().slice(0, 10) + ')\n');
say('Read ' + files.length + ' CSV files: ' + pages.length + ' pages, ' + queries.length + ' queries, ' + idx.length + ' indexing rows.\n');
if (pages.length) {
  const by = {}; for (const p of pages) { const k = kindOf(p.u); const b = by[k] = by[k] || { k, n: 0, c: 0, i: 0, pw: 0 }; b.n++; b.c += p.c; b.i += p.i; b.pw += p.p * p.i; }
  const T = pages.reduce((a, p) => ({ c: a.c + p.c, i: a.i + p.i }), { c: 0, i: 0 });
  say('## By kind of page\n\nAll: ' + T.i + ' impressions, ' + T.c + ' clicks, CTR ' + pct(T.c, T.i) + '.\n');
  say('| Kind | Pages with impressions | Impressions | Clicks | CTR | Avg position |\n|---|---|---|---|---|---|');
  for (const b of Object.values(by).sort((a, b) => b.i - a.i)) say('| ' + b.k + ' | ' + b.n + ' | ' + b.i + ' | ' + b.c + ' | ' + pct(b.c, b.i) + ' | ' + (b.i ? (b.pw / b.i).toFixed(1) : '-') + ' |');
  say('\n## Pages with the most impressions\n\n| Page | Impressions | Clicks | CTR | Position |\n|---|---|---|---|---|');
  for (const p of pages.slice().sort((a, b) => b.i - a.i).slice(0, 30)) say('| ' + p.u.replace('https://the-epoch-institute.org', '') + ' | ' + p.i + ' | ' + p.c + ' | ' + pct(p.c, p.i) + ' | ' + p.p.toFixed(1) + ' |');
}
if (queries.length) {
  say('\n## Queries shown often but rarely clicked (CTR under 2%): rewrite these pages\' titles first\n\n| Query | Impressions | Clicks | CTR | Position |\n|---|---|---|---|---|');
  for (const q of queries.filter(q => q.i >= 10 && q.c / q.i < 0.02).sort((a, b) => b.i - a.i).slice(0, 50)) say('| ' + q.q + ' | ' + q.i + ' | ' + q.c + ' | ' + pct(q.c, q.i) + ' | ' + q.p.toFixed(1) + ' |');
  say('\n## Queries with most clicks\n\n| Query | Clicks | Impressions | Position |\n|---|---|---|---|');
  for (const q of queries.slice().sort((a, b) => b.c - a.c).slice(0, 20)) say('| ' + q.q + ' | ' + q.c + ' | ' + q.i + ' | ' + q.p.toFixed(1) + ' |');
}
if (idx.length) {
  say('\n## Indexing\n');
  const counts = idx.filter(x => x.n != null); if (counts.length) { say('| Reason | Pages |\n|---|---|'); for (const x of counts) say('| ' + x.reason + ' | ' + x.n + ' |'); }
  const urls = idx.filter(x => x.url), byR = {};
  for (const x of urls) { const r = byR[x.reason] = byR[x.reason] || {}; const k = kindOf(x.url); r[k] = (r[k] || 0) + 1; }
  for (const [r, ks] of Object.entries(byR)) say('\n**' + r + '** (example URLs by kind): ' + Object.entries(ks).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(', '));
}
const md = L.join('\n') + '\n'; console.log(md);
if (OUT) { fs.writeFileSync(OUT, md); console.error('written ' + OUT); }
