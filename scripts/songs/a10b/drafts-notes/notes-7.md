# Batch 7 notes (wave A10b)

Wikimedia's APIs were throttling hard during this batch ("You are making too many requests"), so find-sources.js could not
be used (it also reads scripts/songs/<slug>.txt, where these drafts are not). I looked up the Wikidata sitelinks for the
first two songs only and otherwise tried the likely Wikisource and Wikipedia pages by name with fetch-texts.js --peek and a
small read-only helper (drafts/.ws7.js: wikitext and links of a page; drafts/.yt7.js: a watch page's length and
description). Every video was checked through YouTube's oEmbed (all exist and are embeddable) and its description read.

## o-tannenbaum
- Copyright: pd. Ernst Anschütz's words published 1824 (Musikalisches Schulgesangbuch), Zarnack's first verse 1820.
- Words: orig = w-de "O Tannenbaum" #21..#23, the 1824 first printing as German Wikipedia quotes it ("Text nach dem
  Erstdruck 1824"). Stanza 23 ends with that bracketed note "(Text nach dem Erstdruck 1824)" as its 7th line: it needs a
  text fix (drop the line). The German Wikisource has only Zarnack's 1820 love song ("O Tannenbaum (Zarnack)"), not
  Anschütz's text.
- en = en Wikisource "The Bay View Magazine/Volume 21/Number 4/German Folk Song" #2..#4: a 1914 translation
  (three six-line stanzas, matching Anschütz's three). The page names no author or translator (header empty; transcluded from The Bay View Magazine - Volume 21.djvu, p. 195). The other English page on Wikisource, "O, Christmas Tree (unsourced)", is marked no source: not used.
  Longfellow's "The Hemlock Tree" is only "may be a free translation" (Wikisource's own note): not used.
