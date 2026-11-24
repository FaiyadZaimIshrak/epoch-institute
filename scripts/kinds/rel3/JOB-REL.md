# Your job: one religion profile and its faith map

You are writing one profile of a religion, and the data of its map, for a history website. Your message names the
**slug**, the **name** and the **region**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/rel3`

1. Read the brief in full: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/RELIGIONS-GUIDE.md`.
   It gives the voice, the sections, the facts, the JSON file's exact shape and the faith-map file's lines. Follow it to
   the letter, except where this page says otherwise.
2. Read one finished profile as a model of length, tone and shape:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/yazidism.json` (a living faith) or
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/src/mithraism.json` (an ended one).
   For the faith map, read the block that starts with the line `@manichaeism` (and one living faith, `@druze-faith`) in
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/faiths.tsv`, with the format notes at the top of that file.
3. Read your ONLY source, in the work folder: `wp/<slug>.txt` (the religion's own Wikipedia article, saved as text).
   Nothing from memory, nothing from the web. A fact that is not in that file is left out, however well known. The one
   exception is the latitude and longitude of a place the article names (to two decimals), for the faith map.
4. Write with the Write tool (never a shell heredoc) `out/<slug>.json` and `out/<slug>.faith.tsv` in the work folder,
   with `"name"` and `"region"` exactly as given and `@<slug>` as the map block's first line. Leave `"references"`
   as an empty list: the editor fills it.
5. Check the profile (Git Bash):
   ```
   cd "C:/Users/OMEN 16/Documents/epoch-institute"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" scripts/kinds/check-drafts.js religion \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/rel3/out" \
     "C:/Users/OMEN 16/AppData/Local/epoch-tools/rel3/wp" 2>&1 | grep -A40 "== <slug>"
   ```
   It flags missing keys, lengths, praise words, events out of order, and every number or name it cannot find in the
   article. Go through each flag: fix what is wrong; a false alarm (a number the article writes in words, a name it
   spells with an accent, a word that only starts a sentence) may stay, and you list it in your report.
6. Read your own text once more for these faults, which the checker cannot see:
   - a sentence that speaks of its source ("the article says", "is described as", "the lead says", "no figure is
     given"); a claim that something is "not recorded" or "unknown" unless the article itself says so;
   - a figure chosen where the article gives several, or a range tidied; a claim stronger than the article's;
   - a belief stated as plain fact: beliefs are their holders' ("Mandaeans hold that …", "In Aztec belief …"); a miracle
     or revelation is told as the tradition tells it, attributed, neither affirmed nor denied;
   - a ranking of faiths, a verdict on a faith's truth, the words "cult", "sect", "pagan", "primitive", "superstition"
     in your own voice (they may stand where the article reports that others used them, attributed);
   - a verdict between scholars who disagree: report who holds what;
   - a summing-up moral at a paragraph's end, a rhetorical question, a dash used as punctuation;
   - BC or AD, month-first dates, American spelling ("-ize", "color", "center", "honor");
   - key events: 5 to 8, in date order, each label a year (at most four digits), never a day or month first.
7. `start` is the year the religion began as the article dates it (a founding, a revelation, the first evidence),
   `circa` true where the article hedges. A living religion has `"end": null` and is written in the present tense where
   it speaks of today; an ended one has its end year (`endCirca` where hedged) and the past tense.
8. Hard points:
   - **Living faiths and peoples** (Rastafari, Candomblé, Santería, Mandaeism, Samaritanism, the Native American
     Church, Hawaiian and Akan and Serer religion, Korean shamanism): present tense, the names the community uses for
     itself first; a name outsiders gave is said to be that. Ceremonies are described only as far as the article does;
     nothing the article says is kept secret or restricted is detailed.
   - **Persecution and violence** against a faith or by its followers (the Albigensian Crusade and the Inquisition
     against the Cathars, the persecution of Ahmadis, of Jehovah's Witnesses under the Nazis, of Mandaeans in Iraq, of
     early Latter-day Saints; human sacrifice in Aztec, Maya and Inca religion; the suppression of Afro-American
     religions under slavery) is said plainly with the article's figures and whose they are; never softened, never
     enlarged, never lingered over.
   - **Disputes about a faith's standing** (whether Ahmadis are Muslims, whether Latter-day Saints or Jehovah's
     Witnesses are Christians, Gnosticism and the Church): each side's position as the article gives it, attributed;
     no verdict. Controversies of the present day are told as dated facts, briefly, with no verdict on any living
     community or leader.
   - **Ancient religions known from one side** (Gnosticism from its opponents and the Nag Hammadi texts, the Ājīvikas
     from Buddhist and Jain writers, Etruscan religion from Roman ones, Aztec, Maya and Inca religion largely from
     Spanish ones): say through whom they are known.
   - **The faith map:** only regions, places, routes and years the article supports. For a small or recent faith a few
     areas are enough (the guide's "6-14 areas" is an upper range, not a floor: give at least two areas, one origin
     mark and three notes). Every year lies inside the religion's start and end. Exactly one `origin` mark.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the subject.
- Never say more than the article does. No praise words.
- Where the article contradicts itself, leave the point out and say so in `notes`.
- If the article is too thin to fill the sections honestly, write nothing and report "skip" with the reason.
- Edit only your own two files. Do not touch anything inside `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message
The slug; whether the checker is clean; the flags you left and why; the counts of the map's areas, routes, marks and
notes; and a short list of the places the editor should read first.

Keep the final message short: at most 120 words, as a plain list. Put the fuller detail in the file's `notes`.
