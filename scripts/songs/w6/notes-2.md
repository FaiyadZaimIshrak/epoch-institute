# Batch 2: notes for the editor

Drafts in `scripts/songs/w6/drafts/`: god-rest-you-merry-gentlemen, the-twelve-days-of-christmas, the-first-nowell,
we-wish-you-a-merry-christmas, tu-scendi-dalle-stelle. Each was written only from its saved article; each draft's own
`== notes` block has the details. `check-drafts.js` on the five: no asides left; the flagged words are glosses
("England", "United Kingdom" for the article's "UK", "Italian Catholics", "Bethlehem" in a meaning block) and possessives.

## Tools
- `find-sources.js` wrote nothing for this batch: it skips a slug that has no `scripts/songs/<slug>.txt` (line 14), and
  the drafts are in `w6/drafts/`. I looked up the Wikidata sitelinks with a small script of my own and used
  `fetch-texts.js --peek` on each page. English Wikisource answered 429 several times; retried after waits.
- Every video below was checked through YouTube's oEmbed (exists, embeddable). `audit-videos.js` was not run.

## The biggest doubt: We Wish You a Merry Christmas (status)
The list says pd. The article says the words are "English traditional", but also that the famous version is in no
collection up to 1928 and was first published by Oxford University Press in 1935 in Arthur Warrell's arrangement
(Warrell 1883-1939), whose printed words begin "I wish you". By the rule "published before 1931" the usual words are
therefore not shown to be free in the United States; Warrell's own share is free where the term is 70 years after
death. The status line says "pd" with the doubt in it. If the editor rules "copyright", the `== meaning` block must be
cut to theme and mood (its second sentence retells the words).

NO row in rows-2.tsv. The candidate, if the editor decides the words are free (tab-separated):
`we-wish-you-a-merry-christmas  orig  en  We Wish You a Merry Christmas  #1..#8  Traditional (English West Country); as given on English Wikisource`
The page names no edition (tagged PD-old); stanzas 4, 6 and 8 are the single word "chorus", stanza 2 begins with the
label "chorus" and its third line carries an editor's aside "(or: Good tidings for Christmas)": these would need
text fixes. Dutch Wikisource also has a page ("We wish you a merry Christmas"), not peeked.

Date: no date in the article; I put year 1935 (era twentieth) against the list's "nineteenth"; an approximate year
("~1835", from the related mummers' verse of the 1830s) is the alternative.

## Words rows proposed (rows-2.tsv)
- god-rest-you-merry-gentlemen: Sandys 1833 on English Wikisource, `#2..#8 noetc`. Stanza 2 as the page is transcluded
  begins with a stray line, "born on Christmas day.", the tail of the page break before the carol (9 lines instead of
  8): it needs a text fix dropping that first line. Stanzas 3-8 end with "O tidings, &c." (hence `noetc`); the editor
  may prefer to keep the refrain cue. This is the 1833 text ("God rest you merry", "Jury" for Judea), not the Carols
  for Choirs wording of 1961 that the article calls today's baseline. Second choice on the same Wikisource versions
  page: Cecil Sharp, English Folk-Carols (1911), "God bless you, merry gentlemen". An "unsourced modern edition" is
  also there (not to be used).
- the-twelve-days-of-christmas: the Angus broadside, `#2..#13` (stanza 1 is the title). It is the older text: no "On",
  "sent to me", "colly birds" (spelt "colley" in the last verse), and the last gifts in the older order and wording, so
  it will not match word for word what is sung today. The Wikisource note dates the broadside "no later than 1825";
  the article says "late eighteenth or early nineteenth centuries". No Wikisource text of Austin's 1909 version or of
  Mirth Without Mischief was found (the One Hundred English Folksongs page of 1916 is a score only). Austin's death
  year is not in the article, so the status of his version outside the United States is not confirmed from it.
- the-first-nowell: English Wikisource "The First Nowell", `#1..#7 nonum` (stanza 2 is the refrain, printed once
  after the first verse; the verses are numbered "1." to "6."). The page says it is "the version used in The New
  English Hymnal (1986)" and tags it PD-old; the article says that version is the one in Bramley and Stainer's Carols,
  New and Old (1871). The credit follows the page; the editor may prefer to credit 1871 on the article's word. The
  page has "whersoever" (sic) in verse 3. Sandys's 1833 book on Wikisource has only the music page for this carol.
- tu-scendi-dalle-stelle: `orig` from Italian Wikipedia's article, `#9..#15` (seven stanzas of eight lines, the full
  text; the block before them is prose saying the text has many variants). No Italian Wikisource page was found (two
  searches). English Wikipedia quotes only the first two stanzas (`w-en`, `#15..#18`): the second choice.
  NO `en` row: English Wikipedia prints a literal translation of two stanzas (its own) and a King James-style one
  ("From starry skies descending"), naming no translator or year for either; I found no dated translation before 1931
  on English Wikisource (two searches, one cut short by 429). The song needs an Institute translation.
  The article contradicts itself on the date (lead 1744; History "In 1732 … he wrote"); the draft uses 1744. Liguori's
  death year is not in the article.

## Performances proposed (videos-2.tsv), with second choices
- god-rest-you-merry-gentlemen: 9l7nHnGmI4A, The Choir of King's College, Cambridge - Topic (3:34).
  Second: XsrHYGjdKrA, The Choir of Trinity College Cambridge (own channel, 3:53).
- the-twelve-days-of-christmas: au0NgoDjiHc, The King's Singers - Topic (3:37). Second: KPCMzhGQ590, Westminster
  Choir - Topic, John Rutter's arrangement (3:51). Not chosen: the King's Singers with the Tabernacle Choir (9:58, an
  extended version).
- the-first-nowell: reAHLLndk6o, The Choir of King's College, Cambridge - Topic (4:52). Second: It03RTOdF9g,
  Westminster Cathedral Choir - Topic (6:07).
- we-wish-you-a-merry-christmas: frbK-ZTYtXU, Tenebrae Choir's own channel, Warrell's arrangement "arr. N. Short"
  (2:06); I have not heard whether it opens "I wish you" (Warrell) or "We wish you". Second: L1NlLBDZOjc, John Rutter
  & The Cambridge Singers (own channel, Rutter's arrangement with orchestra, 1:53).
- tu-scendi-dalle-stelle: K3pa-kD8DHw, Luciano Pavarotti - Topic (2:10). Second: 68mCdwb4A3k, Andrea Bocelli
  (AndreaBocelliVEVO), live at the Kodak Theatre, 2009 (3:16). A zampogna performance would suit the story, but none
  turned up from a recognised channel in my searches.

I judged the videos by channel, title and length only; none was watched or heard.

## Other doubts
- Titles: "God Rest Ye Merry, Gentlemen" (the article's title) in `title`, "God Rest You Merry, Gentlemen" in `local`
  (the slug and the article's argument favour "You"). "The First Nowell" is used, not the article title "The First
  Noel" (the article's lead gives Nowell first).
- Eras differ from the list's for three songs, because the guide's bands follow the year: The Twelve Days 1780
  (revolutions; list: earlymodern), The First Nowell 1823 (nineteenth; list: earlymodern), We Wish You 1935
  (twentieth; list: nineteenth).
- The First Nowell: the article's sentence on the 1823 and 1833 books (Sandys as editor of both, Gilbert as arranger,
  "for Hymns and Carols of God") looks garbled; the draft keeps its attributions and drops the last phrase.
- The Twelve Days: the story names "colly" and "calling" birds and "my true love", and the meaning names the first
  gift; cut if too close to the words.
- The meaning blocks of God Rest, The First Nowell and Tu scendi summarise the texts I peeked, a little beyond what
  the articles say of the words.
