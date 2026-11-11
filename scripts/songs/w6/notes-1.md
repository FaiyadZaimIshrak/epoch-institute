# Wave 6, batch 1: notes for the editor

Songs: good-king-wenceslas, the-holly-and-the-ivy, deck-the-halls, personent-hodie, hark-the-herald-angels-sing.
Drafts in `scripts/songs/w6/drafts/`, rows in `rows-1.tsv`, performances in `videos-1.tsv`. Each draft's own `== notes`
block lists its doubts in detail; this file holds what concerns the rows, the performances and the wave.

## Status of the words (all five confirmed pd from the articles)
- Good King Wenceslas: John Mason Neale with Thomas Helmore, 1853 (Carols for Christmas-Tide, Novello).
- The Holly and the Ivy: traditional; broadsides of the early 19th century, full text printed 1849, 1861, 1864; Sharp's text 1911.
- Deck the Halls: Thomas Oliphant, 1862 (Welsh Melodies, vol. 2); Welsh words of that edition by John Jones (Talhaiarn).
- Personent hodie: anonymous Latin, Piae Cantiones 1582 (melody in a manuscript of 1360).
- Hark! The Herald Angels Sing: Charles Wesley 1739; revised 1753 (Whitefield), 1760 (Madan), 1861 (Hymns Ancient and Modern).

## Tools
- `find-sources.js` wrote nothing for this batch: it skips a song that has no `scripts/songs/<slug>.txt` yet (the drafts
  are in w6/drafts). I found the pages by Wikisource's search and link lists and peeked each with `fetch-texts.js --peek`.
- Wikimedia answered "too many requests" once (other agents reading at the same time); retried after a pause. One page
  header (Hymns and Sacred Poems) could not be read for that reason; its peek had worked earlier.

## Words rows
- **good-king-wenceslas**: `en:Carols for Christmas-tide/Good King Wenceslas`. The peek shows stanzas 1, 2, 4, 5 as
  8-line blocks, but a stray block "Musical scores are temporarily disabled." (#4) lies between verses 1 and 2, and
  verse 3 is split at a page break into three blocks (#6 3 lines, #7 2 lines, #8 4 lines: 9 lines, so one line is
  probably a stray or a repeated line). It needs a look and probably a text fix / join. Spelling is the edition's
  ("look'd"). Wikisource says this is the Condensed Vocal Parts, 1854; the article says the carol first appeared in 1853:
  the credit says "condensed vocal parts, 1854" as the page prints.
  Second choice: Wikipedia's "Textual comparison" table, where Neale's five 8-line stanzas are clean but interleaved with
  the Latin: five rows `w-en  Good King Wenceslas  #52..#52`, `#57..#57`, `#62..#62`, `#67..#67`, `#70..#70`.
  (The same table has "Tempus adest floridum" in Latin, #53/#58/#63/#68, if the editor wants the spring carol shown.)
- **the-holly-and-the-ivy**: `en:English Folk-Carols/The Holly and the Ivy` #4..#9 (Sharp 1911; the page carries
  PD/US 1924). #4 has 8 lines (verse and refrain), #5-#9 five lines each (four of verse and, it seems, a refrain cue):
  `nolabels` may be wanted if the fifth line is "Refrain"-like. Second choice: `w-en  The Holly and the Ivy  #12..#18`
  (Sharp's text as the article quotes it, with a "REFRAIN:" label in #13).
  Wikisource also has two early broadsides ("The Holly & ivy (1818)", "Herald Angels, and The Holly & Ivy/The Holly & Ivy").
- **deck-the-halls**: `en:Deck the Halls`, all (three 8-line stanzas, PD-old, header: Thomas Oliphant, 1862). Note: this
  is Oliphant's ORIGINAL text, which has drinking in it and differs from what most people sing now (the 1877 school
  version, "Yuletide"). The 1877 variant is on Wikipedia: `w-en  Deck the Halls  #18..#20` (4-line blocks, without the
  fa-la-la lines, it seems). Welsh: only Talhaiarn's first verse is quoted (`w-en  Deck the Halls  #27..#27`, with
  Campbell's literal English of 1862 at #28); I proposed no Welsh row, as one verse of a different song text beside the
  English carol would mislead. No Welsh Wikisource page for "Nos Galan" was found (cy.wikipedia's "Nos Galan" is about
  the day).
- **personent-hodie**: no Latin Wikisource page exists (searched la, fi; Wikidata lists none). The Latin of 1582 is in
  Wikipedia's table: four rows, each a verse that the page breaks into two or three blocks at the repeated-syllable
  lines, so each has ` /8` to regroup its eight lines. The peek's line counts (6+2, 6+1+1, 6+2, 6+2) agree with 8 each;
  please check the import. The same table holds "Intonent hodie" (c. 1360), not proposed.
  English: Jane M. Joseph's "On this day earth shall ring" is in the same table (#28, #34, #39, #44). She died in 1929
  (the article), but the article gives NO year of publication, so the "published before 1931" test is not met from the
  source. The rows are in rows-1.tsv as comments (lines starting `#`), to be enabled only if the editor confirms the
  date. Her verses are a free metrical version, not line by line: it would stand as a block of its own. The table's
  "Literal translation" is a Wikipedia editor's (CC BY-SA), usable under the guide's free-licence clause if the editor
  prefers (#27, #33, #38, #43), or the Institute translates.
- **hark-the-herald-angels-sing**: active row = the sung text from `en:The Army and Navy Hymnal/Hymns/Hark! the Herald
  Angels Sing` #2..#4 (the hymnal is dated 1920 on Wikisource; three stanzas of 10, 10 and 11 lines: the 11th line of the
  last may be an "Amen", to drop). Alternatives as comments in the rows file: A, the 1861 Hymns Ancient and Modern text
  from Wikipedia's table (three one-stanza rows); B, Wesley's own ten verses of 1739 from
  `en:Hymns and Sacred Poems/Hymn for Christmas Day` (all; PD-old). Take ONE for `orig`. A page could well show Wesley's
  1739 text too, but the tool has one `orig`.

## Performances (all checked through oEmbed: exist, embeddable; none was watched, so the editor's audit still applies)
- good-king-wenceslas: 6QwOMUsPdyI, The Choir of King's College, Cambridge - Topic (3:23). Second: A9DkDX4YsQ4, London
  Philharmonic Choir's own channel (3:13); third: B0auGcjcxTY, Archive of Recorded Church Music, Westminster Cathedral
  Choir 1985.
- the-holly-and-the-ivy: T6TQPA4c_Wo, The Choir of King's College, Cambridge - Topic (3:12). Second: TZTxaRDl6_k, Decca
  Classics, the same choir (Official Audio, 3:22). I could not tell from the titles which arrangement each is (Walford
  Davies's is the one the article names).
- deck-the-halls: lB3uHEcsPZE, John Rutter & The Cambridge Singers (own channel, 1:45, choir with orchestra). Second:
  G1xNiH4FxiY, The Cambridge Singers - Topic (the same recording). Third: v-SQV-2uU_Y, The King's Singers (Radial by The
  Orchard). Short, but it is the whole carol.
- personent-hodie: 2gEV4tbPOQE, The Choir of King's College, Cambridge - Topic (2:42), in Latin. Second: Az7xDcJbDmU,
  Decca Classics, the same choir (Official Audio); third: 4NIBIWkgGDY, Ely Cathedral's own channel (Rutter's arrangement).
