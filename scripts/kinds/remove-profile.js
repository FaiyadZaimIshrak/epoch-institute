// Takes a profile out of the site (Nov 2026: the battles whose accounts do not give their formations). Run when no
// build is running:   node scripts/kinds/remove-profile.js [--dry] "<Profile name>" …
// It removes the profile from shared-data.js (EMPIRES, EMPIRE_INFO), empire-profiles.js, empire-glance.js,
// empire-facts.js, empire-section-images.js, scripts/profile-section-sources.js; from encyclopedia-links.js (byEmpire,
// self, ex: rows of link patterns are never deleted, so a profile-only form of it stays as a row nothing uses) and the
// "empires" lists of encyclopedia-data.js; its picture in home-data.js (whose ?v= on index and quiz is raised); its
// profile-only forms from scripts/added-entries.json; its lines of
// scripts/kinds/self.tsv, link-exclusions.tsv, pick.txt and scripts/home-pictures.tsv; its source, page, emblem, poster
// and compare file; and it makes the old address answer 301 to the profile's own entry (root .htaccess), which stays.
// Every file is edited as text and must still evaluate. Afterwards: scripts/kinds/home-pics.js, update-counts.js,
// regen-profiles.ps1 (related lists name it), a full build, and a look at what still names the page (the tool lists it).
const fs = require('fs'), path = require('path');
const R = process.env.EPOCH_REPO || path.join(__dirname, '..', '..'), DRY = process.argv.includes('--dry'), names = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (!names.length) { console.error('usage: remove-profile.js [--dry] "<Profile name>" …'); process.exit(1); }
const J = s => JSON.stringify(s), out = {}, gone = []; let homeChanged = false;
const rd = f => (f in out ? out[f] : fs.readFileSync(path.join(R, f), 'utf8'));
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const E = new Function(rd('shared-data.js') + ';return {EMPIRES, profileUrl, toSlug}')();
// one entry of an object literal written one key to a line (or to several), closed by "};" on a line of its own
function drop(text, name, what) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n', keys = ['\n  ' + J(name) + ': ', '\n' + J(name) + ':']; let i = -1, key = '';
  for (const k of keys) { i = text.indexOf(k); if (i >= 0) { key = k; break; } }
  if (i < 0) { console.log('  (not in ' + what + ')'); return text; }
  const a = i + 1, close = text.lastIndexOf(eol + '}'), next = key.startsWith('\n  ') ? text.indexOf(eol + '  "', a) : text.indexOf(eol + '"', a);
  if (next < 0 || next > close) return text.slice(0, a).replace(/,?\s*$/, '') + text.slice(close);   // the last entry: the comma before it goes
  return text.slice(0, a) + text.slice(next + eol.length);
}
// one key of a JSON object written without regard to lines: from the key to the brace that closes its value
function dropKey(text, name, what) {
  const i = text.indexOf(J(name) + ':{'); if (i < 0) { console.log('  (not in ' + what + ')'); return text; }
  let j = text.indexOf('{', i), depth = 0, str = false;
  for (; j < text.length; j++) { const c = text[j]; if (str) { if (c === '\\') j++; else if (c === '"') str = false; } else if (c === '"') str = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) break; }
  let a = i, b = j + 1; if (text[b] === ',') b++; else { while (/\s/.test(text[a - 1])) a--; if (text[a - 1] === ',') a--; }
  while (text[b] === '\r' || text[b] === '\n') b++;
  return text.slice(0, a) + text.slice(b);
}
const lines = (f, test) => { const t = rd(f), eol = t.includes('\r\n') ? '\r\n' : '\n', L = t.split(eol), K = L.filter(l => !test(l)); if (K.length !== L.length) out[f] = K.join(eol); return L.length - K.length; };
for (const name of names) {
  const emp = E.EMPIRES.find(e => e.name === name); if (!emp) { console.error('no profile named ' + name); process.exit(1); }
  const url = E.profileUrl(emp), slug = url.split('/').pop(), folder = url.split('/')[1]; console.log(name + '  ' + url);
  // shared-data.js
  let sd = rd('shared-data.js'); const row = new RegExp('(, )?\\{"name": ' + esc(J(name)) + ', [^}]*\\}(, )?'), m = sd.match(row);
  if (!m) throw new Error('EMPIRES row of ' + name); sd = sd.replace(row, () => (m[1] && m[2] ? ', ' : ''));
  const ia = sd.indexOf('const EMPIRE_INFO = {'), ib = sd.indexOf('\n};', ia); out['shared-data.js'] = sd.slice(0, ia) + drop(sd.slice(ia, ib + 3), name, 'EMPIRE_INFO') + sd.slice(ib + 3);
  for (const f of ['empire-profiles.js', 'empire-glance.js', 'empire-facts.js', 'empire-section-images.js']) out[f] = drop(rd(f), name, f);
  out['scripts/profile-section-sources.js'] = dropKey(rd('scripts/profile-section-sources.js'), name, 'scripts/profile-section-sources.js');
  // encyclopedia-links.js: byEmpire (numbers), ex (slugs), self (a slug)
  let el = rd('encyclopedia-links.js'); const k = esc(J(name)), cut = (re, what) => { const mm = el.match(re); if (!mm) { console.log('  (not in ' + what + ')'); return; } el = el.replace(re, () => (mm[1] && mm[3] ? ',' : '')); };
  cut(new RegExp('(,)?' + k + ':(\\[[\\d,]*\\])(,)?'), 'byEmpire'); cut(new RegExp('(,)?' + k + ':(\\[(?:"[^"]*",?)*\\])(,)?'), 'ex'); cut(new RegExp('(,)?' + k + ':("[^"]*")(,)?'), 'self');
  if (el.includes(J(name) + ':')) throw new Error('encyclopedia-links.js still holds a key ' + name); out['encyclopedia-links.js'] = el;
  // encyclopedia-data.js: the entries' lists of the profiles that name them
  let ed = rd('encyclopedia-data.js'), nE = 0; const item = new RegExp('(,)?\\{name:' + esc(J(name)) + ',[^{}]*\\}(,)?', 'g');
  ed = ed.replace(item, (m0, c1, c2, off) => { const ls = ed.lastIndexOf('\n', off), em = ed.lastIndexOf('empires:[', off); if (em < ls) return m0; nE++; return c1 && c2 ? ',' : ''; }); out['encyclopedia-data.js'] = ed;
  // scripts/added-entries.json: its profile-only forms (a row [slug, text, mode, {profile: [sections]}])
  let ae = rd('scripts/added-entries.json'), nF = 0; const fkey = '\n    ' + J(name) + ': [';
  for (let i = ae.indexOf(fkey); i >= 0; i = ae.indexOf(fkey)) {
    const a = ae.lastIndexOf('\n  [\n', i), b = ae.indexOf('\n  ]', i) + 4, rowT = ae.slice(a + 1, b), obj = JSON.parse(rowT)[3];
    if (Object.keys(obj).length === 1) ae = ae[b] === ',' ? ae.slice(0, a + 1) + ae.slice(b + 2) : ae.slice(0, a).replace(/,$/, '') + ae.slice(b);
    else { delete obj[name]; const r = JSON.parse(rowT); r[3] = obj; ae = ae.slice(0, a + 1) + JSON.stringify(r, null, 1).split('\n').map(l => '  ' + l).join('\n') + ae.slice(b); }
    nF++;
  }
  JSON.parse(ae); out['scripts/added-entries.json'] = ae;
  // home-data.js: its picture for the featured cards (one profile to a line)
  { const hd = rd('home-data.js'), eol = hd.includes('\r\n') ? '\r\n' : '\n', L = hd.split(eol), i = L.findIndex(l => l.startsWith('  ' + J(name) + ': {'));
    if (i >= 0) { const last = !L[i].trimEnd().endsWith(','); L.splice(i, 1); if (last) L[i - 1] = L[i - 1].replace(/,\s*$/, ''); out['home-data.js'] = L.join(eol); homeChanged = true; } }
  // the editor's lists
  const nL = ['scripts/kinds/self.tsv', 'scripts/kinds/link-exclusions.tsv', 'scripts/kinds/pick.txt', 'scripts/home-pictures.tsv'].map(f => lines(f, l => l.startsWith(name + '\t')));
  // the old address answers with the profile's own entry
  const self = (rd('scripts/kinds/self.tsv').match(new RegExp('^' + esc(name) + '\\t(\\S+)', 'm')) || fs.readFileSync(path.join(R, 'scripts/kinds/self.tsv'), 'utf8').match(new RegExp('^' + esc(name) + '\\t(\\S+)', 'm')) || [])[1];
  if (!self) throw new Error(name + ' has no entry of its own in scripts/kinds/self.tsv: where should its address go?');
  let ht = rd('.htaccess'); const anchor = '  # the profile folders have no index page: their kind\'s list on /profiles\n', rule = '  RewriteRule ^' + folder + '/' + slug.replace(/[.]/g, '\\.') + '$ /encyclopedia/' + self + ' [R=301,L]\n';
  if (!ht.includes(anchor)) throw new Error('.htaccess: anchor'); if (!ht.includes(rule)) { const head = '  # profiles taken off the site: the old address goes to the entry (scripts/kinds/remove-profile.js)\n'; ht = ht.includes(head) ? ht.replace(head, () => head + rule) : ht.replace(anchor, () => head + rule + anchor); } out['.htaccess'] = ht;
  for (const f of [folder + '/' + slug, 'scripts/kinds/src/' + slug + '.json', 'logos/' + name + '.png', 'logos/thumbs/' + name + '.png', 'logos-src/' + name + '.png', 'images/og/' + slug + '.jpg', 'data/compare/' + slug + '.json', 'data/battles/' + slug + '.json']) if (fs.existsSync(path.join(R, f))) gone.push(f);
  console.log('  entries that named it: ' + nE + '; forms: ' + nF + '; lines of self, exclusions, picks, home pictures: ' + nL.join(', ') + '; redirect to /encyclopedia/' + self);
}
if (homeChanged) for (const f of ['index', 'quiz']) { const h = rd(f), m = h.match(/home-data\.js\?v=(\d+)/); if (!m) throw new Error(f + ': home-data.js?v='); out[f] = h.split('home-data.js?v=' + m[1]).join('home-data.js?v=' + (+m[1] + 1)); }
// every file must still evaluate
const ev = (t, v) => new Function(t.replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + ';return ' + v)();
const left = new Function(out['shared-data.js'].replace(/const EVENTS[\s\S]*$/, '') + ';return [EMPIRES, EMPIRE_INFO]')();
const P = ev(out['empire-profiles.js'], 'EMPIRE_PROFILES'), G = ev(out['empire-glance.js'], 'GLANCE'), F = ev(out['empire-facts.js'], 'EMPIRE_FACTS'), S = ev(out['empire-section-images.js'], 'SECTION_IMAGES'), X = ev(out['scripts/profile-section-sources.js'], 'SECTION_SOURCES');
const L = new Function(out['encyclopedia-links.js'] + ';return ENC_LINKS')(), D = new Function(out['encyclopedia-data.js'] + ';return ENCYCLOPEDIA')();
for (const n of names) { if (left[0].some(e => e.name === n) || left[1][n] || P[n] || G[n] || F[n] || S[n] || X[n] || L.byEmpire[n] || (L.self || {})[n] || (L.ex || {})[n] || D.some(e => (e.empires || []).some(x => (x && x.name || x) === n))) throw new Error(n + ' is still in a file'); }
console.log('EMPIRES now ' + left[0].length + '; profiles ' + Object.keys(P).length + ', glance ' + Object.keys(G).length + ', facts ' + Object.keys(F).length + '; entries ' + D.length);
for (const f of Object.keys(out)) { const was = fs.readFileSync(path.join(R, f), 'utf8'); if (out[f] !== was) { console.log('change ' + f + '  ' + (out[f].length - was.length)); if (!DRY) fs.writeFileSync(path.join(R, f), out[f]); } }
for (const f of gone) { console.log('delete ' + f); if (!DRY) fs.unlinkSync(path.join(R, f)); }
console.log(DRY ? 'dry run: nothing written' : 'done. Next: home-pics.js, update-counts.js, regen-profiles.ps1, a full build; then grep for what still names the page.');
