// Checks the longer texts of entries (MORE-GUIDE.md) against their saved articles, for the editor to read first, and
// with --write gathers them into scripts/entry-more.json, which build-pages.ps1 puts on the entry pages ("enc-more").
//   node scripts/entries/check-more.js <round dir> [--write] [--drop=slug,slug]
// <round dir> holds wp/<slug>.txt and out/<slug>.json. Flags: a heading off the list or used twice, word counts,
// HTML or Markdown, "BC"/"AD", month-first dates, hype words, a sentence copied from the entry's own description, and
// every number and capitalised name the article does not contain (accents and case folded).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2), dir = argv.find(a => !a.startsWith('--')), WRITE = argv.includes('--write');
const DROP = new Set(((argv.find(a => a.startsWith('--drop=')) || '').slice(7)).split(',').filter(Boolean));
if (!dir) { console.error('usage: check-more.js <round dir> [--write] [--drop=…]'); process.exit(1); }
const HEADS = ['Early life and background', 'Career', 'Reign', 'Works and ideas', 'Death and legacy', 'Background', 'Course of events', 'Terms', 'Aftermath and significance', 'Setting', 'History', 'The place today', 'Origins', 'Organisation and way of life', 'Legacy', 'Contents', 'What it is', 'How it was used', 'Reception and legacy', 'Discovery and study'];
const HYPE = /\b(famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|stunning|magnificent|greatest|incredible|amazing)\b/i;
const MONTH = 'January|February|March|April|May|June|July|August|September|October|November|December';
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
const all = {}; let n = 0, bad = 0, skipped = 0, words = 0;
for (const f of fs.readdirSync(path.join(dir, 'out')).filter(x => x.endsWith('.json')).sort()) {
  const slug = f.slice(0, -5), out = []; let o;
  try { o = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8')); } catch (x) { console.log(slug + ': NOT JSON'); bad++; continue; }
  if (o.skip) { skipped++; console.log(slug + ': skipped by the writer: ' + o.skip); continue; }
  if (DROP.has(slug)) { skipped++; continue; }
  n++; const e = by[slug]; if (!e) out.push('no such entry');
  if (o.slug !== slug) out.push('slug ' + o.slug);
  const secs = o.sections || []; if (secs.length < 2 || secs.length > 3) out.push(secs.length + ' sections');
  const seen = new Set(); let w = 0; const txt = [];
  for (const s of secs) {
    if (!HEADS.includes(s.h)) out.push('heading "' + s.h + '"'); if (seen.has(s.h)) out.push('heading twice: ' + s.h); seen.add(s.h);
    for (const p of s.p || []) { const pw = p.split(/\s+/).length; w += pw; txt.push(p); if (pw < 30 || pw > 125) out.push('a paragraph of ' + pw + ' words'); if (/<[a-z/]|\*\*|^[-*#] /im.test(p)) out.push('HTML or Markdown'); }
  }
  const t = txt.join(' '); if (w < 220 || w > 460) out.push(w + ' words'); words += w;
  if (/\b(BC|AD)\b/.test(t)) out.push('BC/AD'); const mf = t.match(new RegExp('\\b(?:' + MONTH + ') \\d{1,2}(?:,| \\d{4})')); if (mf) out.push('month-first date: ' + mf[0]);
  const h = t.match(HYPE); if (h) out.push('hype: ' + h[0]);
  if (e) for (const sen of e.desc.split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/)) if (sen.length > 60 && t.includes(sen)) out.push('repeats the description: ' + sen.slice(0, 50));
  const af = path.join(dir, 'wp', slug + '.txt');
  if (!fs.existsSync(af)) out.push('NO ARTICLE');
  else {
    const art = fold(fs.readFileSync(af, 'utf8'));
    const nums = [...new Set((t.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
    if (nums.length) out.push('numbers not in the article: ' + nums.join(' '));
    const names = [...new Set(t.match(/(?<![.!?] |^)\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gmu) || [])]
      .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(v => art.includes(fold(v))));
    if (names.length) out.push('names not in the article: ' + names.join(' | '));
  }
  if (out.length) { bad++; console.log(slug + ': ' + out.join('; ')); }
  all[slug] = secs.map(s => [s.h, s.p]);
}
console.log(n + ' entries, ' + words + ' words, ' + skipped + ' skipped, ' + bad + ' with something to read');
if (WRITE) {
  const f = path.join(R, 'scripts', 'entry-more.json'), cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  for (const [k, v] of Object.entries(all)) cur[k] = v;
  const keys = Object.keys(cur).sort(), o = {}; for (const k of keys) o[k] = cur[k];
  fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); console.log('scripts/entry-more.json: ' + keys.length + ' entries');
}
