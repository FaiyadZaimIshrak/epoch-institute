// Checks drafted Great Speeches (scripts/speeches/SPEECHES-GUIDE.md), for the drafter and the editor: the keys, the era
// against the year, lengths, praise words, every link (entries, profiles of every kind, state pages), a slug or title
// the site already has, the excerpt copied exactly from the imported text (<texts dir>/<slug>.json, as
// fetch-speech-texts.ps1 -OutDir writes it), and every number and capitalised name of before, after and source that
// neither the saved articles (<wp dir>/<slug>.txt, <slug>.2.txt ...) nor the speech's text contain.
//   node scripts/speeches/check-speeches.js <drafts.json> <texts dir> <wp dir>
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [file, tdir, wdir] = process.argv.slice(2);
if (!file || !tdir || !wdir) { console.error('usage: check-speeches.js <drafts.json> <texts dir> <wp dir>'); process.exit(1); }
const ENC = new Set(new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')().map(e => e.slug));
const ctx = {}; new Function('ctx', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';ctx.E = EMPIRES; ctx.url = profileUrl; ctx.span = profileSpan;')(ctx);
const PROF = new Map(ctx.E.map(e => [ctx.url(e), ctx.span(e)]));
const STATES = new Set(JSON.parse(fs.readFileSync(path.join(R, 'data', 'polities.json'), 'utf8')).nodes.map(n => n.id));
const SP = fs.readFileSync(path.join(R, 'speeches-data.js'), 'utf8');
const HAVE = new Set([...SP.matchAll(/\{slug:"([^"]+)",title:"([^"]+)"/g)].flatMap(m => [m[1], m[2].toLowerCase()]));
const ERAS = [['ancient', -9999, 499], ['medieval', 500, 1499], ['earlymodern', 1500, 1759], ['revolutions', 1760, 1847], ['nineteenth', 1848, 1900], ['twentieth', 1901, 1945], ['postwar', 1946, 2100]];
const HYPE = /\b(famous|famously|iconic|legendary|greatest|powerful|stirring|immortal|celebrated|renowned|remarkable|fascinating|landmark|unforgettable)\b/i;
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘'`]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').toLowerCase();
function href(h, out, year) {
  const [u, label] = String(h).split('|'); if (!label) { out.push('no label: ' + h); return; }
  let m;
  if ((m = u.match(/^\/encyclopedia\/([^/#?]+)$/))) { if (!ENC.has(m[1])) out.push('no entry ' + m[1]); }
  else if ((m = u.match(/^\/state\/([^/#?]+)$/))) { if (!STATES.has(m[1])) out.push('no state ' + m[1]); }
  else if (PROF.has(u)) { const sp = PROF.get(u); if (year != null && (year < sp[0] - 1 || year > sp[1] + 1)) out.push('profile ' + u + ' not alive in ' + year); }
  else out.push('unknown link ' + u);
}
let n = 0, bad = 0, skipped = 0;
for (const s of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  n++; const out = [];
  if (s.skip) { skipped++; continue; }
  for (const k of ['slug', 'title', 'speaker', 'era', 'year', 'display', 'place', 'before', 'excerpt', 'source', 'after', 'links', 'full']) if (!(k in s)) out.push('no ' + k);
  if (HAVE.has(s.slug) || HAVE.has(String(s.title).toLowerCase())) out.push('the site already has this slug or title');
  if (typeof s.year !== 'number') out.push('year is not a number');
  const era = ERAS.find(e => e[0] === s.era); if (!era) out.push('unknown era ' + s.era); else if (s.year < era[1] || s.year > era[2]) out.push('era ' + s.era + ' does not fit ' + s.year);
  if (String(s.title).length > 60) out.push('title ' + s.title.length + ' chars');
  const L = (k, a, b) => { const l = String(s[k] || '').length; if (l < a || l > b) out.push(k + ' ' + l + ' chars (' + a + '-' + b + ')'); };
  L('before', 160, 470); L('after', 120, 470); L('excerpt', 20, 310); L('source', 30, 250);
  const h = (s.before + ' ' + s.after + ' ' + s.source + ' ' + s.title).match(HYPE); if (h) out.push('praise word: ' + h[0]);
  if (/\b(BC|AD)\b/.test(s.before + ' ' + s.after + ' ' + s.display)) out.push('BC/AD (write BCE/CE)');
  if (s.speakerSlug && !ENC.has(s.speakerSlug)) out.push('no speaker entry ' + s.speakerSlug);
  if (s.empire) href(s.empire, out, s.year);
  for (const l of s.links || []) href(l, out, null); for (const l of s.led || []) href(l, out, null);
  if ((s.links || []).length < 2 || (s.links || []).length > 5) out.push((s.links || []).length + ' links');
  if (s.copyright) out.push('copyright: true (a protected speech should be skipped)');
  if (!/^https?:\/\/[^|]+\|.+/.test(s.full || '')) out.push('full is not "url|library"');
  const tf = path.join(tdir, s.slug + '.json'); let text = '';
  if (!fs.existsSync(tf)) out.push('NO TEXT imported for ' + s.slug);
  else {
    const t = JSON.parse(fs.readFileSync(tf, 'utf8')); text = t.paras.join(' ');
    if (!fold(text).includes(fold(s.excerpt))) out.push('EXCERPT NOT IN THE TEXT');
    if (s.full && t.url !== String(s.full).split('|')[0]) out.push('full differs from the imported page (' + t.url + ')');
    if (t.words < 60) out.push('text only ' + t.words + ' words');
  }
  const wp = fs.existsSync(wdir) ? fs.readdirSync(wdir).filter(f => f === s.slug + '.txt' || f.startsWith(s.slug + '.')).map(f => fs.readFileSync(path.join(wdir, f), 'utf8')).join(' ') : '';
  if (!wp) out.push('NO ARTICLE saved for ' + s.slug);
  const art = fold(wp + ' ' + text), txt = s.before + ' ' + s.after + ' ' + s.source + ' ' + s.display;
  const nums = [...new Set((txt.match(/\d[\d,.]*\d|\d/g) || []).map(x => x.replace(/[.,]$/, '')))].filter(x => !art.includes(fold(x)) && !art.includes(x.replace(/,/g, '')));
  if (nums.length) out.push('numbers not in the article or text: ' + nums.join(' '));
  const names = [...new Set(txt.match(/\b\p{Lu}[\p{L}'’-]{2,}(?:\s+(?:of|the|de|al|ibn|von|van|da|di|du|la|le)?\s*\p{Lu}[\p{L}'’-]+)*/gu) || [])]
    .filter(x => !art.includes(fold(x)) && !x.split(/\s+/).every(w => art.includes(fold(w))));
  if (names.length) out.push('names not in the article or text: ' + names.join(' | '));
  if (out.length) { bad++; console.log(s.slug + ': ' + out.join('; ')); }
}
console.log(`${n} speeches checked (${skipped} skipped), ${bad} with something to read`);
