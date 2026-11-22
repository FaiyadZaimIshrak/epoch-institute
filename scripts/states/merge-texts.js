// Writes a wave's checked state histories into data/states/<first character>.json (Nov 2026; scripts/states/STATES-GUIDE.md).
//   node scripts/states/merge-texts.js <wave dir> <edits.json> <picks.tsv> [--write]
// <wave dir>/out/batch-*.json are the writers' texts; edits.json the editor's changes, [id, field, old, new], each of
// which must match exactly once; picks.tsv the pictures chosen by eye on the contact sheet (id TAB k, "-" = none), from
// <wave dir>/pics/<id>.<k>.{jpg,png,gif} and .json (scripts/entries/pictures.js fetch), copied to images/states/<id>.jpg
// (320 px; PNG and GIF converted on white by PowerShell's System.Drawing) with the credit {a, l, s}.
// Refuses a state not in the register, one that already has a text, and an edit that does not match. The files are one
// line of JSON written by PowerShell: each new state is inserted as text before the closing brace, so nothing else in
// the file changes. Without --write it only checks.
const fs = require('fs'), path = require('path'), cp = require('child_process'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), WRITE = process.argv.includes('--write');
const [dir, editsF, picksF] = args;
const POL = new Map(JSON.parse(fs.readFileSync(path.join(R, 'data', 'polities.json'), 'utf8')).nodes.map(n => [n.id, n]));
const SD = path.join(R, 'data', 'states'), have = new Set();
for (const f of fs.readdirSync(SD)) for (const k of Object.keys(JSON.parse(fs.readFileSync(path.join(SD, f), 'utf8')))) have.add(k);
const T = {}; for (const f of fs.readdirSync(path.join(dir, 'out')).filter(f => /^batch-.*\.json$/.test(f))) Object.assign(T, JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8')));
const bad = [];
for (const [id, k, a, b] of JSON.parse(fs.readFileSync(editsF, 'utf8'))) {
  const s = T[id] && T[id][k]; if (typeof s !== 'string') { bad.push('edit: no ' + id + '.' + k); continue; }
  const n = s.split(a).length - 1; if (n !== 1) { bad.push('edit matches ' + n + ' times: ' + id + '.' + k + ': ' + a.slice(0, 60)); continue; }
  T[id][k] = s.replace(a, () => b);
}
const PICK = {}; if (picksF && fs.existsSync(picksF)) for (const l of fs.readFileSync(picksF, 'utf8').split(/\r?\n/)) { const p = l.split('\t'); if (p[0] && !l.startsWith('#')) PICK[p[0]] = p[1]; }
for (const id of Object.keys(T)) {
  if (!POL.has(id)) bad.push(id + ': not in the register'); if (have.has(id)) bad.push(id + ': already has a text');
  if (!(id in PICK)) bad.push(id + ': no picture chosen (write "-" for none)');
  for (const k of ['t', 'o', 'r', 'e']) if (/\bthe article\b/i.test(T[id][k] || '')) bad.push(id + '.' + k + ': still speaks of the article');
}
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
const byFile = {};
for (const id of Object.keys(T)) {
  const s = T[id], v = { t: s.t, o: s.o, r: s.r, e: s.e, ru: s.ru || [], re: s.re || '', la: s.la || '' };
  const k = PICK[id];
  if (k && k !== '-') {
    const b = path.join(dir, 'pics', id + '.' + k), ext = ['jpg', 'png', 'gif'].find(x => fs.existsSync(b + '.' + x));
    if (!ext) { console.log(id + ': picture ' + k + ' not downloaded'); process.exit(1); }
    const meta = JSON.parse(fs.readFileSync(b + '.json', 'utf8')), dest = path.join(R, 'images', 'states', id + '.jpg');
    if (WRITE) {
      if (ext === 'jpg') fs.copyFileSync(b + '.jpg', dest);
      else cp.execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Drawing; $s=[Drawing.Image]::FromFile('${(b + '.' + ext).replace(/'/g, "''")}'); $c=New-Object Drawing.Bitmap $s.Width,$s.Height; $g=[Drawing.Graphics]::FromImage($c); $g.Clear([Drawing.Color]::White); $g.DrawImage($s,0,0,$s.Width,$s.Height); $c.Save('${dest.replace(/'/g, "''")}',[Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $c.Dispose(); $s.Dispose()`]);
    }
    v.img = '/images/states/' + id + '.jpg'; v.cr = { a: meta.artist.slice(0, 140), l: meta.licence, s: meta.source };
  }
  const f = id.charAt(0); (byFile[f] = byFile[f] || []).push([id, v]);
}
let n = 0;
for (const [f, rows] of Object.entries(byFile)) {
  const fp = path.join(SD, f + '.json'), text = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '{}';
  const i = text.lastIndexOf('}'), body = rows.map(([id, v]) => JSON.stringify(id) + ':' + JSON.stringify(v)).join(',');
  const out = text.slice(0, i).replace(/\s*$/, '') + (text.slice(0, i).trim() === '{' ? '' : ',') + body + text.slice(i);
  JSON.parse(out); n += rows.length; if (WRITE) fs.writeFileSync(fp, out);
}
console.log(n + ' state histories ' + (WRITE ? 'written' : 'checked') + ' in ' + Object.keys(byFile).length + ' files');
