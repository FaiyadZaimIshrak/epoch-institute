// The scoreboard of the growth plan (14 Nov 2026): two Search Console performance exports compared.
//   node scripts/tools/gsc-compare.js <older export folder> <newer export folder> [--out=<newer folder>/compare.md]
// (never write the report into the repository: it is public). Each folder holds Pages.csv, Queries.csv and Chart.csv
// of Performance > Export. Figures are per day (an export's days are counted from its Chart.csv), so exports of
// different lengths compare. It prints:
//   - the whole site and each kind of page: impressions, clicks, click rate and position, before and after;
//   - the entries told in more detail (scripts/entry-more.json) against the entries considered and not deepened
//     (the rest of scripts/entries/more*/list.tsv): did the longer pages move up?
//   - the click rate by position band, before and after;
//   - the pages that rose and fell most (position, among pages with 50 impressions in either export);
//   - queries that are new or gone (20 impressions or more).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [A, B] = process.argv.slice(2).filter(a => !a.startsWith('--')), OUT = (process.argv.find(a => a.startsWith('--out=')) || '').slice(6);
if (!A || !B) { console.error('usage: gsc-compare.js <older folder> <newer folder> [--out=file.md]'); process.exit(1); }
function csv(t) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f || row.length) { row.push(f); rows.push(row); } return rows.filter(r => r.some(x => x.trim())); }
const num = s => +String(s || '').replace(/[%,\s]/g, '') || 0;
function load(dir) {
  const read = n => { const f = path.join(dir, n); return fs.existsSync(f) ? csv(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : []; };
  const table = n => { const r = read(n); if (!r.length) return []; const h = r[0].map(x => x.trim().toLowerCase()), c = k => h.findIndex(x => x.startsWith(k)); return r.slice(1).map(x => ({ k: x[0], c: num(x[c('clicks')]), i: num(x[c('impressions')]), p: num(x[c('position')]) })); };
  const chart = read('Chart.csv'), days = Math.max(1, chart.length - 1);
  return { days, pages: table('Pages.csv'), queries: table('Queries.csv'), from: (chart[1] || [''])[0], to: (chart[chart.length - 1] || [''])[0] };
}
const a = load(A), b = load(B);
const kindOf = u => { try { const p = new URL(u).pathname.replace(/^\/|\/$/g, ''); if (!p) return 'home'; const s = p.split('/'); return s.length > 1 ? s[0] : 'root: ' + s[0]; } catch (e) { return 'other'; } };
const sum = rows => rows.reduce((t, r) => ({ c: t.c + r.c, i: t.i + r.i, pw: t.pw + r.p * r.i, n: t.n + 1 }), { c: 0, i: 0, pw: 0, n: 0 });
const pct = t => t.i ? (100 * t.c / t.i).toFixed(2) + '%' : '-', pos = t => t.i ? (t.pw / t.i).toFixed(1) : '-', day = (v, d) => (v / d).toFixed(v / d < 10 ? 1 : 0);
const L = [], say = s => L.push(s);
const row = (name, x, y) => '| ' + name + ' | ' + day(x.i, a.days) + ' → ' + day(y.i, b.days) + ' | ' + day(x.c, a.days) + ' → ' + day(y.c, b.days) + ' | ' + pct(x) + ' → ' + pct(y) + ' | ' + pos(x) + ' → ' + pos(y) + ' | ' + x.n + ' → ' + y.n + ' |';
const HEAD = '| | Impressions a day | Clicks a day | Click rate | Position | Pages |\n|---|---|---|---|---|---|';
say('# Search Console: ' + (a.from || path.basename(A)) + '–' + a.to + ' (' + a.days + ' days) against ' + (b.from || path.basename(B)) + '–' + b.to + ' (' + b.days + ' days)\n');
say('## The site and each kind of page\n\n' + HEAD); say(row('**All pages**', sum(a.pages), sum(b.pages)));
const kinds = {}; for (const [s, rows] of [['a', a.pages], ['b', b.pages]]) for (const r of rows) { const k = kindOf(r.k); (kinds[k] = kinds[k] || { a: [], b: [] })[s].push(r); }
for (const [k, v] of Object.entries(kinds).sort((x, y) => sum(y[1].b).i + sum(y[1].a).i - sum(x[1].b).i - sum(x[1].a).i).slice(0, 18)) say(row(k, sum(v.a), sum(v.b)));
// the deepened entries and their control group
let more = {}; try { more = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'entry-more.json'), 'utf8')); } catch (e) {}
const listed = new Set(); const ed = path.join(R, 'scripts', 'entries'); if (fs.existsSync(ed)) for (const d of fs.readdirSync(ed)) { const f = path.join(ed, d, 'list.tsv'); if (/^more\d/.test(d) && fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const s = l.split('\t')[0].trim(); if (s && !s.startsWith('#')) listed.add(s); } }
const slugOf = u => (u.match(/\/encyclopedia\/([a-z0-9-]+)$/) || [])[1];
const pick = (rows, set) => rows.filter(r => set.has(slugOf(r.k)));
const deep = new Set(Object.keys(more)), ctl = new Set([...listed].filter(s => !deep.has(s)));
if (deep.size) { say('\n## Entries told in more detail (' + deep.size + ') against those considered and left short (' + ctl.size + ')\n\n' + HEAD);
  say(row('Told in more detail', sum(pick(a.pages, deep)), sum(pick(b.pages, deep)))); say(row('Left short (control)', sum(pick(a.pages, ctl)), sum(pick(b.pages, ctl))));
  say(row('Every other entry', sum(a.pages.filter(r => slugOf(r.k) && !deep.has(slugOf(r.k)) && !ctl.has(slugOf(r.k)))), sum(b.pages.filter(r => slugOf(r.k) && !deep.has(slugOf(r.k)) && !ctl.has(slugOf(r.k)))))); }
