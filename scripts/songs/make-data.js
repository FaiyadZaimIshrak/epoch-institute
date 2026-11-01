// Songs in History: reads the song files (scripts/songs/<slug>.txt), their texts (data/song-texts/<slug>.json, written by
// merge-texts.js) and the chosen performances (videos.tsv, checked by check-videos.js into videos-checked.json), checks
// them and writes scripts/songs/songs.json, which build-pages.ps1 ("Songs") turns into /songs/<slug> and /songs/.
// Run by the builder; STOPS (exit 1) on a missing key, an unknown type, era or region, a song in the public domain
// with no text and no stated gap, a song in copyright WITH text, a video that failed its check, or a video row for no
// song. A song file: "key: value" header lines (format in the scratchpad's SONGS-GUIDE.md), then "== story",
// "== meaning", "== inspired" and "== inspired-by" (lines "title | year | how"), "== sources"; "== lyrics-source" and
// "== notes" are the editor's.
const fs = require('fs'), path = require('path');
const D = __dirname, REPO = path.join(D, '..', '..');
const TYPES = ['sacred', 'lament', 'celebration', 'love', 'lullaby', 'work', 'war', 'anthem', 'protest', 'ballad', 'dance'];
const REGIONS = ['Ancient Near East', 'Egypt & North Africa', 'Sub-Saharan Africa', 'Europe', 'Islamic Caliphates & Middle East', 'Central & East Asia', 'South & Southeast Asia', 'Americas', 'Oceania'];
const KEYS = ['title', 'local', 'status', 'lyricist', 'composer', 'culture', 'language', 'place', 'date', 'year', 'region', 'types', 'kids', 'kid'];
// songs in the public domain whose words no free, reliable edition holds yet (their pages say so)
const GAPS = ['delphic-hymns', 'dle-yaman', 'hanuman-chalisa', 'hurrian-songs', 'kumbaya',
  'ninkasi', 'raghupati-raghava-raja-ram', 'tizita'];
