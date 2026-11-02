# Writing a song entry for The Epoch Institute's "Songs in History" wing

You draft one file per song. Every fact will be checked against your sources by an editor, so write only what your
source says. Your sources are the files you are given (songs/wp/<slug>.txt, the English Wikipedia article). Do NOT use
the web. If a fact is not in the file, leave it out or write "not known".

## Hard rules on lyrics (copyright)

1. **Never write the song's lyrics.** You do not type the original words, a romanization or a translation of them,
   not even one line. The lyrics are imported later, by a script, from public-domain sources.
2. **For a song marked `copyright`:** do not quote, paraphrase or retell its words, images or story in any order. The
   `== meaning` block names only its theme and mood in ONE or TWO sentences ("a song of protest against police
   violence; angry and mocking"). The only words of the song you may use are its title.
3. **For a song marked `pd`:** the `== meaning` block is still your own short summary, and never a translation. In
   `== lyrics-source`, name where the full public-domain text is. Give only a URL the article itself cites or names
   (Wikisource, Gutenberg, a national archive). If the article names none, write `none named`.
4. **Check the status.** If the article shows that the words are NOT in the public domain, say so in `== notes`.
   Examples: a 20th-century lyricist who died after 1955, or lyrics first published after 1929. The editor decides.

## Voice

- Write a general, academic register about the past itself.
- Use plain sentences. No "this beloved song", no "timeless", no hype.
- For songs of slavery, war or oppression, give the history without euphemism, and the people's own voice and
  resistance.
- For anthems, stay neutral. Present-day politics only as facts, with dates.
- Songs of states, parties and causes (the third wave, Nov 2026: Soviet, Chinese, North Korean, fascist, imperial,
  wartime songs …) are told as history: who made the song, for which state or movement, how it was used (schools,
  parades, radio, purges, personality cults, bans), and what became of it. Name the regime's acts plainly where the
  article does (the Holocaust, the Great Purge, the Cultural Revolution, the Khmer Rouge's killings), never in the
  song's own terms, and never praise or mock. Write "the song presents X as Y", not "X was Y". kids: no for songs of
  fascist and Nazi movements, of personality cults and of regimes of mass killing, unless the article shows the song
  is also sung apart from them (a folk tune, an anthem of today); the kid line still says plainly what it was.

## File format (songs/out/<slug>.txt)

```
title: La Marseillaise
local: La Marseillaise                (the title in its own language and script; romanized form after " / " if not Latin script)
status: pd | lyrics by Rouget de Lisle (d. 1836)   (or: copyright | lyrics by X (d. 1983))
lyricist: Claude Joseph Rouget de Lisle   (or: traditional / anonymous / not known)
composer: Claude Joseph Rouget de Lisle   (or: traditional / anonymous / not known)
culture: French revolutionaries        (the people or community whose song it is)
language: fr | French                   (ISO 639 code | name; several with " ; ")
place: Strasbourg, France              (where it was made; "region, present-day country" for traditional songs)
date: 1792                              (as the article gives it: "c. 1400 BCE", "first printed 1765", "19th century")
year: 1792                              (one number for sorting, negative BCE; your best reading of the date)
era: revolutions                        (ancient <500 CE, medieval 500-1500, earlymodern 1500-1750, revolutions 1750-1815, nineteenth 1815-1900, twentieth 1900-1945, postwar 1945-)
region: Europe                          (exactly one of: Ancient Near East, Egypt & North Africa, Sub-Saharan Africa, Europe, Islamic Caliphates & Middle East, Central & East Asia, South & Southeast Asia, Americas, Oceania)
types: anthem, war                      (one or two of: sacred, lament, celebration, love, lullaby, work, war, anthem, protest, ballad, dance)
people: Claude Joseph Rouget de Lisle; Philippe-Frédéric de Dietrich   (people the story names, full names as in the article)
places: Strasbourg; Marseille; Paris
events: French Revolution; War of the First Coalition
kids: yes                               (no if the story centres on violence, slavery or death in a way a 9-year-old should not meet first)
kid: A marching song written in one night in 1792 that became the national anthem of France.   (≤140 characters, simple, true)
== story
Three to six paragraphs: how the song came to be, who sang it and why, how it travelled and changed, what it meant in
its history (bans, revivals, adoption as an anthem), and how it is sung today. Dates and names exactly as in the
article.
== meaning
Two to four sentences in your own words (see the lyrics rules).
== inspired
One line for each later work the article says it inspired or was reused in: title | year | how
(how: "same melody", "parody", "quoted in", "translation", "adapted as", "answer song" …). Only what the article says.
== inspired-by
Same format, for earlier songs or texts it came from, if the article says so.
== lyrics-source
url | what it holds (original text / English translation by X, year)   or: none named
== sources
The article (its URL is on the first line of the file) and works the article cites for the facts you used. Write
them as author, title, year. Only real works that appear in the article.
== notes
For the editor: doubts, conflicting dates, the copyright status, anything you left out and why.
```

Keep the order of the keys. One key per line. No empty values: write `not known`.
