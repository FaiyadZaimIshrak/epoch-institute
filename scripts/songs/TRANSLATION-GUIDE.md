# Translating and romanizing a song for The Epoch Institute

You are given the original words of a song in the public domain (texts/<slug>.json, part "orig": stanzas of lines,
imported from Wikisource, Wikipedia or Project Gutenberg). You write two things, line by line:

1. **en**: an English translation of every line.
2. **rom**: a romanization of every line, if the original is not written in the Latin alphabet.

## Rules

- **Your own translation, from the text in front of you.** Never reproduce a published English translation from
  memory, not even a famous one: many are still in copyright. Translate each line yourself, plainly and faithfully.
- **Literal before beautiful.** Keep the sense, the images and the order of the original. No rhyme, no added
  words, no smoothing over what is strange, harsh or archaic. A word you cannot be sure of gets [?] after it; a
  phrase whose sense is disputed gets a note.
- **Same shape.** Exactly as many stanzas and lines as the original, in the same order. A refrain repeated in the
  original is translated again where it stands. A line that is only a label or a repeat sign ("&c.") is kept as it is.
- **Archaic and dialect texts in English** (Scots, Middle English, minstrel dialect): "en" is a modern English
  rendering of each line, with the same shape.
- **Romanization by a named scheme**, the same for the whole text:
  - Hebrew: SBL general-purpose; Arabic: ALA-LC (without dots under letters, with ʿ and ʾ);
  - Sanskrit, Bengali, Gujarati, Tamil: ISO 15919 (IAST for Sanskrit);
  - Greek (ancient): the classical transliteration (ph, th, ch, y for upsilon, long vowels with macrons);
  - Russian and Ukrainian: scientific transliteration;
  - Japanese: modified Hepburn; Korean: Revised Romanization; Chinese: pinyin with tone marks.
  Romanize what is written. Do not modernize the spelling.
- Names of people, places and gods stay as names (Savitr, Jordan, Maunawili), explained in a note if needed.

## Output (out-tr/<slug>.json)

```
{"slug": "...", "scheme": "ISO 15919" | null,
 "en": [["line", "line"], ["line"]],          // same stanzas and lines as orig
 "rom": [["line", "line"], ["line"]] | null,
 "notes": ["line 3.2: 'X' can also mean Y", ...]}
```

Before you finish, count: every stanza of en (and rom) must have the same number of lines as the matching stanza
of orig. Report the counts.
