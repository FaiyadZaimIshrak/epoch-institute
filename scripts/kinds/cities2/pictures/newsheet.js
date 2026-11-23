// A sheet of only the proposals not yet looked at: those of secpics/prop.json that are not in secpics/seen.json
// ("profile|section|slug" of every cell shown on an earlier sheet). Marks them seen.   (run in the repository)
//   node newsheet.js <out dir> <sheet name>
const fs = require('fs'), path = require('path'); const [out, name] = process.argv.slice(2);
const E = new Function(fs.readFileSync('encyclopedia-data.js', 'utf8') + ';return ENCYCLOPEDIA')(); const by = new Map(E.map(e => [e.slug, e]));
const prop = JSON.parse(fs.readFileSync(path.join(out, 'prop.json'), 'utf8')), seenF = path.join(out, 'seen.json');
const seen = new Set(fs.existsSync(seenF) ? JSON.parse(fs.readFileSync(seenF, 'utf8')) : []);
const css = '<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:6px;font:11px Arial;background:#181818;color:#eee;display:flex;flex-wrap:wrap;gap:3px}.c{position:relative;width:122px;height:106px}.c img{width:122px;height:76px;object-fit:cover;object-position:center 25%;display:block}.c b{position:absolute;left:0;top:0;background:#000c;color:#fff;padding:0 3px;font-size:12px}.c i{display:block;font-style:normal;font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;color:#ccc}.c u{display:block;text-decoration:none;font-size:10px;line-height:14px;white-space:nowrap;overflow:hidden;color:#e8c97a}</style>';
let h = css, n = 0; const leg = [];
for (const [k, p, s, slug] of prop) { const key = p + '|' + s + '|' + slug; if (seen.has(key)) continue; seen.add(key); n++; const e = by.get(slug);
  h += '<div class="c"><img src="' + e.img + '"><b>' + k + '</b><i>' + e.name.replace(/</g, '&lt;') + '</i><u>' + p + ' · ' + s + '</u></div>'; leg.push([k, p, s, slug].join('\t')); }
fs.writeFileSync(path.join(out, name + '.html'), h); fs.writeFileSync(path.join(out, name + '.txt'), leg.join('\n') + '\n'); fs.writeFileSync(seenF, JSON.stringify([...seen]));
console.log(n + ' new cells on ' + name + '.html');
