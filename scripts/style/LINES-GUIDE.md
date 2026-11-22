# Fixing single sentences that read as stock prose

Each batch file `scripts/style/lines/in-N.json` is a list of `{ "id", "text", "hits" }`. `text` is a piece of the site
(an encyclopedia entry's description, one section of a profile, one field of a state's history, a day's event, a song's
story). It is accurate and mostly plain. `hits` are the stock words found in it: "renowned", "at the heart of",
"fostered", "played a leading role", "cornerstone of", "paved the way", "lasting legacy", "remarkable", "intricate",
"boasted", "pivotal" and the like.

Write `scripts/style/lines/out-N.json`: the same list, same ids, same order, each `text` with ONLY the sentences that
hold a hit reworded. Everything else in the text stays byte for byte, including markup such as `[[e:slug|words]]`,
`<p>` tags and line breaks. Drop the `hits` key or keep it; nothing else is added but `literal` (below).

## How to reword
- Say the plain thing. "a renowned centre of learning" → "a centre of learning known across the Islamic world" only if
  the text says so; otherwise "a centre of learning". "played a leading role in" → "led" or "helped to" as the facts
  allow. "fostered trade" → "encouraged trade". "at the heart of the kingdom" → "in the centre of the kingdom" or "the
  kingdom's core". "boasted three harbours" → "had three harbours". "paved the way for" → "made possible", "led to",
  "was followed by" (choose what the text supports). "a cornerstone of" → "the basis of", "central to".
  "left a lasting legacy in X" → say what remained, if the text names it, else cut the phrase.
- If the sentence only praises or sums up and the paragraph loses no fact without it, shorten it to its fact.
- No new fact, number, name, cause or judgement. Every number and proper name of the text stays. Quotations stay
  letter for letter. No dash (— or –) as punctuation in a sentence you touch; year ranges keep theirs.
- British spelling, academic register, no contractions. Do not replace one stock word with another (no "notable",
  "significant", "key", "vital", "crucial", "vibrant", "rich", "iconic", "celebrated" as fillers).
- A hit that is meant literally stays, and you list it: `"literal": ["tapestry"]` for a real tapestry, a legend that
  is legendary, an "intricate" carving the text describes as such in a craft sense, "foster" children, a writer who
  "boasts" in an inscription (that is what inscriptions do). Use this sparingly and only for the literal case.
- Texts in which nothing needs to change are returned unchanged.

Do the work by reading each text; do not write a script that swaps words.

## Check
`export PATH="$LOCALAPPDATA/epoch-tools/node:$PATH"; cd "/c/Users/OMEN 16/Documents/epoch-institute"; node scripts/style/lines.js check scripts/style/lines`
checks every out file present (other writers' too: look only at ids from your batch). Fix every fault on your ids.
Write the out file with the Write tool (valid UTF-8 JSON), never with a shell heredoc.

# The round of November 2026: also structure and phrasing, and nothing removed
In this round `hits` may also name a habit of build or a slip of phrasing, by a label:
`s: closing moral`, `s: legacy endures`, `s: more than a`, `s: not just … but`, `s: from X to Y opener`,
`s: summing-up opener`, `s: colon-led claim`, `s: rhetorical question`, `s: it was X that`, `s: whether … or`,
`s: three sentences open alike`, `s: sentences of one length`, `p: doubled word`, `p: a before a vowel`,
`p: an before a consonant`, `p: lower-case sentence start`, `p: dangling opener`, `p: comprised of`,
`p: less with a count`, `p: stray punctuation`, `p: unbalanced bracket`, `p: unbalanced quotation mark`.
- For an `s:` label reword the sentence (or, for the last two, vary two or three sentences of the text) so that the
  habit is gone. For a `p:` label correct the slip and nothing else.
- NOTHING IS REMOVED (the owner's rule for this round). A sentence that only sums up is reworded to say its concrete
  point from the same text, or joined to its neighbour; it is never deleted. The checker refuses a text under 95% of
  its length (85% under 800 characters).
- While you are in a sentence, also set right any incorrect phrasing you see in it: a wrong article, a verb that does
  not agree, a tense that switches, a dangling opener, a pronoun with no referent, "between … to", "less" for "fewer".
- The facts are not yours to check or change: no number, name, date or claim is corrected, added or dropped.
- A label that is a false alarm (a proper name read as a slip, a quotation, a title) is listed in `literal` and the
  text returned unchanged.

## What the pilot of 22 November taught
- "One of the most …", "notably" and "X showed that …" are ordinary prose and are no longer sent to you. If you meet
  them in a sentence you are rewording for another reason, leave them as they are.
- Never put a filler in a stock word's place: no "a major", "a leading", "an important", "a significant", "a key".
  If the plain sentence needs no adjective, give it none.
- An interpretation stays an interpretation. "The campaign showed the limits of Persian power" must not become the
  flat claim "Persian power was limited": keep the verb of judging (showed, suggests, is seen as) and its subject.
- `s: sentences of one length`: the text's sentences all run to about the same length. Change the rhythm of two or
  three of them: join two that belong together with "and", "but", "while" or a semicolon; split one long sentence at its
  natural break; open one with its time or place instead of its subject. Do not touch the facts, their order within a
  paragraph, or the paragraph breaks, and do not rewrite sentences that already differ.
- `s: three sentences open alike`: three or four sentences in a row start with the same word. Change the opening of
  one or two (name the person once, begin with the date or the place, join two sentences).
- `s: legacy endures`: "its legacy endures", "its memory lives on". Say what remains, from the same text ("its law
  code is still cited", "the name survives in the province"), or join the clause to the fact it follows.
- You may apply your own hand-written replacements with a small script, as long as every replacement was written by
  you for that sentence; the output must still be the whole list.
