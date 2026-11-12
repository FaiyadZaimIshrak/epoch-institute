# Rewriting a profile in plain prose

The texts you are given are accurate and were checked fact by fact. Their PROSE is overwritten: grand
openings, paired dashes, stock phrases, summing-up sentences that say nothing. You rewrite the prose and change no
fact. Think of a working historian writing a reference article for a general reader: plain, specific, unhurried.

## What you get: in/<slug>.json
```
{ "name": "Abbasid Caliphate",
  "fields": { "foundation": "<p>…</p><p>…</p>", "socioeconomy": "…", …, "summary": "…", "teaser": "…",
              "t0": "…", "t1": "…", "t2": "…", "dyk": "…" },
  "keep": ["Battle of the Zab", "House of Wisdom", …] }
```
`fields` are the six sections (HTML paragraphs), the summary, the teaser of the profile card, three takeaways and a
"Did you know?". `keep` lists names that are links on the page: each must still appear, spelt exactly so.

## What you write: out/<slug>.json
The same object with the same keys in `fields`, each rewritten, and nothing else changed (`name` and `keep` as given).
A field that already reads plainly may be returned unchanged.

## Rules that are checked by a script
1. **Every fact stays.** Each number, date and proper name of a field is in your version of that field, and you add
   none. Do not round, merge or reorder dates. Do not add a fact, a cause, a comparison or a judgement that the text
   does not make.
2. **Quotations** (text between “ ” or " ") are copied letter for letter.
3. **Names in `keep`** appear exactly as listed, in the field where they stood. Keep full names ("the Battle of
   Mohács", never "at Mohács"; "Suleiman the Magnificent", not "Suleiman" at first mention).
4. **Same number of paragraphs** in each section, each still `<p>…</p>`; no other HTML.
5. **Length** between 75% and 105% of the original (55% to 110% for a field under 400 characters). Cutting empty words is the point; cutting information is not.
6. **No dashes as punctuation** (— or –) inside a sentence. A year range keeps its en dash ("1258–1260").

## What to take out
- Stock words and phrases: testament to, tapestry, pivotal, crucial/key/vital role, played a … role, underscores,
  showcases, boasts, vibrant, rich heritage, enduring/lasting/profound legacy, left an indelible mark, the … landscape,
  multifaceted, intricate, fostered, bolstered, garnered, not only … but also, it is worth noting, notably, moreover,
  furthermore, indeed, ultimately, serves as a reminder/symbol/model, beacon, cornerstone, crucible, at the heart of,
  profound(ly), seamless, shaped the course of, paved the way, laid the groundwork, set the stage, stands as, endures
  as, remarkable, extraordinary, unprecedented, formidable, renowned, iconic, magnificent, sophisticated, vast,
  complex interplay, navigated, ushered in, highlights, exemplifies, embodies, continues to inspire/resonate.
- Grand frames: "emerged from the ruins of", "one of history's most compelling demonstrations that", "its significance
  is paradoxical:", "The fundamental cause was structural:". Say the thing itself.
- Sentences that only sum up or praise ("Its legacy endures in countless ways"). Cut them, or replace them with the
  one concrete fact they were pointing at if the paragraph already states it.
- Lists of three abstractions ("stability, prosperity and innovation") where the text gives no instance of each.
- "X, Y and Z" adjective piles; "both … and …" where one word does; "not merely … but".
- Superlatives the text does not support with a fact. "One of the largest cities in the world" may stay when it is a
  claim about size; "one of the most remarkable" may not.

## How it should read
- Subject, verb, object. Say who did what, when, to whom. Prefer the concrete noun and the plain verb: "built",
  "taxed", "fought", "wrote", "ruled", rather than "undertook the construction of", "exerted fiscal pressure upon".
- Vary sentence length the way a person does: mostly medium, a short one when the fact is blunt. Do not write every
  sentence to the same balanced shape, and do not end paragraphs on a flourish.
- Keep the academic register and British spelling (centralised, defence, labour). No contractions, no questions, no
  "we", no addressing the reader, no jokes.
- Hedges the text has ("probably", "by tradition", "some historians argue") stay; add none of your own.
- Where a sentence is fine, leave it alone. Do not rewrite for the sake of rewriting.

## Example
Before: "The Benin Empire's most enduring legacy is the Benin Bronzes — several thousand works in brass, ivory and
wood, looted in the British Punitive Expedition of 1897 and dispersed to museums worldwide — which stand as a
testament to the extraordinary sophistication of its court art."
After: "The Benin Bronzes are several thousand works in brass, ivory and wood made for the court. British forces
looted them in the Punitive Expedition of 1897, and they are now held in museums around the world."

## Before you finish
Run the checker on each file and fix what it reports:
`node scripts/style/check.js scripts/style/empires <slug>`
Report which fields you left unchanged, and anything the rules forced you to keep that still reads badly.
