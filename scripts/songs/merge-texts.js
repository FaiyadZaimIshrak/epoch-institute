// Merges each song's imported text (imported/) with its Institute translation and romanization (translations/) and
// the editor's line fixes (translation-fixes.json) into data/song-texts/<slug>.json, the build input (not deployed):
//   {slug, parts: {orig, en, rom}: {stanzas, credit, url, licence, source, own}, aligned, tentative, scheme, notes}
// "aligned": en has the shape of orig, so the page sets them side by side; else en is a block of its own.
// Stops on a shape mismatch between orig and an Institute part, or a fix whose line does not exist.
const fs = require('fs'), path = require('path'), D = __dirname;
const FIX = JSON.parse(fs.readFileSync(path.join(D, 'translation-fixes.json'), 'utf8'));
const REGROUP = { 'aloha-oe': [4, 5, 5, 4] };   // the song's own verses and chorus (tr-check.md T13)
const TENTATIVE = ['hanacpachap-cussicuinin'];
const shape = st => st ? st.map(s => s.length).join(',') : '';
const regroup = (st, ns) => { const ls = st.flat(), out = []; let i = 0; for (const n of ns) { out.push(ls.slice(i, i + n)); i += n; } if (i !== ls.length) throw new Error('regroup leaves lines'); return out; };
fs.mkdirSync(path.join(D, '..', '..', 'data', 'song-texts'), { recursive: true });
let n = 0; const problems = [];
for (const f of fs.readdirSync(path.join(D, 'imported'))) {
  const slug = f.replace(/\.json$/, ''), t = JSON.parse(fs.readFileSync(path.join(D, 'imported', f), 'utf8'));
  const tr = fs.existsSync(path.join(D, 'translations', f)) ? JSON.parse(fs.readFileSync(path.join(D, 'translations', f), 'utf8')) : null;
  const P = {};
  for (const [k, p] of Object.entries(t.parts)) P[k] = { stanzas: p.stanzas, credit: p.credit, url: p.url, licence: (p.licences || []).join(' '), source: p.site, page: p.page, own: false, also: p.also || [] };
  if (tr) {
    for (const k of ['en', 'rom']) if (tr[k]) {
      if (P[k]) { problems.push(slug + ': both an imported and an Institute ' + k); continue; }
      P[k] = { stanzas: tr[k], credit: k === 'en' ? 'Translation: The Epoch Institute' : 'Romanization: The Epoch Institute (' + (tr.scheme || '') + ')', own: true };
      if (P.orig && shape(tr[k]) !== shape(P.orig.stanzas)) problems.push(slug + ': ' + k + ' ' + shape(tr[k]) + ' vs orig ' + shape(P.orig.stanzas));
    }
  }
  for (const [k, st, ln, line] of FIX[slug] || []) { if (!P[k] || !P[k].stanzas[st - 1] || P[k].stanzas[st - 1][ln - 1] === undefined) throw new Error(slug + ' fix ' + k + ' ' + st + '.' + ln); P[k].stanzas[st - 1][ln - 1] = line; }
  if (REGROUP[slug]) for (const k of Object.keys(P)) if (P[k].own || k === 'orig') P[k].stanzas = regroup(P[k].stanzas, REGROUP[slug]);
  const out = { slug, parts: P, aligned: !!(P.orig && P.en && shape(P.orig.stanzas) === shape(P.en.stanzas)), tentative: TENTATIVE.includes(slug), heads: tr && tr.heads || null, label: tr && tr.label || null, lang: tr && tr.lang || null, scheme: tr && tr.scheme || null, notes: tr && tr.notes || [] };
  fs.writeFileSync(path.join(D, '..', '..', 'data', 'song-texts', f), JSON.stringify(out, null, 1)); n++;
}
console.log(n, 'merged;', problems.length, 'problems'); problems.forEach(p => console.log('  ' + p));
