# Who Said It?: finding quotations

The daily game shows five quotations, each with four portraits to choose from; the answer names the work, the
translation and the source. You find quotations and write them as ROWS of scripts/quote-sources.tsv. You never type a
quotation: a row names a public web page and the words that START and END the quotation, and
scripts/fetch-quotes.ps1 copies exactly what lies between them from that page. Your rows go into your own file; the
editor reads them and appends them.

## A row (tab-separated, one a line)

    speaker <TAB> url <TAB> "start phrase".."end phrase" <TAB> work <TAB> credit <TAB> note

- speaker: the slug of a PERSON entry in encyclopedia-data.js (one entry a line, `{slug:"…",name:"…",type:"person",
  dates:"…",…,img:"…"}`) that has `dates` and an `img`, and is not listed in scripts/no-portrait.tsv. Check with
  `node scripts/quotes/check-speakers.js <slug> …`.
- url: the page that holds the text. Prefer Project Gutenberg (`https://www.gutenberg.org/cache/epub/<n>/pg<n>-images.html`),
  the Avalon Project, Fordham's Internet History Sourcebooks, presidential libraries and archives; Wikisource
  (en.wikisource.org) is fine but answers slowly when asked often.
- "start".."end": the first words and the last words of the quotation, copied exactly from the page as the script reads
  it. Find them with `powershell -ExecutionPolicy Bypass -File scripts\fetch-quotes.ps1 -Peek <url> -Find word1,word2`
  (prints the page's cleaned paragraphs that hold a word, with numbers). The quotation must lie inside one paragraph.
- work: the work and the place in it ("Meditations, book 2", "Speech at the Hyphasis (Arrian, Anabasis, book 5)",
  "Letter to his son, 1756").
- credit: "tr. <translator>, <year of that translation>" or "original" for words first written in English.
- note (optional): how the words reach us or who speaks them, shown with the answer: "spoken by Hamlet", "Plutarch's
  account", "as William Wirt reconstructed it", "the allegory of the cave; Socrates is the speaker in the dialogue".

## What may be used

- Words first published in English before 1930; translations published before 1930 with the translator named; works of
  the US federal government. Nothing under copyright, no modern translation, no paraphrase.
- 5 to 45 words. The script adds "…" where a quotation starts or ends inside a sentence.
- Never a word of the speaker's own name (or another name of theirs) inside the quotation: the script refuses it.
- Words the speaker wrote or is recorded as saying. Words that reach us through someone else stay, with the note saying
  so (Thucydides' Pericles, Plutarch's Caesar). Leave out retellings pieced together much later (Tecumseh's "Sell a
  country", 1912) and lines chiefly about contempt for a people.
- A good quotation is worth reading for its own sake and says something of its speaker: a principle, a famous line,
  a vivid sentence. Not a list, not a table, not a formula of greeting.
- It must not give its speaker away at a glance (no "I, Cyrus, king of the world"), but naming the speaker's city or
  age is fine: the wrong answers are people of the same age.

## Test your rows

`powershell -ExecutionPolicy Bypass -File scripts\fetch-quotes.ps1 -Test <your.tsv>` imports your rows and prints each
quotation with its checks, writing nothing. Fix every row it refuses (start or end not found, too long, a name inside),
and read every quotation it prints: it must be what you meant, whole and sensible.

## Output

Your rows in your file (no header), then report: how many rows, how many speakers (new to the game and already in it),
and anything the editor should know (a doubtful attribution, a note you are unsure of).
