# Writing encyclopedia entries for The Epoch Institute (A7, Nov 2026)

You write short encyclopedia entries, each ONLY from its saved English Wikipedia article (`wp/<slug>.txt`; the first
lines give the URL and title). Do NOT use the web or your memory for facts. An editor checks every number and name
against that file; a fact that is not in it is removed, so leave it out. Dates, numbers and names exactly as the
article gives them; where the article hedges ("probably", "about", "traditionally"), hedge too.

## Voice
A general academic register about the past itself, as a good encyclopaedia writes: plain, exact, no hype ("famous",
"iconic", "fascinating", "legendary" as praise), no "the article says", no "this entry". Past tense for the past; the
present for what still exists (a site, a text, a living institution). Name violence, slavery, persecution and
colonial conquest plainly, as the article does. Religious matters as their traditions hold them, attributed
("according to the Gospels", "Muslim tradition holds"). Use the full name at first mention, BCE/CE, metres and
kilometres (convert nothing: give what the article gives).

## Each entry
```
{
 "slug": "friedrich-engels",           given to you; never change it
 "name": "Friedrich Engels",           the subject's usual English name, as the article's title has it, without
                                       a disambiguating bracket unless the editor gave one
 "type": "person",                     person | place | event | work | group | institution | term | idea | polity (a state)
 "subtype": "",                        place: city, region, site, river, island, mountain, sea, lake;
                                       event: battle, war, treaty, revolt, revolution, siege, campaign, conquest,
                                       disaster, other; work: text, monument, artifact, infrastructure, song, other;
                                       idea: religion, concept, deity, movement, period, ideology;
                                       term: title, office, language, script, weapon, currency, government; else ""
 "aka": ["Engels"],                    other names the article gives (spellings, titles, native names); [] if none
 "dates": "1820–1895",                 a person: lifespan "1820–1895", or "c. 1390–1441", "d. 1066", "fl. 1340s",
                                       a ruler whose birth is unknown "r. 1556–1605"; an event or a work its year(s)
                                       "1848", "1789–1799", "c. 515 BCE"; a place or a term: its founding or period if
                                       the article gives one ("founded 1162", "c. 1500–1200 BCE"), else ""; four
                                       digits at most, never a day-first date, never "BC"/"AD"
 "desc": "…"                           3 to 5 sentences, 380 to 700 characters, plain text (no HTML, no quotation of
                                       more than a few words). The first sentence says what the subject is, where and
                                       when ("Friedrich Engels was a German philosopher, social scientist and
                                       businessman who …"); then what it did or what happened, why it matters, and how
                                       it ended or what it left, with the article's own dates and numbers.
}
```
Write your batch as one JSON array to `out/<batch>.json` (UTF-8), the entries in the order given. No other keys.

## Notes for the editor
After the array, write `out/<batch>.notes.txt`: one line per entry where you doubted something (conflicting dates in
the article, a hedge you kept, a fact you wanted but could not find), and the slugs of articles that turned out to
be about something else (a namesake, a disambiguation page, a stub with too little to say): leave those out of the
JSON and say why.

Before you finish: validate the JSON (`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))"
out/<batch>.json`), check each desc is 380-700 characters and every date has at most four digits. Report how many
entries you wrote, which you left out and why.
