// The editor's changes to the drafts of the sacred texts (works3, 22 Nov 2026), each an exact pair that must stand once
// in its draft (events are removed by their date label).   node scripts/kinds/works3/edit.js
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'out');
const E = {
  'hebrew-bible': [
    // a teaser is a sentence
    ["The canonical collection of Hebrew scriptures, the Torah, Nevi'im and Ketuvim, composed and edited by the Israelites over several hundred years, with its authoritative Jewish form fixed in the Masoretic Text of the 7th to 10th centuries CE.",
     "The Hebrew Bible is the canonical collection of Hebrew scriptures, the Torah, Nevi'im and Ketuvim, composed and edited by the Israelites over several hundred years; its authoritative Jewish form was fixed in the Masoretic Text of the 7th to 10th centuries CE."]],
  'new-testament': [
    ['"info": "The second division of the Christian Bible: 27 texts', '"info": "The New Testament is the second division of the Christian Bible: 27 texts'],
    // the Catechism's "Revelation" is divine revelation, not the book of that name
    ['teaches that Revelation has one common source', 'teaches that divine revelation has one common source']],
  'guru-granth-sahib': [
    ['"info": "The central scripture of Sikhism, which Sikhs regard', '"info": "The Guru Granth Sahib is the central scripture of Sikhism, which Sikhs regard']],
  'bhagavad-gita': [
    // Ashoka is a historical ruler (and a Great Life of the site)
    ['and the semi-legendary life of Ashoka in the 3rd', 'and the life of Ashoka in the 3rd'],
    ['Its arts afterlife includes Philip Glass', 'Works of art drawn from it include Philip Glass']],
  'pali-canon': [
    // a verdict between scholars is not the Institute's to give
    ['a position Alexander Wynne criticised and Bhikkhu Anālayo has refuted in detail', 'a position that Alexander Wynne criticised and Bhikkhu Anālayo has argued against in detail']],
  'avesta': [
    // the Parsis had the texts all along
    ['discovered the texts among the Parsi communities', 'found the texts among the Parsi communities']],
  'lotus-sutra': [
    ['EVENT', '1253'],   // dated only by the year of Dōgen's death: the article gives no year for it
    ['ALL', 'skillful', 'skilful'], ['ALL', 'jeweled', 'jewelled'], ['Memorizing it became', 'Memorising it became'], ['countless eons ago', 'countless aeons ago'], ['ALL', 'Sanskritized', 'Sanskritised']],
  'upanishads': [
    // the years given for Akbar's reign are not his reign's: left out
    ["Akbar's reign (1556 to 1586) saw", "Akbar's reign saw"],
    ['ALL', 'memorized', 'memorised'], ['ALL', 'synthesizes', 'synthesises'], ['ALL', 'self-realization', 'self-realisation']]
};
// a span in words where the years of composition are a tradition and a long process
const SPAN = { 'pali-canon': [-450, '5th–1st century BCE'] };
let n = 0;
for (const slug of Object.keys(E)) {
  const f = path.join(D, slug + '.json'); let t = fs.readFileSync(f, 'utf8');
  for (const e of E[slug]) {
    if (e[0] === 'EVENT') { const j = JSON.parse(t), k = j.ev.findIndex(x => x[0] === e[1]); if (k < 0) { console.log(slug + ': no event ' + e[1] + ' (already taken out?)'); continue; } j.ev.splice(k, 1); t = JSON.stringify(j, null, 1) + '\n'; n++; continue; }
    if (e[0] === 'ALL') { const c = t.split(e[1]).length - 1; if (!c) { console.log(slug + ': none of ' + e[1]); continue; } t = t.split(e[1]).join(e[2]); n += c; continue; }
    const a = JSON.stringify(e[0]).slice(1, -1), b = JSON.stringify(e[1]).slice(1, -1), A = t.includes(a) ? a : e[0], B = t.includes(a) ? b : e[1];
    if (t.includes(B) && !t.includes(A)) continue; if (t.split(A).length !== 2) { console.log(slug + ': NOT ONCE: ' + e[0].slice(0, 60)); continue; }
    t = t.replace(A, () => B); n++;
  }
  JSON.parse(t); fs.writeFileSync(f, t);
}
for (const slug of Object.keys(SPAN)) { const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')); j.start = SPAN[slug][0]; j.circa = true; j.span = SPAN[slug][1]; fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); }
console.log(n + ' changes');
