# Your job: one profile of a movement

You are writing one profile of a historical movement for a history website. Your message names the **slug**, the
**name** and the **region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/moves3`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/MOVEMENTS-GUIDE.md`.
   It gives the voice, the six sections (background, aims, events, people, outcomes, legacy), the facts (where,
   period, figures, outcome) and the file's exact shape. Follow it to the letter.
2. Read one finished profile as a model of length, tone and shape:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/chartism.json` or
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/tanzimat.json`.
3. Read your ONLY source, in the work folder: `wp/<slug>.txt` (the movement's own Wikipedia article, saved as text).
   Nothing from memory, nothing from the web. A fact that is not in that file is left out, however well known.
4. Write the profile with the Write tool (never a shell heredoc) to `out/<slug>.json` in the work folder, with
   `"name"` and `"region"` exactly as given. Leave `"references"` as an empty list: the editor fills it.
5. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js movement \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/moves3/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/moves3/wp" 2>&1 | grep -A40 "== <slug>"
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
   - a verdict of your own on the movement, or between scholars who disagree: report who holds what. Praise and blame
     are their authors': "X called it …", "critics such as Y argued …";
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "defense", "honor");
   - rankings and polls, films, games and songs about the movement, "as of" a year;
   - key events: 5 to 8, in date order, each label a year (at most four digits), never a day or month first.
7. `start` is the year the movement began and `end` the year it ended, `circa` / `endCirca` true where the article
   hedges. A movement that still exists (a church, a living tradition, an organisation still at work) has `"end": null`
   and is written in the present tense where it speaks of today. The `period` fact says the same in words.
8. Hard points:
   - **Violence told in the article's measure.** Killings, executions, massacres, detention camps, torture and
     repression, by the movement or against it, are said plainly with the article's figures and whose estimate they
     are; never softened, never enlarged (the Mau Mau rebellion, the Hussite wars, the Donghak rising, the March First
     Movement).
   - **Opponents and critics** in their own words, attributed; a movement's failures and divisions as the article
     tells them.
   - **Religious movements** (Quakers, Puritans, Hussites, Wahhabism, the Brahmo Samaj, the Haskalah, the Ghost Dance,
     the Great Awakening, liberation theology): what members believe is attributed to them; no faith is ranked;
     names a group uses for itself come first, and a name its opponents gave it is said to be that.
   - **Indigenous and colonised peoples** (the Ghost Dance, the American Indian Movement, the Māori King movement, the
     Mau movement, Mau Mau): their own names and nations as the article gives them; colonial violence named plainly;
     living peoples and movements in the present tense. Ceremonies are described only as far as the article does.
   - **Contested modern subjects:** each side's view as the article gives it, attributed; no verdict on any present
     government, party or movement.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the subject.
- Past tense for the past. No praise words. Never say more than the article does.
- Where the article contradicts itself, leave the point out and say so in `notes`.
- If the article is too thin to fill six sections honestly (under about 900 words of history), write nothing and report
  "skip" with the reason.
- Edit only your own file `out/<slug>.json`. Do not touch anything inside
  `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; and a short list of the places the editor should
read first: disputed dates and figures, anything the article contradicts itself on, garbled passages you left out.

Keep the final message short: at most 120 words, as a plain list. Put the fuller detail in the file's `notes`.
