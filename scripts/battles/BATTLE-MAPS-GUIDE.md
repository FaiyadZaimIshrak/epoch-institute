# Battle plans: the brief

You turn ONE saved article about a battle into a plan of the field in phases: where each formation stood and how it
moved. The plan is drawn on the battle's page under "How it was fought". You write a scenario file; a program draws it.

Read `scripts/battles/battle-of-ain-jalut.json` first: it is the model. `scripts/battles/battle-of-cannae.json` and `scripts/battles/battle-of-hastings.json`
show a pocket closing and a part of a line breaking off.

## 1. The test: can this battle be drawn?
A battle is drawn only if its article says BOTH:
- **how each side was drawn up or where it stood** (wings and centre, lines, or positions on named ground), and
- **at least three distinct movements in order** (an advance, a charge, a retreat, a flanking move, an encirclement …).

If it does not, write only `{"slug": "<slug>", "skip": "<one full sentence saying what the article lacks>"}` and stop.
A skip is a good answer. Never fill a gap from what you know from elsewhere.

## 2. Only what the article states
- Every piece of ground, every formation and every phase carries `"quote"`: words copied EXACTLY from the article
  (five words or more) that support it. The checker looks each quotation up word for word.
- No ground, formation, commander, number or movement that the article does not give. Not from memory, not from
  another article, not "as is well known".
- Where the article gives two accounts, follow the one it treats as the main one, and say in `"note"` that another
  account exists and what it differs on.
