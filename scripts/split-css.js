'use strict';
// The stylesheets the pages load: shared.css (389 KB, every style of the site, the one file to edit) split by the pages
// that can use each rule. A page used to load all of it before its first paint, 67 KB compressed; an entry page needed
// a fifth. Measured 29 Oct 2026: from Europe the host sends a 100 KB file in 4.9 s on average, up to 25 s.
//   css/pages.css      the generated pages (entries, states, days, countries, centuries, years, people, paths,
//                      speeches, essays, articles, teachers) and the profiles of every kind
//   css/<page>.css     each hand page (index, games, atlas ... and 404)
// A rule goes into a file when every class and id its selector needs can occur on those pages: in their class and id
// attributes (all of them, not a sample), in their inline scripts, or anywhere in a script they load - by <script src>
// or by naming '/x.js' (lazy loaders: connections-map.js, faith-map.js, scribe.js, test-yourself.js), followed
// recursively; generator.html's template for the profiles, the builder's class strings for the generated pages. Names
// put together in scripts count by their stem ('gm-cl' + n, 'ph-' + kind). Rules keep their order and their @media
// blocks, so a page renders exactly as with the whole file; @font-face, @keyframes and @page go into every file.
// Run after editing shared.css or the markup (build-pages.ps1 runs it at the end of every build):
//   node scripts/split-css.js            write the files that changed
//   node scripts/split-css.js --check    only report files out of date (check-site.ps1; exit code 1)
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = path.resolve(__dirname, '..'), CHECK = process.argv.includes('--check');
const HAND = ['index', 'research', 'research-series', 'about', 'contributors', 'dataset', 'explorer', 'profiles', 'community', 'connections', 'atlas', 'quiz',
  'contact', 'start', 'games', 'kids', 'search', 'timeline', 'passport', 'write', 'faiths', 'flashcards', 'race', '404.html'];
const GENERATED = ['encyclopedia', 'state', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'essays', 'articles', 'teachers'];
const PROFILES = ['empire', 'religion', 'language', 'culture', 'movement'];
// every script counts, data files too: epoch-stats.js looks like data but draws the profiles' radar panel (its title,
// tags and bars), whose rules a first cut without it left out. The data's words add a few rules (0.4 KB), never miss one.

