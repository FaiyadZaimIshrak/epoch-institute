# Your job: one HELD journey, tried again with a second source

You turn saved Wikipedia articles into the stops of one historical journey, for a page of a history website that
draws the route stop by stop on a globe. Your message names the **slug**.
This journey was tried once and HELD BACK because its article gave the route too thinly (an order of stops that was
inferred, years that were placeholders, a key meeting without a place). A second source is now saved beside the
first. Find out honestly whether the sources together now give the route; only then write the journey.

Work folder (Git Bash paths): `C:/Users/OMEN 16/AppData/Local/epoch-tools/held3/jr`
The repository `C:/Users/OMEN 16/Documents/epoch-institute` is READ ONLY: never write inside it.

1. Read the brief in full: `JOURNEYS-GUIDE.md` in the work folder.
2. Read one finished journey as a model:
   `C:/Users/OMEN 16/Documents/epoch-institute/scripts/journeys/magellan.json`.
3. Read the held attempt `held/<slug>.json`; its `"notes"` say what was inferred or missing.
4. Read your ONLY source, all of it: `wp/<slug>.txt`: the first article, then the new ones, parted by lines of
   `==========`. One may be in French: read it in French. Nothing from memory, nothing from the web.
5. **The test, strictly.** At least SIX places IN AN ORDER THE SOURCES STATE, each with something that happened
   there. An order you would have to infer means the stop is left out. A year the sources do not give for a stop is
   `null` for both `date` and `year` (the stop then shows no date): never a placeholder, never a year inferred from
   the surrounding story unless the same sentence or the section's heading gives it. If fewer than six stops remain,
   write `out/<slug>.json` holding only `{"slug": "<slug>", "hold": true, "why": "two or three sentences"}`.
6. Otherwise write `out/<slug>.json` with the Write tool (never a shell heredoc), 6 to 24 stops.
   - `entry`: search `places.tsv` (entry slug TAB name) for every stop, also under other spellings. Never a namesake.
   - `wp`: the title of the place's own English Wikipedia article: a town, fort, island, cape, bay, pass, mountain or
     station with a point on the map. NOT a river, sea, desert, region or country.
   - `quote`: copied exactly from the source (French stays French), with the place's name in it or right beside it.
   - Each stop's text 12 to 50 words, past tense, and it never speaks of its source.
7. Check it:
   ```
   cd "C:/Users/OMEN 16/AppData/Local/epoch-tools/held3/jr"
   "C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe" \
     "C:/Users/OMEN 16/Documents/epoch-institute/scripts/journeys/src/check-journeys.js" . \
     "C:/Users/OMEN 16/Documents/epoch-institute" <slug>
   ```
   (No `--points`.) Fix every flag that is a fault; list false alarms in your report.

## Rules that matter most
- Only what the sources state. Plain words, no praise, no "discovered", BCE/CE, day-first dates, British spelling,
  no dashes as punctuation. Where scholars disagree on the route, the intro or ending says so in a sentence.
- Edit only your own file in `out/`.

## Your final message
The slug; `clean` or `hold` (with the reason); the number of stops; for every stop the words of the source that give
its PLACE IN THE ORDER; stops with null dates; false alarms; anything you were unsure of.
