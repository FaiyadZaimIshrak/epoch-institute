# Batch 3 notes (wexford-carol, here-we-come-a-wassailing, i-saw-three-ships, white-christmas)

Drafts are in `scripts/songs/w6/drafts/`. Each draft's own `== notes` block has the detail; this file gathers what the editor must decide.

## Tools
- `find-sources.js` could not be used: it skips a slug that has no file in `scripts/songs/` (the drafts are in `w6/drafts/`), so it wrote nothing. I used `fetch-texts.js --peek` on the Wikipedia articles and on Wikisource pages found through Wikisource's search API.
- Wikisource answered "fetch failed" once for the Sandys page and worked on a retry 20 s later. YouTube search and oEmbed worked; all four proposed videos and the four second choices answered oEmbed 200 on 11 Nov 2026. I did not run audit-videos.js (it reads videos.tsv).

## wexford-carol
- pd confirmed as far as the article goes (traditional, "likely 15th or 16th century"; Grattan Flood 1859-1928). The year of The Oxford Book of Carols is not in the article.
- Words row: `w-en:Wexford Carol` stanzas #11..#15 (five verses, numbered "1." to "5.", hence `nonum`). No Wikisource page found (searches for the title and the first line returned nothing). This is Grattan Flood's text as Wikipedia quotes it; the credit says so without a year.
- The Irish text (stanzas #18..#19 of the same page, two verses): NO row proposed. The article says nothing about who wrote it or when; it may be a modern translation. If the editor drops Irish, change `language` to English only and `local` to "Wexford Carol" (I gave "Carúl Loch Garman", the article's Irish name).
- year 1500 is my reading of "15th or 16th century".
- Performance: Pa9OHZGa9Rs, John Rutter & The Cambridge Singers' own channel, with Stephen Varcoe (the 2002 recording the article names), 4:06. Second choice: yxDZjg_Igoc, Yo-Yo Ma with Alison Krauss (YoYoMaVEVO, 4:21, also named in the article; sung by Krauss). Third: HgGu1I0n-ec, Anúna.

## here-we-come-a-wassailing
- pd confirmed as far as the article goes (traditional, "at least the mid 19th century"). No first printing or year in the article; year 1850 is my reading.
- Words row: `w-en:Here We Come A-wassailing` #28..#36 (verse 1, the refrain, verses 2-8; `nonum`). DOUBTS: (a) the article says its text is "based on the text given in The New Oxford Book of Carols", a modern edition of traditional words: the editor decides whether that is free enough; (b) stanza #29 begins with the label "—Refrain:" as its first line, which needs a flag or a text fix to drop; (c) verse 1 shows 4 lines and the others 5, so the peek may have split or joined something: check the import's shape.
- Second choice for the words: Wikisource `en:Here We Come A-Wassailing` (#3..#13, five verses with "CHORUS" label stanzas #4, #7, #9, #11, #13 to leave out; licence tag PD-US). Its header says "The source document of this text is not known", so it has no edition to credit, and one line peeked as "We are not daily begga" (possibly a slip on the page). I preferred the Wikipedia text for its eight verses.
- No pre-1931 printed edition was found on Wikisource (searches: "a-wassailing", "Wassail Song", Bramley and Stainer's Christmas Carols New and Old: nothing).
- The == meaning block: please check against the imported words that it is a summary and not a retelling.
- Performance: 4YUGXr8FcdY, The King's Singers - Topic (official release, 2:15, sung). Second choice: niB2-TfUxMk, Washington Choral Arts Society - Topic, in John Rutter's arrangement (3:52). Not chosen: the Clare College and Magdalen College "Wassail Song" Topic tracks, because the title alone does not show which wassail song they are (it could be the Gloucestershire or Yorkshire one).

## i-saw-three-ships
- pd confirmed (traditional; 17th-century print; Sandys 1833).
- Words row: Wikisource `en:Christmas Carols, Ancient and Modern/I Saw Three Ships` #2..#10 (nine verses; #1 is the heading). The book title and "(1833)" in the credit: the title is the Wikisource page's; 1833 is the article's date for Sandys's version. The peek does not print the book's date, so check that the Wikisource index gives 1833 before keeping the year in the credit. Second choice: `w-en:I Saw Three Ships` #14..#22 (the same nine verses as the article quotes them).
- year: the article gives only "17th century". I put 1650 as a sorting value; it is NOT in the article. Alternative: 1833 (the one dated publication), which would make the era "nineteenth" instead of the list's "earlymodern".
- Performance: CO4FptgN2B4, KingsCollegeChoir (the choir's own channel, "100 Years of Nine Lessons & Carols", 1:56). Second choice: 9muiP6sQGKs, John Rutter & The Cambridge Singers (2:16).

## white-christmas
- Copyright (Irving Berlin; written c. 1940, released 1942). The article gives no birth or death year for Berlin, so the status line gives the song's dates. No words row. No words of the song in the draft but the title; the article's two quoted lines and its description of the dropped opening verse were left out.
- The article contradicts itself on when the record returned to number one (lead: December 1943 and 1944; body: holiday seasons of 1945 and 1946). The story says "in later holiday seasons".
- place: two rival claims (La Quinta, California; the Arizona Biltmore); I wrote "United States (by one account La Quinta, California)".
- events: "Fall of Saigon" is my label for what the article calls "the U.S. evacuation from Saigon" on 30 April 1975.
- Performance: v5ryZdpEHqM, "White Christmas (Official Video)", Bing Crosby's official channel (oEmbed author BingCrosbyVEVO), 3:24, 10 million views. I could not tell from the title whether it is the 1942 or the 1947 recording. Second choice: 4pckTiyVTcI, Bing Crosby - Topic, "1947 Single Version / With 1954 Spoken Introduction" (3:24; it opens with speech). At0gAwAvFeA (Remastered 2006) is only 1:35, so not chosen.
