# The inventions tree: drafting a new node

The Epoch Institute's inventions tree (/inventions) shows inventions and discoveries in eleven lanes, each a card
linked to the things it built on. Every node is also an encyclopedia entry. For each candidate in your batch you write
BOTH the entry and the tree row, ONLY from its saved English Wikipedia article (`<wp dir>/<slug>.txt`; the first lines
give its URL and title). Never from memory or the web. The editor checks every number and name against that file.

## The entry
As scripts/entries/ENTRIES-GUIDE.md says (read its Voice section and its fields): slug (given), name, type (an
invention, technique or device is usually "work" with subtype "artifact", "infrastructure" or "other"; a discovery or
a body of knowledge "idea" with subtype "concept"; a crop or food "term" with subtype ""), subtype, aka, dates (the
year or period of the first firm evidence, four digits at most, "c. 3500 BCE", "1830s", "1876"), desc (3 to 5
sentences, 380-700 characters: what it is, where and when it first appears, who made or improved it, and what it led
to, with the article's own dates and numbers). The name is the thing's usual English name ("Wheelbarrow", "Morse
code", "Portland cement"), without a bracket.

## The tree row
- label: the card's name, at most 28 characters ("Wheelbarrow", "Hot-air balloon").
- cat: the lane given in your brief (tools, farming, building, transport, weapons, writing, science, chemistry,
  medicine, energy, communication); you may move it to another lane if the article plainly says it belongs there:
  say why in notes.
- year: a number, the year of the EARLIEST FIRM EVIDENCE the article accepts (BCE negative). Not a claim the article
  calls legendary, speculative or disputed: put that in "contested" instead. circa: 1 when the article hedges the date
  ("about", "c.", a range), else 0.
- date: the date as the card shows it ("c. 100 BCE", "1st century CE", "1876", "by 1088"); four-digit years at most.
- place: where that earliest evidence is, as exact as the article allows ("Sichuan, China", "Lyon, France").
- civ: the states or peoples credited, ONLY where the article supports it: a profile name exactly as in
  shared-data.js EMPIRES (`node scripts/days/profiles-alive.js <year> [word]` lists the profiles alive that year,
  e.g. "Han Dynasty", "Abbasid Caliphate", "United Kingdom of Great Britain and Ireland") or an entry slug; [] when
  unsure or when the inventor worked for no state in particular.
- people: the inventors or discoverers the article names: entry slugs where an entry exists (search encyclopedia-data.js
  for `name:"..."` with grep; never read it whole), else "=Full Name".
- also: independent origins the article names, ["place|date", ...]; else [].
- built: the slugs of EARLIER nodes it built on, from the node list in your brief (data in nodes.tsv: slug, label,
  lane, year) or other candidates of the whole release (cands.tsv), only where the article says so or the dependence
  is plain (a lithium-ion battery built on the electric battery; a tractor on the internal combustion engine). Every
  parent must be dated no later than the node. Usually 1 to 3; [] when none fits.
- contested: one or two sentences where the article reports an earlier claim, a dispute over credit, or another
  origin story; else "".
- source: the Wikipedia article's title.

## Output
A JSON array in the batch's order, each item:

    {"entry": {"slug": "...", "name": "...", "type": "...", "subtype": "...", "aka": [], "dates": "...", "desc": "..."},
     "row": {"label": "...", "cat": "...", "year": -100, "circa": 1, "date": "...", "place": "...", "civ": [],
             "people": [], "also": [], "built": [], "contested": "", "source": "..."},
     "notes": "..."}

or {"slug": "...", "skip": "why"} when the article is about something else or cannot date a first appearance.
Then run `node scripts/inventions/check-inventions.js <your file> <wp dir>` and fix every flag (a number or name not in
the article, a parent dated later, an unknown profile, entry or lane), or explain it in notes. Report what you wrote
and skipped.