- Video: s8N8KVWAokU, John Rutter & The Cambridge Singers (the arranger-conductor's own channel), album Christmas Night.
  Language not stated in the description (could be German or English). Second choice: aNx6AjfF7nc, Lviv Municipal Choir
  "Homin" with organ and soprano, labelled "Ernst Anschutz - O Tannenbaum", live, on a shared channel ("Ukrainian Live
  Classic and Хор Гомін"); third UgPSrNMlJvo, the Tabernacle Choir's own channel (Sony release, 1980). VOCES8's video
  (12gsCREkIn0) was dropped: its description calls it "Melchior Franck's carol 'O Tannenbaum'", so it may be the old
  folk-song version, not this song.

## nearer-my-god-to-thee
- Copyright: pd. Written 1841 by Sarah Flower Adams; the sixth verse by Edward Henry Bickersteth Jr. (19th century; no
  date in the article).
- Words: orig = en Wikisource "The Army and Navy Hymnal/Hymns/Nearer, My God, to Thee" #2..#6 (Adams's five verses;
  stanza 1 is the "Musical scores are temporarily disabled" notice). The hymnal's year is not shown in the peek: the
  editor may add it to the credit from the page. Alternatives: the English Wikipedia article itself (w-en) prints all
  five verses plus Bickersteth's sixth; Wikisource also has "The Riverside song book/Nearer, my God, to Thee" and "The
  Canadian Soldiers' Song Book/Nearer, My God, to Thee" (the Riverside page failed to load under the throttling).
- Video: xaxrY1rxZKE, The Tabernacle Choir and Orchestra at Temple Square (own channel), Mason's "Bethany". Second
  choice: rSDy3csevZE, Wells Cathedral Choir - Topic, Dykes's "Horbury" (the usual British tune).
- Doubts: kids yes, though the Titanic and SS Valencia sinkings are a large part of the story; "A Confederate army band
  is said to have played it" softens the article's plain statement.

## funiculi-funicula
- Copyright: pd under the brief's rule (published 1880 by Ricordi). The article: Denza died 1922, "the song has been in
  the public domain since 1 January 1993". Peppino Turco's death year is not in the article.
- Words: orig = w-it "Funiculì funiculà" #32..#37 (three verses, each with its refrain), the Neapolitan text Italian
  Wikipedia quotes under "Testo e melodia". Its Italian version (#38..#43) is a modern translation by Wikipedia editors,
  not proposed. No free English translation found: Oxenford's "A Merry Life" has "scant relationship" to the original
  (the article), so it is not a translation. The English would have to be the Institute's own (TRANSLATION-GUIDE.md).
  The Neapolitan Wikipedia article is a stub without the words.
- Video: f5d86xl4qHg, Luciano Pavarotti's own channel, official audio (Decca, album O sole mio). Second choice:
  x8DHWNYh1DY, Luciano Pavarotti - Topic, but it is the Pavarotti & Friends version with the pop band Aqua and a
  children's choir, so not preferred; third PG4SbelgIFk is a re-upload of Bocelli (not usable).

## god-rest-ye-merry-gentlemen
- Copyright: pd. Traditional; manuscript of the 1650s, broadsheet c. 1760, Sandys 1833.
- Words: orig = en Wikisource "Christmas Carols, Ancient and Modern/God Rest You Merry, Gentlemen" #2..#8 (Sandys, 1833;
  seven stanzas). Stanza 2 begins with a stray line (four words, apparently the end of the refrain, left over from the
  page's layout) before the first verse: it needs a text fix dropping that first line. Wikisource's versions
  page also lists English Folk-Carols (Sharp) "God bless you, merry gentlemen" and Mulock's poem (not the carol).
- Video: 9l7nHnGmI4A, The Choir of King's College, Cambridge - Topic (Warner Classics, 1971). Second choice:
  WTuJxaAisvg, Magdalen College Choir, Oxford - Topic; also XsrHYGjdKrA, the Choir of Trinity College Cambridge on
  Hyperion's channel.

## london-bridge-is-falling-down
- Copyright: pd. Traditional; printed c. 1744.
- Words: orig = en Wikisource "Tommy Thumb's Pretty Song Book/London Bridge" #2..#11, the earliest printed English
  version (c. 1744), in its old spelling. Its verses are three-line blocks; stanza 2 has six lines. Alternatives:
  "Tommy Thumb's Song Book (1815)/London Bridge" and Baring-Gould's "A Book of Nursery Rhymes/Part V" (1895), closer to
  the modern words; the editor may prefer one of them (not peeked, throttled).
- Video: mDKz3aODffI, The Wiggles - Topic (Pop Go the Wiggles!, 2007; 1:07, "Composer Lyricist: Traditional"). Every
  other result was a nursery-video channel (Cocomelon, Mother Goose Club, Super Simple), which I avoided. Second choice:
  wFTAWqLYil0, Cedarmont Kids (a children's music label's own channel, 1:18).
- Doubt: kids yes, though the story names the human-sacrifice theory in one clause.

## santa-lucia
- Copyright: pd. Traditional; Teodoro Cottrau's Italian text published 1849, Cottrau d. 1879. Thomas Oliphant's English
  translation is undated in the article.
- Words: no free edition found. The Italian Wikisource has no page by that title; the Italian Wikipedia article "Santa Lucia (brano musicale)" exists but quotes no verse block; "Santa Lucia (canzone)" does not exist on the Italian or Neapolitan Wikipedia. Oliphant's English translation was not found on Wikisource under the titles tried (searches were throttled).
- Video: PLqoNhHYo7Y, Enrico Caruso - Topic (the release dates the recording 1902); the article calls Caruso's recording
  "perhaps the definitive 20th century recording". Second choice: Nfr0ErQXtDQ, Alfie Boe's own channel; third
  gn1NR8Z8pJg, Luciano Pavarotti's own channel (1:30, short).
- Doubt: types "work" (a boatman's barcarola touting his boat) instead of the brief's "work, love".

## twinkle-twinkle-little-star
- Copyright: pd. Jane Taylor (1783–1824), published 1806.
- Words: orig = en Wikisource "Rhymes for the Nursery/The Star" all (the five stanzas, 1806).
- Video: KUXhjWOL4EU, Jewel's own channel, official audio from her album Lullaby (3:05). Second choice: t0tYLXYXZPM,
  Westminster Choir - Topic. The other results were nursery-video channels or hours-long loops.
- era: revolutions (1806), not the brief's nineteenth.

## the-british-grenadiers
- Copyright: pd. Anonymous, 18th century.
- Words: orig = en Wikisource "The British Grenadiers (1802)/The British Grenadiers" #2..#8 (seven eight-line stanzas,
  a chapbook printed in Glasgow, 1802, {{PD-old}}). Alternative: "Fugitive Poetry. 1600–1878/The British Grenadiers"
  #2..#7 (six four-line stanzas, the long-line layout), which the editor may prefer as the more usual text; the 1802
  chapbook has one more stanza (its fifth, on Whig and Tory).
- Video: yLtY471mgmI, Diane Taraz - Topic (CD Baby release, album Songs of the Revolution, 2010), sung by a folk singer.
  Second choice: SgJedyce7H4, Peter Holman - Topic (4:46; not checked whether sung). The band versions (Coldstream
  Guards, Welsh Guards, US Army Strings, fife and drum) are instrumental and were avoided.
- Left out on purpose: the article's line that the song was playing in the car of Brenton Tarrant during the
  Christchurch mosque shootings. The editor decides.

## torna-a-surriento
- Copyright: pd under the brief's rule (deposited 1894, copyrighted officially 1905). The article gives no death year
  for Giambattista De Curtis: to be confirmed before printing.
- Words: orig = w-it "Torna a Surriento" #19..#27, the Neapolitan text Italian Wikipedia quotes. Text fixes needed:
  stanza 19 opens with the label line "(napoletano)" and the text is wrapped in «…» (first and last line); the last
  line of the song stands alone as stanza 27 and belongs to stanza 26. The Italian version on the same page (#28..)
  is not proposed (its translator and date are not given). No free English found: Claude Aveling's "Come Back to
  Sorrento" is undated in the article.
- Video: ol4OoaQ_Evs, LucianoPavarottiVEVO (Decca, 1990, with Zubin Mehta). Second choice: HbUfpQ9Nmbw, Decca Classics'
  channel, Pavarotti.
- year 1894 and era nineteenth, not the brief's twentieth (the lead says "composed in 1894").
