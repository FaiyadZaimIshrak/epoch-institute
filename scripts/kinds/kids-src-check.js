// Checks the Kids stories against their packs (8 Nov 2026): every "src" phrase must be found in the story's pack (case,
// quotes and spacing aside), and every number in a sentence must be in its src or be a rounded "years ago" figure.
// Prints each story with its sentences beside their sources, for the editor to read, and the faults first.
//   node scripts/kinds/kids-src-check.js <stories dir> <packs dir> [--faults]
const fs = require('fs'), path = require('path');
const [sd, pd] = process.argv.slice(2), FAULTS = process.argv.includes('--faults');
const norm = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[‘’ʼ`]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
let nF = 0; const out = [];
for (const f of fs.readdirSync(sd).filter(f => f.endsWith('.json')).sort()) {
  const slug = f.replace(/\.json$/, ''), packF = path.join(pd, slug + '.md');
  let s; try { s = JSON.parse(fs.readFileSync(path.join(sd, f), 'utf8')); } catch (e) { out.push('!! ' + f + ': not JSON'); nF++; continue; }
  if (!fs.existsSync(packF)) { out.push('!! ' + f + ': no pack'); nF++; continue; }
  const pack = norm(fs.readFileSync(packF, 'utf8')), lines = ['## ' + s.name + ': ' + s.title];
  for (const p of s.pages) {
    lines.push('[' + p.pic + ']');
    p.text.forEach((t, i) => {
      const src = (p.src || [])[i] || '', parts = src.split(' / ').map(x => x.trim()).filter(Boolean), faults = [];
      if (!parts.length) faults.push('no source');
      for (const x of parts) if (!pack.includes(norm(x).replace(/^"|"$/g, ''))) faults.push('not in the pack: "' + x + '"');
      const nums = (t.match(/\d[\d,.]*/g) || []).map(n => n.replace(/[,.]$/, ''));
      for (const n of nums) if (!norm(src).includes(n.replace(/,/g, '')) && !norm(src).includes(n) && !/years? ago/.test(t)) faults.push('number ' + n + ' not in its source');
      if (faults.length) nF += faults.length;
      if (!FAULTS || faults.length) lines.push('  ' + t + '\n      <- ' + src + (faults.length ? '\n      !! ' + faults.join('; ') : ''));
    });
  }
  out.push(lines.join('\n'));
}
console.log(out.join('\n\n')); console.error(nF + ' faults');
