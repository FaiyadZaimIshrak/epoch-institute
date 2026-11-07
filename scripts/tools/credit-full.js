// Credits cut short at import ("Original upload...", "Juliusz Ostrowsk..."): the picture credits of encyclopedia-data.js,
// empire-section-images.js and data/states/*.json whose author ends in "..." are looked up again on Wikimedia Commons
// (the file's Artist field, HTML flattened, styles dropped) and the full text is APPENDED to scripts/credit-overrides.tsv
// (File:<title> TAB author), which scripts/clean-credits.ps1 then applies and shortens at a part's end. Files already in
// the overrides are skipped; one request a second.
//   node scripts/tools/credit-full.js [--list]        --list only counts and prints what would be asked
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org; picture credits)' };
const STR = '"((?:[^"\\\\]|\\\\.)*)"';
const rxA = new RegExp('artist:' + STR + ',licence:' + STR + ',source:' + STR, 'g');
const rxS = new RegExp('"cr":\\{"a":' + STR + ',"l":' + STR + ',"s":' + STR, 'g');
const cut = new Map();
const take = (txt, rx) => { for (const m of txt.matchAll(rx)) { const a = JSON.parse('"' + m[1] + '"'), s = JSON.parse('"' + m[3] + '"'); if (/(\.\.\.|…)$/.test(a)) { const t = (s.match(/\/wiki\/(File:[^?#]+)/) || [])[1]; if (t) cut.set(decodeURIComponent(t).replace(/_/g, ' '), a); } } };
take(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8'), rxA);
take(fs.readFileSync(path.join(R, 'empire-section-images.js'), 'utf8'), rxA);
for (const f of fs.readdirSync(path.join(R, 'data', 'states'))) take(fs.readFileSync(path.join(R, 'data', 'states', f), 'utf8'), rxS);
const ovF = path.join(R, 'scripts', 'credit-overrides.tsv');
const have = new Set(fs.readFileSync(ovF, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')[0]));
const todo = [...cut.keys()].filter(t => !have.has(t));
console.log(cut.size + ' credits cut short, ' + todo.length + ' not yet in credit-overrides.tsv');
if (process.argv.includes('--list')) { for (const t of todo.slice(0, 20)) console.log('  ' + t + ' :: ' + cut.get(t)); process.exit(0); }
const flat = h => h.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<br\s*\/?>/gi, '; ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  const add = []; let n = 0;
  for (const t of todo) {
    try {
      const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist&titles=' + encodeURIComponent(t), { headers: UA });
      const j = await r.json(), p = Object.values(j.query.pages)[0], v = p.imageinfo && p.imageinfo[0].extmetadata.Artist;
      const a = v ? flat(v.value) : '';
      if (a && a.length > cut.get(t).replace(/(\.\.\.|…)$/, '').length) { add.push(t + '\t' + a.replace(/\t/g, ' ')); n++; }
    } catch (e) { console.log('  failed: ' + t + ' (' + e.message + ')'); }
    await new Promise(r => setTimeout(r, 2500));
  }
  if (add.length) fs.appendFileSync(ovF, '# ' + new Date().toISOString().slice(0, 10) + ': credits cut short at import, full text from Commons (scripts/tools/credit-full.js)\n' + add.join('\n') + '\n');
  console.log(n + ' full credits added to scripts/credit-overrides.tsv');
})();
