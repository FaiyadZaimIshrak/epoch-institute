// The editor's picks of each battle's books (picks.tsv: numbers in refs-all.json's order, as fill-refs.js list prints them)
// written into the drafts' references. node refs.js <drafts dir>
const fs = require('fs'), path = require('path'), D = process.argv[2], all = JSON.parse(fs.readFileSync(path.join(__dirname, 'refs-all.json'), 'utf8'));
for (const l of fs.readFileSync(path.join(__dirname, 'picks.tsv'), 'utf8').split(/\r?\n/).filter(Boolean)) { const [slug, p] = l.split('\t'), f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.references = p === '-' ? [] : p.split(',').map(n => { const r = (all[slug] || [])[+n - 1]; if (!r) throw new Error(slug + ' ' + n); return r.replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/ : /g, ': ').replace(/:(?=[A-Z])/g, ': '); });
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); console.log(slug + ': ' + j.references.length); j.references.forEach(r => console.log('   ' + r)); }
