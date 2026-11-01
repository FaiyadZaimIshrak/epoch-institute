// Songs in History: where a phrase stands on a source page. node scripts/songs/find-lines.js "site:Page|phrase" ...
// Prints the page's stanza numbers (as fetch-texts.js --peek numbers them) holding the phrase, with the stanza's size
// and first words, or "not on the page". The phrase is compared without vowel marks, accents or punctuation.
const { execFileSync } = require('child_process'), path = require('path');
const fold = s => s.normalize('NFD').replace(/[̀-ًͯ-ְٰٟ-ׇ॑-॔]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
for (const a of process.argv.slice(2)) {
  const [pg, phrase] = a.split('|'); let out;
  try { out = execFileSync(process.execPath, [path.join(__dirname, 'fetch-texts.js'), '--peek=' + pg, '--full'], { encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch (e) { console.log(pg + ': ' + (e.stdout || e.message).split('\n')[0]); continue; }
  const lines = out.split('\n'), hits = lines.filter((l, i) => i && fold(l).includes(fold(phrase)));
  console.log(lines[0].slice(0, 70) + ' | "' + phrase + '": ' + (hits.length ? '' : 'not on the page'));
  for (const h of hits.slice(0, 6)) console.log('   ' + h.slice(0, 110));
}
