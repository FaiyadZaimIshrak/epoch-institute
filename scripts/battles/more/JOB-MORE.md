# Your job: more steps for one battle plan, where its source gives them

You are revising one "battle plan" scenario file of a history website. Your message names the **slug**.
The plans were first written with a limit of seven phases, so many fold several movements into one phase.
The limit is now fourteen. Your task is to find, in the plan's own source, the movements it bundles or leaves out.

Folders (Git Bash paths):
- Work folder: `C:/Users/OMEN 16/AppData/Local/epoch-tools/battles/more`
- The plan as it stands: `scen/<slug>.json` (read it; do not change it)
- The repository (READ ONLY, never write inside it): `C:/Users/OMEN 16/Documents/epoch-institute`
- The brief for all plans: `C:/Users/OMEN 16/Documents/epoch-institute/scripts/battles/BATTLE-MAPS-GUIDE.md` (read it in full first)
- The source: the plan's `"article"` field names it; the file is
  `C:/Users/OMEN 16/Documents/epoch-institute/scripts/kinds/<article>.txt`. It is your ONLY source.

## What to do
1. Read the guide, the plan and the article's whole account of the fighting.
2. Write down, for yourself, every distinct movement the article tells IN ORDER: an attack, its repulse, a
   counter-attack, a march round a flank, an arrival, a breakthrough, a withdrawal, a commander's fall, a rout.
3. Compare with the plan's phases:
   - A phase whose text tells two or more movements that the article tells one after the other: split it, one
     phase each, each with its own `quote`, `title`, `text` (110 to 340 characters) and its own change on the plan.
   - A movement the article tells and the plan leaves out: add its phase in its place in the order.
   - A phase that is already one movement: leave it exactly as it is.
4. You may add a formation the new phases need (a part that breaks off, a force that arrives: guide section 5) and
   ground the article names that the plan lacks (a road, stream, village, wood, hill: guide section 4), each with
   its `quote`. Do not move or rename what is already there unless a new phase requires it. Keep every existing
   field you do not need to change (`leaderEntry`, `short`, `lab`, `note`, `field` …) exactly as it is.
5. At most fourteen phases. NEVER pad. If the article gives no more movements than the plan already has, change
   nothing and say so: that is a good answer. Do not make phases for the aftermath, for speeches, or for the same
   movement told twice.
6. Write the revised plan to `out/<slug>.json` with the Write tool (never a shell heredoc). If nothing changes,
   write no file.

## Check and look (from the work folder)
```
N="C:/Users/OMEN 16/AppData/Local/epoch-tools/node/node.exe"
export EPOCH_PW="C:\\Users\\OMEN 16\\AppData\\Local\\epoch-tools\\pw"
R="C:/Users/OMEN 16/Documents/epoch-institute"
"$N" "$R/scripts/battles/check-battle-maps.js" out "$R/scripts/kinds" <slug>
"$N" "$R/scripts/battles/sheet.js" out <slug> --out=out/sheets --compact      # writes out/sheets/<slug>-compact.png
```
Repeat until the checker says `clean` AND the sheet, opened with the Read tool, reads well: in every phase the
picture must show what its text tells (blocks in new places, an arrow for a strike, a routed or destroyed block),
no block on top of another, names legible.

## Rules that matter most
- Only what the article states. Nothing from your own knowledge of the battle, however well known it is.
- Every new phase, formation and piece of ground needs a `"quote"` copied exactly from the article.
- The order of phases is the article's order. If the article does not say which of two movements came first,
  keep them in one phase.
- Past tense, plain words, no praise words, BCE/CE, day-first dates, British spelling, no dashes as punctuation.
  The text never speaks of its source.
- A part that breaks off is a formation of its own; the parent stays where it was.
- Never depict or describe the likeness of Muhammad or Ali; sacred history is told as the article attributes it.

## Your final message
The slug; `phases: N -> M` (or `no change` with one line why); `clean`; and a short list of anything you were
unsure of.
