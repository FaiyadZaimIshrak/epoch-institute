// Section pictures of the profiles (empire-section-images.js): one picture per section, an encyclopedia entry linked in
// that section, chosen BY EYE on a contact sheet (the subject itself; a map only for a place, never a modern city view, a
// flag or a namesake), as in Oct 2026.
//   node scripts/kinds/section-pictures.js sheet <out.html> <profile> …   candidates per section (open it from the local
//        server: the pictures are /images/… addresses; scripts/tools/shots.js can photograph it), (the pictured entries
//        its page links there, from link-scan.js's report) as an HTML contact sheet, numbered "<section>.<n>"
//   node scripts/kinds/section-pictures.js write                           writes the choices in scripts/kinds/pick.txt
// pick.txt: "profile<TAB>section<TAB>entry slug" ("-" = no picture); a profile's rows replace all its sections. Needs
// the --report of link-scan.js for the profiles: node scripts/kinds/link-scan.js --report=<file> … (pass it as REPORT=).
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const [cmd, ...rest] = process.argv.slice(2);
const ed = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
const ent = slug => { const m = ed.match(new RegExp('^  \\{slug:"' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '",name:("(?:[^"\\\\]|\\\\.)*").*?img:"([^"]*)",credit:\\{artist:("(?:[^"\\\\]|\\\\.)*"),licence:("(?:[^"\\\\]|\\\\.)*"),source:("(?:[^"\\\\]|\\\\.)*")', 'm'));
  return m ? { slug, name: JSON.parse(m[1]), img: m[2], artist: JSON.parse(m[3]), licence: JSON.parse(m[4]), source: JSON.parse(m[5]) } : null; };
if (cmd === 'sheet') {
  const [out, ...names] = rest, rep = process.env.REPORT;
  if (!rep) { console.error('REPORT=<link-scan report> needed'); process.exit(1); }
  const rows = fs.readFileSync(rep, 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
  let h = '<!doctype html><meta charset="utf-8"><style>body{font:13px sans-serif;background:#222;color:#eee}h2{margin:24px 0 4px}h3{margin:10px 0 4px;color:#e8c97a}' +
    '.g{display:flex;flex-wrap:wrap;gap:8px}.c{width:128px;font-size:11px}.c img{width:128px;height:90px;object-fit:cover;object-position:center 25%;display:block}.c b{color:#e8c97a}</style>';
  for (const n of names) {
    h += '<h2>' + n + '</h2>';
    const secs = [...new Set(rows.filter(r => r[0] === n).map(r => r[1]))];
    for (const s of secs) {
      const cands = [...new Set(rows.filter(r => r[0] === n && r[1] === s).map(r => r[2]))].map(ent).filter(e => e && e.img);
      h += '<h3>' + s + ' (' + cands.length + ')</h3><div class="g">' + cands.map((e, i) => '<div class="c"><img src="' + e.img + '" loading="lazy"><b>' + s + '.' + (i + 1) + '</b> ' + e.slug + '</div>').join('') + '</div>';
    }
  }
  fs.writeFileSync(out, h); console.log('sheet written: ' + out);
} else if (cmd === 'write') {
  const picks = {};
  for (const l of fs.readFileSync(path.join(__dirname, 'pick.txt'), 'utf8').split(/\r?\n/)) {
    if (!l || l.startsWith('#')) continue; const [n, s, slug] = l.split('\t'); (picks[n] = picks[n] || []).push([s, slug]);
  }
  let t = fs.readFileSync(path.join(R, 'empire-section-images.js'), 'utf8');
  for (const [n, ps] of Object.entries(picks)) {
    const body = ps.filter(p => p[1] !== '-').map(([s, slug]) => { const e = ent(slug); if (!e || !e.img) throw new Error(n + ' ' + s + ': no picture for ' + slug);
      return '    ' + s + ':{slug:' + JSON.stringify(e.slug) + ',name:' + JSON.stringify(e.name) + ',img:' + JSON.stringify(e.img) + ',artist:' + JSON.stringify(e.artist) + ',licence:' + JSON.stringify(e.licence) + ',source:' + JSON.stringify(e.source) + '}'; });
    const block = '  ' + JSON.stringify(n) + ': {\n' + body.join(',\n') + '\n  }';
    const key = '\n  ' + JSON.stringify(n) + ': {\n';
    if (t.includes(key)) { const a = t.indexOf(key) + 1, b = t.indexOf('\n  }', a) + 4; t = t.slice(0, a) + block + t.slice(b); }
    else { const close = t.lastIndexOf('\n};'); t = t.slice(0, close) + ',\n' + block + t.slice(close); }
  }
  new Function(t + ';return SECTION_IMAGES')();   // must still evaluate
  fs.writeFileSync(path.join(R, 'empire-section-images.js'), t); console.log('written: ' + Object.keys(picks).length + ' profiles');
} else { console.error('usage: section-pictures.js sheet <out.html> <profile> … | write'); process.exit(1); }
