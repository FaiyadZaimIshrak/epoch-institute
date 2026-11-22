// References of the sacred texts (works3): the editor's picks, by number, from each article's own bibliography as
// article-refs.js read it (refs-all.json), written into out/<slug>.json.   node scripts/kinds/works3/refs.js
// The Hebrew Bible and the Guru Granth Sahib have none: their articles list no books the tool can read.
const fs = require('fs'), path = require('path'), D = __dirname;
const PICK = {
  'new-testament': [9, 17, 34, 33, 6, 14], 'quran': [5, 18, 21, 30, 23, 15], 'rigveda': [1, 4, 9, 11],
  'bhagavad-gita': [8, 32, 4, 17, 16, 12], 'pali-canon': [20, 25, 7, 9, 13], 'avesta': [6, 7, 8, 2, 10],
  'talmud': [12, 10, 11, 8], 'upanishads': [28, 27, 5, 19, 34], 'lotus-sutra': [21, 22, 12, 33, 17, 14],
  'i-ching': [15, 14, 12, 10, 7, 9]
};
// tidied as printed: translators' "(tr.)" marks, "Last, First" order, doubled or stray punctuation
const TIDY = [[/ \(tr\.\)/g, ''], [/^Steinsaltz, Adin,/, 'Adin Steinsaltz,'], [/^Maccoby,/, 'Hyam Maccoby,'], [/\.\s*\(/g, ' ('], [/\) \(/g, ' (']];
const refs = JSON.parse(fs.readFileSync(path.join(D, 'refs-all.json'), 'utf8')); let n = 0;
for (const slug of Object.keys(PICK)) {
  const f = path.join(D, 'out', slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.references = PICK[slug].map(i => { let x = refs[slug][i - 1]; if (!x) throw new Error(slug + ': no book ' + i); for (const [a, b] of TIDY) x = x.replace(a, b); return x; });
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); n++; console.log('== ' + slug + '\n   ' + j.references.join('\n   '));
}
console.log(n + ' drafts given references');
