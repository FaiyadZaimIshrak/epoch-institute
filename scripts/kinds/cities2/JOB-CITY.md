# Your job: one city profile

You are writing one city profile for a history website. Your message names the **slug**, the **name** and the
**region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/cities2`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/CITIES-GUIDE.md`.
   It gives the voice, the six sections, the facts and the file's exact shape. Follow it to the letter.
2. Read one finished profile as a model of length and tone:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/cities1/out/samarkand.json`.
3. Read your ONLY sources, in the work folder: `wp/<slug>.txt` (the city's own article) and, if the file exists,
   `wp/<slug>-history.txt` (its "History of …" article). If `wp/<slug>-history.txt` does not exist or holds another
   subject, use the city's own article alone. Nothing from memory, nothing from the web. A fact that is in neither
   file is left out.
4. Write the profile with the Write tool (never a shell heredoc) to `out/<slug>.json` in the work folder, with
   `"name"` and `"region"` exactly as given. Leave `"references"` as an empty list: the editor fills it.
5. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js city \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/cities2/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/cities2/wpc" 2>&1 | grep -A40 "== <slug>"
   ```
   (`wpc/<slug>.txt` holds both articles joined, for the checker.) It flags missing keys, lengths, praise words,
   events out of order, and every number or name it cannot find in the articles. Go through each flag: fix what is
   wrong; a flag that is a false alarm (a number the article writes in words, a name it spells with an accent, a word
   that only starts a sentence) may stay, and you list it in your report.
6. Read your own text once more for these faults, which the checker cannot see:
   - a sentence that speaks of its source ("the article says", "the account gives", "is described as", "is given as",
     "in one place", "the lead says", "no figure is given"); a claim that something is "not recorded" or "unknown"
     unless the article itself says so;
   - a figure chosen where the articles give several, or a range tidied;
   - a claim stronger than the article's ("destroyed" for "damaged", "all" for "most");
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "defense");
   - anything about tourism, rankings, sports, airports, the present government, or "as of" a year;
   - key events: 6 to 8, in date order, each label a year or a century with at most four digits, never a day first,
     never "years ago"; the last event is the last great change, not this year's news.
7. A city that is a ruin or a site today (Pompeii, Persepolis, Nineveh, Mohenjo-daro, Copán): `end` is the year the
   articles give for its end as a city, and "today" says what the place is now. A city holy to a faith (Medina,
   Varanasi, Lhasa, Anuradhapura, Kairouan): what the tradition holds is attributed to it; no depiction of Muhammad
   is described; no faith is ranked above another.

## Rules that matter most
- Only what the articles state. Nothing from your own knowledge of the city.
- Past tense for the past. No praise words. Never say more than the articles do.
- Where the two articles disagree, leave the point out and say so in `notes`.
- Edit only your own file `out/<slug>.json`. Do not touch anything inside
  `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; and a short list of the places the editor should
read first: disputed dates and figures, anything the two articles contradict each other on, garbled passages you left
out.
