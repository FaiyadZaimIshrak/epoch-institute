// The editor's changes to the w1 drafts (winter round, Nov 2026), applied to out/*.json in place and printed:
// dates in running text day-first, as the encyclopedia writes them (the drafts followed their articles), and the
// fixes listed in FIX ([slug, field, old, new]; for desc, old must occur once). Run once after the drafts arrive.
const fs = require('fs'), path = require('path'), dir = path.join(__dirname, 'out');
const M = '(January|February|March|April|May|June|July|August|September|October|November|December)';
const RULES = [
  [new RegExp(M + ' (\\d{1,2}) to (\\d{1,2}), (\\d{4})', 'g'), '$2 to $3 $1 $4'],
  [new RegExp(M + ' (\\d{1,2})[–-](\\d{1,2}), (\\d{4})', 'g'), '$2–$3 $1 $4'],
  [new RegExp(M + ' (\\d{1,2}), (\\d{4})', 'g'), '$2 $1 $3'],
  [new RegExp(M + ' (\\d{1,2}) (or|and) (\\d{1,2})\\b', 'g'), '$2 $3 $4 $1'],
  [new RegExp(M + ' (\\d{1,2})\\b(?![\\d,])', 'g'), '$2 $1'],
  [new RegExp(M + ' (\\d{1,2})(?=,(?! \\d{4}))', 'g'), '$2 $1'],
];
const FIX = [
  ['kwanzaa', 'dates', 'first celebrated 1966', '1966'],
  // "with Orville" read as if the aircraft had the dispute
  ['wright-flyer', 'desc', 'After a long dispute with Orville it joined the Smithsonian Institution\'s collection in 1948',
    'After a long dispute between Orville and the Smithsonian Institution it joined the Institution\'s collection in 1948'],
  // 717 characters after the fix above: the guide's limit is 700
  ['wright-flyer', 'desc', 'before gusts wrecked the machine, which never flew again', 'before gusts wrecked the machine'],
];
for (const f of fs.readdirSync(dir).filter(x => /^[a-z]\.json$/.test(x))) {
  const p = path.join(dir, f), list = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const e of list) {
    let d = e.desc; for (const [re, to] of RULES) d = d.replace(re, to);
    if (d !== e.desc) { console.log(e.slug + ': dates day-first'); e.desc = d; }
    for (const [slug, field, old, nw] of FIX) {
      if (slug !== e.slug) continue;
      if (field === 'desc') { if (e.desc.split(old).length !== 2) { if (e.desc.includes(nw)) continue; throw new Error('fix does not match once: ' + slug); } e.desc = e.desc.replace(old, nw); }
      else { if (e[field] === nw) continue; if (e[field] !== old) throw new Error('fix does not match: ' + slug + ' ' + field); e[field] = nw; }
      console.log(e.slug + ': ' + field + ' fixed');
    }
    if (e.desc.length < 380 || e.desc.length > 700) console.log('LENGTH ' + e.slug + ' ' + e.desc.length);
  }
  fs.writeFileSync(p, JSON.stringify(list, null, 1) + '\n');
}
