# Your job: one great-work profile

You are writing one great-work profile (a text, a monument or a work of art that has lasted) for a history website.
Your message names the **slug**, the **name** and the **region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/works4`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/WORKS-GUIDE.md`.
   It gives the voice, the six sections, the facts and the file's exact shape. Follow it to the letter.
2. Read one finished profile as a model of length and tone: for a monument or a work of art
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/colosseum.json`, for a text
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/aeneid.json`.
3. Read your ONLY source, in the work folder: `wp/<slug>.txt` (the work's own Wikipedia article, saved as text).
   Nothing from memory, nothing from the web. A fact that is not in that file is left out, however well known.
4. Write the profile with the Write tool (never a shell heredoc) to `out/<slug>.json` in the work folder, with
   `"name"` and `"region"` exactly as given. Leave `"references"` as an empty list: the editor fills it.
5. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js work \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/works4/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/works4/wp" 2>&1 | grep -A40 "== <slug>"
   ```
   It flags missing keys, lengths, praise words, events out of order, and every number or name it cannot find in the
   article. Go through each flag: fix what is wrong; a flag that is a false alarm (a number the article writes in
   words, a name it spells with an accent, a word that only starts a sentence) may stay, and you list it in your report.
6. Read your own text once more for these faults, which the checker cannot see:
   - a sentence that speaks of its source ("the article says", "the account gives", "is described as", "is given as",
     "in one place", "the lead says", "no figure is given"); a claim that something is "not recorded" or "unknown"
     unless the article itself says so;
   - a figure chosen where the article gives several, or a range tidied;
   - a claim stronger than the article's ("destroyed" for "damaged", "all" for "most", "the first" for "one of the
     first");
   - a verdict of your own on the work's worth, or between scholars who disagree: report who holds what;
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "defense");
   - anything about tourism, visitor numbers, rankings, ticketing, "as of" a year, or films and games that use the work;
   - key events: 5 to 8, in date order, each label a year or a century with at most four digits (write "c. 9500 BCE",
     "3rd millennium BCE" as the guide shows), never a day first, never "years ago"; the last event is the last great
     change in the work's history (a restoration, a rediscovery, a listing), not this year's news.
7. `start` is the year the article gives for the making (the beginning of building, the composition, the first
   printing); `circa` true where the article hedges. `end` is null for a work that survives (a text still read, a
   building still standing, even as a ruin that is visited); a work that was destroyed and is gone has the year it ended.
8. Hard points:
   - **Authorship and dating** exactly as the article hedges them ("attributed to", "traditionally", "scholars date").
   - **Sacred texts and holy places:** what the tradition holds is attributed to it, and what scholars conclude to them;
     no faith is ranked above another. No likeness of Muhammad is described.
   - **Removal, looting and restitution** (the Benin Bronzes, the Ishtar Gate in Berlin, finds taken to museums abroad):
     told as the article tells it, each side's position attributed. A place its own people always knew is never
     "discovered" by a visitor: "brought to wider attention", or what the article supports.
   - **Forced labour, slavery, conquest** in the making of a work: said plainly, in the article's measure and with its
     figures and whose estimate they are.
   - **Political texts** (a manifesto, a declaration): what it says and what it led to, the criticisms as their
     authors'; no verdict on present governments or parties.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the work.
- Past tense for the past. No praise words. Never say more than the article does.
- Where the article contradicts itself, leave the point out and say so in `notes`.
- Edit only your own file `out/<slug>.json`. Do not touch anything inside
  `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; and a short list of the places the editor should
read first: disputed dates and figures, anything the article contradicts itself on, garbled passages you left out.