- hark-the-herald-angels-sing: 9Bwn0k0k8xI, KingsCollegeChoir (the choir's own channel, Carols from King's 2021, with
  Willcocks's descant, 3:05; the arrangement the article describes). Second: Ob3AtxjgJZo, The Choir of King's College,
  Cambridge - Topic (4:11).
  Four of five are King's College; the site already uses the choir for several carols. Swap in the second choices if
  more variety is wanted.

## Doubts in the drafts (summary)
- Three `== meaning` blocks use details that are NOT in the saved articles (their lyric sections are blank there):
  Holly (blossom, berry, prickle, bark; the refrain's images), Personent hodie (the last verse), Good King Wenceslas
  (the closing moral; "food, drink and firewood"). Each is marked in the draft's notes; check against the imported
  words or cut.
- Years and eras differ from slugs.tsv in two cases: the-holly-and-the-ivy year 1823 / nineteenth (slugs: earlymodern;
  the article says the song "can be traced only as far as the early nineteenth century"; Sylvester's "about 1711"
  broadside is a claim), personent-hodie year 1360 / medieval (slugs: earlymodern, the 1582 print).
- Good King Wenceslas: "In 1849 he had published Deeds of Faith" is read as Neale (the article's "he" is ambiguous
  after the Svoboda sentence). Gift of Piae Cantiones: "in or around 1853" (this article) against 1852 (the Personent
  hodie article); each draft follows its own article. Jacobus Finno is "Protestant headmaster of Turku Cathedral School"
  in one article and "a Swedish Lutheran cleric" in the other; the printer is "Theodoric Petri" in one, "T.P. Rutha" in
  the other.
- Deck the Halls: the article dates the tune three ways (16th century; a manuscript of the 1700s; published 1794);
  all given. Nat King Cole's version has only empty chart sections in the saved text: that inspired line may be dropped.
  types "celebration, dance": "dance" is mine.
- Hark: the story paraphrases Wesley's superseded opening ("welkin ... King of Kings") without quoting it; cut the clause
  if too close. people line gives "George Frideric Handel"; the article says only "Handel".
- Types added beyond slugs.tsv: "sacred" on Good King Wenceslas, "celebration" on Holly, Personent hodie and Hark.

## For the wave (not my batch)
- slugs.tsv has `god-rest-you-merry-gentlemen`; the site already has `scripts/songs/god-rest-ye-merry-gentlemen.txt`
  (and a videos.tsv row for it). merge-wave.js should refuse it by title, but the batch that drafts it will have worked
  for nothing.
