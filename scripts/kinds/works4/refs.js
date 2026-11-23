// Writes the editor's picks (picks.tsv: slug TAB numbers of refs-all.json's list; "-" for none; "k" keeps the references
// the writer copied from the article's own list) into each draft's "references", as the article prints them but for
// the author's name put first-name first.   node refs.js [dir of drafts, default out] [--dry]
const fs = require('fs'), path = require('path'); const D = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, 'out'), DRY = process.argv.includes('--dry');
const refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'refs-all.json'), 'utf8'));
const tidy = s => { s = s.replace(/^([A-Z][A-Za-zÀ-ÿ'’-]+), ([A-Z][A-Za-zÀ-ÿ. -]{1,24}?)\.?, (?=["“A-Z])/, (m, sur, giv) => (/(^| )[A-Z]$/.test(giv) ? giv + '.' : giv) + ' ' + sur + ', ');
  return s.replace("Her Majesty's Stationery Office (HMSO)", "Her Majesty's Stationery Office").replace('(the Viking Press, ', '(Viking Press, ').replace('(The University of Chicago Press, ', '(University of Chicago Press, ')
    .replace('Motilal Banarsidass (Reprinted 2010), 1965', 'Motilal Banarsidass, 1965').replace('Darwin\'s sacred cause : race', 'Darwin\'s Sacred Cause: Race').replace('(Four Winds Press (a division of Macmillan Publishing Company), ', '(Four Winds Press, ')
    .replace('(Harvard-Yenching Institute; Harvard University Asia Center, ', '(Harvard University Asia Center, ').replace('(Unwin critical library, G. Allen & Unwin, ', '(G. Allen & Unwin, ').replace('The Muqaddimah : an introduction to history; in three volumes. (', 'The Muqaddimah: An Introduction to History, three volumes (').replace('Men and Women in Qing China : Gender', 'Men and Women in Qing China: Gender').replace('(Eisenbraun, 2006)', '(Eisenbrauns, 2006)').replace('Gasper, Phil, ed., ', 'Phil Gasper (ed.), ').replace(/\s+/g, ' ').trim(); };
// a kept list set by hand where the article prints an edition in a form of its own
const OVERRIDE = { 'florentine-codex': ['Bernardino de Sahagún, The Florentine Codex: General History of the Things of New Spain, translated by Arthur J. O. Anderson and Charles E. Dibble, 12 volumes (University of Utah Press, 2002)'] };
let n = 0, c = 0, kept = 0;
for (const l of fs.readFileSync(path.join(__dirname, 'picks.tsv'), 'utf8').split(/\r?\n/)) { if (!l.trim()) continue; const [slug, nums] = l.split('\t'); const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  let list; if (nums.trim() === 'k') { list = OVERRIDE[slug] || (j.references || []).map(tidy); kept++; } else list = nums.trim() === '-' ? [] : nums.split(',').map(x => { const r = (refs[slug] || [])[+x - 1]; if (!r) throw new Error(slug + ': no book ' + x); return tidy(r); });
  j.references = list; if (list.length) { c++; n += list.length; console.log(slug + '\n  ' + list.join('\n  ')); } if (!DRY) fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); }
console.log(n + ' references for ' + c + ' works (' + kept + ' kept as the writer copied them)' + (DRY ? ' (dry)' : ''));
