// Keeps the profile counts written by hand into pages in step with EMPIRES (they went stale: in Nov 2026 the home page
// still said 510 profiles and /profiles 15 cultures). Run after merging profiles of any kind:
//   node scripts/kinds/update-counts.js [--check]       (--check: report what would change, write nothing)
// Rewrites: index's meta description (N profiles), /profiles' descriptions and JSON-LD (N states and empires, N religions
// …), /faiths' "<number word> religions", llms.txt's collection lines. Numbers of religions are written as words where
// the page uses words. Fails on a pattern that no longer matches, so a reworded page is noticed.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const check = process.argv.includes('--check');
const sd = fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8');
const E = new Function(sd + ';return EMPIRES')();
const n = k => E.filter(e => (e.kind || 'polity') === k).length;
const C = { all: E.length, polity: n('polity'), religion: n('religion'), language: n('language'), culture: n('culture'), movement: n('movement'), government: n('government'), ideology: n('ideology'), work: n('work') };
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const word = x => x < 20 ? ONES[x] : TENS[Math.floor(x / 10)] + (x % 10 ? '-' + ONES[x % 10] : '');
const cap = s => s[0].toUpperCase() + s.slice(1);
const NUMW = '(?:' + [...ONES.slice(10), ...TENS.slice(2).flatMap(t => [t, ...ONES.slice(1, 10).map(o => t + '-' + o)])].join('|') + ')';
const RULES = [
  ['index', /\b\d+ profiles of states, empires/g, () => C.all + ' profiles of states, empires'],
  ['profiles', /\b\d+ states and empires, \d+ religions, \d+ languages, \d+ cultures, \d+ movements(?:,| and) \d+ forms of government(?:(?:,| and) \d+ ideologies)?(?: and \d+ great works)?/g,
    () => `${C.polity} states and empires, ${C.religion} religions, ${C.language} languages, ${C.culture} cultures, ${C.movement} movements, ${C.government} forms of government, ${C.ideology} ideologies and ${C.work} great works`],
  ['faiths', new RegExp('\\b(' + NUMW + ') religions', 'gi'), m => (/^[A-Z]/.test(m) ? cap(word(C.religion)) : word(C.religion)) + ' religions'],
  ['llms.txt', /the \d+ in-depth profiles of empires and states/g, () => `the ${C.polity} in-depth profiles of empires and states`],
  ['llms.txt', /\): \d+ profiles of faiths/g, () => `): ${C.religion} profiles of faiths`],
  ['llms.txt', /\): \d+ profiles of languages/g, () => `): ${C.language} profiles of languages`],
  ['llms.txt', /\): \d+ profiles of cultures/g, () => `): ${C.culture} profiles of cultures`],
  ['llms.txt', /\): \d+ profiles of movements/g, () => `): ${C.movement} profiles of movements`],
  ['llms.txt', /\): \d+ profiles of ideologies/g, () => `): ${C.ideology} profiles of ideologies`],
  ['llms.txt', /\): \d+ profiles of great works/g, () => `): ${C.work} profiles of great works`],
  ['llms.txt', /\b\d+ full profiles of empires, states, religions, languages, cultures, movements(?:,| and) forms of government(?:(?:,| and) ideologies)?(?: and great works)?/g,
    () => `${C.all} full profiles of empires, states, religions, languages, cultures, movements, forms of government, ideologies and great works`],
  ['llms.txt', new RegExp('\\b' + NUMW + ' religions on a turning globe', 'g'), () => word(C.religion) + ' religions on a turning globe'],
];
const files = {}, bad = []; let changed = 0;
for (const [f, re, to] of RULES) {
  const p = path.join(R, f); const t = files[f] !== undefined ? files[f] : fs.readFileSync(p, 'utf8');
  let hits = 0; const nt = t.replace(re, m => { hits++; return to(m); });
  if (!hits) bad.push(f + ': no match for ' + re); if (nt !== t) changed++;
  files[f] = nt;
}
if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
console.log('counts:', JSON.stringify(C));
for (const f in files) { const old = fs.readFileSync(path.join(R, f), 'utf8'); if (old !== files[f]) { console.log((check ? 'would update ' : 'updated ') + f); if (!check) fs.writeFileSync(path.join(R, f), files[f]); } }
