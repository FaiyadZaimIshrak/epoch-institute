// Checks drafted profile sources (scripts/kinds/src or a drafts folder, JSON as POLITY-GUIDE.md / the kinds' format)
// against the articles they were written from: the shape (sections, counts, points, stats), then every number and every
// capitalised name in the public text that does not occur in the article, for the editor to read first.
//   node scripts/kinds/check-profiles.js <drafts dir> <articles dir> [slug …]
const fs = require('fs'), path = require('path');
const [dir, wpDir, ...only] = process.argv.slice(2);
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘ʻ]/g, "'");
const STOP = new Set('The A An In On Of And At By For From To With As It Its His Her Their This That These Those He She They When While After Before During Since Until Under Over Between Among Into Through Also But Or Not No Yes One Two Three Four Five Six Seven Eight Nine Ten First Second Third Many Some Most Both Each Every Today Later Early Late New Old St Saint Mr Dr Sir Lord God King Queen What Why How Where Who Which There Here Such Few Yet So If Then Now Only Even Still Kingdom Empire Sultanate Republic Duchy County Principality Emirate Khanate Dynasty State City Chronicle Crown Islam Muslim Christian Church'.split(' '));
const ASIDE = /\bthe article\b|\barticle (says|gives|names|does)\b|\bnot given\b|\bthe editor\b|\bsaved text\b|\bthe file\b|\bnot stated\b|\bsee notes\b/i;
let total = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const slug = f.slice(0, -5); if (only.length && !only.includes(slug)) continue;
  let s; try { s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log('== ' + slug + '\n  BAD JSON ' + e.message); total++; continue; }
  let art = ''; for (const g of fs.readdirSync(wpDir)) if (g === slug + '.txt' || g.startsWith(slug + '.')) art += fs.readFileSync(path.join(wpDir, g), 'utf8') + '\n'; art = fold(art);
  const out = [];
  if (s.id && s.id !== slug) out.push('id ' + s.id + ' is not ' + slug);
  const secs = s.sections || {};
  for (const [k, v] of Object.entries(secs)) { const len = String(v).replace(/<[^>]+>/g, '').length; if (len < 900 || len > 1800) out.push('section ' + k + ': ' + len + ' chars'); if (!/^<p>[\s\S]*<\/p>$/.test(String(v))) out.push('section ' + k + ': not <p>…</p>'); }
  if (!Array.isArray(s.t) || s.t.length !== 3) out.push('t: ' + (s.t || []).length);
  if (!Array.isArray(s.ev) || s.ev.length < 5 || s.ev.length > 8) out.push('ev: ' + (s.ev || []).length);
  if (s.points) {
    const p = s.points; if (p.length < 8 || p.length > 20) out.push('points: ' + p.length);
    if (p[0] && p[0][0] !== s.start) out.push('first point ' + p[0][0] + ' is not start ' + s.start);
    if (p.length && p[p.length - 1][0] !== (s.end === null ? 2025 : s.end)) out.push('last point ' + p[p.length - 1][0] + ' is not end ' + s.end);
    if (!p.some(x => x[1] === 10)) out.push('no point at 10'); if (p.some(x => x[1] < 1 || x[1] > 10)) out.push('a strength outside 1-10');
    for (let i = 1; i < p.length; i++) if (p[i][0] <= p[i - 1][0]) out.push('points not in order at ' + p[i][0]);
    for (const x of p) if (!s.pointDescs || !s.pointDescs[String(x[0])]) out.push('no description for point ' + x[0]);
    const dims = ['militaryPower', 'territorialReach', 'economicStrength', 'tradeNetworks', 'administrativeSophistication', 'culturalIntellectualOutput', 'institutionalLongevity', 'historicalInfluence'];
    for (const d of dims) if (!s.stats || !(s.stats[d] >= 1 && s.stats[d] <= 10)) out.push('stat ' + d);
    if (!Array.isArray(s.tags) || s.tags.length !== 3) out.push('tags: ' + (s.tags || []).length);
  }
  const pub = [['info', s.info], ['summary', s.summary], ['dyk', s.dyk], ...Object.entries(s.facts || {}).map(([k, v]) => ['fact ' + k, v]), ...(s.t || []).map((x, i) => ['t' + (i + 1), x]), ...(s.ev || []).map(e => ['ev ' + e[0], e[1]]), ...Object.entries(secs).map(([k, v]) => [k, String(v).replace(/<[^>]+>/g, ' ')]), ...Object.entries(s.pointDescs || {}).map(([k, v]) => ['point ' + k, v])];
  for (const [b, v] of pub) for (const l of String(v || '').split('\n')) if (ASIDE.test(l)) out.push('aside [' + b + ']: ' + l.slice(0, 100));
  const flagged = new Set();
  for (const [b, v] of pub) {
    const t = String(v || '');
    for (const n of t.match(/\b\d[\d,.]*\b/g) || []) { const x = n.replace(/[.,]$/, ''); if (!art.includes(fold(x)) && !art.includes(fold(x.replace(/,/g, '')))) flagged.add(x); }
    for (const m of t.matchAll(/\b[\p{Lu}][\p{L}'’-]+(?:\s+(?:of|de|del|la|le|du|von|van|der|al|el|ibn|bin|y|and)?\s*[\p{Lu}][\p{L}'’-]+)*/gu)) {
      const w = m[0]; if (STOP.has(w)) continue;
      if (!art.includes(fold(w))) { const parts = w.split(/\s+/).filter(x => x.length > 2 && !STOP.has(x)); if (parts.some(p => !art.includes(fold(p)))) flagged.add(w); }
    }
  }
  if (flagged.size) out.push('not in the article: ' + [...flagged].join(' · '));
  total += out.length;
  console.log('== ' + slug + (out.length ? '' : ': ok')); for (const o of out) console.log('  ' + o);
}
console.log(total + ' items to look at');
