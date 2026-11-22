# Journeys on the globe: the writers' brief

You turn ONE saved Wikipedia article into the stops of one historical journey, for a page that draws the route stop by
stop on a globe. Everything you write comes from that article. Nothing comes from memory: if the article does not say
it, it is not in your file.

## Files
- The article: `wp/<slug>.txt` in this folder (plain text). Read all of it.
- The places the encyclopedia has, with a map point: `places.tsv` (entry slug, name). Search it for every stop
  (`grep -i`), also under older or other spellings (Constantinople / Istanbul, Calicut / Kozhikode).
- You write `out/<slug>.json` and nothing else. Do not touch any other file, and nothing in the website's repository.

## What a journey is here
A route one traveller, expedition, army or fleet really took, as an ordered list of 8 to 24 stops. Choose the stops the
article itself treats as stages of the journey: where it began, the places it names along the way with something that
happened there, where it turned back or ended. Keep the article's order of travel. A place visited twice is two stops
when the journey came back through it (the return to the starting point is a stop).

Leave a stop out when the article names the place only in passing, gives nothing that happened there, or is unsure the
traveller was ever there (say so in `notes`). Where the article says a visit is doubted by scholars (Marco Polo's
China, parts of Ibn Battuta's travels), keep the stop only if the article keeps it, and put the doubt in the stop's
text, attributed ("the account says", "some scholars doubt").

For a journey made of several voyages or campaigns (Paul's journeys, Zheng He's seven voyages), give `legs`: each leg
has a short title and its own stops. Otherwise give one leg.

## The file
```json
{
  "slug": "magellan",
  "title": "Magellan and Elcano's Voyage Round the World",
  "years": "1519–1522",
  "traveller": "Ferdinand Magellan",
  "intro": "Two or three plain sentences: who set out, why, and what the journey was. From the article.",
  "ending": "One or two sentences on how it ended and what came of it. From the article.",
  "legs": [
    { "title": "Across the Atlantic",
      "stops": [
        { "place": "Sanlúcar de Barrameda",
          "entry": "sanlucar-de-barrameda",
          "wp": "Sanlúcar de Barrameda",
          "date": "20 September 1519",
          "year": 1519,
          "by": "sea",
          "text": "One or two sentences (15 to 45 words) on what happened here, in the past tense.",
          "quote": "the exact words of the article that support the text and the date" }
      ] }
  ],
  "notes": "anything the editor should know: doubts, places you could not match, where the article contradicts itself"
}
```
- `place`: the name as the article gives it for that time (Constantinople, not Istanbul).
- `entry`: the slug from `places.tsv` when the same place is there, else `null`. Never a namesake: a town of the same
  name in another country is not the place. When in doubt, `null`.
- `wp`: the title of the place's own English Wikipedia article as best the saved article names it (the present-day
  town for an ancient site without its own name is acceptable only when the article says where the site is). The
  editor's tool looks the coordinates up from this title, so it must be a real place, not a region the size of a
  country, an ocean or a sea. A stop that can only be described as "the Pacific" is not a stop; use the island or
  strait the article names.
- `date`: as the article gives it, day first ("6 March 1521"), or a month and year, or a year, or "c. 630". BCE and CE,
  never BC and AD. `year` is the same year as a number (BCE negative).
- `by`: "sea" or "land": how the traveller came to this stop from the one before (the first stop: how the journey
  set out).
- `text`: what happened at this stop, plainly. No praise words (epic, legendary, remarkable, daring), no "would
  later", no summing-up morals, no rhetorical questions, no dashes as punctuation. British spelling. Numbers only as the
  article gives them, with its hedges ("about", "according to Pigafetta").
- `quote`: copied exactly from the article (one or two sentences is enough), so the editor can find it. It must
  contain the place's name or make plain that the event was there, and the date or year where you give one.

## Tone
- Violence, enslavement and conquest are told plainly where the article tells them, without relish and without
  softening: who did what to whom. Do not call a land "discovered" when people lived there; say "reached" or "sighted".
- Religious journeys (the Hijra, Paul): what the tradition and the sources say, attributed as the article attributes
  it ("according to the Acts of the Apostles", "Islamic tradition holds"). No miracle as plain fact, none denied.
  Do not describe the appearance of Muhammad.
- Peoples met on the way have their own names where the article gives them.

## Before you finish
- Every stop has all eight keys; `year` is a number; stops are in the order of travel.
- Every `quote` is found word for word in `wp/<slug>.txt` (check with grep on a distinctive phrase of each).
- Every `entry` is a slug in `places.tsv`.
- The file parses: `node -e "JSON.parse(require('fs').readFileSync('out/<slug>.json','utf8'))"`.
Reply with a short report: the number of legs and stops, the stops you left out and why, and anything doubtful.
