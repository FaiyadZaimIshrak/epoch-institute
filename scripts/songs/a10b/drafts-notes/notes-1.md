# Batch 1 notes (wave A10b)

General: the Wikimedia APIs were rate-limiting through much of this batch ("too many requests"), so some Wikisource
lookups were slow or failed; find-sources.js could not be used as such, since it reads the draft from scripts/songs/
(the repository), where I may not write. I peeked pages directly with fetch-texts.js --peek (its cache only). Stanza
numbers below are from those peeks (4 Nov 2026). Peek outputs kept in drafts/work/ (as .log files, so no merge script takes them for drafts).

## song-of-songs (pd)
- Copyright: ancient anonymous text; KJV 1611 and the Masoretic text are public domain.
- Words: whole book. Hebrew: he:שיר השירים א … ח (one row per chapter, the Masoretic parashot as stanzas), hebnum.
  English: en:Bible (King James)/Song of Solomon, one row per chapter by stanza numbers (#3..#19, #22..#38, #41..#51,
  #54..#69, #72..#87, #90..#102, #105..#117, #120..#133: the "Chapter N" and "edit" lines between are left out), nonum.
- Doubts: (1) chapter 1's first Hebrew stanza begins "א א א" (chapter, verse and a third letter): hebnum strips at most
  two letter groups before a pointed word, so it may leave the line unstripped; check the import, add a text fix if
  needed. (2) chapter 5's second stanza begins "א* ב": the asterisk mark may also defeat hebnum. (3) KJV 6:13 is
  Hebrew 7:1, so English and Hebrew do not align; they will show as blocks. (4) 117 verses is long: the editor may
  prefer one or two chapters. (5) kids: no (erotic love poetry); editor may choose yes.
- Video: FE476z6J7vs (Hagay Yair Batzri, chapter 3 chanted with cantillation, Jerusalem Sephardic, 2:23). Second:
  UE29iz8zi34 (Moshe Weisblum, the whole book in Ashkenazi cantillation, 32 min). Also possible: the Hilliard Ensemble -
  Topic, Palestrina's "Osculetur me" (GqufbNLWegE), a setting in Latin.

## odes-of-solomon (pd)
- Copyright: anonymous, 1st or 2nd century CE; Harris's translations (1911; with Mingana 1920) are public domain; the
  article calls the Zinner and Mattison "Nuhra Version" (2021) public domain and a Wikisource text.
- Words: no free edition found on Wikisource: searches of English Wikisource (main and Translation namespaces) for "Odes of Solomon", "Nuhra" and "Zinner Mattison" found no text, though the article calls the Nuhra Version "a Wikisource text"; the pages "The Odes of Solomon", "Odes of Solomon" and "The Lost Books of the Bible/The Odes of Solomon" do not exist. No row. Harris (1911) and Harris and Mingana (1920) are named in the article as online scans (Internet Archive, OCR only); Platt's The Lost Books of the Bible (1926) reprints a translation and may be on Project Gutenberg: the editor could check there (I did not search Gutenberg). Since the book has 42 odes, a single ode (e.g. Ode 30 or 37, the two the videos set) would suit the page better than the whole collection.
- The Odes Project: the article says John Schreiner released it in 2010 as a two-disc album; the YouTube releases say
  "The Odes Project, Volume 1" and "Volume 2", ℗ 2008. The draft keeps the article's 2010.
- Video: qbJDja7Ukpw (Fernando Ortega - Topic: Fernando Ortega with the Riverbend Choir, "I Stretched Out My Hands (Ode
  37)", The Odes Project, Volume 1). Second: rUUbdVMetaU (Release - Topic: John Andrew Schreiner with the Riverbend
  Choir, "Fill Yourselves With Living Water (Ode 30)", Volume 2). These are modern English song settings of single
  odes, not an ancient chant: nothing older exists on YouTube (only audiobooks and talks).

## psalm-104 (pd)
- Copyright: ancient text; KJV 1611 public domain.
- Words: he:תהלים קד #5..#39 hebnum; en:Bible (King James)/Psalms "O LORD my God, thou art very great".."Let the sinners
  be consumed" nonum (stanzas #1931..#1965 of the page: verses 1–35). The start phrase avoids Psalm 103, which also
  opens "Bless the LORD, O my soul".
- year -950 is derived from the article's "some 400 years" after the 14th-century BCE Aten hymn; editor may prefer
  undated.
- inspired-by points to the site's Great Hymn to the Aten (same title), as a parallel with influence debated.
- Video: --UABwqW9Sg (Yamma Ensemble, Psalm 104 sung in Hebrew, 4:39). Second: B-hmv1aZ6eE (St. Petersburg Optina
  Pustyn Male Choir - Topic, the Vespers psalm, Church Slavonic).