// the era bands of the Great Speeches, by the song's year
const era = y => y < 500 ? 'ancient' : y < 1500 ? 'medieval' : y < 1750 ? 'earlymodern' : y < 1815 ? 'revolutions' : y < 1900 ? 'nineteenth' : y < 1946 ? 'twentieth' : 'postwar';
const fold = s => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().replace(/[‘’ʻʼ'"“”]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const none = s => /^(not known|none|none named|unknown|n\/a)\b/i.test(s.trim());
const bad = [];
const songs = [];
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.txt')).sort()) {
  const slug = f.slice(0, -4), raw = fs.readFileSync(path.join(D, f), 'utf8').replace(/\r/g, '');
  const i = raw.indexOf('\n== '), head = raw.slice(0, i), H = {};
  for (const l of head.split('\n')) { const m = l.match(/^([a-z-]+):\s*(.*)$/); if (m) H[m[1]] = m[2].trim(); }
  const B = {}; let cur = null;
  for (const l of raw.slice(i + 1).split('\n')) { const m = l.match(/^== ([a-z-]+)\s*$/); if (m) { cur = m[1]; B[cur] = []; } else if (cur) B[cur].push(l); }
  for (const k of KEYS) if (!H[k]) bad.push(slug + ': no ' + k);
  for (const k of ['story', 'meaning']) if (!B[k] || !B[k].join('').trim()) bad.push(slug + ': no ' + k);
  const paras = k => (B[k] || []).join('\n').split(/\n\s*\n/).map(s => s.replace(/\n/g, ' ').trim()).filter(Boolean);
  const list = k => (H[k] && !none(H[k])) ? H[k].split(';').map(s => s.trim()).filter(s => s && !none(s)) : [];
  const links = k => (B[k] || []).map(l => l.trim()).filter(l => l.includes('|')).map(l => { const [t, y, ...h] = l.split('|').map(s => s.trim()); return { title: t, year: none(y || '') ? '' : y, how: h.join(' | ') }; });
  const [st, ...why] = H.status.split('|').map(s => s.trim());
  if (!['pd', 'copyright'].includes(st)) bad.push(slug + ': status ' + st);
  const types = H.types.split(',').map(s => s.trim());
  for (const t of types) if (!TYPES.includes(t)) bad.push(slug + ': type ' + t);
  if (!REGIONS.includes(H.region)) bad.push(slug + ': region ' + H.region);
  const year = +H.year; if (!Number.isFinite(year)) bad.push(slug + ': year ' + H.year);
  if (!/^(yes|no)$/.test(H.kids)) bad.push(slug + ': kids ' + H.kids);
  const langs = none(H.language) ? [] : H.language.split(';').map(s => { const [c, ...n] = s.split('|').map(x => x.trim()); return { code: c, name: n.join(' | ') }; });
  let text = null; const tf = path.join(REPO, 'data', 'song-texts', slug + '.json');
  if (fs.existsSync(tf)) text = JSON.parse(fs.readFileSync(tf, 'utf8'));
  if (st === 'copyright' && text) bad.push(slug + ': in copyright but has a text');
  if (st === 'pd' && !text && !GAPS.includes(slug)) bad.push(slug + ': public domain, no text and not a stated gap');
  if (text && GAPS.includes(slug)) bad.push(slug + ': has a text but is listed as a gap');
  songs.push({
    slug, title: H.title, local: (H.local === H.title || none(H.local)) ? '' : H.local, pd: st === 'pd', status: why.join(' | '),
    lyricist: H.lyricist, composer: H.composer, culture: H.culture, langs, place: H.place, date: H.date, year, era: era(year),
    region: H.region, types, people: list('people'), places: list('places'), events: list('events'), kids: H.kids === 'yes', kid: H.kid,
    story: paras('story'), meaning: paras('meaning'), inspired: links('inspired'), inspiredBy: links('inspired-by'),
    sources: (B.sources || []).map(l => l.trim()).filter(Boolean), text, gap: GAPS.includes(slug), video: null
  });
}
// the chosen performances: only those that passed the last check
const VC = fs.existsSync(path.join(D, 'videos-checked.json')) ? JSON.parse(fs.readFileSync(path.join(D, 'videos-checked.json'), 'utf8')) : {};
const BYS = Object.fromEntries(songs.map(s => [s.slug, s]));
for (const l of fs.readFileSync(path.join(D, 'videos.tsv'), 'utf8').split(/\r?\n/)) {
  if (!l || l.startsWith('#')) continue;
  const [slug, id, channel, note] = l.split('\t');
  if (!BYS[slug]) { bad.push('videos.tsv: no song ' + slug); continue; }
  const c = VC[slug];
  if (!c || c.id !== id) { bad.push('videos.tsv: ' + slug + ' not checked (run node scripts/songs/check-videos.js)'); continue; }
  if (!c.ok) { bad.push('videos.tsv: ' + slug + ' failed its check (' + id + ')'); continue; }
  BYS[slug].video = { id, channel: (c.channel || channel).trim(), note: note || '', title: c.title || '', checked: c.checked };
}
// inspired chains: a line whose title is another song's title (or its title in its own language) links to it, and that
// song lists this one as its source; "Inspired by" lines likewise
const NAMES = new Map();
for (const s of songs) for (const n of [s.title, s.local]) if (n) NAMES.set(fold(n), s.slug);
// an album named after a song (Pete Seeger's We Shall Overcome) is not the song
const match = t => { if (/\balbum\b/i.test(t)) return null; const a = fold(t.replace(/\s*\(.*$/, '')); return NAMES.get(a) || NAMES.get(fold(t)) || null; };
for (const s of songs) {
  for (const x of s.inspired) { x.slug = match(x.title); if (x.slug === s.slug) x.slug = null; }
  for (const x of s.inspiredBy) { x.slug = match(x.title); if (x.slug === s.slug) x.slug = null; }
}
for (const s of songs) for (const x of s.inspired) if (x.slug) {
  const t = BYS[x.slug]; if (!t.inspiredBy.some(y => y.slug === s.slug)) t.inspiredBy.push({ title: s.title, year: String(s.year < 0 ? -s.year + ' BCE' : s.year), how: x.how, slug: s.slug, back: true });
}
for (const s of songs) for (const x of s.inspiredBy) if (x.slug && !x.back) {
  const t = BYS[x.slug]; if (!t.inspired.some(y => y.slug === s.slug)) t.inspired.push({ title: s.title, year: String(s.year), how: x.how, slug: s.slug, back: true });
}
songs.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
if (bad.length) { console.error(bad.length + ' problems:\n  ' + bad.join('\n  ')); process.exit(1); }
fs.writeFileSync(path.join(D, 'songs.json'), JSON.stringify(songs));
const n = k => songs.filter(k).length;
console.log(`songs: ${songs.length} (${n(s => s.text)} with their words, ${n(s => !s.pd)} in copyright, ${n(s => s.gap)} gaps; ${n(s => s.video)} performances; ${songs.reduce((a, s) => a + s.inspired.filter(x => x.slug).length, 0)} links between songs)`);
