// Genius's own English translations of the songs whose lyrics come from Genius and are not in English (the user, 6 Nov
// 2026: "for the genius.com ones, make the translations if there aren't any"). The Institute does not translate words
// still in copyright, nor words it has no free edition of: where Genius has an English translation page of the song
// (the API's translation_songs, language "en"), its official embed shows it, under Genius's licence, like the lyrics.
//   node scripts/songs/genius-translations.js [--write]
// Prints, for each song of genius.tsv not sung in English, the English translation Genius lists (or none) and whether its
// lyrics are complete; --write rewrites scripts/songs/genius-en.tsv (slug, Genius id, url, Genius full title), which
// make-data.js reads. Token as genius-find.js: GENIUS_TOKEN or %LOCALAPPDATA%\epoch-tools\genius-token.txt.
const fs = require('fs'), path = require('path'), D = __dirname;
const TOKEN = process.env.GENIUS_TOKEN || (() => { try { return fs.readFileSync(path.join(process.env.LOCALAPPDATA || '', 'epoch-tools', 'genius-token.txt'), 'utf8').trim(); } catch (e) { return ''; } })();
if (!TOKEN) { console.error('no Genius token: set GENIUS_TOKEN or write %LOCALAPPDATA%\epoch-tools\genius-token.txt'); process.exit(1); }
const write = process.argv.includes('--write');
const S = JSON.parse(fs.readFileSync(path.join(D, 'songs.json'), 'utf8')), songs = Array.isArray(S) ? S : S.songs;
const bySlug = new Map(songs.map(s => [s.slug, s]));
const rows = fs.readFileSync(path.join(D, 'genius.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(p) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.genius.com' + p, { headers: { Authorization: 'Bearer ' + TOKEN } });
    if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(p + ' ' + r.status);
    return (await r.json()).response;
  }
  throw new Error(p + ' kept answering 429');
}
// sung wholly in English (or Scots): no translation wanted
const english = s => (s.langs || []).length && s.langs.every(l => /^(en|sco|enm|ang)$/.test(l.code));
(async () => {
  const out = [];
  for (const [slug, id] of rows) {
    const s = bySlug.get(slug); if (!s || english(s)) continue;
    const r = await api('/songs/' + id); await sleep(400);
    const tr = (r.song.translation_songs || []).filter(t => t.language === 'en');
    if (!tr.length) { console.log('none   ' + slug); continue; }
    for (const t of tr) {
      const d = await api('/songs/' + t.id); await sleep(400);
      const ok = d.song.lyrics_state === 'complete';
      console.log((ok ? 'EN     ' : 'NOLYR  ') + slug.padEnd(38) + ' ' + t.id + '  ' + d.song.full_title);
      if (ok) { out.push([slug, t.id, d.song.url, d.song.full_title].join('\t')); break; }
    }
  }
  console.log(out.length + ' English translations found');
  if (write) fs.writeFileSync(path.join(D, 'genius-en.tsv'), '# Genius\'s English translation of songs whose lyrics come from Genius and are not in English (scripts/songs/genius-translations.js):\n# shown by Genius\'s official embed under its own licence, on the press of a button. slug<TAB>Genius id<TAB>url<TAB>Genius full title\n' + out.join('\n') + '\n');
})();
