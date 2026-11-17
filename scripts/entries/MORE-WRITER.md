# Your task as a writer in the campaign (read with MORE-GUIDE.md)

You write the longer texts ("told in more detail") for ONE batch of 20 encyclopedia entries of The Epoch Institute, a
history website, strictly from saved source articles. Your prompt names the wave folder and your batch file.

1. Read `MORE-GUIDE.md` (in this folder) completely and follow it exactly, above all its sections "The present day"
   and "Touch only your own files".
2. Your batch file (`batch-N.tsv` in the wave folder) lists slug TAB article title. For each slug read `wp\<slug>.txt`
   (the article, or its lead and the opening of each section) and `desc\<slug>.txt` (the entry as it stands; do not
   repeat it), then write `out\<slug>.json` in the guide's format (UTF-8, valid JSON).

What matters most:
- Every fact, number and proper name must be in the wp file. Nothing from memory or the web. Too little material:
  `{"slug": "…", "skip": "why"}`. Living person: `{"slug": "…", "skip": "living person"}`. If the article is about a
  different subject than the entry (a namesake, a broader thing, the modern country for a historical region), skip and
  say so.
- 260-420 words in all (aim for 380; do not draft long and trim), two or three sections, headings only from the guide's
  list (never "Death and legacy" unless the person's death is told: use "Legacy" then; "Reign" only for a monarch, "In office" for a
  president, prime minister or party leader), each paragraph 40-110 words. No doubled punctuation ("U.S..", ",,") and
  not the bare words "undefined" or "NaN": the site's crawl reads them as slips.
- Recent events are history too: tell them like any other, dated and in the past tense up to the last date the
  article gives, each side's claims attributed. But no assessment of present governments or leaders, no rankings or
  indices, nothing "as of". "The place today" is two to four sentences of lasting facts.
- Never mention your source in the text: no "the article", "the entry", "Wikipedia". State the matter directly;
  attribute a judgement to those who hold it ("historians", "tradition"). Do not add a hedge the article does not have.
- NEVER contradict the entry. Where the article gives a date, number or fact that differs from the entry's own
  description or dates (desc file), do not print either version: leave that point out of your text, or word it without
  the disputed figure ("in the 590s", "late in his reign"), and record both versions in "notes". Wikipedia has slips
  too (it had Augustine landing in Kent in 595; the entry's 597 was right), and a page must not disagree with itself.
  The same where the article contradicts itself.
- Dates day-first, BCE/CE, no hype words, plain prose, no lists or Markdown. Hedge where the article hedges.
- Edit ONLY the out files of your own 20 slugs, one at a time with your file tools. Never run a script over the whole
  out folder, and stop no process you did not start. If you write a helper script, name it after your wave and batch
  (`w09-b3-fix.js`): other writers share the scratch folder, and a script called `fix.js` has been overwritten by
  another writer's.

When all are written, check your batch and fix what is flagged, repeating until clean (never with --write):

    "C:\Users\OMEN 16\AppData\Local\epoch-tools\node\node.exe" "C:\Users\OMEN 16\Documents\epoch-institute\scripts\entries\check-more.js" "<wave folder>" --batch=batch-N.tsv

A flag about a name or number means it is not in the wp file: remove it or use what the file says.

Put doubts, and any place where the article disagrees with the entry's own description or dates, in each file's
"notes", not in your report. Final report, at most four lines: written / skipped (slugs and why) / flags left (slug:
flag) / anything that went wrong.
