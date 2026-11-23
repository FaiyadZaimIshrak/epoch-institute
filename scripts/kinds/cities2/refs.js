// Writes the editor's picks (picks.tsv: slug TAB numbers of refs-all.json's list, "-" for none) into each draft's
// "references", as the article prints them but for the author's name put first-name first and a publisher's stray
// words.   node refs.js [dir of drafts, default out] [--dry]
const fs = require('fs'), path = require('path'); const D = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'out', DRY = process.argv.includes('--dry');
const refs = JSON.parse(fs.readFileSync(path.join(__dirname, 'refs-all.json'), 'utf8'));
const tidy = s => { s = s.replace(/^([A-Z][A-Za-zÀ-ÿ'’-]+), ([A-Z][A-Za-zÀ-ÿ. -]{1,24}?)\.?, (?=["“A-Z])/, (m, sur, giv) => (/(^| )[A-Z]$/.test(giv) ? giv + '.' : giv) + ' ' + sur + ', ');
  return s.replace(/^Lewis \(writer\) Hanke/, 'Lewis Hanke').replace(/^Jane \(2008\) McIntosh/, 'Jane McIntosh').replace('Wiley-Blackwell; New Ed edition, 2001', 'Wiley-Blackwell, 2001').replace('(CUP Archive, ', '(Cambridge University Press, ')
    .replace('(Univ of California Press, ', '(University of California Press, ').replace('(Univ. of Minnesota Press, ', '(University of Minnesota Press, ').replace('University of California Press / London', 'University of California Press').replace(/ \(Peoples of Africa\)/, '').replace('(Pimlico (London), ', '(Pimlico, ').replace('(Clarendon Press (Oxford), ', '(Clarendon Press, ').replace('John E. Jr. Wills', 'John E. Wills Jr.').replace('University of Chigaco Press', 'University of Chicago Press').replace(/\s+/g, ' ').trim(); };
let n = 0, c = 0;
for (const l of fs.readFileSync(path.join(__dirname, 'picks.tsv'), 'utf8').split(/\r?\n/)) { if (!l.trim()) continue; const [slug, nums] = l.split('\t'); const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const list = nums.trim() === '-' ? [] : nums.split(',').map(x => { const r = (refs[slug] || [])[+x - 1]; if (!r) throw new Error(slug + ': no book ' + x); return tidy(r); });
  j.references = list; if (list.length) { c++; n += list.length; console.log(slug + '\n  ' + list.join('\n  ')); } if (!DRY) fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); }
console.log(n + ' references for ' + c + ' cities' + (DRY ? ' (dry)' : ''));
