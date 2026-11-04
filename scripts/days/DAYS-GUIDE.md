# Today in History: writing events

Each day page of The Epoch Institute lists events that happened on that day of the year. You write new events, one
for each candidate in your batch, ONLY from the material given: the event's line from Wikipedia's "On this day", the
saved Wikipedia article of its main subject (or its lead), the leads of the event's other pages, and the passage that
states the day and the year (the candidate was kept because one of them gives both). Never from memory or the web.

## A batch line (tab-separated)

    day (MM-DD)  year (BCE negative)  main article title  "On this day" line  other pages  the passage that dates it
    the file the passage is in

The main article is saved as `<articles dir>/<day>_<year>.txt` and the other pages' leads as `<day>_<year>~1.txt`, `~2`
... (the batch brief names the folder). Read the main article and the file that dates the event; write the event that
the dated passage describes.

## An event (JSON)

    {"day": "01-04", "year": 1493, "title": "...", "description": "...", "links": [["slug", "label"], ...],
     "profile": ["Name", "/empire/slug"], "source": "<main article title>"}

- title: a headline in the present tense, 30-75 characters, naming who and what ("Columbus leaves Hispaniola for
  Spain", "Hōjō Tokimune's fleet drives off the Mongol invasion"). No date in it.
- description: two sentences, 150-260 characters, past tense: what happened, then why it mattered or what followed,
  as the article says. Plain and exact; no praise words ("famous", "great", "legendary"), no "on this day".
- Every fact must be in the article (or the On this day line). Numbers, names and places only as the article gives
  them. Where the article hedges ("according to", "traditionally", "possibly"), keep the hedge.
- Violence is named plainly (a massacre is a massacre) but without detail beyond what the event needs.
- links (optional): encyclopedia entries the event names, as [slug, label]. An entry is a line of encyclopedia-data.js
  (`{slug:"…",name:"…",type:"…"`); search it (do not read the whole file). Only an entry that is the same thing
  (not a namesake), at most four.
- profile (optional): the state where the event happened or whose ruler or army acted, if it has a profile alive that
  year: `node scripts/days/profiles-alive.js <year> [word]` lists them with their addresses. Leave it out when unsure.
- If the article does not support a clear event for that day and year, write {"day": …, "year": …, "skip": "why"}.

## Output

A JSON array, the batch's order, to the file your brief names. Validate it with node; check every title and
description length. Then run `node scripts/days/check-events.js <your file> <articles dir>` and fix every flagged
number or name that the article does not contain, or explain it in a notes file. Report how many you wrote and skipped.
