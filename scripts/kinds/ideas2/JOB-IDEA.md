# Your job: one profile of an ideology

You are writing one profile of a political or social ideology for a history website. Your message names the **slug**,
the **name** and the **region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/ideas2`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/IDEOLOGIES-GUIDE.md`.
   It gives the voice, the six sections (origins, ideas, spread, power, critiques, legacy), the facts (thinkers, texts,
   ideas, today) and the file's exact shape. Follow it to the letter.
2. Read one finished profile as a model of length, tone and shape:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/liberalism.json` or
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/maoism.json`.
3. Read your ONLY source, in the work folder: `wp/<slug>.txt` (the ideology's own Wikipedia article, saved as text).
   Nothing from memory, nothing from the web. A fact that is not in that file is left out, however well known.
4. Write the profile with the Write tool (never a shell heredoc) to `out/<slug>.json` in the work folder, with
   `"name"` and `"region"` exactly as given. Leave `"references"` as an empty list: the editor fills it.
5. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js ideology \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/ideas2/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/ideas2/wp" 2>&1 | grep -A40 "== <slug>"
   ```
   It flags missing keys, lengths, praise words, events out of order, and every number or name it cannot find in the
   article. Go through each flag: fix what is wrong; a flag that is a false alarm (a number the article writes in
   words, a name it spells with an accent, a word that only starts a sentence) may stay, and you list it in your report.
6. Read your own text once more for these faults, which the checker cannot see:
   - a sentence that speaks of its source ("the article says", "the account gives", "is described as", "is given as",
     "in one place", "the lead says", "no figure is given"); a claim that something is "not recorded" or "unknown"
     unless the article itself says so;
   - a figure chosen where the article gives several, or a range tidied;
   - a claim stronger than the article's ("all" for "most", "the first" for "one of the first");
   - a verdict of your own on the ideology, or between scholars who disagree: report who holds what. Praise and blame
     are their authors': "X called it …", "critics such as Y argued …";
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "defense", "honor", "labor");
   - rankings and polls, "as of" a year;
   - key events: 5 to 8, in date order, each label a year (at most four digits), never a day or month first.
7. `start` is the year the ideology took shape as the article dates it (a founding text, a first party, the coining of
   the word where the article ties the idea to it), `circa` true where the article hedges. `end` is null where it is
   still held today; an ideology the article treats as ended (a regime's doctrine that fell with it) has its end year.
8. Hard points:
   - **The record in power, as the article tells it.** Repression, purges, famines, camps, wars and genocides are named
     plainly with the article's figures and whose estimates they are; never softened, never enlarged (Nazism and the
     Holocaust, Stalinism, Marxism–Leninism, Juche, Ba'athism, Social Darwinism and eugenics, manifest destiny and the
     removal of Native peoples, antisemitism and its persecutions). Victims are named as the article names them.
   - **Ideologies of hatred** (Nazism, antisemitism, Social Darwinism): describe the ideas as claims their holders
     made, never in the ideology's own voice as if true; say plainly where the article says a claim is false or
     pseudoscientific. No slogans or slurs quoted beyond what is needed to name the idea.
   - **Critics' arguments are theirs**, attributed; so are defenders'. Where scholars dispute a definition (populism,
     neoliberalism, totalitarian readings), give the positions with their holders.
   - **Living ideologies and present politics:** what parties and states did up to the recent past, as facts; no
     verdict on any present government, party, leader or movement, no forecasts.
   - **Religion-linked ideologies** (pan-Islamism, Christian democracy, secularism, Gandhism): beliefs attributed to
     their holders; no faith is ranked.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the subject.
- Past tense for the past. No praise words. Never say more than the article does.
- Where the article contradicts itself, leave the point out and say so in `notes`.
- Edit only your own file `out/<slug>.json`. Do not touch anything inside
  `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; and a short list of the places the editor should
read first: disputed dates and figures, anything the article contradicts itself on, garbled passages you left out.

Keep the final message short: at most 120 words, as a plain list. Put the fuller detail in the file's `notes`.
