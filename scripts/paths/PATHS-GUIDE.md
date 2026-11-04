# Reading paths: writing a path

A reading path at The Epoch Institute is a themed route of 6 to 10 stops through the site's own pages: profiles (of
states and empires, religions, languages, cultures, movements, forms of government and ideologies) and encyclopedia
entries. Each stop carries one sentence saying why it is on the path. Readers follow a path stop by stop, so the order
matters (usually by time, sometimes by argument), and the reasons should build a story.

## What a path holds (JSON)

    {"slug": "the-mongol-world", "title": "The Mongol World", "tagline": "…",
     "types": ["strategist", "navigator"], "eras": ["medieval"], "intro": "…",
     "steps": [{"href": "/empire/mongol-empire", "why": "…"}, …]}

- slug: lower case with hyphens. title: 2-6 words. tagline: one sentence of 8-16 words, what the path follows.
- types: the reader types it suits (1-3 of strategist, navigator, thinker, chronicler, builder, timekeeper: war and
  power; trade, travel and maps; ideas, faith and science; stories and people; buildings, cities and institutions;
  the long view across ages). eras: the ages it covers, main one first (ancient = to 500 CE, medieval = 500-1500,
  earlymodern = 1500-1800, modern = 1800 on).
- intro: 3-5 sentences, 400-750 characters, setting out the theme and what the stops show, in the site's plain academic
  voice (no praise words, no "journey", no "fascinating").
- steps: 6-10 stops, each a page that exists, each "why" one sentence of 80-190 characters.

## The one rule

Every "why" and every fact of the intro must rest on the stop pages themselves. Read each stop before you write it:

    node scripts/paths/stop.js /empire/mongol-empire /encyclopedia/genghis-khan
    node scripts/paths/stop.js --find mongol        (finds stops by a word in their names, with their addresses)

The tool prints a profile's teaser, its three takeaways and key events, or an entry's description. Write the "why"
from that text: numbers, names and dates only as the page gives them. Never from memory.

## Good paths

- Mix profiles and entries; 3-6 profiles per path is usual. Prefer stops with pictures and well-known subjects.
- Do not repeat an existing path (reading-paths.js lists them: `grep -o 'title:"[^"]*"' reading-paths.js`); a stop may
  appear on other paths.
- Spread the world: each path in your brief has its own region or theme; keep to it.

## Output

A JSON array of your paths to the file your brief names; validate it with node. Then run
`node scripts/paths/make-paths.js <your file>` (without --write): it must report 0 faults (unknown stops, lengths,
types). Report the paths you wrote with their stop counts.
