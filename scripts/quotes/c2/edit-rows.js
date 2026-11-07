// The editor's changes to the C2 rows (7 Nov 2026), applied in place to scripts/quotes/c2/q-*.tsv (idempotent):
// credits that the finders gave from memory are cut to what the pages print (QUOTES-GUIDE: translator years a page
// does not print are left off), and notes say where words are a later reconstruction or a pseudonym's. The rows the
// editor leaves out are in c2/drop.txt, which assemble-quotes.js reads.
const fs = require('fs'), path = require('path'), D = __dirname;
// [speaker, start of the start phrase, column (4 work, 5 credit, 6 note), new text]
const E = [
  ['ernest-renan', '"The one object', 5, 'translator not named'],
  ['ernest-renan', '"I no longer believe', 5, 'translator not named'],
  ['ernest-renan', '"I am double', 5, 'translator not named'],
  ['henrik-ibsen', '"the spirit of truth', 5, 'tr. R. Farquharson Sharp'],
  ['henrik-ibsen', '"But our home', 5, 'tr. R. Farquharson Sharp'],
  ['ludwig-van-beethoven', '"When I open my eyes', 5, 'tr. H. E. K., 1905'],
  ['friedrich-schiller', '"One pen-stroke', 5, 'tr. Richard Dillon Boylan'],
  ['henry-viii-of-england', '"reminding us', 5, 'translated from his French (translator not named)'],
  ['henry-viii-of-england', '"I send you', 5, 'translated from his French (translator not named)'],
  ['enrico-dandolo', '"I am a man old', 5, 'translator not named'],
  ['enrico-dandolo', '"If you will consent', 5, 'translator not named'],
  ['soren-kierkegaard', '"What is a poet', 6, 'from the Diapsalmata, written in the voice of the pseudonymous aesthete "A"'],
  ['soren-kierkegaard', '"Let others complain', 6, 'from the Diapsalmata, written in the voice of the pseudonymous aesthete "A"'],
  ['soren-kierkegaard', '"My melancholy', 6, 'from the Diapsalmata, written in the voice of the pseudonymous aesthete "A"'],
  ['soren-kierkegaard', '"Of all ridiculous', 6, 'from the Diapsalmata, written in the voice of the pseudonymous aesthete "A"'],
  ['william-pitt-the-elder', '"If I were an American', 6, 'as the parliamentary reports reconstructed it'],
  ['william-pitt-the-elder', '"I rejoice that America', 6, 'as the parliamentary reports reconstructed it'],
  ['william-pitt-the-elder', '"Sorry I am', 6, 'as the parliamentary reports reconstructed it'],
  ['robert-walpole', '"Gentlemen have talked', 6, 'as the parliamentary reports reconstructed it'],
  ['robert-walpole', '"A patriot, sir', 6, 'as the parliamentary reports reconstructed it'],
  ['robert-walpole', '"My great and principal', 6, 'as the parliamentary reports reconstructed it'],
  ['robert-walpole', '"Have I ever been', 6, 'as the parliamentary reports reconstructed it'],
  ['robert-walpole', '"yet I will not shrink', 6, 'as the parliamentary reports reconstructed it'],
];
let n = 0;
for (const f of fs.readdirSync(D).filter(f => /^q-.*\.tsv$/.test(f))) {
  const p = path.join(D, f), L = fs.readFileSync(p, 'utf8').split('\n');
  for (let i = 0; i < L.length; i++) {
    const c = L[i].split('\t'); if (c.length < 5) continue;
    for (const [sp, st, col, txt] of E) if (c[0] === sp && c[2].startsWith(st)) { while (c.length <= col - 1) c.push(''); if (c[col - 1] !== txt) { c[col - 1] = txt; n++; } }
    L[i] = c.join('\t');
  }
  fs.writeFileSync(p, L.join('\n'));
}
const hit = E.filter(([sp, st]) => !fs.readdirSync(D).filter(f => /^q-.*\.tsv$/.test(f)).some(f => fs.readFileSync(path.join(D, f), 'utf8').split('\n').some(l => { const c = l.split('\t'); return c[0] === sp && (c[2] || '').startsWith(st); })));
if (hit.length) { console.error('not found: ' + hit.map(h => h[0] + ' ' + h[1]).join('; ')); process.exit(1); }
console.log(n + ' cells changed');
