// Checks drafted profiles of the other kinds (CULTURES-GUIDE.md, POLITY-GUIDE.md) against the articles they were
// written from:
//   node scripts/kinds/check-drafts.js <kind> <drafts dir> <articles dir> [slug=article …]
// kind: culture, movement, religion, language, government or polity (the kind's sections and facts come from
// PROFILE_KINDS in shared-data.js; polity uses POLITY-GUIDE's six sections and four facts). A draft <slug>.json is
// checked against <articles dir>/<slug>.txt, or the article named after "=" (san-people=san-peoples).
// Reports: missing or unknown keys, section and fact keys, counts (three takeaways, 5-8 events in date order, section
// lengths, references), drafting asides in the public text ("the article", "not given" …), hype words, a day-first event
// date, and then every number and capitalised name in the public text that does not occur in the article, for the
// editor to read first. A flagged item is not necessarily wrong (a translation, a normalised spelling, a sum).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [kind, dir, wpDir, ...only] = process.argv.slice(2);
if (!wpDir) { console.error('usage: check-drafts.js <kind> <drafts dir> <articles dir> [slug[=article] …]'); process.exit(1); }
const sd = fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8');
let SECS, FACTS;
if (kind === 'polity') { SECS = ['foundation', 'socioeconomy', 'military', 'governance', 'impact', 'decline']; FACTS = ['capital', 'founder', 'predecessor', 'successor']; }
else { const pk = new Function(sd.slice(sd.indexOf('const PROFILE_KINDS'), sd.indexOf('function profileKind')) + ';return PROFILE_KINDS')()[kind];
  if (!pk) { console.error('no kind ' + kind); process.exit(1); } SECS = pk.sections.map(s => s[0]); FACTS = (pk.facts || []).map(f => f[0]); }
