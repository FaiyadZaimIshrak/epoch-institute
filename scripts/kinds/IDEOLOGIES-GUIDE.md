# Writing an ideology profile for The Epoch Institute

An ideology profile is about a body of political or economic ideas and the movements and states it shaped: liberalism,
fascism, Legalism, Kemalism. You write one JSON file per ideology, ONLY from the source you are given: its saved English
Wikipedia article (`wp/<file>.txt`; the first line is the URL). Do NOT use the web or your memory for facts. Every claim
will be checked against that file by an editor; a fact that is not in it is left out. Dates, numbers and names exactly as
the article gives them; where the article hedges, you hedge too.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes. Plain sentences, no
hype, no "the article says", no "this profile". Never argue for or against the ideology: state its ideas as its thinkers
put them ("liberals hold …", "in Mussolini's formulation …"), and give critics' arguments as theirs, with names where the
article names them. Its record in power is told as the article tells it: what was built and achieved, and the
repression, wars, famines, massacres and genocides carried out in its name, named plainly with the article's figures and
attributions (for example the Holocaust under Nazism, the famine of the Great Leap Forward under Mao). Where the article
says the meaning of the word is contested, or that scholars disagree on a definition, say so. Present-day parties and
politicians only as facts the article states, never as judgements. Use the names the article uses, in full at first
mention.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Liberalism",                   the name you were given, exactly
 "region": "Europe",                     as given (where it first arose)
 "start": 1689, "end": null,             whole years: the start where the article places its origin (a founding text,
                                         a first use of the name, a first movement); end null if it has living
                                         adherents or parties, else the year the article gives for its end
 "circa": true, "endCirca": false,       true where a year is approximate; endCirca false when end is null
 "info": "One sentence of 25-40 words: what the ideology holds, where and when it arose, and what it shaped.",
 "facts": {
   "thinkers": "its founding and leading thinkers, with a word on each",
   "texts": "its key texts with their authors and years, as the article gives them",
   "ideas": "its core ideas, a list of 4-8 separated by semicolons",
   "today": "where it stands today: parties, states or movements that claim it, as the article reports"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["1689", "One sentence."], …],     5-8 key events in date order; date as the article gives it, never more than
        four digits and never "years ago" ("1848", "c. 1550", "1920s", "4th century BCE"); no day-first dates;
        no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "origins":      "<p>where and how it arose: the conditions, the earlier ideas, the first thinkers and texts</p>",
   "ideas":        "<p>what it holds: its principles, its view of the individual, society, state and economy</p>",
   "spread":       "<p>how it spread across countries and centuries, its schools and variants, with dates</p>",
   "power":        "<p>its record in power: the states, parties and movements that applied it, and what they did</p>",
   "critiques":    "<p>the main criticisms, by whom, and the debates within and about it</p>",
   "legacy":       "<p>its influence afterwards, how it is studied and remembered, where it stands today</p>"
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
