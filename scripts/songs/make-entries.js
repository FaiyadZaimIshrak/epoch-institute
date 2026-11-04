// Encyclopedia entries for the songs (Nov 2026): one entry a song that has none of its title, written ONLY from the song's
// own checked text (scripts/songs/<slug>.txt via songs.json): its first sentences of "The story" (at most ~420
// characters, cut at a sentence), its dates and its title in its own language as another name. Added to
// scripts/added-entries.json "entries" (apply-added-entries.ps1 then writes encyclopedia-data.js and the link rows).
// Link patterns (the entry found in other texts) only for titles that cannot mean anything else: LINKABLE below, read by
// eye; every other song entry gets no patterns, so "Imagine", "Dixie" or "Sakura" never link the song.
//   node scripts/songs/make-entries.js [--list]     (--list: the songs and their proposed entry slug, nothing written)
const fs = require('fs'), path = require('path');
const D = __dirname, R = path.join(D, '..', '..');
const S = JSON.parse(fs.readFileSync(path.join(D, 'songs.json'), 'utf8'));
const ed = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8');
const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
const NAMEQ = '("(?:[^"\\\\]|\\\\.)*")';
const names = new Map(), works = new Map(), slugs = new Set();
for (const m of ed.matchAll(new RegExp('^  \\{slug:"([^"]+)",name:' + NAMEQ + ',type:"([a-z]+)"', 'gm'))) {
  slugs.add(m[1]); names.set(JSON.parse(m[2]).toLowerCase(), m[1]); if (m[3] === 'work') works.set(JSON.parse(m[2]).toLowerCase(), m[1]);
}
// titles that are names of the song alone (checked by eye against the entries, the state texts and the day events)
const LINKABLE = new Set(fs.existsSync(path.join(D, 'entry-links.tsv')) ? fs.readFileSync(path.join(D, 'entry-links.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')) : []);
// the first sentences of the story, cut at a sentence end (not after an initial, "c." or "St."), at most ~420 characters
function lede(paras) {
  const t = paras.join(' ');
  const ends = [...t.matchAll(/[.!?](?=\s+[A-Z“"(])/g)].map(m => m.index + 1).filter(i => !/(\b[A-Z]|\bc|\bSt|\bJr|\bvs|\bNo)\.$/.test(t.slice(Math.max(0, i - 4), i)));
  let cut = ends.find(i => i > 160) || t.length; for (const i of ends) if (i <= 420) cut = Math.max(cut, i); else break;
  if (cut > 520) cut = ends.find(i => i > 160) || t.length;
  return t.slice(0, cut).trim();
}
// songs whose entry exists under another spelling of the title (song slug: entry slug), so no second entry is written
const HASENTRY = { 'enuma-elis': 'enuma-elish' };
const out = [];
for (const s of S) {
  // a song whose title (without a bracketed translation) is an entry's name has its entry: God Save the King, the Cantigas …
  // (the short title counts only for a work: "Jerusalem (And did those feet …)" is not the city)
  if (names.has(s.title.toLowerCase()) || works.has(s.title.replace(/\s*\(.*\)$/, '').toLowerCase())) continue;
  if (HASENTRY[s.slug]) continue;
  let slug = s.slug; if (slugs.has(slug)) slug = s.slug + '-song';
  if (slugs.has(slug)) { console.error('no free slug for ' + s.slug); process.exit(1); }
  const e = { slug, name: s.title, type: 'work', subtype: 'song' };
  if (s.local) e.aka = s.local.split(' / ').map(x => x.trim()).filter(x => x && x !== s.title);
  if (!s.undated) e.dates = s.date;
  e.desc = lede(s.story);
  e.links = LINKABLE.has(s.slug) ? [[s.title.replace(/ *[(].*[)]$/, ""), 0]] : [];
  e.song = s.slug;
  out.push(e);
}
if (process.argv.includes('--list')) { for (const e of out) console.log(e.song.padEnd(36), e.slug === e.song ? '' : '-> ' + e.slug, '|', e.name, '|', (e.dates || '').slice(0, 40)); console.log(out.length + ' song entries'); process.exit(0); }
const keep = A.entries.filter(e => e.subtype !== 'song' || !e.song);   // a re-run replaces the song entries it wrote before
A.entries = keep.concat(out.map(e => { const x = { ...e }; return x; }));
fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
console.log(out.length + ' song entries written to scripts/added-entries.json (' + out.filter(e => e.links.length).length + ' with link patterns)');