const REGIONS = JSON.parse(sd.match(/const REGIONS = (\[[^\]]*\])/)[1]);
const KEYS = kind === 'polity' ? null : ['name', 'region', 'start', 'end', 'circa', 'endCirca', 'info', 'facts', 't', 'dyk', 'ev', 'sections', 'summary', 'references', 'notes'];
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘ʻʼ]/g, "'").replace(/[–—]/g, '-');
const ASIDE = /\bthe article\b|\barticle (says|gives|names|does)\b|\bnot given\b|\bthe editor\b|\bsaved text\b|\bthis profile\b|\bnot stated\b|\bsee notes\b|\bwikipedia\b/i;
const HYPE = /\b(mighty|mysterious|fascinating|primitive|glorious|timeless|untouched|noble savages?|enigmatic)\b/i;
const STOP = new Set('The A An In On Of And At By For From To With As It Its His Her Their This That These Those He She They We When While After Before During Since Until Under Over Between Among Into Through Also But Or Not No Yes One Two Three Four Five Six Seven Eight Nine Ten First Second Third Many Some Most Both Each Every Today Later Early Late Middle New Old St Saint Mr Mrs Dr Sir Lord God King Queen BCE CE BP Late Upper Lower North South East West Northern Southern Eastern Western Central Great Little Classic Iron Bronze Age Stone'.split(' '));
const map = {}; const want = [];
for (const o of only) { const [s, a] = o.split('='); want.push(s); if (a) map[s] = a; }
const yearOf = d => { const m = String(d).match(/(\d+)(?:st|nd|rd|th)? (?:century|millennium)/i); let y = m ? +m[1] * (/millennium/i.test(d) ? 1000 : 100) - (/millennium/i.test(d) ? 500 : 50) : (String(d).match(/\d+/) ? +String(d).match(/\d+/)[0] : NaN); if (/BCE|BC\b|years ago|BP/.test(d)) y = -y; return y; };
let total = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  const slug = f.slice(0, -5); if (want.length && !want.includes(slug)) continue;
  const out = []; let s;
  try { s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log('== ' + slug + '\n  JSON: ' + e.message); total++; continue; }
  const wpF = path.join(wpDir, (map[slug] || slug) + '.txt'); const art = fs.existsSync(wpF) ? fold(fs.readFileSync(wpF, 'utf8')) : '';
  if (!art) out.push('no article ' + wpF);
  if (KEYS) { for (const k of KEYS) if (!(k in s)) out.push('missing key ' + k); for (const k of Object.keys(s)) if (!KEYS.includes(k)) out.push('unknown key ' + k); }
  if (s.region && !REGIONS.includes(s.region)) out.push('region ' + s.region);
  if (!Number.isInteger(s.start) || !(s.end === null || Number.isInteger(s.end))) out.push('start/end ' + s.start + '/' + s.end);
  if (s.end === null && s.endCirca) out.push('endCirca with end null');
  for (const k of SECS) { const v = (s.sections || {})[k]; if (!v) { out.push('no section ' + k); continue; } if (!/^<p>[\s\S]*<\/p>$/.test(v)) out.push('section ' + k + ' not <p>'); const n = v.replace(/<[^>]+>/g, '').length; if (n < 700 || n > 1800) out.push('section ' + k + ' ' + n + ' chars'); }
  for (const k of Object.keys(s.sections || {})) if (!SECS.includes(k)) out.push('unknown section ' + k);
  for (const k of FACTS) if (!(s.facts || {})[k]) out.push('no fact ' + k);
  for (const k of Object.keys(s.facts || {})) if (!FACTS.includes(k)) out.push('unknown fact ' + k);
  if (!Array.isArray(s.t) || s.t.length !== 3) out.push('takeaways ' + (s.t || []).length);
  if (!Array.isArray(s.ev) || s.ev.length < 5 || s.ev.length > 8) out.push('events ' + (s.ev || []).length);
  for (const e of s.ev || []) { if (/^\d{1,2} [A-Z][a-z]+ \d/.test(e[0])) out.push('day-first date ' + e[0]); if (/\.$/.test(e[1])) out.push('event ends in a full stop: ' + e[0]); }
  const ys = (s.ev || []).map(e => yearOf(e[0])); for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1]) out.push('events out of order at ' + s.ev[i][0]);
  if (!Array.isArray(s.references)) out.push('references'); else if (s.references.length > 6) out.push('references ' + s.references.length);
  if (s.info && (s.info.split(/\s+/).length < 18 || s.info.split(/\s+/).length > 45)) out.push('info ' + s.info.split(/\s+/).length + ' words');
  if (s.summary && (s.summary.length < 200 || s.summary.length > 500)) out.push('summary ' + s.summary.length + ' chars');
  const pub = [['info', s.info || ''], ['facts', Object.values(s.facts || {}).join('\n')], ['t', (s.t || []).join('\n')], ['dyk', s.dyk || ''], ['ev', (s.ev || []).map(e => e.join(' ')).join('\n')], ...SECS.map(k => [k, ((s.sections || {})[k] || '').replace(/<[^>]+>/g, ' ')]), ['summary', s.summary || '']];
  for (const [b, t] of pub) { if (ASIDE.test(t)) out.push('aside [' + b + ']: ' + t.match(new RegExp('.{0,50}' + ASIDE.source + '.{0,50}', 'i'))[0]); if (HYPE.test(t)) out.push('hype [' + b + ']: ' + t.match(HYPE)[0]); }
  for (const r of s.references || []) { const a = fold(r.split(/[,(.]/)[0]).trim(); if (a.length > 3 && !art.includes(a)) out.push('reference author not in the article: ' + r.slice(0, 90)); }
  const flagged = new Set();
  for (const [b, t] of pub) {
    for (const n of t.match(/\b\d[\d,.]*\b/g) || []) { const v = n.replace(/[.,]$/, ''); if (!art.includes(fold(v)) && !art.includes(fold(v.replace(/,/g, '')))) flagged.add(b + ': ' + v); }
    for (const m of t.matchAll(/\b[\p{Lu}][\p{L}'’-]+(?:\s+(?:of|de|del|la|le|du|von|van|der|al|el|y|and)?\s*[\p{Lu}][\p{L}'’-]+)*/gu)) {
      const w = m[0]; if (STOP.has(w)) continue;
      if (!art.includes(fold(w))) { const parts = w.split(/\s+/).filter(x => x.length > 2 && !STOP.has(x)); if (parts.some(p => !art.includes(fold(p).replace(/'s$/, '')))) flagged.add(b + ': ' + w); }
    }
  }
  if (flagged.size) out.push('not in the article: ' + [...flagged].join(' · '));
  total += out.length;
  console.log('== ' + slug + (out.length ? '' : ': ok')); for (const o of out) console.log('  ' + o);
}
console.log(total, 'items to look at');
