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

## Sacred lives (founders, prophets and saints: Jesus, Muhammad, the Buddha, Moses and the like; Nov 2026)
Millions of readers hold these lives holy, and historians study them. Write so that both a believer and a historian
would call the page fair.
- **Two voices, each attributed.** What the tradition holds ("the Gospels say", "Muslim tradition holds", "the Pali
  texts relate", "according to the Book of Exodus") and what historians assess ("most scholars date", "historians
  generally accept", "scholars disagree whether"). Never state a miracle or a revelation as plain fact, and never deny
  it: say who tells it. Never write "allegedly", "supposedly", "myth" or "legend" in your own voice for what a faith
  holds; use the article's own attributed wording.
- **Dates and existence.** Keep every hedge of the article ("c.", "traditionally", "disputed"). Where scholars doubt
  that a figure lived as told (the article will say so), say it plainly once, attributed, and go on telling the life as
  the tradition tells it. Set "circa" and "endCirca" true where the years are traditional or approximate.
- **No ranking of faiths.** Do not call one religion truer, older, purer or more tolerant than another, and do not
  compare founders in worth. Honorifics ("peace be upon him", "Lord", "Saint") are left out of running text unless they
  are part of a name the article uses.
- **The sections, read for a sacred life.** "rise": the call, the first teaching, the first followers. "deeds": the
  teaching and the acts of the ministry or mission, as the sources tell them. "opponents": who opposed them in their
  lifetime and why, as the tradition and the historians tell it, then the later debates among scholars about the
  sources; no polemic of one faith against another, and no insult repeated. "last": the last days as each tradition
  tells them, with the differences between traditions named (the crucifixion in the Gospels and in the Qur'an, for
  instance, where the article gives both). "legacy": the faith and its branches, the texts, how the figure is seen in
  other religions.
- **facts.** "died" gives the end as the traditions tell it, attributed, where they differ. "role" says what the
  followers hold the person to be and, in a few words, how historians describe them.
- **Pictures are not your concern**, but do not describe a likeness or portrait of Muhammad or Ali.

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
 "references": [],   leave this empty: the saved articles keep their reference headings but not the lists, and the
        editor fills it from the article's own bibliography (scripts/kinds/article-refs.js)
 "notes": ["for the editor: doubts, conflicting dates, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

Before you finish, count: six sections of 1,100-1,600 characters each; 5-8 events in date order; three takeaways.
Validate the JSON
(`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the counts and
your doubts, and list any fact you wanted to include but could not find in the article.
