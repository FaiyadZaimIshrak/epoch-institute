// Songs in History: checks drafted song files against the articles they were written from.
//   node scripts/songs/check-drafts.js <drafts dir> <articles dir> [slug ...]
// For each draft: header keys present and in order, kids yes/no, types from the list, no drafting asides in the public
// parts ("the article", "not given", "editor" …); then every number and every capitalised name in the public parts
// (header, story, meaning, inspired, inspired-by) that does not occur in the article, for the editor to look at. A
// flagged item is not necessarily wrong (a translated title, a normalised spelling): it is what to read first.
const fs = require('fs'), path = require('path');
const [dir, wpDir, ...only] = process.argv.slice(2);
const KEYS = ['title', 'local', 'status', 'lyricist', 'composer', 'culture', 'language', 'place', 'date', 'year', 'era', 'region', 'types', 'people', 'places', 'events', 'kids', 'kid'];
const TYPES = ['sacred', 'lament', 'celebration', 'love', 'lullaby', 'work', 'war', 'anthem', 'protest', 'ballad', 'dance'];
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’‘ʻ]/g, "'");
const ASIDE = /\bthe article\b|\barticle (says|gives|names|does)\b|\bnot given\b|\bthe editor\b|\bsaved text\b|\bthe file\b|\bnot stated\b|\bsee notes\b/i;
const STOP = new Set('The A An In On Of And At By For From To With As It Its His Her Their This That These Those He She They When While After Before During Since Until Under Over Between Among Into Through Also But Or Not No Yes One Two Three Four Five Six Seven Eight Nine Ten First Second Third Many Some Most Both Each Every Today Later Early Late New Old St Saint Mr Mrs Dr Sir Lord God King Queen'.split(' '));
let total = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.txt'))) {
  const slug = f.slice(0, -4); if (only.length && !only.includes(slug)) continue;
  const t = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r/g, ''), wpF = path.join(wpDir, f);
  const art = fs.existsSync(wpF) ? fold(fs.readFileSync(wpF, 'utf8')) : '';
  const out = []; const i = t.indexOf('\n== '), head = t.slice(0, i);
  const H = {}; const order = [];
  for (const l of head.split('\n')) { const m = l.match(/^([a-z-]+):\s*(.*)$/); if (m) { H[m[1]] = m[2]; order.push(m[1]); } }
  const missing = KEYS.filter(k => !(k in H)); if (missing.length) out.push('missing keys: ' + missing.join(', '));
  if (H.kids && !/^(yes|no)$/.test(H.kids)) out.push('kids: ' + H.kids);
  for (const ty of (H.types || '').split(',').map(s => s.trim()).filter(Boolean)) if (!TYPES.includes(ty)) out.push('type: ' + ty);
  if (H.kid && H.kid.length > 140) out.push('kid line ' + H.kid.length + ' chars');
  const B = {}; let cur = null;
  for (const l of t.slice(i + 1).split('\n')) { const m = l.match(/^== ([a-z-]+)\s*$/); if (m) { cur = m[1]; B[cur] = []; } else if (cur) B[cur].push(l); }
  for (const b of ['story', 'meaning', 'inspired', 'inspired-by', 'sources']) if (!B[b]) out.push('no block ' + b);
  const pub = [['head', head.split('\n').filter(l => !/^(year|era|region|types|kids):/.test(l)).join('\n')], ...['story', 'meaning', 'inspired', 'inspired-by', 'sources'].map(b => [b, (B[b] || []).join('\n')])];
  for (const [b, s] of pub) for (const l of s.split('\n')) if (ASIDE.test(l)) out.push('aside [' + b + ']: ' + l.slice(0, 110));
  const flagged = new Set();
  for (const [b, s] of pub.filter(p => p[0] !== 'sources')) {
    for (const n of s.match(/\b\d[\d,.]*\b/g) || []) { const v = n.replace(/[.,]$/, ''); if (!art.includes(fold(v)) && !art.includes(fold(v.replace(/,/g, '')))) flagged.add(b + ': ' + v); }
    for (const m of s.matchAll(/\b[\p{Lu}][\p{L}'’-]+(?:\s+(?:of|de|del|la|le|du|von|van|der|al|el|y|and)?\s*[\p{Lu}][\p{L}'’-]+)*/gu)) {
      const w = m[0]; if (STOP.has(w)) continue;
      if (!art.includes(fold(w))) { const parts = w.split(/\s+/).filter(x => x.length > 2 && !STOP.has(x)); if (parts.some(p => !art.includes(fold(p)))) flagged.add(b + ': ' + w); }
    }
  }
  if (flagged.size) out.push('not in the article: ' + [...flagged].join(' · '));
  total += out.length;
  console.log('== ' + slug + (out.length ? '' : ': ok')); for (const o of out) console.log('  ' + o);
}
console.log(total, 'items to look at');
