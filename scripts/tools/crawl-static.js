// Reads every page of the site as deployed (root pages, the generated folders, the profiles) and lists what check-site.ps1
// does not look at: local resources that do not exist (img src/srcset, script src, link href, poster, og:image), text
// left over from templates or data ("undefined", "NaN", "[object Object]", "[[e:", "{{", a stray "null"), mojibake
// ("Ã©", "â€™"), entities escaped twice ("&amp;amp;", "&amp;#"), JSON-LD that does not parse, ids used twice in a page,
// empty links, and pictures without alt.   node scripts/tools/crawl-static.js [--json=out.json] [--max=N per rule] [--strict]
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)=?(.*)$/); return m ? [m[1], m[2] || true] : [a, true]; }));
const MAX = +args.max || 12;
const ROOTPAGES = ['index', 'research', 'research-series', 'about', 'contributors', 'dataset', 'explorer', 'profiles', 'community', 'connections',
  'atlas', 'quiz', 'contact', 'start', 'games', 'kids', 'search', 'timeline', 'passport', 'weekly', 'write', 'faiths', 'flashcards', 'race',
  'inventions', 'governance', 'compare', 'new', 'today-card', '404.html', 'offline.html'];
const FOLDERS = ['encyclopedia', 'state', 'today-in-history', 'countries', 'centuries', 'paths', 'speeches', 'years', 'people', 'teachers',
  'societies', 'songs', 'essays', 'articles', 'empire', 'religion', 'language', 'culture', 'movement', 'government', 'ideology', 'work'];
