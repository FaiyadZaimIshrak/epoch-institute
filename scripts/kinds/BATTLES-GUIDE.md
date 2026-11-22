# Writing a battle profile for The Epoch Institute

A battle profile tells one battle or siege in full: Kadesh, Cannae, Hattin, Waterloo, Stalingrad. You write one JSON
file per battle, ONLY from the source you are given: its saved English Wikipedia article (`wp/<slug>.txt`; the first
line is the URL). Do NOT use the web or your memory for facts. Every claim will be checked against that file by an
editor; a fact that is not in it is left out. Dates, numbers and names exactly as the article gives them; where the
article hedges ("modern estimates", "according to Herodotus", "figures are disputed"), you hedge too.

## Voice
A general academic register, as an encyclopaedia or a serious military history writes. Plain sentences in the past
tense. No hype and no relish: never "epic", "legendary", "glorious", "heroic", "brilliant", "masterstroke", "crushing",
"annihilated" (unless the article's own word for a force destroyed, and then say what was destroyed), "decisive" only
where the article calls the battle decisive and you say for what. No "the article says", no "this profile", no
rhetorical questions, no dashes used as punctuation, no summing-up morals. British spelling. BCE and CE. Dates day first
("18 June 1815").

- **Numbers are the heart of the page and the place most easily got wrong.** Give strengths and losses only as the
  article gives them, with its ranges and its attributions: "between 50,000 and 86,000 by modern estimates; ancient
  sources give 80,000". Never choose one figure where the article gives several, never round, never add up. Where
  ancient or partisan sources give figures that modern historians doubt, say both and who says which.
- **Both sides are told.** Who they were, who led them, what each wanted and what each could do. Neither side is "the
  enemy". Peoples and states by the names the article uses.
- **The dead, the wounded, prisoners and civilians** are told plainly where the article tells them: massacres of
  prisoners, the sack of a city, enslavement, starvation in a siege, with the article's figures and attributions.
  No softening and no gore.
- **Sources and doubt.** Every profile has a section on how the battle is known: the accounts that survive, who wrote
  them and for whom, what archaeology or records add, and what historians dispute (the site, the numbers, the course,
  whether it mattered as much as tradition says). A battle known only from one side's account (Kadesh from the Egyptian
  reliefs, Badr from the Islamic tradition) says so plainly.
- **Battles of religious history** (Badr, Hattin, Tours, the fall of Constantinople, Lepanto): told as history, what
  each tradition holds attributed to it; no divine help stated as plain fact and none denied; no faith or people made
  the hero or the villain. No depiction of Muhammad is described.
- **Modern battles** (Gettysburg, Stalingrad, Adwa): no verdict on present governments or nations; atrocities named
  with the article's figures and attributions.
- **"What if" is not history.** No speculation about what would have happened had the battle gone otherwise, unless
  the article reports a named historian's view, attributed.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Battle of Hastings",           the name you were given, exactly
 "region": "Europe",                     as given (where it was fought)
 "start": 1066, "end": 1066,             the year or years of the battle (BCE negative); a siege or a long battle
                                         may span two years (1942, 1943)
 "circa": false, "endCirca": false,      true only where the article itself gives the year as approximate
 "span": "14 October 1066",              the battle's date in words, as the article gives it, day first ("May 1274
                                         BCE", "23 August 1942 – 2 February 1943", "winter 208–209"); where the date is
                                         disputed, the form the article prefers, and the dispute goes in the text
 "info": "One sentence of 25-40 words: who fought whom, where and when, who won, and what followed from it.",
 "facts": {
   "date": "the date as in span, with a word on any dispute",
   "place": "where it was fought: the field, town or strait, the region and the present-day country; 'site disputed'
             where it is",
   "sides": "the two sides and their commanders, with the strengths the article gives and whose figures they are",
   "outcome": "who won and what the immediate result was, in one or two plain sentences"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["1066", "One sentence."], …],   5-8 key events in date order: what led to the battle, the battle, what
        followed; the date as the article gives it, never more than four digits ("1066", "c. 1274 BCE", "1942");
        no day-first dates here; no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "background": "<p>why it was fought: the war or dispute, what each side wanted, the campaign that brought the
                  armies or fleets to this place</p>",
   "forces":     "<p>the two sides: who they were, their commanders, numbers (with whose estimates), troops, ships
                  or weapons, their positions and plans before the fighting</p>",
   "course":     "<p>how it went, in order: the opening, the turns, the end; with times and places as the article
                  gives them</p>",
   "aftermath":  "<p>what followed at once: losses on each side (with whose figures), prisoners, the pursuit, the
                  fate of the commanders and of the town or people, the peace or the next campaign</p>",
   "sources":    "<p>how we know: the accounts and who wrote them, archaeology and records, and what historians
                  dispute about the site, the numbers, the course and the battle's weight</p>",
   "legacy":     "<p>what it changed and how it has been remembered: in the war and in the states concerned, in
                  later memory, monuments, art and national stories, with later reassessments attributed</p>"
 },
 "summary": "Two or three sentences (250-450 characters).",
 "references": [],                   leave empty: the editor takes the references from the article's own lists
 "notes": ["for the editor: doubts, conflicting figures, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

Before you finish, count: six sections of 1,100-1,600 characters each (count the text without tags); 5-8 events in date
order; three takeaways. Check that every number in your text stands in the article with the same hedge. Validate the
JSON (`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the counts and
your doubts, and list any fact you wanted to include but could not find in the article.
