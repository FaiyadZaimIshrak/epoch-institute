# Your job: one HELD battle plan, tried again with a second source

You are writing one "battle plan" scenario file for a history website. Your message names the **slug**.
This battle was tried once and HELD BACK: its first article did not say where one side stood, so the writer had
placed that side by judgement. A second source has now been saved beside the first. Your task is to find out,
honestly, whether the sources together now state the deployment, and only then to write the plan.

Work folder (Git Bash paths): `C:/Users/OMEN 16/AppData/Local/epoch-tools/held3`
The repository `C:/Users/OMEN 16/Documents/epoch-institute` is READ ONLY: never write inside it.

1. Read the brief in full: `BATTLE-MAPS-GUIDE.md` in the work folder.
2. Read two model plans: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/battles/battle-of-cannae.json` and
   `.../scripts/battles/battle-of-hastings.json`.
3. Read the held attempt, `scen/<slug>.json`. Its `"note"` (or `"skip"`) says exactly what the first article did
   not give. That is the gap you must close from the sources, or else report as still open.
4. Read your ONLY source, all of it: `k/held3/wp/<slug>.txt`. It is several saved Wikipedia articles joined, parted
   by lines of `==========`: the first English article, then the new ones. Some are in another language (Japanese,
   Spanish, Russian, Chinese): read them in that language. Nothing from memory, nothing from the web.
5. **The test, strictly.** Write the plan only if the sources STATE, for BOTH sides, how each was drawn up or where
   it stood on named ground or in a stated direction or stated relation to the enemy ("on the left wing", "south of
   the road", "facing Ukita's troops", "attacked from the west"), AND give at least three movements in order.
   - Where two accounts in the sources differ, follow ONE named account throughout, say in `"note"` which, and that
     others differ. Do not mix accounts to fill gaps.
   - If the sources themselves say the order of battle or the site is unknown or debated so that one side would
     still stand where YOU chose, the answer is still "held". That is a good answer; do not strain.
   - A formation the sources do not place is left off the plan and named in the note, never placed by guess.
6. If it passes, write `out/<slug>.json` with the Write tool (never a shell heredoc):
   `"slug": "<slug>"`, the `"name"` of the held attempt, `"article": "held3/wp/<slug>"`, up to fourteen phases, one
   per movement the sources tell in order (never padded).
   - Every piece of ground, formation and phase needs a `"quote"` copied EXACTLY from the source, in the source's
     own language (a Japanese, Spanish, Russian or Chinese quotation is fine and is checked word for word; at
     least five words, or for Japanese and Chinese at least five space-separated tokens are NOT needed: if the
     checker complains only of the five-word length of a Japanese or Chinese quotation, list it as a false alarm).
   - Names in the texts are written in their usual English form (as the English article writes them).
   If it does not pass, write `out/<slug>.json` holding only
   `{"slug": "<slug>", "hold": true, "why": "two or three sentences: what the sources still do not state"}`.
7. Check and look (from the work folder):
   ```
   N="C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe"
   export EPOCH_PW="C:\\Users\\OMEN 16\\AppData\\Local\\epoch-tools\\pw"
   R="C:/Users/OMEN 16/Documents/epoch-institute"
   "$N" "$R/scripts/battles/check-battle-maps.js" out k <slug>
   "$N" "$R/scripts/battles/sheet.js" out <slug> --out=out/sheets --compact    # writes out/sheets/<slug>-compact.png
   ```
   Repeat until the checker says `clean` (apart from false alarms about a name or number that stands in a
   foreign-language part of the source in another spelling or script: list each of those in your report with the
   foreign words that support it) AND the sheet, opened with the Read tool, reads well: in every phase the picture
   shows what its text tells, no formation on top of another, names legible.

## Rules that matter most
- Only what the sources state. Nothing from your own knowledge of the battle, however well known it is.
- Past tense, plain words, no praise words, BCE/CE, day-first dates, British spelling, no dashes as punctuation.
- The texts never speak of their source ("the article", "the accounts say"); the `"note"` says "the accounts".
- A part that breaks off is a formation of its own; the parent stays where it was.
- Edit only your own file in `out/`.

## Your final message
The slug; `clean` or `hold` (with the reason); for a clean plan: for EACH side, the exact source words (with an
English translation if foreign) that place it; which account you followed; every false alarm of the checker with its
support; anything you were unsure of.
