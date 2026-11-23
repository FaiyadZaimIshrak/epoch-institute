# Your job: one great-life profile

You are writing one profile of a person's life for a history website. Your message names the **slug**, the **name** and
the **region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/lives4`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/LIVES-GUIDE.md`.
   It gives the voice, the six sections, the facts and the file's exact shape. Follow it to the letter.
2. Read one finished profile as a model of length and tone:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/isaac-newton.json` (a thinker) or
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/catherine-the-great.json` (a ruler).
3. Read your ONLY source, in the work folder: `wp/<slug>.txt` (the person's own Wikipedia article, saved as text).
   Nothing from memory, nothing from the web. A fact that is not in that file is left out, however well known.
4. Write the profile with the Write tool (never a shell heredoc) to `out/<slug>.json` in the work folder, with
   `"name"` and `"region"` exactly as given. Leave `"references"` as an empty list: the editor fills it.
5. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js life \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/lives4/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/lives4/wp" 2>&1 | grep -A40 "== <slug>"
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
   - a verdict of your own on the person, or between scholars who disagree: report who holds what. Praise and blame
     are their authors': "X called him …", "critics such as Y argued …";
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "defense", "honor");
   - rankings and polls ("greatest", "most influential", "voted"), prizes listed for their own sake, films, games and
     songs about the person, "as of" a year;
   - key events: 6 to 8, in date order, each label a year (at most four digits), never a day first; the first is the
     birth or the first dated act, the last is the death or the last great change after it.
7. `start` is the birth year and `end` the death year, `circa` / `endCirca` true where the article hedges. A ruler
   whose birth year is unknown takes the first year the article gives for the life (an accession), and the "born" fact
   says so.
8. Hard points:
   - **Harm told in the article's measure.** Wars, conquests, executions, famines, slavery, persecution and repression
     in which the person had a part are said plainly, with the article's figures and whose estimate they are; never
     softened, never enlarged. A slaveholder is called one where the article does (Jefferson).
   - **Critics and opponents** get their own section in their own words, attributed.
   - **Disputed or late sources** (Socrates known through Plato and Xenophon; ancient kings through later chronicles)
     are named as such.
   - **Political figures of the modern age** (Lenin, Marx, Sukarno, Lumumba, Ambedkar, King): what they did and what
     followed, each side's judgement attributed; no verdict on any present government, party or movement.
   - **Faith:** what a tradition holds about a person (a saint, a reformer) is attributed to it; no faith is ranked.
   - **Indigenous and colonised peoples** (Sitting Bull, Truganini, Yaa Asantewaa): their own names and nations as the
     article gives them; colonial violence named plainly; no people described as vanished unless the article says so
     and it is true of the people, and where the article corrects such a claim, follow the correction.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the person.
- Past tense for the past. No praise words. Never say more than the article does.
- Where the article contradicts itself, leave the point out and say so in `notes`.
- Edit only your own file `out/<slug>.json`. Do not touch anything inside
  `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; and a short list of the places the editor should
read first: disputed dates and figures, anything the article contradicts itself on, garbled passages you left out.

Keep the final message short: at most 120 words, as a plain list. Put the fuller detail in the file's `notes`.