## hallel (pd)
- Copyright: ancient text (Psalms 113–118); KJV 1611 public domain.
- Words: six Hebrew rows (he:תהלים קיג #5..#13, קיד #5..#12, קטו #5..#22, קטז #5..#23, קיז #5..#6, קיח #5..#33, hebnum)
  and six KJV rows on en:Bible (King James)/Psalms by phrases. Psalm 118's start phrase "for he is good: because his
  mercy" is unique (Psalms 106, 107, 136 say "for his mercy"); its end phrase "for he is good: for his mercy endureth"
  is then the first match after it, verse 29. About 82 verses in all: the editor may cut to Psalms 113–114.
- year 50 is my reading of "in the first century"; the article gives no date.
- The meaning summarises the six psalms from their KJV text (the article describes only 114's Exodus); a shorter
  alternative is in the draft's notes.
- Video: hPLF7GNacGQ (TACIChannel: the Tel Aviv Cantorial Institute choir under Naftali Herstik, Hallel medley,
  Rosenblatt arr. Goldstein, 2007, 6:48). Second: Cgo_jERqVa4 (Cantorial Legends: Moshe Oysher, Pesach 1956, 18 min).

## kesh-temple-hymn (pd)
- Copyright: over 4,000 years old; Langdon (1913/1915/1919) and Barton (1918) translations public domain but partial
  and outdated. ETCSL's composite and translation are CC BY-NC-SA 3.0 (the licence accepted for Gilgamesh).
- Words: no Wikisource text found; no row (the rows format has no ETCSL site). Proposal: import with
  scripts/songs/fetch-etcsl.js as for Gilgamesh. The article's external links give "ETCSLtransliteration : c.5.3.2",
  which I could not verify as this hymn's number; the editor must confirm it on ETCSL before importing.
- Video: none. YouTube has only documentaries, a translation reading, meditation and AI-made "Sumerian chants" (Tera
  Mangala, SlowOut - Topic, belawetz - Ai Music); Peter Pringle has no Kesh hymn. Nothing fits the rules.

## hymn-of-the-pearl (pd)
- Copyright: anonymous, 2nd (or 1st) century CE; William Wright's translation (1871), tagged PD-old on Wikisource.
- Words: en:Hymn of the Pearl #1..#105 (stanza 106, the colophon, left out). The page says it is "arranged in couplets,
  following A. E. J. Klijn, The Acts of Thomas (Leiden, 1962)", and that Klijn uses Wright's translation "except for a
  few variant readings": check that the page text is Wright's. Two {{illegible}} gaps show as "(illegible text)".
  No Syriac original found on Wikisource (not searched further: rate limits).
- Article thin: story is two paragraphs.
- Video: X_aYbo6hiLg (BYU Singers - Topic, Kevin Anthony's "Hymn of the Pearl", the setting the article names, 7:42).
  Second: 97R4A_s5VY8 (Kevin Anthony Composer channel, BYU Singers, titled 2024). The draft lists the work with year
  "not known" (the article gives none); 2024 from the video title if wanted.

## song-of-hannah (pd)
- Copyright: ancient text; KJV 1611 public domain. The article prints the NKJV (in copyright): not used.
- Words: he:שמואל א ב #5..#5 hebnum (one stanza of 10 lines, verses 1–10); en:Bible (King James)/1 Samuel/Chapter 2
  #4..#13 nonum (verses 1–10; #3 is the chapter summary, left out). Both start with "And Hannah prayed, and said", as
  the Song of Deborah row starts with its narrative line.
- local שירת חנה / Shirat Hannah is not in the article (as with Deborah): confirm.
- inspired: Magnificat (the site's song, same title), so the two link.
- Video: D-q-4Xv-BkA (תפארת הפיוט: Cantor Moshe Habusha chants the haftarah "Vatitpalel Hannah", 2:49). Second:
  GtnkWXoNY1g (baruch sh, Kurdish tradition; a personal channel). The first channel's description is empty: editor to
  confirm it is the channel of the Tiferet HaPiyut project.

## kassaman (copyright)
- Copyright: words written April 1955 by Moufdi Zakaria (alive after 1962 per the article; death year not given);
  music by Mohamed Fawzi. No words rows; the meaning names theme and mood only.
- Video: 0RALqtth3UU (EPTV, Algerian public television, the anthem in full, 5:32): its description does not say
  whether it is sung; check. Second: fKk1W9_rWzk (People's Democratic Republic of Algeria - Topic, GTX Media, 1:02,
  perhaps instrumental). The article names a Republican Guard performance in its external links; the Guard's own
  channel had none of the anthem in the search.

## humat-al-hima (copyright, batch guessed pd)
- Copyright: poem "written in the 1930s" by Mostafa Saadeq Al-Rafe'ie, last verses by Aboul-Qacem Echebbi (added June
  1955); the article gives no publication date and no death years. By the brief's rule (words first published after
  1930) I marked copyright. If the editor establishes that both poets died long before 1956 and the words are free in
  the US, it can become pd; then the Arabic text must be found (I did not search: rate limits).
- Article thin: two paragraphs.
- Video: wPncVG_7N3U (IFM radio: sung by Saber Rebai, Amina Fakhet and Lotfi Bouchnak, 3:33). Second: yJNnMQ514XQ
  (Nessma TV: sung at the opening session of parliament, 2:32).
