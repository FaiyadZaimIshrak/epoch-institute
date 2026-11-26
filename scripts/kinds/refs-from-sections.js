// References for profiles that still have none, from the works their own Wikipedia article cites (the lists of
// scripts/profile-section-sources.js, SECTION_SOURCES), chosen by the editor: only works about the subject itself.
//   node scripts/kinds/refs-from-sections.js list                  prints, per profile without references, the cited works, numbered
//   node scripts/kinds/refs-from-sections.js write <picks.tsv>     picks: profile name <TAB> numbers ("3,1"; "-" none)
// The numbers are those of `list` (the order is stable while profile-section-sources.js is unchanged; write checks
// nothing but that each number exists, so run list and write on the same data). A profile that has references is left alone.
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..');
const c = {}; vm.createContext(c);
for (const f of ['shared-data.js', 'empire-profiles.js', 'scripts/profile-section-sources.js'])
  vm.runInContext(fs.readFileSync(path.join(R, f), 'utf8').replace(/^\s*(const|let) /mg, 'var '), c);
const worksOf = name => { const s = c.SECTION_SOURCES[name], m = new Map(); if (s) for (const k of Object.keys(s.s)) for (const w of s.s[k].w) m.set(w, (m.get(w) || 0) + 1); return [...m.keys()]; };
const none = c.EMPIRES.filter(e => c.EMPIRE_PROFILES[e.name] && !(c.EMPIRE_PROFILES[e.name].references || []).length);
const [cmd, picksF] = process.argv.slice(2);
if (cmd === 'list') {
  for (const e of none) { const w = worksOf(e.name); if (w.length) console.log('\n== ' + e.name + '\n' + w.map((x, i) => '  ' + (i + 1) + ' ' + x).join('\n')); }
} else if (cmd === 'write') {
  const f = path.join(R, 'empire-profiles.js'); let t = fs.readFileSync(f, 'utf8'); const E = t.includes('\r\n') ? '\r\n' : '\n'; let n = 0;
  for (const l of fs.readFileSync(picksF, 'utf8').split(/\r?\n/)) {
    const [name, nums] = l.split('\t'); if (!name || name.startsWith('#') || !nums || nums.trim() === '-') continue;
    if (!none.some(e => e.name === name)) { console.log('has references or is no profile, left: ' + name); continue; }
    const w = worksOf(name), list = nums.split(',').map(x => { const b = w[+x.trim() - 1]; if (!b) throw new Error(name + ': no work ' + x); return b; });
    const at = t.indexOf(E + '  ' + JSON.stringify(name) + ': {'); if (at < 0) throw new Error('not found: ' + name);
    const end = t.indexOf(E + '  }', at + 1), a = t.indexOf('references: [', at); if (a < 0 || a > end) throw new Error('no references key: ' + name);
    const b = t.indexOf(']', a); if (t.slice(a + 13, b).trim()) throw new Error('has references: ' + name);
    t = t.slice(0, a + 13) + E + list.map(x => '    ' + JSON.stringify(x)).join(',' + E) + E + '    ' + t.slice(b); n++;
  }
  new Function(t.replace(/^\s*const /gm, 'var '));   // the file must still evaluate
  fs.writeFileSync(f, t); console.log(n + ' profiles given references');
} else { console.log('list | write <picks.tsv>'); process.exit(1); }
