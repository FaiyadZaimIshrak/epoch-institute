// Checks the longer texts of entries (MORE-GUIDE.md) against their saved articles, for the editor to read first, and
// with --write gathers them into scripts/entry-more.json, which build-pages.ps1 puts on the entry pages ("enc-more").
//   node scripts/entries/check-more.js <round dir> [--write] [--clean] [--drop=slug,slug]
//   --clean (the campaign of Nov 2026: too many to read each flag): with --write only the texts with NO flag are
//   gathered; the others are listed in <round dir>/held.tsv (slug TAB flags) for a second pass or to stay short.
// <round dir> holds wp/<slug>.txt and out/<slug>.json. Flags: a heading off the list or used twice, word counts,
// HTML or Markdown, "BC"/"AD", month-first dates, hype words, a sentence copied from the entry's own description, and
// every number and capitalised name the article does not contain (accents and case folded).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2), dir = argv.find(a => !a.startsWith('--')), WRITE = argv.includes('--write'), CLEAN = argv.includes('--clean');
const held = [];
const DROP = new Set(((argv.find(a => a.startsWith('--drop=')) || '').slice(7)).split(',').filter(Boolean));
if (!dir) { console.error('usage: check-more.js <round dir> [--write] [--drop=…]'); process.exit(1); }
const HEADS = ['Early life and background', 'Career', 'Reign', 'In office', 'Works and ideas', 'Death and legacy', 'Background', 'Course of events', 'Terms', 'Aftermath and significance', 'Setting', 'History', 'The place today', 'Origins', 'Organisation and way of life', 'Legacy', 'Contents', 'What it is', 'How it was used', 'Reception and legacy', 'Discovery and study'];
const HYPE = /\b(famous|famously|iconic|fascinating|legendary|renowned|celebrated|remarkable|stunning|magnificent|greatest|incredible|amazing)\b/i;
const MONTH = 'January|February|March|April|May|June|July|August|September|October|November|December';
const NOTNAME = new RegExp('^(?:' + MONTH + '|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|BCE|CE|The|In|On|At|By|After|Before|During|Under|From|When|His|Her|Its|Their|This|These|Those|Some|Many|Most|Both|Among|Although|While|Since|Later|Early|Modern|Western|Eastern|Northern|Southern)$');
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[–—]/g, '-').toLowerCase();
const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
const all = {}; let n = 0, bad = 0, skipped = 0, words = 0;
// --batch=batch-3.tsv: only that batch's entries (a writer checking its own work), and those of them not yet written
const BATCH = (argv.find(a => a.startsWith('--batch=')) || '').slice(8), ONLY = BATCH ? new Set(fs.readFileSync(path.join(dir, BATCH), 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t')[0])) : null;
if (ONLY) for (const s of ONLY) if (!fs.existsSync(path.join(dir, 'out', s + '.json'))) console.log(s + ': NOT WRITTEN YET');
for (const f of fs.readdirSync(path.join(dir, 'out')).filter(x => x.endsWith('.json') && (!ONLY || ONLY.has(x.slice(0, -5)))).sort()) {
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
  const h = (e ? t.split(e.name).join(' ') : t).match(HYPE); if (h) out.push('hype: ' + h[0]);   // the entry's own name may hold such a word ("Amazing Grace")
  // the present day (MORE-GUIDE.md): no judgement of present governments, no indices and rankings, no "as of"
  const pd = t.match(/\bas of\b|\bauthoritarian (?:regime|system|state|government)|\bdictator(?:ship)?\b(?=[^.]*\b(?:is|remains|current|today)\b)|Freedom House|\bnot free\b|democratic backsliding|approval rating|by nominal GDP|\b(?:largest|biggest) economy\b|\b(?:ranked|ranks) \w+(?:-\w+)? (?:in|on|by|among)\b|\b(?:corruption|democracy|press freedom|human development) index\b/i); if (pd) out.push('present-day judgement or ranking: ' + pd[0]);
  const meta = t.match(/\b(?:the|this|its) (?:Wikipedia )?(?:article|entry|source file|excerpt)\b|\bWikipedia\b/i); if (meta) out.push('speaks of its source: ' + meta[0]);
  // what the site's strict crawl stops a deploy on (a template's leftovers) or lists (doubled punctuation): "Its boundaries
  // were undefined" passed here and failed there (wave 17)
  const lo = txt.map(p => (p.match(/\b(?:undefined|NaN)\b|\[object |[^.]\.\.(?!\.)|,,|,\.|\s[,;:](?:\s|$)|\s\.(?:\s|$)|\s{2,}/) || [])[0]).filter(Boolean); if (lo.length) out.push('reword (the crawl reads it as a slip): "' + lo[0].trim() + '"');
  const late = [...t.matchAll(/\b20(1[6-9]|[2-9]\d)\b(?!\s*(?:[–-]\s*(?:c\.\s*)?\d+\s*)?BCE)/g)].length; if (late > 2) out.push(late + ' years after 2015: is this history?');
  if (e) for (const sen of e.desc.split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/)) if (sen.length > 60 && t.includes(sen)) out.push('repeats the description: ' + sen.slice(0, 50));
  const af = path.join(dir, 'wp', slug + '.txt');
  if (!fs.existsSync(af)) out.push('NO ARTICLE');
  else {
    const art = fold(fs.readFileSync(af, 'utf8'));
    const nums = [...new Set((t.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
    if (nums.length) out.push('numbers not in the article: ' + nums.join(' '));
    const names = [...new Set(t.match(/(?<![.!?] |^)\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gmu) || [])]
      .map(x => x.replace(/['’]s$/, '')).filter(x => !NOTNAME.test(x) && !art.includes(fold(x)) && !x.split(/\s+/).every(v => NOTNAME.test(v) || art.includes(fold(v.replace(/['’]s$/, '')))));   // a possessive is the name; months and sentence words are no names
    if (names.length) out.push('names not in the article: ' + names.join(' | '));
  }
  if (out.length) { bad++; console.log(slug + ': ' + out.join('; ')); held.push(slug + '\t' + out.join('; ')); if (CLEAN) continue; }
  all[slug] = secs.map(s => [s.h, s.p]);
}
console.log(n + ' entries, ' + words + ' words, ' + skipped + ' skipped, ' + bad + ' with something to read');
if (WRITE) {
  const total = require('./more-store').merge(all); console.log('scripts/entry-more/: ' + Object.keys(all).length + ' gathered, ' + total + ' entries in all');
  if (CLEAN) { fs.writeFileSync(path.join(dir, 'held.tsv'), held.join('\n') + (held.length ? '\n' : '')); console.log(held.length + ' held (held.tsv)'); }
}
