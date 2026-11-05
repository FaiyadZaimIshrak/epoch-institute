// The Genius embed for the songs whose words the Institute does not print (in copyright, or public domain with no free
// edition found; never the withheld ones): Genius serves the lyrics itself, under its own licence, in its official embed,
// which a song page loads only when the reader asks (songs.js). This finds each song on Genius through the official API
// and proposes a match; the editor's choices are scripts/songs/genius.tsv (slug, Genius id, url, Genius's full title),
// which make-data.js reads. The API token (genius.com/api-clients, "Client Access Token") is read from GENIUS_TOKEN or
// %LOCALAPPDATA%\epoch-tools\genius-token.txt: never put it in the repository.
//   node scripts/songs/genius-find.js [--write] [slug …]
// Without --write it prints, for each song not in genius.tsv, the accepted match (title and a writer or performer agree)
// or the top candidates to choose from by hand. --write appends the accepted ones.
const fs = require('fs'), path = require('path'), D = __dirname;
const TOKEN = process.env.GENIUS_TOKEN || (() => { try { return fs.readFileSync(path.join(process.env.LOCALAPPDATA || '', 'epoch-tools', 'genius-token.txt'), 'utf8').trim(); } catch (e) { return ''; } })();
if (!TOKEN) { console.error('no Genius token: set GENIUS_TOKEN or write %LOCALAPPDATA%\\epoch-tools\\genius-token.txt'); process.exit(1); }
const args = process.argv.slice(2), write = args.includes('--write'), only = args.filter(a => !a.startsWith('--'));
const S = JSON.parse(fs.readFileSync(path.join(D, 'songs.json'), 'utf8')), songs = Array.isArray(S) ? S : S.songs;
const TSV = path.join(D, 'genius.tsv');
const have = new Set(fs.existsSync(TSV) ? fs.readFileSync(TSV, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t')[0]) : []);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
async function api(p) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch('https://api.genius.com' + p, { headers: { Authorization: 'Bearer ' + TOKEN } });
    if (r.status === 429) { await sleep(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(p + ' ' + r.status);
    return (await r.json()).response;
  }
  throw new Error(p + ' kept answering 429');
}
(async () => {
  const want = songs.filter(s => (!s.pd || !s.text) && !s.withheld && !have.has(s.slug) && (!only.length || only.includes(s.slug)));
  const add = [];
  for (const s of want) {
    // the song's own names, and the people who may stand as its artist on Genius: writers, performers in the video
    const titles = [s.title, ...String(s.local || '').split(' / ')].map(fold).filter(Boolean);
    const people = [s.lyricist, s.composer, s.video && s.video.channel, s.video && s.video.note].join(' ').split(/[,;&()]| and | - /).map(fold).filter(x => x.length > 3 && !/^(traditional|anonymous|not known|topic)$/.test(x));
    const qs = [s.title + ' ' + (people[0] || ''), s.title];
    let hits = [];
    for (const q of qs) { const r = await api('/search?q=' + encodeURIComponent(q.trim())); hits = hits.concat(r.hits.filter(h => h.type === 'song').map(h => h.result)); await sleep(400); }
    const seen = new Set(); hits = hits.filter(h => !seen.has(h.id) && seen.add(h.id));
    const score = h => {
      const t = fold(h.title), a = fold(h.artist_names);
      const tm = titles.some(x => x === t) ? 2 : titles.some(x => t.includes(x) || x.includes(t)) ? 1 : 0;
      const am = people.some(p => p.split(' ').filter(w => w.length > 3).some(w => a.includes(w))) ? 1 : 0;
      return { tm, am, bad: /\b(remix|live|cover|translation|traduction|traduccion|ubersetzung|tradução|romanized)\b/i.test(h.full_title) };
    };
    const ranked = hits.map(h => ({ h, ...score(h) })).sort((x, y) => (y.tm + y.am - y.bad) - (x.tm + x.am - x.bad));
    const best = ranked[0];
    if (best && best.tm === 2 && best.am && !best.bad) {
      const song = await api('/songs/' + best.h.id); await sleep(400);
      const ok = song.song.lyrics_state === 'complete';
      console.log((ok ? 'OK    ' : 'NOLYR ') + s.slug.padEnd(40) + ' ' + best.h.id + ' ' + best.h.full_title);
      if (ok) add.push([s.slug, best.h.id, song.song.url, best.h.full_title].join('\t'));
    } else {
      console.log('CHOOSE ' + s.slug.padEnd(40) + ' [' + [s.title, s.lyricist, s.composer].join(' | ') + ']');
      for (const r of ranked.slice(0, 4)) console.log('         ' + r.h.id + '  t' + r.tm + ' a' + r.am + (r.bad ? ' x' : '') + '  ' + r.h.full_title);
    }
  }
  if (write && add.length) {
    const head = fs.existsSync(TSV) ? '' : '# The Genius embed of each song whose words the site does not print (scripts/songs/genius-find.js; checked by the editor).\n# slug<TAB>Genius song id<TAB>url<TAB>Genius full title\n';
    fs.appendFileSync(TSV, head + add.join('\n') + '\n');
  }
  console.log('\n' + want.length + ' songs looked up, ' + add.length + ' accepted' + (write ? ' and written' : ' (dry run: --write)'));
})().catch(e => { console.error(e.message); process.exit(1); });
