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
