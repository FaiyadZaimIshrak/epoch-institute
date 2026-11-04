# History Connections: proposing groups

You propose groups of four for the daily History Connections puzzle (sixteen tiles, four groups of four, one
puzzle a day). The editor assembles the puzzles from your proposals with scripts/conn/assemble.js, after
scripts/conn/verify-proposals.js has checked every tile. Write only from the encyclopedia: every tile is an entry of
encyclopedia-data.js (one entry a line: `{slug:"…",name:"…",type:"…",dates:"…",desc:"…"}`), and every tile carries a
quotation from ITS OWN entry (name, dates or description) that proves it belongs to the group. Never from memory.

## A group

- A name the reader sees after solving it: short, plain, exact ("Mughal emperors", "Founded by Phoenicians",
  "Born in 1813", "Sieges of Vienna", "Gulf of ___"). No jokes, no "Things that …" padding.
- SIX candidate tiles (the editor keeps four), each `{label, slug, quote}`:
  - label: what the tile shows, short (1-3 words; "Bolívar", "Thermopylae", "Mehmed II"). A label must not give the
    group away: for "Battles of the Napoleonic Wars" write "Austerlitz", not "Battle of Austerlitz".
  - slug: the entry's slug, exactly as in encyclopedia-data.js.
  - quote: words copied EXACTLY from that entry's name, dates or desc (at least 4 words, or the dates field whole) that
    show the tile belongs. For a year group the quote must contain the year.
- level 1-4: 1 = a category most readers know at once (Greek gods, Wonders of the World); 2 = a known category that
  needs some knowledge (Silk Road cities, Tudor monarchs); 3 = specialist (Khans of the Golden Horde, Kings of
  Assyria); 4 = the hardest: a shared year ("All in 1848", "Born in 1813", "Died in 1616"), wordplay on the labels
  ("Gulf of ___", "Hidden animals"), or a sharp, surprising link.
- kind: "plain", "year" (the tiles share a year: born, died, founded, fought, signed in it), or "wordplay" (the
  labels share a word pattern; the link is in the words, but each tile is still a real entry).
- note: optional, one line for the editor (a doubt, a decoy).

## What makes a good group

- Every tile is something a curious reader could have met: prefer entries with a picture or with several profiles
  naming them (the `empires` list). Avoid obscure tiles: the verifier prints a weight; aim for the well known.
- The group is TRUE of all six candidates by their entries, and not true of a well-known thing it leaves out in a
  way that would make the puzzle unfair.
- Decoys welcome across groups (Beethoven: a composer, but also born in 1770), but say so in the note.
- Spread the world and the ages: Africa, the Americas, South, East and Southeast Asia, the Islamic world, the steppe,
  Oceania and Europe; antiquity to the 20th century. Not more than a third of your groups on Europe.
- Kinds: rulers of one dynasty, battles of one war, cities of one trade or empire, works of one kind, inventions,
  religions and their founders, explorers, treaties, revolutions, capitals, rivers, peoples, scripts, titles,
  buildings of one style or city, women rulers, things named after people …
- No grim themes for their own sake (no "Massacres", "Executed by beheading"); wars and battles are fine.
- Never repeat a group already published (the list of published names is given in your brief); a new angle on a
  published theme (other members) is fine if the name differs clearly.
- A year group needs four tiles whose entries state that year for the same thing (born, died, founded …): say which
  in the name ("Born in 1564", not "1564").

## Output

A JSON array of groups: `{"name": "...", "level": 2, "kind": "plain", "tiles": [{"label": "...", "slug": "...",
"quote": "..."}, ... six ...], "note": "..."}`. Validate it with node, then run
`node scripts/conn/verify-proposals.js <your file>` and fix every FAIL line (a quote not found, an unknown slug, a
published name) before you report. Report how many groups you wrote, by level and kind.
