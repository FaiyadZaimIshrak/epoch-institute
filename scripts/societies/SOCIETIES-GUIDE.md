# Writing a social ladder for The Epoch Institute's "Social ladders" (/societies/)

You draft one file per society: the rank order of its people, from the ruler to the enslaved, for one period. Every
fact will be checked by an editor against your sources, so write only what they say. Your sources are the saved
Wikipedia articles you are given (one folder per society). Do NOT use the web otherwise, and never your memory: if a
fact is not in the files, leave it out.

Read first: scripts/societies/ancient-rome.txt (the reference ladder), and one ladder near yours in region or kind
(sparta, hawaii, tokugawa-japan, mali-empire, joseon, inca-empire …). Copy their shape, length and voice.

## Voice
- A general, academic register about the past itself. Plain sentences; no "fascinating", no "rigid hierarchy" clichés.
- Ranks are described as the period's law, custom and ideology set them, never as a natural order. Slavery, caste and
  ranks of descent or colour are named without euphemism ("enslaved people", not "servants"), and the people at the
  bottom are given their own lives, work and resistance.
- Present-day politics only as dated facts. Never praise or mock a regime; say what its law or ideology claimed.
- BCE/CE; "c." for uncertain dates.

## The file (scripts/societies/<slug>.txt)
Header lines, in this order (one key a line, no empty values):
```
name: Qing China                       (the society's name as a card title)
of: Qing China                         ("The social ladder of …")
short: the Qing                        (a short name for running text)
in: Qing China                         ("Born in …")
year: 1750                             (one year: the middle of the period described; negative BCE)
period: 1644–1912 (the high Qing, 18th century)
region: Central & East Asia            (one of: Ancient Near East, Egypt & North Africa, Sub-Saharan Africa, Europe,
                                        Islamic Caliphates & Middle East, Central & East Asia, South & Southeast Asia,
                                        Americas, Oceania)
population: 300-400 million | whose estimate, from the article   (or: est 3-5 million | what the estimate rests on)
profiles: Qing dynasty                 (profile names on the site, comma-separated: check shared-data.js EMPIRES names)
nolink: medina                         (optional: entry slugs the gold links must not go to on this page, e.g. a name
                                        inside a longer one; leave the line out if none)
picture: forbidden-city                (an encyclopedia entry slug whose picture heads the page; see "Entries" below)
kids: no                               (yes only if the ladder can be told to a nine-year-old without its worst parts first)
title: Social Hierarchy of Qing China: From Emperor to Bondservant   (at most 70 characters)
desc: …                                (at most 160 characters: the meta description, naming the ranks)
intro: …                               (one paragraph: how the society ranked people, by law, birth, wealth, office)
```
Then one `== tier` block for each rank, from the top down:
```
== tier
level: 1                (1 = top; ranks of equal standing share a level and stand side by side)
band: ruler             (one of: ruler, nobility, religious, specialists, commoners, dependent, outcast, enslaved)
name: The emperor       (the rank in plain English)
term: huangdi, tianzi   (the period's own words, romanized, comma-separated; "-" if none is attested)
local: Huangdi          (the rank's own name shown first, with the English after it; "-" if none; one word where both
                         are the same)
share: 0                (per cent of the whole population: 0 for a ruler; "lo-hi" from a scholar's figure; "est lo-hi"
                         for an estimate; "rest" for exactly one rank, everyone else)
sharenote: …            (whose figure, or "Estimate: …" saying what it rests on; "One …" only for a single ruler)
firm: yes               (yes when the article makes this rank's place in the order clear and agreed)
terms: eight-banners    (encyclopedia entry slugs for the rank's terms, comma-separated; the line must be there, empty
                         when there are none: "terms:")
people: kangxi-emperor  (entry slugs of members of the rank, never of their rulers; the line must be there: "people:")
picture: forbidden-city (optional: an entry slug whose picture shows this rank; "-" for none)
text: …                 (one paragraph, 60-120 words: who they were, what they did, what the law gave or denied them)
rise: …                 (one or two sentences: how one entered or left the rank)
you: …                  (one or two sentences in the second person, "Born into history": every fact in it is in text)
kid: …                  (at most 140 characters, simple and true)
```
Then the free sections, each a paragraph or two:
```
== mobility
How people moved between ranks, and how often.
== women
How women's place differed from men's in each rank.
== sources
Only real works the articles cite (author, year, title, place: publisher), one a line; at least three.
== checked
The titles of the articles you used, separated by "; ".
```
Lines starting `NOTE:` or `MISSING:` are for the editor: `NOTE:` for a doubt, `MISSING:` for a person or term you would
have linked but the encyclopedia lacks ("MISSING: bannerman (Manchu soldier-settler)").

## Shares
The editor accepts estimates, marked as such, everywhere. Use a scholar's number where the article gives one (and say
whose in the sharenote). Where nobody counted, write `est lo-hi` with a sharenote starting "Estimate:" that says what
it rests on (a related count, the same rank in comparable societies, a share another figure implies). Exactly one rank
may be "rest" (usually the commoners or peasants), and the numbered shares must leave room for it. The levels go down
the page in order; every rank needs a `kid`, `you`, `text` and `rise`.

## Entries
Every slug you name (picture, terms, people, nolink) must be an existing entry. Check each one:
  grep -o '{slug:"<slug>",name:"[^"]*"' encyclopedia-data.js
and that it is the right subject (a name may belong to a namesake). Entries with pictures carry `img:` on their line.
A rank whose terms and people have no picture is fine: the editor finds one. Prefer pictures of the period itself.

## Output
Write SCRATCH/out/<slug>.txt and SCRATCH/out/notes-<batch>.md (per ladder: what you left out and why, the doubtful
shares, the MISSING names). Do not change anything in the repository.
