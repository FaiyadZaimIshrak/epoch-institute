// References for profiles that have none (22 Nov 2026): the books each profile's own Wikipedia article lists, read by
// article-refs.js, chosen by the editor.
//   node scripts/kinds/fill-refs.js list <refs.json> <names.tsv>            prints each profile's books, numbered; those
//        whose title holds a word of the profile's name are starred (the editor's first candidates)
//   node scripts/kinds/fill-refs.js write <refs.json> <names.tsv> <picks.tsv>   picks: slug <TAB> numbers ("3,1,7"; "-" none)
// names.tsv: slug <TAB> profile name (as in EMPIRES). write puts the books into empire-profiles.js where the profile's
// references are empty (a profile that has references is left alone) and into scripts/kinds/src/<slug>.json when there.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [cmd, refsF, namesF, picksF] = process.argv.slice(2);
const refs = JSON.parse(fs.readFileSync(refsF, 'utf8'));
const names = fs.readFileSync(namesF, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
const GEN = new Set(['history', 'empire', 'kingdom', 'republic', 'state', 'people', 'culture', 'movement', 'great', 'language', 'religion', 'rule', 'the', 'and', 'of', 'in']);
const words = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3 && !GEN.has(w)).map(w => w.slice(0, 5));
if (cmd === 'list') {
  for (const [slug, name] of names) { const r = refs[slug] || []; const w = words(name);
    console.log('\n== ' + slug + ' (' + name + '): ' + r.length);
    r.forEach((x, i) => console.log((w.some(k => words(x.replace(/^[^,]*,/, '')).includes(k)) ? ' *' : '  ') + String(i + 1).padStart(3) + ' ' + x.slice(0, 170))); }
} else if (cmd === 'write') {
  const picks = {}; for (const l of fs.readFileSync(picksF, 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[0] && !c[0].startsWith('#') && c[1] && c[1].trim() !== '-') picks[c[0]] = c[1].split(',').map(n => +n.trim()); }
  const f = path.join(R, 'empire-profiles.js'); let t = fs.readFileSync(f, 'utf8'); const E = t.includes('\r\n') ? '\r\n' : '\n'; let n = 0;
  for (const [slug, name] of names) {
    if (!picks[slug]) continue; const list = picks[slug].map(i => { const x = (refs[slug] || [])[i - 1]; if (!x) throw new Error(slug + ': no book ' + i); return x; });
    const at = t.indexOf(E + '  ' + JSON.stringify(name) + ': {'); if (at < 0) { console.log('NOT FOUND: ' + name); continue; }
    const end = t.indexOf(E + '  }', at + 1), a = t.indexOf('references: [', at); if (a < 0 || a > end) { console.log('no references key: ' + name); continue; }
    const b = t.indexOf(']', a); if (t.slice(a + 13, b).trim()) { console.log('has references, left: ' + name); continue; }
    t = t.slice(0, a + 13) + E + list.map(x => '    ' + JSON.stringify(x)).join(',' + E) + E + '    ' + t.slice(b); n++;
    const s = path.join(__dirname, 'src', slug + '.json'); if (fs.existsSync(s)) { const j = JSON.parse(fs.readFileSync(s, 'utf8')); if (!(j.references || []).length) { j.references = list; fs.writeFileSync(s, JSON.stringify(j, null, 1) + '\n'); } }
  }
  new Function(t.replace(/^\s*const /gm, 'var '));   // the file must still evaluate
  fs.writeFileSync(f, t); console.log(n + ' profiles given references');
}
