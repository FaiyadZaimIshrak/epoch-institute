# Writing a great-work profile for The Epoch Institute

A great-work profile is about one text or monument that has lasted: the Epic of Gilgamesh, the Analects, the Parthenon,
Angkor Wat. You write one JSON file per work, ONLY from the source you are given: its saved English Wikipedia article
(`wp/<slug>.txt`; the first line is the URL). Do NOT use the web or your memory for facts. Every claim will be checked
against that file by an editor; a fact that is not in it is left out. Dates, numbers and names exactly as the article
gives them; where the article hedges ("probably", "traditionally attributed", "scholars disagree"), you hedge too.

## Voice
A general academic register about the work and its past, as an encyclopaedia or a serious history writes. Plain
sentences, no hype ("masterpiece", "breathtaking", "timeless", "iconic" only inside a quotation the article attributes),
no "the article says", no "this profile". Say what the work is and does, how and by whom it was made, how it was received,
how it survived, and what it led to. Authorship and dating that are traditional or disputed are given as such ("ascribed
by tradition to Vyasa", "Homer, whose existence is debated"). Sacred texts and sites are described as their believers
hold them ("which Hindus regard as …") and as scholars study them, never judged. Removals and lootings (the Parthenon
sculptures, looted manuscripts) are told as the article tells them, each side's position attributed. A place that local
people always knew is never "discovered" by a later visitor: write "brought to international attention" or what the
article supports. Use the names the article uses, in full at first mention.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Parthenon",                    the name you were given, exactly
 "region": "Europe",                     as given (where it was made)
 "start": -447, "end": null,             whole years (BCE negative): start where the article places its making (the
                                         year building began, or the date of composition or of the oldest version);
                                         end null if it survives (a monument standing, a text read), else the year the
                                         article gives for its loss
 "circa": true, "endCirca": false,       true where a year is approximate; endCirca false when end is null
 "info": "One sentence of 25-40 words: what the work is, who made it, where and when, and why it matters.",
 "facts": {
   "made": "who made it: the author(s), patron, builders or tradition it comes from, with a word on each",
   "form": "what it is: language, metre and length for a text; material, size and plan for a monument",
   "where": "where it is now: the site, or the libraries and museums holding its manuscripts or pieces",
   "known": "what it is known for, a list of 4-8 separated by semicolons"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["c. 447 BCE", "One sentence."], …],  5-8 key events in date order; date as the article gives it, never more
        than four digits and never "years ago" ("1853", "c. 1200 BCE", "1910s", "6th century"); no day-first dates;
        no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "origins":   "<p>the world it came from: the time, place, patrons, earlier traditions and sources</p>",
   "content":   "<p>what it is: for a text its story, teachings or contents and its form; for a monument its plan,
                parts, decoration and purpose</p>",
   "making":    "<p>how it was made: composition, authorship, versions and editing; or design, builders, labour,
                materials and techniques, with dates</p>",
   "reception": "<p>how its own and later ages received and used it: readers, rulers, worshippers, translators,
                scholars, critics</p>",
   "survival":  "<p>how it came down to us: manuscripts, losses, damage, conversions, rediscovery, restoration, and
                disputes over it</p>",
   "legacy":    "<p>its influence afterwards on writing, art, building, belief and memory; how it stands today</p>"
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
