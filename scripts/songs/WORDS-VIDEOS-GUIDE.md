# Songs in History: proposing the words and the performance

After drafting a song's file (SONGS-GUIDE.md), propose where its public-domain words are and one performance. You only
PROPOSE rows: the editor imports and checks them. Never type a song's words.

## The words (rows for scripts/songs/sources.tsv)
Only for a song marked `pd`. Rows are tab-separated: `slug  part  site  page  select  credit`
- part: `orig` (the words in the song's own language), `en` (an English translation), `rom` (a romanization).
- site: a Wikisource language code (`en`, `fr`, `de`, `tr`, `ar` …), `w-xx` for the public-domain words quoted in a
  Wikipedia article of that language, `pg` for Project Gutenberg.
- Find the pages: `node scripts/songs/find-sources.js <slugs.tsv> <out.txt> <slug>` (slugs.tsv: the wave's, given in
  your brief) lists the song's Wikisource pages through Wikidata and peeks their verse blocks;
  `node scripts/songs/fetch-texts.js --peek=en:Page_title` shows a page's stanzas with their numbers and first words.
- select: `all`, `#n..#m` (stanzas), or `"start words".."end words"`. Leave out titles, notes and editors' prefaces.
- credit: whose text ("from the 1919 hymnal", "tr. John Mason Neale (1851)"): the translator and year only as the page
  prints them.
- Only texts in the public domain: words published before 1931 (and their translations before 1931), or older. A
  modern translation on Wikisource under a free licence (CC BY-SA) is acceptable; say so in the credit.
- If no free text is found, write no row and say so in your notes ("no free edition found: …").

## The performance (a row for scripts/songs/videos.tsv)
`slug  video id  channel  note (who performs, how)`. Search with `node scripts/songs/yt-search.js "query" ["query" …]`
(it lists id | channel | title | length | views). Choose ONE performance of the song itself:
- by the performers' own channel, an official "- Topic" release, a recognised choir, ensemble, orchestra, broadcaster,
  archive or institution; never a compilation, a re-upload of an album, a lyric video by a stranger, a cover by an
  unknown channel, a karaoke, a lesson, a talk, a news clip, a reaction or a promotion;
- SUNG, if the song has words (not an instrumental arrangement); in its own language where that is how it is known;
- of a sensible length (not a 10-hour loop, not a 20-second clip).
Give a second choice in your notes. If nothing fits, propose none and say why.