// ── the parser: a flat list of rules and at-blocks in file order, each with the @media/@supports blocks around it ──
function parse(css) {
  const items = []; let i = 0; const n = css.length;
  const skipWs = () => { while (i < n && /\s/.test(css[i])) i++; };
  function readBlock() {   // css[i] is '{': returns the inside, leaves i after the matching '}'
    let depth = 0, j = i, q = null;
    for (; j < n; j++) {
      const c = css[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === '/' && css[j + 1] === '*') j = css.indexOf('*/', j + 2) + 1;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) break;
    }
    const inner = css.slice(i + 1, j); i = j + 1; return inner;
  }
  function readUntil(stop) {
    let j = i, q = null, par = 0;
    for (; j < n; j++) {
      const c = css[j];
      if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c; else if (c === '(') par++; else if (c === ')') par--; else if (!par && stop.includes(c)) break;
    }
    const t = css.slice(i, j); i = j; return t;
  }
  while (true) {
    skipWs(); if (i >= n) break;
    if (css.startsWith('/*', i)) { i = css.indexOf('*/', i + 2) + 2; continue; }
    if (css[i] === '}') { i++; continue; }
    if (css[i] === '@') {
      const prelude = readUntil('{;').trim();
      if (css[i] === ';') { i++; items.push({ at: true, text: prelude + ';', ctx: [] }); continue; }
      if (/^@(media|supports|layer|container)\b/.test(prelude)) { parse(readBlock()).forEach(it => { it.ctx = [prelude].concat(it.ctx); items.push(it); }); continue; }
      items.push({ at: true, text: prelude + ' {' + readBlock() + '}', ctx: [] }); continue;
    }
    const sel = readUntil('{').trim(); items.push({ sel, text: sel + ' {' + readBlock() + '}', ctx: [] });
  }
  return items;
}
function selectors(sel) { const out = []; let d = 0, cur = ''; for (const c of sel) { if (c === '(') d++; else if (c === ')') d--; if (c === ',' && !d) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out.map(s => s.trim()).filter(Boolean); }
function dropParens(s, fns) {   // removes :not(...), :is(...), :where(...): what they name is not required
  let out = '';
  for (let i = 0; i < s.length;) {
    const m = s.slice(i).match(new RegExp('^:(?:' + fns + ')\\('));
    if (m) { let d = 0, j = i + m[0].length - 1; for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) break; } i = j + 1; continue; }
    out += s[i++];
  }
  return out;
}
const needs = s => [...dropParens(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\[[^\]]*\]/g, ''), 'not|is|where|-webkit-any|-moz-any').matchAll(/[.#](-?[_a-zA-Z][\w-]*)/g)].map(m => m[1]);

// ── the names each group of pages can carry ──
const words = (t, into) => { for (const m of t.matchAll(/[A-Za-z_][\w-]*/g)) into.add(m[0]); };
const attrs = (html, into) => { for (const m of html.matchAll(/\s(?:class|id)\s*=\s*(?:"([^"]*)"|'([^']*)'|([\w-]+))/g)) (m[1] ?? m[2] ?? m[3]).split(/\s+/).forEach(x => x && into.add(x)); };
const inline = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const scriptRefs = text => [...text.matchAll(/(?:src="|['"`])\/((?:[\w-]+\/)*[\w.-]+\.js)/g)].map(m => m[1]);   // any folder: /maps/, /data/, /encyclopedia/
const jsWords = {};
function addScripts(refs, into) {   // the scripts and every script they name, recursively
  const seen = new Set(), todo = [...refs];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    const p = path.join(R, f); if (!fs.existsSync(p)) continue;
    if (!jsWords[f]) { const t = fs.readFileSync(p, 'utf8'); jsWords[f] = new Set(); words(t, jsWords[f]); jsWords[f].refs = scriptRefs(t); }
    jsWords[f].forEach(w => into.add(w)); todo.push(...jsWords[f].refs);
  }
}
function addPage(file, into, refs) { const html = fs.readFileSync(file, 'utf8'); attrs(html, into); const s = inline(html); words(s, into); scriptRefs(html).forEach(r => refs.add(r)); scriptRefs(s).forEach(r => refs.add(r)); }
function pagesIn(dir) { const out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...pagesIn(p)); else if (!e.name.startsWith('.') && !path.extname(e.name)) out.push(p); } return out; }
const groups = [];
{ // the generated pages and the profiles share one file
  const u = new Set(), refs = new Set();
  for (const d of GENERATED.concat(PROFILES)) for (const f of pagesIn(path.join(R, d))) addPage(f, u, refs);
  const gen = fs.readFileSync(path.join(R, 'generator.html'), 'utf8'), gs = inline(gen); words(gs, u); scriptRefs(gs).forEach(r => refs.add(r));
  const b = fs.readFileSync(path.join(R, 'scripts', 'build-pages.ps1'), 'utf8');
  for (const m of b.matchAll(/class=`?["']([^"'`]+)/g)) m[1].split(/\s+/).forEach(x => /^[\w-]+$/.test(x) && u.add(x));
  addScripts(refs, u); groups.push({ name: 'pages', who: 'the generated pages and the profiles', u });
}
for (const h of HAND) {
  const f = path.join(R, h); if (!fs.existsSync(f)) continue;
  const u = new Set(), refs = new Set(); addPage(f, u, refs); addScripts(refs, u);
  groups.push({ name: h.replace(/\.html$/, ''), who: '/' + (h === 'index' ? '' : h.replace(/\.html$/, '')), u });
}
function present(name, u, stems) {
  if (u.has(name)) return true;
  const d = name.replace(/\d+$/, ''); if (d !== name && u.has(d)) return true;   // 'gm-cl' + n
  for (let k = name.length - 1; k > 1; k--) if (name[k - 1] === '-' && stems.has(name.slice(0, k))) return true;   // 'ph-' + kind
  return false;
}

// ── write ──
const css = fs.readFileSync(path.join(R, 'shared.css'), 'utf8'), items = parse(css);
if (!items.length) throw new Error('shared.css: nothing parsed');
const out = path.join(R, 'css'); if (!CHECK) fs.mkdirSync(out, { recursive: true });
const stale = [], report = [];
for (const g of groups) {
  const stems = new Set([...g.u].filter(w => w.endsWith('-')));
  const keep = items.filter(it => it.at || selectors(it.sel).some(s => needs(s).every(nm => present(nm, g.u, stems))));
  let text = '/* Generated by scripts/split-css.js from shared.css: the rules ' + g.who + ' can use. Do not edit: edit shared.css, then run node scripts/split-css.js. */\n';
  let open = [];
  for (const it of keep) {   // consecutive rules in the same @media blocks share them, as in shared.css
    let k = 0; while (k < open.length && k < it.ctx.length && open[k] === it.ctx[k]) k++;
    text += '}\n'.repeat(open.length - k); for (let j = k; j < it.ctx.length; j++) text += it.ctx[j] + ' {\n';
    open = it.ctx; text += it.text + '\n';
  }
  text += '}\n'.repeat(open.length);
  const file = path.join(out, g.name + '.css'), now = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (now !== text) { stale.push('css/' + g.name + '.css'); if (!CHECK) fs.writeFileSync(file, text); }
  report.push(('css/' + g.name + '.css').padEnd(26) + String(keep.filter(x => !x.at).length).padStart(5) + ' rules ' + String(Math.round(text.length / 1024)).padStart(4) + ' KB, gzip ' + (zlib.gzipSync(text, { level: 9 }).length / 1024).toFixed(1) + ' KB');
}
if (CHECK) {
  if (stale.length) { console.log('out of date (run node scripts/split-css.js): ' + stale.join(' ')); process.exit(1); }
  console.log('css/: ' + groups.length + ' files, all up to date');
} else {
  console.log('shared.css: ' + items.filter(x => !x.at).length + ' rules, ' + Math.round(css.length / 1024) + ' KB, gzip ' + (zlib.gzipSync(css, { level: 9 }).length / 1024).toFixed(1) + ' KB');
  report.forEach(l => console.log('  ' + l));
  console.log(stale.length ? 'written: ' + stale.join(' ') : 'no file changed');
}
