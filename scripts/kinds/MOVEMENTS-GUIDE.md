# Writing a movement profile for The Epoch Institute

A movement profile is about a movement, a reform or a revolution: a body of people pursuing shared aims over time
(Chartism, the Meiji Restoration, Négritude, the Arab Spring). You write one JSON file per movement, ONLY from the source
you are given: its saved English Wikipedia article (`wp/<file>.txt`; the first line is the URL). Do NOT use the web or
your memory for facts. Every claim will be checked against that file by an editor; a fact that is not in it is left out.
Dates, numbers and names exactly as the article gives them; where the article hedges, you hedge too.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes. Plain sentences, no
hype, no "the article says", no "this profile". Describe aims as the movement's members stated them and outcomes as the
article reports them; give critics' and supporters' views as theirs, with names where the article names them. On
contested modern subjects (Zionism and the Palestinians, the Arab Spring) give each side's view as the article does,
neutrally, without taking a side, and name violence, repression and displacement plainly as the article names them. Use
the names the article uses, in full at first mention (the encyclopedia links entries by exact names).

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Chartism",                     the name you were given, exactly
 "region": "Europe",                     as given
 "start": 1838, "end": 1857,             whole years, negative = BCE; end null for a movement active today
 "circa": false, "endCirca": false,      true where a year is approximate; endCirca false when end is null
 "info": "One sentence of 25-40 words: what the movement was, where and when, and what it sought or achieved.",
 "facts": {
   "where": "the countries, cities and regions where it acted",
   "period": "its phases with their dates",
   "figures": "its leading figures, with a word on each where the article gives one",
   "outcome": "what came of it, as the article reports"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["1838", "One sentence."], …],    5-8 key events in date order; date as the article gives it, never more than
        four digits and never "years ago" ("1848", "c. 1550", "1960s", "18th century"); no day-first dates;
        no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "background": "<p>the conditions and ideas it grew out of</p>",
   "aims":       "<p>what it sought, its programme, its ideas and arguments</p>",
   "events":     "<p>the course of events: campaigns, risings, congresses, splits, repression, with dates</p>",
   "people":     "<p>its leaders, thinkers, artists and ordinary members, and their roles</p>",
   "outcomes":   "<p>what it achieved or failed to achieve, and why, as the article explains</p>",
   "legacy":     "<p>its influence afterwards, how it is remembered and debated, what continues today</p>"
 },
 "summary": "Two or three sentences (250-450 characters).",
 "references": ["Author, Title (Publisher, year)", …],   3-6 real works copied from the ARTICLE's reference lists,
        bibliography or further reading; [] if it names none
 "notes": ["for the editor: doubts, conflicting dates, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

Before you finish, count: six sections of 1,100-1,600 characters each; 5-8 events in date order; three takeaways;
3-6 references copied from the article. Validate the JSON
(`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the counts and
your doubts, and list any fact you wanted to include but could not find in the article.