- Where the article describes a feature but not where it lay (a wood where troops hid, "nearby hills"), place it on
  the side that the story needs and say so in `"note"` ("… placed on their side of the field; the accounts do not
  say exactly where it lay"). Give such a feature a describing word as its name and `"unnamed": true`.

## 3. The plane
- 100 units wide, 62 high. `x` runs right, `y` runs DOWN. Keep every block at least 4 units inside the edges.
- North is up when the article lets you tell the directions (`"field": {"north": 0}`); otherwise `"north": null`.
- A place is `[x, y, facing]`. Facing in degrees: 0 = towards the top, 90 = right, 180 = bottom, 270 = left.
  A block is drawn `w` wide along its front and `d` deep; a block facing 90 or 270 therefore stands upright.
- Sizes: `w` 6 to 16 by rough strength (a wing 8 to 10, a main body 12 to 16), `d` 3. Two blocks never overlap; leave
  at least 1 unit between them. Opposing lines begin 12 to 20 apart.
- Each name is written behind its block (the side away from its front): leave about 6 units free there, and do not
  stack blocks closely one behind another.
- `"field": {"edges": [{"name": "to Baysan →", "at": [97, 58]}]}` names a place off the plan.
- `"field": {"ground": "sea"}` for a battle at sea (then land is drawn as `land` areas).
- A siege, or a battle of many days over a wide country, may be drawn at the scale of the whole operation: the
  formations are then armies, corps or fleets, the ground is cities, rivers and walls, and `"note"` says that the
  plan shows the operation, not a single field. The test of section 1 still holds.

## 4. Ground (`terrain`)
- Areas, as 5 to 9 points round the outline: `hill`, `ridge`, `mountain`, `wood`, `marsh`, `sea`, `lake`, `land`.
- Lines, as 3 to 6 points: `river`, `stream`, `road`, `wall`, `ditch`.
- Places, as one point: `town`, `village`, `fort`, `spring`, `bridge`, `ford`, `point`.
- `"name"` as the article writes it; `"lab": [x, y]` moves the name where it would sit under a block.
- Draw little: only ground the article names or describes as mattering to the fight.

## 5. Sides and formations
- `sides`: usually two, `{"id", "name"}`. Allies of a side share its colour: they are formations of that side.
- `units`: 4 to 12 formations in all. Each: `id`, `side`, `k`, `name` (at most 30 characters, what it is: "Roman
  right-wing cavalry"), `short` (at most 10 characters, for phones), `w`, `quote`.
- `k`: `infantry`, `spears`, `pikes`, `archers`, `light`, `cavalry`, `horse-archers`, `elephants`, `chariots`,
  `artillery`, `armour` (tanks and mechanised troops), `ships`, `guard` (a commander's own unit or a reserve), `camp`,
  `wagons`.
- `leader`: only where the article says who led that formation, written as the article writes the name.
  `leaderEntry`: leave out; the editor adds it.
- Group small units into the formations the article itself speaks of. Do not invent a subdivision to look precise.
- **A part that breaks off is a formation of its own.** When the article says that some of a formation left it (men who
  ran down in pursuit, a detachment sent round a flank, a rearguard left behind), give that part its own small block
  (`w` 4 to 6), named for what it is ("English pursuers"). It first stands in the phase where it leaves, beside its
  parent, and is `gone` when it is destroyed or rejoins. **The parent stays where it was.** Never move a whole line
  because part of it moved: a shield wall that "held" is on its hill in every phase.
- `leader` is one name, or two short ones, of at most 30 characters in all. If the article names more, give the first.
- Only fighting formations and their camps. No block for clergy, servants, onlookers or baggage that took no part.

## 6. Phases
Three to fourteen: one for every distinct movement the article tells in order (an attack, its repulse, a counter-attack,
a march round a flank, an arrival, a withdrawal, a commander's fall), and no more. A battle the article tells in four
movements has four phases; never pad, and never fold two movements the article tells one after the other into one phase
(the limit was seven until 24 Nov 2026, and many plans bundled). Each phase:
- `title`: at most 60 characters, no full stop. What happened, plainly ("The Roman centre pushes forward").
- `when`: only if the article gives it ("About midday", "2 August 216 BCE").
- `text`: one to three sentences, 110 to 340 characters, past tense. What moved and why it mattered to the fight.
- `quote`: the article's words for this phase.
- `at`: `{id: [x, y, facing]}` for the formations that move or turn in this phase. Phase 1 places every formation
  as it first stood; a formation that arrives later gets its first place in the phase where it arrives.
- `how`: `{id: "retreat" | "feint" | "rout"}` for a move that is not an advance.
- `state`: `{id: "hidden" | "shown" | "routed" | "destroyed" | "gone"}`. Hidden = in ambush or out of the enemy's
  sight. Routed = broken (move it away with `how: "rout"`). Destroyed = killed or captured where it stood: its place
  stays on the plan as an outline with a cross, and the `hits` that destroyed it belong in the same phase (it may
  also strike in that phase: a last charge that ended in its ruin). Gone = it
  left the field or rejoined its parent, and vanishes.
- `hits`: `[[attacker, target]]`, an arrow from one formation to the one it strikes. A third number (−0.3 to 0.3)
  bends the arrow to keep it clear of a block between them.
- Every phase must change something. Do not make a phase for the aftermath: the plan ends when the fighting does.
- A move that was made and then undone within one phase (a feigned flight and the return, a charge and the recoil) is
  drawn at its furthest point with `how: "feint"` or as a hit; the next phase puts the formation back where it stood
  only if the article says it went back.
- What the text of a phase tells, the picture of that phase must show. If it cannot be shown, leave it out of the text.

## 7. Wording
- Past tense, plain, no praise words (brilliant, masterful, decisive, famous, crushing, daring, heroic …).
- The text never speaks of its source: no "the article says", no "according to accounts". State it, or hedge it as
  the article does ("perhaps", "by one estimate").
- Numbers only as the article gives them, with whose estimate where it attributes one.
- BCE and CE, never BC and AD. Day-first dates (3 September 1260). British spelling. No dashes as punctuation.
- No verdict on who deserved to win.
- Never say more than the article does. If it says some escaped, do not write that all were killed; if it says a
  wing "gave ground", do not write that it was destroyed.

## 8. Check your work, then look at it
```
node scripts/battles/check-battle-maps.js scripts/battles scripts/kinds <slug>
node scripts/battles/sheet.js scripts/battles <slug>            # prints where it wrote <slug>-sheet.png
node scripts/battles/sheet.js scripts/battles <slug> --phone    # the first, middle and last phase at phone width
```
(EPOCH_PW = a folder with playwright-core, as the other tools. A scenario names its article from scripts/kinds:
`"article": "battles1/wp/battle-of-ain-jalut"`.)
- Run the checker until it says `clean`.
- Then OPEN the sheet picture with the Read tool and look at every phase:
  - Does each side stand where the article puts it (left, right, on the hill, behind the stream)?
  - Can every name be read? Are any two blocks or names on top of each other?
  - Is each phase visibly different from the one before, and do the arrows point at what was struck?
  - Does the last phase show how it ended?
- Fix what is wrong and draw the sheet again. Two or three rounds are normal.
- Edit only your own battle's file.

## 9. Report
In your final message give: the slug; `clean` or the faults left; and a short list of anything you were unsure of
(a deployment the article leaves vague, two accounts, a feature you had to place by judgement).
