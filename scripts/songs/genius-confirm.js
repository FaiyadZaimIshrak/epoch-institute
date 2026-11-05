// Confirms the editor's Genius choices (slug<TAB>id lines) through the API and writes scripts/songs/genius.tsv: each
// song's Genius page, its full title, and that its lyrics are complete there (a page without lyrics is left out).
//   node scripts/songs/genius-confirm.js <choices.tsv>
const fs = require('fs'), path = require('path'), D = __dirname;
const TOKEN = process.env.GENIUS_TOKEN || fs.readFileSync(path.join(process.env.LOCALAPPDATA || '', 'epoch-tools', 'genius-token.txt'), 'utf8').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const rows = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const out = [], miss = [];
  for (const [slug, id] of rows) {
    const r = await fetch('https://api.genius.com/songs/' + id, { headers: { Authorization: 'Bearer ' + TOKEN } }); await sleep(350);
    if (!r.ok) { miss.push(slug + ' ' + id + ' ' + r.status); continue; }
    const s = (await r.json()).response.song;
    if (s.lyrics_state !== 'complete') { miss.push(slug + ' ' + id + ' lyrics ' + s.lyrics_state); continue; }
    out.push([slug, s.id, s.url, s.full_title.replace(/\s+/g, ' ')].join('\t'));
  }
  const head = '# The Genius embed of each song whose words the site does not print: Genius serves the lyrics under its own licence,\n# and a song page loads the official embed only when the reader asks (songs.js). Chosen by the editor among the matches of\n# scripts/songs/genius-find.js (the song itself, in its own words: no namesakes, instrumentals or adaptations), confirmed by\n# scripts/songs/genius-confirm.js. slug<TAB>Genius song id<TAB>Genius page<TAB>Genius full title\n';
  fs.writeFileSync(path.join(D, 'genius.tsv'), head + out.join('\n') + '\n');
  console.log(out.length + ' written' + (miss.length ? '; left out: ' + miss.join('; ') : ''));
})();
