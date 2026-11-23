# Your job: the stops of one journey

You turn ONE saved Wikipedia article into the stops of one historical journey, for a page of a history website that
draws the route stop by stop on a globe. Your message names the **slug**.

Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/journeys2`

1. Read the brief in full: `JOURNEYS-GUIDE.md` in the work folder. It gives the file's exact shape, the rules for
   stops, dates, quotations and tone. Follow it to the letter.
2. Read one finished journey as a model:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/journeys/magellan.json`.
3. Read your ONLY source: `wp/<slug>.txt` in the work folder, all of it. Nothing from memory, nothing from the web.
4. **The test.** A journey belongs on the globe only if the article itself gives the route: at least SIX places in
   the order of travel, each with something that happened there (a date, a meeting, a fight, a death, a turning
   back). If the article is a biography that names only where the traveller was born and died, or gives the journey in
   a paragraph without places, or you would have to supply the route from what you know, do not write a journey.
   Write instead, with the Write tool, `out/<slug>.json` holding only
   `{"slug": "<slug>", "skip": true, "why": "one or two sentences"}` and report that.
   When the article is a person's biography with several journeys, tell the one journey (or the legs of the one great
   journey) the article gives best, and say which in `notes`.
5. Otherwise write `out/<slug>.json` with the Write tool (never a shell heredoc). 6 to 24 stops in all (the brief says 8;
   six or seven are enough when each is a real stage of the journey with its own event).
   - `entry`: search `places.tsv` (entry slug TAB name) for every stop, also under other spellings. Never a namesake.
   - `wp`: the title of the place's own English Wikipedia article. It must be a place with a point on the map: a
     town, a fort, an island, a cape, a bay, a pass, a mountain, a mission station. NOT a river (a river's article
     gives its source or mouth, not the crossing), a sea, a desert, a region or a country. For a river crossing or a
     landing on a coast, name the nearest town, fort or cape the article names; if it names none, leave the stop out
     and say so in `notes`.
   - `quote`: copied exactly from the article, with the place's name in it or right beside it.
6. Check it (Git Bash):
   ```
   cd "C:/Users/OMEN 16/AppData/Local/epoch-tools/journeys2"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" \
     "C:/Users/OMEN 16/Documents/epoch-institute/scripts/journeys/src/check-journeys.js" . \
     "C:/Users/OMEN 16/Documents/epoch-institute" <slug>
   ```
   (Do NOT add `--points`: the editor runs that.) It flags a quotation not found word for word, a place not named near
   its quotation, a year that is not in the article, stops out of order, texts too short or long, praise words,
   dashes, BC/AD, "discovered". Fix every flag that is a fault; a flag that is a false alarm may stay, listed in your
   report.
7. Read your own texts once more for these faults, which the checker cannot see:
   - a sentence that speaks of its source ("the article says", "is described as", "is given as", "no date is
     given"); say the thing itself, or attribute it to the witness the article names ("according to Pigafetta");
   - a fact that is not in the quotation or the article's lines beside it;
   - a claim stronger than the article's; a figure chosen where the article gives several;
   - a summing-up moral, a rhetorical question, "would later";
   - month-first dates, American spelling ("-ize", "color", "center", "harbor", "defense").

## Rules that matter most
- Only what the article states. A stop whose place or event you know but the article does not give is left out.
- Violence, enslavement, forced removal and conquest are told plainly where the article tells them: who did what to
  whom, with the article's figures and whose estimates they are. Peoples have their own names. No land is
  "discovered" where people lived: "reached", "sighted", "landed at".
- Edit only your own file `out/<slug>.json`. Nothing inside `C:/Users/OMEN 16/Documents/epoch-institute` (read only).

## Your final message (under 100 words)
The slug; journey or skip (and why); legs and stops; whether the checker is clean and the flags you left; the two or
three places the editor should read first (doubtful stops, places you could not name on the map, dates the article
contradicts itself on). Everything else goes in the file's `notes`.