// click rate by position
say('\n## Click rate by position\n\n| Position | Impressions a day | Click rate |\n|---|---|---|');
for (const [lo, hi] of [[1, 3], [3, 5], [5, 7], [7, 10], [10, 20], [20, 200]]) { const f = rows => sum(rows.filter(r => r.p >= lo && r.p < hi)), x = f(a.pages), y = f(b.pages); say('| ' + lo + '–' + hi + ' | ' + day(x.i, a.days) + ' → ' + day(y.i, b.days) + ' | ' + pct(x) + ' → ' + pct(y) + ' |'); }
// movers
const A1 = new Map(a.pages.map(r => [r.k, r])), mov = [];
for (const r of b.pages) { const o = A1.get(r.k); if (o && (o.i >= 50 || r.i >= 50) && o.p && r.p) mov.push([o.p - r.p, r.k, o, r]); }
const short = u => u.replace('https://the-epoch-institute.org', '') || '/';
const mrow = m => '| ' + short(m[1]) + ' | ' + m[2].p.toFixed(1) + ' → ' + m[3].p.toFixed(1) + ' | ' + day(m[2].i, a.days) + ' → ' + day(m[3].i, b.days) + ' | ' + day(m[2].c, a.days) + ' → ' + day(m[3].c, b.days) + ' |';
say('\n## Pages that rose most\n\n| Page | Position | Impressions a day | Clicks a day |\n|---|---|---|---|'); for (const m of mov.slice().sort((x, y) => y[0] - x[0]).slice(0, 20)) say(mrow(m));
say('\n## Pages that fell most\n\n| Page | Position | Impressions a day | Clicks a day |\n|---|---|---|---|'); for (const m of mov.slice().sort((x, y) => x[0] - y[0]).slice(0, 20)) say(mrow(m));
// queries
const QA = new Set(a.queries.map(q => q.k)), QB = new Set(b.queries.map(q => q.k));
say('\n## New queries (20 impressions or more)\n\n| Query | Impressions | Clicks | Position |\n|---|---|---|---|'); for (const q of b.queries.filter(q => !QA.has(q.k) && q.i >= 20).sort((x, y) => y.i - x.i).slice(0, 30)) say('| ' + q.k + ' | ' + q.i + ' | ' + q.c + ' | ' + q.p.toFixed(1) + ' |');
say('\n## Queries no longer shown (20 impressions or more before)\n\n| Query | Impressions | Clicks | Position |\n|---|---|---|---|'); for (const q of a.queries.filter(q => !QB.has(q.k) && q.i >= 20).sort((x, y) => y.i - x.i).slice(0, 30)) say('| ' + q.k + ' | ' + q.i + ' | ' + q.c + ' | ' + q.p.toFixed(1) + ' |');
const md = L.join('\n') + '\n'; console.log(md);
if (OUT) { if (path.resolve(OUT).startsWith(path.resolve(R))) { console.error('not written: the repository is public'); process.exit(1); } fs.writeFileSync(OUT, md); console.error('written ' + OUT); }
