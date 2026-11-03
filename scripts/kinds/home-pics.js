// home-data.js for new profiles (Nov 2026; the scratchpad make-home-data of Oct 2026 is gone, and re-running it would
// reshuffle the daily quiz): adds, for the profiles named, HOME_PICS[name] from scripts/home-pictures.tsv (the entry's
// picture, name, slug and credit; top=NN kept) and, for polities, HOME_QUIZ.profiles[name] = [capital, founder, the
// "Did you know?" with the profile's own name masked], as the file holds them. Profiles already there are left as they are.
//   node scripts/kinds/home-pics.js <profile name> …      then bump home-data.js?v= on index and quiz
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const names = process.argv.slice(2); if (!names.length) { console.error('usage: home-pics.js <profile name> …'); process.exit(1); }
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
let hd = rd('home-data.js'); const eol = hd.includes('\r\n') ? '\r\n' : '\n';
const H = new Function(hd + ';return {HOME_PICS, HOME_QUIZ}')();
const ed = rd('encyclopedia-data.js');
const SD = new Function(rd('shared-data.js').replace(/const EVENTS[\s\S]*$/, '') + ';return EMPIRES')();
const FA = new Function(rd('empire-facts.js').replace(/^\s*const /m, 'var ') + ';return EMPIRE_FACTS')(), GL = new Function(rd('empire-glance.js').replace(/^\s*const /m, 'var ') + ';return GLANCE')();
const pics = {}; for (const l of rd('scripts/home-pictures.tsv').split(/\r?\n/)) { if (!l || l.startsWith('#')) continue; const c = l.split('\t'); pics[c[0]] = { slug: c[1], opts: c.slice(2) }; }
const J = s => JSON.stringify(s);
function entry(slug) {
  const m = ed.match(new RegExp('^  \\{slug:' + J(slug).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ',name:("(?:[^"\\\\]|\\\\.)*")(.*)$', 'm'));
  if (!m) return null; const line = m[2];
  const img = /,img:("[^"]*")/.exec(line), cr = /credit:\{artist:("(?:[^"\\]|\\.)*"),licence:("[^"]*")/.exec(line);
  return { name: JSON.parse(m[1]), img: img ? JSON.parse(img[1]) : null, artist: cr ? JSON.parse(cr[1]) : '', licence: cr ? JSON.parse(cr[2]) : '' };
}

const GEN = new Set(['kingdom', 'empire', 'of', 'the', 'sultanate', 'republic', 'duchy', 'county', 'principality', 'emirate', 'khanate', 'dynasty', 'state', 'city', 'confederation', 'federation', 'union', 'commonwealth', 'grand', 'holy', 'free', 'first', 'second', 'new', 'and', 'people', 'peoples', 'united', 'states', 'province', 'colony', 'protectorate', 'mandate', 'territory', 'north', 'south', 'east', 'west', 'upper', 'lower', 'great', 'ancient', 'old', 'later', 'early', 'northern', 'southern', 'eastern', 'western']);
function mask(text, name) {   // every distinctive word of the name is hidden, as the file does ("the ████ Chronicle")
  let t = text; for (const w of name.split(/[\s()-]+/).filter(w => w.length > 2 && !GEN.has(w.toLowerCase()))) t = t.replace(new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(s|n|ns|ese|an|ans|ian|ians|ish|i|ite|ites)?\\b', 'gi'), '████'); return t;
}
let nP = 0, nQ = 0, nH = 0, out = [];
for (const n of names) {
  const e = SD.find(x => x.name === n); if (!e) { out.push('no profile ' + n); continue; }
  if (!H.HOME_PICS[n] && pics[n] && pics[n].slug !== '-') {
    const en = entry(pics[n].slug); if (!en || !en.img) { out.push(n + ': home-pictures.tsv names ' + pics[n].slug + ', which has no picture'); }
    else { const o = { img: en.img, name: en.name, slug: pics[n].slug, credit: [en.artist, en.licence].filter(Boolean).join(', ') }; const top = pics[n].opts.find(x => x.startsWith('top=')); if (top) o.top = +top.slice(4); if (pics[n].opts.includes('hide')) o.hide = 1;
      const i = hd.indexOf('var HOME_PICS = {'), close = hd.indexOf(eol + '};', i); hd = hd.slice(0, close) + ',' + eol + '  ' + J(n) + ': ' + J(o) + hd.slice(close); nP++; }
  }
  // a profile marked hide that is already in the file without the flag gets it (until 3 Nov 2026 this script dropped it)
  if (H.HOME_PICS[n] && pics[n] && pics[n].opts.includes('hide') && !H.HOME_PICS[n].hide) {
    const key = eol + '  ' + J(n) + ': {', i = hd.indexOf(key); if (i < 0) out.push(n + ': cannot find its HOME_PICS line'); else { const close = hd.indexOf('}', i + key.length); hd = hd.slice(0, close) + (hd[i + key.length] === '"' ? ',"hide":1' : ',hide:1') + hd.slice(close); nH++; }
  }
  if (!e.kind && !H.HOME_QUIZ.profiles[n] && FA[n] && GL[n]) {
    const q = [mask(FA[n].capital || '', n), mask(FA[n].founder || '', n), mask(GL[n].dyk || '', n)];
    const i = hd.indexOf('var HOME_QUIZ = {profiles: {'), close = hd.indexOf(eol + '}', i); hd = hd.slice(0, close) + ',' + eol + '  ' + J(n) + ': ' + J(q) + hd.slice(close); nQ++;
  }
}
const H2 = new Function(hd + ';return {HOME_PICS, HOME_QUIZ}')();
for (const n of names) if (!H2.HOME_PICS[n] && !(pics[n] && pics[n].slug === '-')) out.push(n + ': still no home picture');
fs.writeFileSync(path.join(R, 'home-data.js'), hd);
console.log('home pictures added ' + nP + ', hidden ' + nH + ', quiz profiles added ' + nQ + (out.length ? '\n  ' + out.join('\n  ') : ''));
