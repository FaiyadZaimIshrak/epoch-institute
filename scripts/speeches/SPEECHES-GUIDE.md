# Great Speeches: drafting a speech

Each speech of The Epoch Institute (/speeches/<slug>) tells its setting, gives a key passage, says what followed, and
prints the complete text where a public-domain or freely licensed copy exists. You draft speeches ONLY from:
- the saved Wikipedia articles named in your brief (`<wp dir>/<slug>.txt`, `<slug>.2.txt`): for the setting and what
  followed;
- the speech's own text, as the importer copies it from its source: for the key passage.
Never from memory or the open web; never type or paraphrase a speech's words.

## 1. Find the text
Every speech in your batch needs a source page that holds the WHOLE speech (or the whole of what survives), in English,
and is in the public domain:
- published before 1931 (a translation too: name the translator and the year where the page prints them), or
- a work of the United States federal government (a president's or secretary's speech in office), or
- freely licensed (Wikisource transcriptions are CC BY-SA: fine).
Look first on English Wikisource (also "The World's Famous Orations" (1906), ten volumes:
https://en.wikisource.org/wiki/The_World%27s_Famous_Orations), then Project Gutenberg, the Avalon Project
(avalon.law.yale.edu), Fordham's Internet History Sourcebooks, the National Archives (founders.archives.gov), the
presidential libraries and the American Presidency Project. Open the page and make sure it holds THIS speech (a page of
the same collection may hold another one), from its first words to its last.

See a page's paragraphs (cached after the first call):

    powershell -ExecutionPolicy Bypass -File scripts\fetch-speech-texts.ps1 -Peek "<url>" -Find "*"
    powershell -ExecutionPolicy Bypass -File scripts\fetch-speech-texts.ps1 -Peek "<url>" -Find "first words","last words"

Choose `select`: `all`, `@first..@last` (paragraph numbers as -Peek lists them; `@3..` to the end), or
`"start phrase".."end phrase"` (the end phrase's paragraph is kept). Leave out the editor's introduction, notes and
the page's furniture; keep the speech. A speech in several pages: several source rows, joined in order.

Then import your batch into your own folder and read the result (the first and last words of each are printed):

    powershell -ExecutionPolicy Bypass -File scripts\fetch-speech-texts.ps1 -Sources <your sources.tsv> -OutDir <your texts dir>

sources.tsv lines (tab-separated): `slug  url  select  credit  lang`; credit says whose text it is, short
("from The World's Famous Orations (1906)", "tr. Richard Crawley (1874)", "as printed in the Congressional Record"),
lang `en`.

If no free full text exists, say so in your notes and still draft the speech only if a public-domain source prints at
least the key passage (then give that source as a row with the passage's paragraphs); otherwise skip it.

## 2. The record (JSON)

    {"slug": "...", "title": "...", "speaker": "...", "speakerSlug": "...", "era": "...", "year": 1858,
     "display": "16 June 1858", "place": "Springfield, Illinois", "empire": "/empire/united-states|United States",
     "before": "...", "excerpt": "...", "source": "...", "after": "...",
     "links": ["/encyclopedia/abraham-lincoln|Abraham Lincoln", ...], "led": ["/encyclopedia/...|...", ...],
     "full": "<url>|<library>", "notes": "..."}

- slug: as your brief gives it. title: the speech as it is known ("Lincoln's House Divided Speech", "Burke on
  Conciliation with America"), at most 60 characters.
- speaker: the name as the encyclopedia writes it; speakerSlug: the speaker's entry, if there is one (search
  encyclopedia-data.js for `name:"..."`; do not read the whole file), else "".
- era: ancient (to 499), medieval (500-1499), earlymodern (1500-1759), revolutions (1760-1847), nineteenth (1848-1900),
  twentieth (1901-1945), postwar (1946 on). year: a number, BCE negative. display: the date as the article gives it
  ("c. 1046 BCE", "Winter 431-430 BCE", "4 March 1801").
- place: where it was spoken. empire: the profile of the state it was spoken in or for, alive that year, as
  "href|label" (`node scripts/days/profiles-alive.js <year> [word]` lists profiles and addresses), else "".
- before (160-470 characters): the setting, past tense: who spoke, to whom, why then. after (120-470): what followed,
  as the article says. Plain and exact; no praise words ("famous", "greatest", "iconic", "legendary", "powerful",
  "stirring", "immortal"). Where a speech reaches us through someone else (Herodotus, Thucydides, Livy, a
  newspaper, an interpreter, a reconstruction years later), say so plainly, in before or source.
- excerpt: the key passage, a sentence or two (20-310 characters), copied EXACTLY from your imported text (same words,
  same spelling and punctuation; you may start and end at sentence boundaries only). The checker refuses an excerpt the
  text does not contain.
- source: one line naming the text the excerpt comes from: the work, the translator and year, and any caveat ("Thucydides
  wrote the speech in his own words, as he says he did for all the speeches in his History").
- links: 2-5 entries, profiles or state pages the setting names: "/encyclopedia/<slug>|Label", "/empire/<slug>|Label",
  "/state/<id>|Label". led: 1-4 entries for what the speech led to or what followed. Only entries that exist and are
  the same thing (not a namesake).
- full: the source page and its library ("https://en.wikisource.org/wiki/...|Wikisource").
- notes (optional): anything the editor should know (doubts about the text, a date the articles disagree on).
- copyright: true only for a speech whose words are still protected (none should be: such a speech is skipped).

## 3. Check
    node scripts/speeches/check-speeches.js <your drafts.json> <your texts dir> <wp dir>
fix every flag (an excerpt not found, a number or name not in the article or the text, a link to nothing), or explain
it in notes. Write the drafts as a JSON array, and the sources file, to the paths your brief names. Report how many you
wrote and skipped, and why.
