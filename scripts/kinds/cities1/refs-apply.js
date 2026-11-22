// puts the editor's picks of each profile's references into edit-more.json as ['slug', 'set', 'references', [...]]
// node refs-apply.js <dir> <refs.json>
const fs = require('fs'), path = require('path'), [dir, refsF] = process.argv.slice(2);
const refs = JSON.parse(fs.readFileSync(refsF, 'utf8')), f = path.join(dir, 'edit-more.json');
let ed = []; try { ed = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
ed = ed.filter(e => !(e[1] === 'set' && e[2] === 'references'));
const tidy = s => s.replace('Bloomsbury, 2nd edition, 2017, 2017', 'Bloomsbury, 2017').replace('Bloomsbury, 2nd edition, 2014, 2014', 'Bloomsbury, 2014').replace(/^Bury, J B, /, 'J. B. Bury, ').replace('Holy Land. (', 'Holy Land (').replace(/^Ali, Abdullah Yusuf, /, 'Abdullah Yusuf Ali, ').replace(/^(Crone), (Patricia), /, '$2 $1, ').replace(/^(Hodgson), (Marshall), /, '$2 $1, ').replace(/^(Nicolle), (David), /, '$2 $1, ').replace(/^(Boritt), (Gabor S.), ed, /, '$2 $1 (ed.), ').replace(/^(Mayer), (Hans Eberhard), /, '$2 $1, ').replace('Enemy of Rome:The', 'Enemy of Rome: The').replace(/'(?= \()/, '').replace(/^([^,]+), ([A-Z][a-z]+(?: [A-Z]\.?)*),,? /, (m, last, first) => /^(Le Strange|Wiet|Coe|Díaz del Castillo|Soustelle|Evans|Rosenthal|Lapidus|Boak|Bury|Crone|Hodgson|Nicolle|Boritt)$/.test(last) ? first + ' ' + last + ', ' : m).replace(/\s+/g, ' ').replace(/ \(([^()]*), (\d{4})\)$/, (m, p, y) => ' (' + p.replace(/;.*$/, '').trim() + ', ' + y + ')');
let n = 0;
for (const l of fs.readFileSync(path.join(dir, 'picks.tsv'), 'utf8').split(/\r?\n/)) { if (!l.trim()) continue; const [slug, nums] = l.split('\t'); if (nums.trim() === '-') continue;
  const list = nums.split(',').map(x => { const r = (refs[slug] || [])[+x - 1]; if (!r) throw new Error(slug + ': no book ' + x); return tidy(r); });
  ed.push([slug, 'set', 'references', list]); n += list.length; console.log(slug + '\n  ' + list.join('\n  ')); }
fs.writeFileSync(f, JSON.stringify(ed, null, 1)); console.log(n + ' references set');
