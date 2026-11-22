# Writing a city profile for The Epoch Institute

A city profile tells one city through time: Jerusalem, Baghdad, Chang'an, Tenochtitlan. You write one JSON file per
city, ONLY from the sources you are given: the saved English Wikipedia articles `wp/<slug>.txt` (the city's own
article) and, where there is one, `wp/<slug>-history.txt` (its "History of …" article); the first line of each is the
URL. Do NOT use the web or your memory for facts. Every claim will be checked against those files by an editor; a fact
that is in neither is left out. Dates, numbers and names exactly as the articles give them; where they hedge
("traditionally founded", "estimates range", "according to legend"), you hedge too. Where the two articles disagree,
leave the point out and say so in `notes`.

## Voice
A general academic register about the city and its past, as an encyclopaedia or a serious history writes. Plain
sentences in the past tense for the past. No hype ("jewel", "glittering", "eternal", "legendary", "vibrant", "bustling",
"melting pot", "crossroads of civilisations"), no "the article says", no "this profile", no rhetorical questions, no
dashes used as punctuation, no summing-up morals at the end of a paragraph. British spelling. BCE and CE, never BC and
AD. Dates day first ("29 May 1453").

- **This is a history, not a guide.** Nothing about tourism, hotels, airports, sports clubs, rankings ("most liveable",
  "largest economy"), or the city's present government. The present appears only as lasting facts: what the place is
  today (a capital, a ruin, a district of another city), its present name, and roughly how many people live there if
  the article says. Nothing "as of" a year.
- **Recent events are history** and are told like any other, plainly and briefly, without a verdict on any present
  government or party.
- **Sieges, sacks, massacres, plagues, fires and earthquakes** are told plainly with the articles' figures and their
  attributions ("according to …", "estimates range from … to …"), without relish and without softening: who did what
  to whom. The people who lived there are named as the articles name them.
- **A city holy to several faiths** (Jerusalem, Mecca, Constantinople, Delhi): what each tradition holds is attributed
  to it ("in Jewish tradition", "Muslims hold"); no miracle or revelation is stated as plain fact and none is denied;
  no faith's claim to a place is ranked above another's. Contested present-day status (Jerusalem) is stated as the
  articles state it, each side's position attributed, in one or two sentences. No depiction of Muhammad is described.
- **Founding legends** are legends ("according to tradition Romulus founded …"), and the archaeology is given beside
  them when the articles give it.
- **Names.** Use the name of the time ("Byzantium", then "Constantinople", then "Istanbul"; "Dadu", "Khanbaliq",
  "Beijing"), saying when and why it changed if the articles do. A land or city is never "discovered" by an outsider
  when people lived there.
- **Population figures** only as the articles give them, with the year and the hedge.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Baghdad",                      the name you were given, exactly
 "region": "Islamic Caliphates & Middle East",   as given
 "start": 762, "end": null,              whole years (BCE negative). start: the founding the articles accept (a
                                         foundation date, or the earliest settlement they date); end: null if people
                                         live there today, under whatever name; else the year the articles give for
                                         its end as a city (Babylon, Tenochtitlan, Chang'an)
 "circa": false, "endCirca": false,      true where a year is approximate or traditional
 "info": "One sentence of 25-40 words: what the city is, where, when it was founded, and what it has been.",
 "facts": {
   "founded": "when and by whom, as the articles put it, legend marked as legend",
   "where": "where it stands: the river, coast or plain, the region and the present-day country",
   "known": "what it is known for in history, a list of 4-8 separated by semicolons",
   "today": "what it is now: its present name and standing, in one plain sentence without figures 'as of' a year"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],     three sentences that carry the city's history
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["762", "One sentence."], …],    6-8 key events in date order, from the founding to the last great change;
        the date as the articles give it, never more than four digits and never "years ago" ("1258", "c. 1200 BCE",
        "8th century"); no day-first dates here; no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "origins": "<p>the site and its founding: the land and water, who settled or founded it and why, the legends and
               what archaeology shows, its first form</p>",
   "growth":  "<p>how it grew and when it stood highest: its periods of greatest size, wealth or importance, what
               was built, how many lived there, what it traded and made</p>",
   "rulers":  "<p>who ruled it, in order: the states, dynasties and conquerors that held it, when it was a capital
               and of what, how it changed hands</p>",
   "life":    "<p>life in the city: its peoples, quarters, faiths and languages, markets and crafts, schools and
               learning, water and food, how the city was laid out and governed</p>",
   "crises":  "<p>sieges, sacks, plagues, fires, earthquakes and declines: what happened, when, at whose hands, with
               the articles' figures, and how the city recovered or did not</p>",
   "legacy":  "<p>what it left and what it is: its place in memory, law, religion, art and learning; what survives of
               the old city; what the place is today</p>"
 },
 "summary": "Two or three sentences (250-450 characters).",
 "references": [],                   leave empty: the editor takes the references from the article's own lists
 "notes": ["for the editor: doubts, conflicting dates, where the two articles disagree, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

Before you finish, count: six sections of 1,100-1,600 characters each (count the text without tags); 6-8 events in date
order; three takeaways. Validate the JSON
(`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the counts and
your doubts, and list any fact you wanted to include but could not find in the articles.
