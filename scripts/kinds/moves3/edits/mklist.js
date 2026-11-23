// list.tsv for a wave from its rank.tsv and the editor's chosen titles.   node mklist.js <dir> <kind label> <title>|<profile name> …
const fs = require('fs'), path = require('path'), [dir, label, ...picks] = process.argv.slice(2);
const R = new Map(fs.readFileSync(path.join(dir, 'rank.tsv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split('\t')).map(c => [c[0], c]));
const slug = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const out = ['# ' + label + ' (23 Nov 2026). slug TAB Wikipedia title TAB the profile\'s name TAB region'];
for (const p of picks) { const [t, name = t] = p.split('|'), c = R.get(t); if (!c) throw new Error('not ranked: ' + t); out.push([slug(name), c[7] || t, name, c[1]].join('\t')); }
fs.writeFileSync(path.join(dir, 'list.tsv'), out.join('\n') + '\n'); console.log(picks.length + ' rows');
