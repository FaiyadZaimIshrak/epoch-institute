# Writing a religion profile and its faith map for The Epoch Institute

You write two files per religion, ONLY from the sources you are given: its saved English Wikipedia article
(`wp/<file>.txt`; the first line is the URL). Do NOT use the web or your memory for historical facts. Every claim will be
checked against that file by an editor; a fact that is not in it is left out. Dates, numbers and names exactly as the
article gives them; where the article hedges, you hedge too. The one exception is the latitude and longitude of a named
place in the faith map (a city, a temple site, a region's middle), which you may give from general geography, to two
decimals, for places the article itself names.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes. Plain sentences, no
hype, no "the article says", no "this profile". Describe beliefs as their followers hold them ("Yazidis believe …",
"in Druze teaching …"), never as true or false, and give outsiders' views and scholars' debates as theirs. Persecution,
massacres, forced conversion and genocide are named plainly as the article names them. A living faith is written in the
present tense, with its own names for itself where the article gives them. A religion's esoteric or secret teachings only
as far as the article describes them. Use the names the article uses, in full at first mention.

## File 1: out/<slug>.json, UTF-8
```
{
 "name": "Yazidism",                    the name you were given, exactly
 "region": "Islamic Caliphates & Middle East",   as given
 "start": 1150, "end": null,            whole years, negative = BCE; end null for a living faith
 "circa": true, "endCirca": false,      circa true when the start is approximate; endCirca false when end is null
 "info": "One sentence of 25-40 words saying what the faith is, where and when it arose, and what it is known for.",
 "facts": {
   "origin": "where and when it arose, as the article puts it",
   "founder": "its founder or early teachers, or 'none: …' with a short reason",
   "scriptures": "its sacred texts or oral tradition; 'none written: …' where that is the case",
   "followers": "followers today with the article's figure and year, or 'none: died out …' for a past religion"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["c. 1150", "One sentence."], …],    5-8 key events in date order; date as the article gives it, but never
        more than four digits and never "years ago" or "BP" (the site's timeline reads the first number as a year:
        "c. 3500 BCE", "1162", "7th century", "2nd millennium BCE"); no day-first dates; no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "origins":   "<p>where and how it began, what came before, founders and first communities, scholars' debates</p>",
   "beliefs":   "<p>gods or God, cosmology, ethics, ritual, worship, festivals, priests, sacred places, the afterlife</p>",
   "texts":     "<p>scriptures, hymns, myths and oral tradition, the teachers and writers who shaped it</p>",
   "spread":    "<p>how and where it spread or contracted, century by century, with the dates the article gives</p>",
   "community": "<p>its people and institutions: clergy, castes or ranks, law, family, its place in states; persecution</p>",
   "legacy":    "<p>what it changed or left; for a living faith its people today; for an ended one what survived of it</p>"
 },
 "summary": "Two or three sentences (250-450 characters).",
 "references": ["Author, Title (Publisher, year)", …],   3-6 real works copied from the ARTICLE's reference lists,
        bibliography or further reading; [] if it names none
 "notes": ["for the editor: doubts, conflicting dates, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

## File 2: out/<slug>.faith.tsv, UTF-8, tab-separated, the religion's faith map
The site draws it on a globe century by century (see the example block for Manichaeism you were shown). Lines:
```
@<slug>
area	<name of region>	<lat>,<lng>	<radius km>	<from year>	<to year, empty = today>	<level>	<short note, optional>
route	<year>	<lat>,<lng> > <lat>,<lng>	<label: how it spread, with the year in brackets where useful>
mark	origin|place|last	<year>	<name>	<lat>,<lng>	<one sentence: what happened here>
note	<year>	<the caption shown from this year's century until the next note: one or two sentences>
src	<a work relied on: the article's own title "Wikipedia: <title>", then works the article cites for the facts used>
```
- level 2: a main faith of the region or of its rulers; level 1: communities, a minority. A region may appear twice
  with different years and levels (main faith, then a minority).
- 6-14 areas, 2-8 routes, 3-8 marks (exactly one origin; "last" only for an ended religion's last attested place),
  5-12 notes in year order, 1-4 src lines. Years negative for BCE; every year inside the religion's start and end.
- Only regions, places, routes and years the article supports. A glow is a region, not a border: radius 80-1000 km.
- Keep the wording neutral, as in the profile.

Before you finish, count and validate: six sections of 1,100-1,600 characters each; 5-8 events in date order; three
takeaways; the JSON parses (`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`);
every TSV line has the right number of tab-separated fields. Report the counts and your doubts.
