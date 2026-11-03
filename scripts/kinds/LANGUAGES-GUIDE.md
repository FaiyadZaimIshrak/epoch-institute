# Writing a language profile for The Epoch Institute

You write one JSON file per language, ONLY from the source you are given: its saved English Wikipedia article
(`wp/<file>.txt`; the first line is the URL). Do NOT use the web or your memory for facts. Every claim will be checked
against that file by an editor; a fact that is not in it is left out. Dates, numbers, names and examples of words exactly
as the article gives them; where the article hedges, you hedge too.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes, for a reader who is
not a linguist: explain a technical term the first time (an abugida, a case, a vowel harmony) in a few plain words, and
give one or two of the article's own example words where they make a point clear (in the article's spelling and
transliteration). No hype, no "the article says", no "this profile". A language is the story of its speakers: who spoke
and wrote it, where and when, what they wrote in it, how it changed and what came of it. Conquest, colonial rule and the
suppression of a language are named plainly as the article names them. A living language is written in the present
tense. Use the names the article uses, in full at first mention.

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Old English",                 the name you were given, exactly
 "region": "Europe",                    as given
 "start": 450, "end": 1150,             whole years, negative = BCE, the span of the language as the article gives it;
                                        end null for a language spoken today
 "circa": true, "endCirca": true,       circa true when the year is approximate; endCirca false when end is null
 "info": "One sentence of 25-40 words: what the language is, who spoke it, where and when, and what it is known for.",
 "facts": {
   "family": "its family and branch, as the article gives them",
   "script": "how it was or is written, with dates",
   "earliest": "its earliest records, with dates and the names of the inscriptions or texts",
   "status": "extinct (and its descendants) or living (speakers today with the article's figure and year, where official)"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["c. 450", "One sentence."], …],    5-8 key events in date order; date as the article gives it, never more
        than four digits and never "years ago" or "BP" ("c. 700", "1066", "9th century", "2nd millennium BCE");
        no day-first dates; no full stop at the end
 "sections": {                       six sections, each 1,100-1,600 characters of text, as two or three <p>…</p>
   "origins":    "<p>where the language came from: its family, its ancestor, its first speakers and first records</p>",
   "structure":  "<p>sounds, script and grammar, explained plainly with the article's examples</p>",
   "speakers":   "<p>who spoke it, where, how many, and how it spread or retreated, with dates</p>",
   "literature": "<p>what was written in it: the great works, laws, scriptures, inscriptions, scholars and schools</p>",
   "change":     "<p>its periods and dialects, how it changed, what languages descend from it or replaced it</p>",
   "legacy":     "<p>its words in other languages, its revival or survival, its study, its speakers today</p>"
 },
 "summary": "Two or three sentences (250-450 characters).",
 "references": ["Author, Title (Publisher, year)", …],   3-6 real works copied from the ARTICLE's reference lists,
        bibliography or further reading; [] if it names none
 "notes": ["for the editor: doubts, conflicting dates or figures, what you left out and why"]
}
```
No other keys. Every string plain text except the sections' <p> tags.

Before you finish, count: six sections of 1,100-1,600 characters each; 5-8 events in date order; three takeaways;
3-6 references copied from the article. Validate the JSON
(`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the counts and
your doubts, and list any fact you wanted to include but could not find in the article.
