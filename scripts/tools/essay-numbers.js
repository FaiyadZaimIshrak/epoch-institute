// The figures quoted in Research Series essays 07 (Before the State), 08 (How Songs Travel), 09 (Faiths on the Move),
// 10 (Who Invented It First?), 11 (From Ruler to Enslaved) and 12 (The Written Word), computed from the data so that none
// is typed: node scripts/tools/essay-numbers.js 07 | 08 | 09 | 10 | 11 | 12. Re-run after a change to the cultures, the register or
// the songs, and compare with the essays' "What the Data Shows".
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const which = process.argv[2] || '07';
const YEAR = 2025;
const yl = y => y < 0 ? -y + ' BCE' : y + ' CE';
const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

if (which === '07') {
  const SD = new Function(rd('shared-data.js') + ';return {EMPIRES, profileSpan}')();
  const cultures = SD.EMPIRES.filter(e => e.kind === 'culture');
  const pol = JSON.parse(rd('data/polities.json')).nodes.filter(n => Number.isFinite(+n.s) && Number.isFinite(+n.e));
  const cs = cultures.map(c => ({ name: c.name, a: c.start, b: c.end == null ? YEAR : c.end, living: c.end == null, region: c.region }));
  const cl = cs.map(c => c.b - c.a), sl = pol.map(n => +n.e - +n.s).filter(x => x >= 0);
  console.log('cultures', cs.length, 'living', cs.filter(c => c.living).length);
  console.log('culture span: median', median(cl), 'mean', Math.round(mean(cl)), 'longest', cs.reduce((m, c) => c.b - c.a > m.b - m.a ? c : m).name, Math.max(...cl), 'shortest', cs.reduce((m, c) => c.b - c.a < m.b - m.a ? c : m).name, Math.min(...cl));
  console.log('states with dates', sl.length, 'of', pol.length, '| state lifespan: median', median(sl), 'mean', Math.round(mean(sl)));
  console.log('states lasting under a century', sl.filter(x => x < 100).length, '(' + Math.round(100 * sl.filter(x => x < 100).length / sl.length) + '%)', 'over 500 years', sl.filter(x => x >= 500).length, 'over 1000', sl.filter(x => x >= 1000).length);
  const first = Math.min(...pol.map(n => +n.s)), firstN = pol.filter(n => +n.s === first).map(n => n.n);
  console.log('earliest recorded state', yl(first), firstN.join(', '));
  console.log('cultures begun before', yl(first) + ':', cs.filter(c => c.a < first).map(c => c.name + ' ' + yl(c.a)).join('; '));
  console.log('cultures begun before 3000 BCE', cs.filter(c => c.a < -3000).length, '| before 1000 BCE', cs.filter(c => c.a < -1000).length);
  console.log('cultures longer than the longest-lived state (' + Math.max(...sl) + ' years, ' + pol.reduce((m, n) => +n.e - +n.s > +m.e - +m.s ? n : m).n + '):', cs.filter(c => c.b - c.a > Math.max(...sl)).map(c => c.name).join(', '));
  console.log('cultures longer than 1000 years', cs.filter(c => c.b - c.a >= 1000).length, '| longer than 2000', cs.filter(c => c.b - c.a >= 2000).length);
  for (const c of cs.filter(c => c.living)) {
    // the recorded states whose span lies entirely within the living culture's span (the states it has outlived)
    const inside = pol.filter(n => +n.s >= c.a && +n.e <= YEAR - 1 && +n.e >= +n.s);
    console.log('living:', c.name, 'since', yl(c.a), '| recorded states begun and ended within its span (all regions):', inside.length);
  }
  const byReg = {}; cs.forEach(c => { (byReg[c.region] = byReg[c.region] || []).push(c.name); });
  console.log('by region:', Object.keys(byReg).map(r => r + ' ' + byReg[r].length).join('; '));
} else if (which === '08') {
  const S = JSON.parse(rd('scripts/songs/songs.json')); const songs = Array.isArray(S) ? S : S.songs || Object.values(S);
  const langs = new Set(); songs.forEach(s => (s.langs || []).forEach(l => langs.add(l.code)));
  console.log('songs', songs.length, 'languages', langs.size, 'with words', songs.filter(s => s.text).length, 'in copyright', songs.filter(s => !s.pd).length, 'with a performance', songs.filter(s => s.video).length);
  const T = {}, E = {}, Rg = {}, TE = {};
  const ERAS = ['ancient', 'medieval', 'earlymodern', 'revolutions', 'nineteenth', 'twentieth', 'postwar'];
  songs.forEach(s => { E[s.era] = (E[s.era] || 0) + 1; Rg[s.region] = (Rg[s.region] || 0) + 1; (s.types || []).forEach(t => { T[t] = (T[t] || 0) + 1; (TE[t] = TE[t] || {})[s.era] = (TE[t][s.era] || 0) + 1; }); });
  console.log('by type:', Object.entries(T).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join(', '));
  console.log('by era:', ERAS.map(e => e + ' ' + (E[e] || 0)).join(', '));
  console.log('by region:', Object.entries(Rg).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join(', '));
  for (const t of ['sacred', 'anthem', 'war', 'protest', 'love', 'work']) console.log('  ' + t + ' by era:', ERAS.map(e => e + ' ' + (TE[t][e] || 0)).join(', '));
  const pre = songs.filter(s => ERAS.indexOf(s.era) <= 2), post = songs.filter(s => ERAS.indexOf(s.era) >= 3);
  const share = (set, t) => Math.round(100 * set.filter(s => (s.types || []).includes(t)).length / set.length);
  console.log('to 1750: sacred ' + share(pre, 'sacred') + '% anthem ' + share(pre, 'anthem') + '% protest ' + share(pre, 'protest') + '% | from 1750: sacred ' + share(post, 'sacred') + '% anthem ' + share(post, 'anthem') + '% protest ' + share(post, 'protest') + '%');
  const oldest = songs.filter(s => !s.undated).sort((a, b) => a.year - b.year).slice(0, 6).map(s => s.title + ' (' + s.date + ')');
  console.log('oldest:', oldest.join('; '));
  // the tune families: every song another song names as its source (inspired-by), and the reverse
  const by = {}; songs.forEach(s => { (s.inspired || []).forEach(i => { if (i.slug) (by[s.slug] = by[s.slug] || new Set()).add(i.slug); }); (s.inspiredBy || []).forEach(i => { if (i.slug) (by[i.slug] = by[i.slug] || new Set()).add(s.slug); }); });
  const name = Object.fromEntries(songs.map(s => [s.slug, s.title]));
  const fams = Object.entries(by).map(([k, v]) => [k, [...v]]).sort((a, b) => b[1].length - a[1].length);
  console.log('links between songs', fams.reduce((n, f) => n + f[1].length, 0), 'parents', fams.length);
  fams.forEach(([k, v]) => console.log('  ' + name[k] + ' -> ' + v.map(x => name[x]).join(', ')));
  const anth = songs.filter(s => (s.types || []).includes('anthem')), anthFrom = anth.filter(s => (s.inspiredBy || []).some(i => i.slug)).length;
  console.log('anthems', anth.length, 'of which with a named source song', anthFrom);
} else {
  require('./essay-numbers-2.js')(which, { rd, YEAR, yl, median, mean });
}