const files = [];
for (const p of ROOTPAGES) if (fs.existsSync(path.join(R, p))) files.push(p);
function walk(d) {
  for (const n of fs.readdirSync(path.join(R, d), { withFileTypes: true })) {
    const rel = d + '/' + n.name;
    if (n.isDirectory()) walk(rel);
    else if (!n.name.startsWith('.') && (!path.extname(n.name) || n.name.endsWith('.html'))) files.push(rel);
  }
}
for (const d of FOLDERS) if (fs.existsSync(path.join(R, d))) walk(d);
const found = {}; let pages = 0;
const add = (rule, page, what) => { (found[rule] = found[rule] || []).push(page + ' :: ' + String(what).slice(0, 160)); };
const exists = new Map();
function localOk(u) {
  if (!u || /^(https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/.test(u)) return true;
  if (!u.startsWith('/')) return true; // relative: the root pages have none that matter
  let p = decodeURIComponent(u.split('#')[0].split('?')[0]);
  if (exists.has(p)) return exists.get(p);
  let f = path.join(R, p), ok = fs.existsSync(f);
  if (ok && fs.statSync(f).isDirectory()) ok = fs.existsSync(path.join(f, 'index'));
  exists.set(p, ok); return ok;
}
const strip = h => h.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
for (const rel of files) {
  const html = fs.readFileSync(path.join(R, rel), 'utf8'); pages++;
  const page = '/' + rel.replace(/\/index$/, '/').replace(/^index$/, '');
  // resources
  const noJs = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => m.slice(0, m.indexOf('>') + 1));
  for (const m of noJs.matchAll(/<(img|script|source|link|video|audio|iframe)\b[^>]*?\b(src|href|poster)="([^"]+)"/gi)) {
    if (/^link$/i.test(m[1]) && /rel="(canonical|alternate|preconnect|dns-prefetch)"/.test(m[0])) continue;
    if (!localOk(m[3])) add('missing resource', page, m[1] + ' ' + m[3]);
  }
  for (const m of html.matchAll(/\bsrcset="([^"]+)"/gi)) for (const c of m[1].split(',')) { const u = c.trim().split(/\s+/)[0]; if (!localOk(u)) add('missing resource', page, 'srcset ' + u); }
  for (const m of html.matchAll(/<meta\s+(?:property|name)="(?:og:image|twitter:image)"\s+content="https:\/\/the-epoch-institute\.org(\/[^"]+)"/gi)) if (!localOk(m[1])) add('missing poster', page, m[1]);
  for (const m of html.matchAll(/<image\b[^>]*\bhref="([^"]+)"/gi)) if (!localOk(m[1])) add('missing resource', page, 'svg image ' + m[1]);
  // visible text
  // the cite box (details.ref-cite) holds the access date only once a script fills it in: not read for text
  const body = strip(html), text = body.replace(/<details class="ref-cite"[\s\S]*?<\/details>/g, ' ').replace(/<\/?(?:a|span|em|strong|i|b|abbr|sup|sub|small|cite|mark|q|bdi|time)\b[^>]*>/gi, '').replace(/<[^>]+>/g, ' ');
  const t = (re, rule) => { const m = text.match(re); if (m) add(rule, page, text.slice(Math.max(0, m.index - 50), m.index + 70).replace(/\s+/g, ' ')); };
  t(/\bundefined\b/, 'text: undefined');
  t(/\bNaN\b/, 'text: NaN');
  t(/\[object \w+\]/, 'text: [object]');
  t(/\[\[[es]:|\{\{|\}\}/, 'text: template markup');
  { const m = body.match(/>\s*(?:null|undefined|NaN)\s*</); if (m) add('text: a bare null/undefined/NaN', page, body.slice(Math.max(0, m.index - 80), m.index + 40).replace(/\s+/g, ' ')); }
  t(/Ã[\u0080-¿©¨§¡³¶¼½¾]|â€[™œ“”˜¦\u009d]|Â[ -¿]/, 'text: mojibake');
  t(/&amp;(?:amp|quot|lt|gt|#\d+|nbsp);/, 'text: escaped twice');
  t(/�/, 'text: replacement character');
  { const tx = text.replace(/Accessed \./g, '').replace(/\(Accessed: \)/g, '').replace(/\. \. \./g, '…').replace(/\.\.\./g, '…'); const m = tx.match(/ ,| \.(?![\d.])|,,|\.\.|\( | \)/); if (m) add('text: stray spacing', page, tx.slice(Math.max(0, m.index - 50), m.index + 70).replace(/\s+/g, ' ')); }
  t(/\b(?:the editor (?:may|should|wants)|as instructed|EDITOR FIRST|IMPORT:|the import's|before publishing)/, 'text: a note to the editor');
  // attributes and structure
  const ids = {}; for (const m of body.matchAll(/\sid="([^"]+)"/g)) ids[m[1]] = (ids[m[1]] || 0) + 1;
  const dup = Object.keys(ids).filter(k => ids[k] > 1); if (dup.length) add('duplicate id', page, dup.slice(0, 6).join(', '));
  for (const m of body.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)) add('img without alt', page, m[0].slice(0, 120));
  for (const m of body.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>(\s*)<\/a>/gi)) if (!/aria-label|title=/.test(m[0])) add('empty link', page, m[0].slice(0, 120));
  for (const m of body.matchAll(/<a\b[^>]*\bhref=""/gi)) add('empty href', page, m[0].slice(0, 120));
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch (e) { add('JSON-LD does not parse', page, e.message); } }
  if (!/<html[^>]*\blang="/.test(html)) add('no lang on html', page, '');
}
const rules = Object.keys(found).sort((a, b) => found[b].length - found[a].length);
console.log(pages + ' pages read');
for (const r of rules) {
  console.log('\n## ' + r + ': ' + found[r].length);
  for (const l of found[r].slice(0, MAX)) console.log('  ' + l);
}
if (args.json) fs.writeFileSync(args.json, JSON.stringify(found, null, 1));
// --strict (the deploy workflow): exit 1 when any rule but stray spacing found something; spacing is listed for reading
// (credits keep a few spaced dots of their sources) but never blocks a deploy
const SOFT = ['text: stray spacing'];
if (args.strict) { const hard = rules.filter(r => !SOFT.includes(r)); if (hard.length) { console.log('\nstrict: ' + hard.join(', ')); process.exit(1); } }
