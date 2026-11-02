// Songs in History: imports lines of a Sumerian composition from the Electronic Text Corpus of Sumerian Literature
// (ETCSL, Oxford; CC BY-NC-SA 3.0, the user's choice of 2 Nov 2026 for a non-commercial site) into imported/<slug>.json,
// in the format fetch-texts.js writes: the composite transliteration as the original, the ETCSL translation as the
// English. Words are never typed: only the spelling is converted from ETCSL's ASCII to the usual signs (c = š, j = ĝ,
// h = ḫ, index numbers as subscripts, determinatives in braces, as in Oracc: {d}en-lil₂, {ĝiš}ma₂).
//   node scripts/songs/fetch-etcsl.js <slug> <ETCSL number, e.g. 1.8.1.4> <first line> <last line> <stanzas: 1-3,4-7,…> <translation paragraph>
// The translation is prose by paragraph: it is set as one block, its lines broken after each semicolon and full stop ("--" set as a dash).
const fs = require('fs'), path = require('path');
const [slug, num, from, to, groups, para] = process.argv.slice(2);
const n = num.replace(/\./g, ''), BASE = 'https://etcsl.orinst.ox.ac.uk/section' + num[0] + '/';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sign = s => s.replace(/c/g, 'š').replace(/j/g, 'ĝ').replace(/h/g, 'ḫ');
function translit(html) {
  return html
    .replace(/<sub>(\d+)<\/sub>/g, (m, d) => [...d].map(x => SUB[x]).join(''))
    .replace(/^i<sup>m<\/sup>/, '<sup>im</sup>')                     // line 7's {im}: the page splits the determinative
    .replace(/<sup>([^<]+)<\/sup>/g, (m, d) => '{' + sign(d) + '}')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    .split(/(\{[^}]*\})/).map(p => p.startsWith('{') ? p : sign(p)).join('');
}
(async () => {
  const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' } }); if (!r.ok) throw new Error(u + ' ' + r.status); return (await r.text()).replace(/\r\n?/g, '\n'); };
  const comp = await get(BASE + 'c' + n + '.htm'), tr = await get(BASE + 'tr' + n + '.htm');
  // the composite text: lines are "<sup>N</sup>text<br>" (the first carries an anchor)
  const lines = {};
  for (const m of comp.matchAll(/<sup>(\d+)<\/sup>(?:<\/a>)?([\s\S]*?)<br>/g)) if (!lines[m[1]]) lines[m[1]] = translit(m[2]);
  const want = []; for (let i = +from; i <= +to; i++) { if (!lines[i]) throw new Error('no line ' + i); want.push(i); }
  const stanzas = groups.split(',').map(g => { const [a, b] = g.split('-').map(Number); return want.filter(i => i >= a && i <= (b || a)).map(i => lines[i]); });
  if (stanzas.flat().length !== want.length) throw new Error('the stanzas do not cover the lines');
  // the translation: the paragraph whose number range is <para>
  const pm = tr.match(new RegExp('<p><a name="para\\d+"[^>]*>(?:<sup>)?' + para.replace('-', '\\s*-\\s*') + '(?:</sup>)?</a>([\\s\\S]*?)</p>'))
    || tr.match(new RegExp('>' + para + '</[^>]+>([\\s\\S]*?)</p>'));
  if (!pm) throw new Error('no translation paragraph ' + para);
  const prose = pm[1].replace(/<span class=\s*"dn">([\s\S]*?)<\/span>/g, (m, d) => sign(d.replace(/<[^>]+>/g, ''))).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const en = prose.replace(/ -- /g, ' — ').split(/(?<=[;.])\s+(?=[A-Za-z])/);
  const credit = 'J.A. Black, G. Cunningham, E. Fluckiger-Hawker, E. Robson and G. Zólyomi, The Electronic Text Corpus of Sumerian Literature (Oxford, 1998-2006), ' + num + ', lines ' + from + '-' + to;
  const lic = ['CC BY-NC-SA 3.0'];
  const out = { slug, parts: {
    orig: { site: 'etcsl', page: 'ETCSL c.' + num + ', composite text', url: BASE + 'c' + n + '.htm', licences: lic, translator: '', credit, stanzas },
    en: { site: 'etcsl', page: 'ETCSL t.' + num + ', translation', url: BASE + 'tr' + n + '.htm', licences: lic, translator: 'ETCSL', credit: credit.replace(', lines', ', translation of lines'), stanzas: [en] } } };
  fs.writeFileSync(path.join(__dirname, 'imported', slug + '.json'), JSON.stringify(out, null, 1));
  console.log(stanzas.map(s => s.join('\n')).join('\n\n')); console.log('---'); console.log(en.join('\n'));
})();
