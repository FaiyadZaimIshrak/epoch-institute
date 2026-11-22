// Longer texts whose sentences an earlier tool cut at an abbreviation ("5 p.m.", "U.S.", "(1.5)"): the missing words
// put back from the saved Wikipedia articles (22 Nov 2026; found by style-audit.js "p: lower-case sentence start").
// Each pair must stand exactly once in scripts/entry-more/<first character>.json.   node scripts/entries/more-repairs.js
const fs = require('fs'), path = require('path'), D = path.join(__dirname, '..', 'entry-more');
const FIX = [
  ['treaty-of-luneville', 'The last week concerned the left bank of the Rhine. m. on 9 February 1801.',
    'The last week concerned the left bank of the Rhine. The treaty was signed at five in the evening on 9 February 1801.'],
  ['united-states-invasion-of-panama', 'S. Marine lieutenant, Robert Paz, was shot dead by the Panama Defense Forces.',
    'A U.S. Marine lieutenant, Robert Paz, was shot dead by the Panama Defense Forces.'],
  ['united-states-invasion-of-panama', 'on 17 December. m. S. citizens, defending democracy and human rights,',
    'on 17 December. The invasion began at 12:46 a.m. on 20 December 1989, and Bush named four objectives: safeguarding the lives of U.S. citizens, defending democracy and human rights,'],
  ['united-states-invasion-of-panama', 'S. S. civilians. About 20,000 people lost their homes',
    'The Pentagon estimated that 516 Panamanians were killed, including 314 soldiers and 202 civilians; 23 U.S. soldiers and 3 U.S. civilians were killed. About 20,000 people lost their homes'],
  ['united-states-invasion-of-panama', 'the United Kingdom and France. S. government invoked self-defence,',
    'the United Kingdom and France. The U.S. government invoked self-defence,'],
  ['arame-of-urartu', 'who are not historically attested. 5) places them six and seven generations after Hayk.',
    'who are not historically attested. Khorenatsi’s History (1.5) places them six and seven generations after Hayk.']
];
const js = s => JSON.stringify(s).slice(1, -1); let n = 0;
for (const [slug, a, b] of FIX) {
  const f = fs.readdirSync(D).find(x => slug in JSON.parse(fs.readFileSync(path.join(D, x), 'utf8'))), p = path.join(D, f); let t = fs.readFileSync(p, 'utf8');
  if (t.includes(js(b))) { console.log(slug + ': already'); continue; }
  if (t.split(js(a)).length !== 2) { console.log(slug + ': NOT ONCE: ' + a.slice(0, 50)); continue; }
  t = t.replace(js(a), () => js(b)); JSON.parse(t); fs.writeFileSync(p, t); n++;
}
console.log(n + ' repaired');
