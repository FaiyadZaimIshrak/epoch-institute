# Writing a "great life" profile for The Epoch Institute

A great-life profile is about one person of history: Ashoka, Cleopatra, Ibn Khaldun, Lincoln. You write one JSON file
per person, ONLY from the source you are given: the saved English Wikipedia article (`wp/<slug>.txt`; the first line
is the URL). Do NOT use the web or your memory for facts. Every claim will be checked against that file by an editor;
a fact that is not in it is left out. Dates, numbers and names exactly as the article gives them; where the article
hedges ("probably", "according to tradition", "historians disagree"), you hedge too.

## Voice
A general academic register about the person and their time, as an encyclopaedia or a serious history writes. Plain
sentences, no hype ("genius", "legendary", "visionary", "greatest" only inside a judgement the article attributes to
someone), no "the article says", no "this profile". A life is told with its harm as well as its achievements, in the
article's own measure: conquests are told with their dead and enslaved where the article gives them, laws and wars
with those who suffered under them, and a person's critics are given their arguments, attributed. Do not praise or
condemn in your own voice; let the attributed judgements stand. Where the sources are late, partisan or legendary
(ancient biographers, court chronicles, an enemy's account), say whose account it is. Religious figures and beliefs
are described as their followers hold them and as scholars study them. Use the names the article uses, in full at
first mention; give a person's own name beside a title or epithet where the article does.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Ashoka",                       the name you were given, exactly
 "region": "South & Southeast Asia",     as given
 "start": -304, "end": -232,             whole years (BCE negative): birth and death as the article gives them
 "circa": true, "endCirca": false,       true where that year is approximate or disputed
 "info": "One sentence of 25-40 words: who the person was, when and where, and why they are remembered.",
 "facts": {
   "born": "date and place of birth as the article gives them, with the family or house in a few words",
   "died": "date, place and manner of death as the article gives them",
   "role": "what they were: titles and offices held, with their years",
   "known": "what they are known for, a list of 4-8 separated by semicolons"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],   three sentences that carry the life
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["356 BCE", "One sentence."], …],  5-8 key events of the life in date order; date as the article gives it,
        never more than four digits ("1853", "c. 268 BCE", "1790s"); no day-first dates; no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "early":     "<p>birth, family, upbringing and education, and the world they were born into</p>",
   "rise":      "<p>how they came to power, office or prominence: the steps, allies and rivals, with dates</p>",
   "deeds":     "<p>what they did at their height: rule, wars, laws, works, ideas or discoveries, with dates and figures</p>",
   "opponents": "<p>who opposed them and why; failures, cruelties and controversies; what critics then and since have
                 argued, each attributed as the article attributes it</p>",
   "last":      "<p>the last years: decline, defeat, exile or old age; death and its circumstances; the succession</p>",
   "legacy":    "<p>what followed from the life: institutions, borders, ideas, works; how later ages have remembered,
                 used and disputed the person; how historians assess them</p>"
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
