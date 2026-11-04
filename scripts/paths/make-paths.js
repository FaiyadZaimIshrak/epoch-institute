// Appends new reading paths (PATHS-GUIDE.md) to reading-paths.js, as the 38 paths of Oct 2026 are written: each step
// gets its name, picture and label from the site's data (a profile: its name, its home picture (home-data.js HOME_PICS),
// "Profile · <span>"; an entry: its name, picture, "Encyclopedia · <Type> · <dates>"). Refuses a slug already used, an
// unknown address, a type or era outside the lists, fewer than 5 or more than 12 stops, a "why" over 200 characters or a
// stop twice. Writes reading-paths.js only with --write.
//   node scripts/paths/make-paths.js [--write] <paths.json> [...]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
const c = {}; new Function('c', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';c.E = EMPIRES; c.u = profileUrl; c.t = profileSpanText;')(c);
const PICS = new Function(fs.readFileSync(path.join(R, 'home-data.js'), 'utf8') + ';return HOME_PICS')();
const ENC = new Map(new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')().map(e => [e.slug, e]));
const PROF = new Map(c.E.map(e => [c.u(e), e]));
const RP = path.join(R, 'reading-paths.js'); let text = fs.readFileSync(RP, 'utf8');
const used = new Set([...text.matchAll(/\{slug:"([^"]+)",title:/g)].map(m => m[1]));
const TYPES = ['strategist', 'navigator', 'thinker', 'chronicler', 'builder', 'timekeeper'], ERAS = ['ancient', 'medieval', 'earlymodern', 'modern'];
const TL = { person: 'Person', event: 'Event', place: 'Place', term: 'Term', work: 'Work', institution: 'Institution', group: 'People', polity: 'State', idea: 'Idea' };
const J = s => JSON.stringify(String(s));
let faults = 0; const out = [];
for (const f of files) for (const p of JSON.parse(fs.readFileSync(f, 'utf8'))) {
  const F = m => { console.log(p.slug + ': ' + m); faults++; };
  if (!/^[a-z0-9-]+$/.test(p.slug || '')) F('bad slug'); if (used.has(p.slug)) F('slug used already'); used.add(p.slug);
  for (const k of ['title', 'tagline', 'intro']) if (!p[k]) F('no ' + k);
  for (const t of p.types || []) if (!TYPES.includes(t)) F('type ' + t); for (const e of p.eras || []) if (!ERAS.includes(e)) F('era ' + e);
  if (!(p.types || []).length || !(p.eras || []).length) F('types and eras needed');
  const steps = p.steps || []; if (steps.length < 5 || steps.length > 12) F(steps.length + ' stops');
  const seen = new Set(), st = [];
  for (const s of steps) {
    if (seen.has(s.href)) F('stop twice: ' + s.href); seen.add(s.href);
    if (!s.why || s.why.length > 200) F(s.href + ': why ' + (s.why || '').length + ' chars');
    const pr = PROF.get(s.href), m = s.href.match(/^\/encyclopedia\/(.+)$/), en = m && ENC.get(m[1]);
    if (pr) st.push(`{name:${J(pr.name)},href:${J(s.href)},img:${J((PICS[pr.name] && PICS[pr.name].img) || '')},meta:${J('Profile · ' + c.t(pr))},why:${J(s.why)}}`);
    else if (en) st.push(`{name:${J(en.name)},href:${J(s.href)},img:${J(en.img || '')},meta:${J('Encyclopedia · ' + (TL[en.type] || en.type) + (en.dates ? ' · ' + en.dates : ''))},why:${J(s.why)}}`);
    else F('unknown stop ' + s.href);
  }
  out.push(`  {slug:${J(p.slug)},title:${J(p.title)},tagline:${J(p.tagline)},types:[${p.types.map(J).join(',')}],eras:[${p.eras.map(J).join(',')}],intro:${J(p.intro)},steps:[\n    ` + st.join(',\n    ') + '\n  ]}');
}
console.log(`${out.length} paths, ${faults} faults`);
if (faults) process.exit(1);
if (args.includes('--write') && out.length) {
  const i = text.lastIndexOf('];'); const before = text.slice(0, i).replace(/\s*$/, '');
  text = before + ',\n' + out.join(',\n') + '\n' + text.slice(i);
  new Function(text + ';return READING_PATHS')();   // still evaluates
  fs.writeFileSync(RP, text); console.log('appended to reading-paths.js');
}
