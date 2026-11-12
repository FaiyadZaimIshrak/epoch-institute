# Telling an encyclopedia entry in more detail

Some entries of The Epoch Institute's encyclopedia are what readers reach from a search engine, and at 60 words they
answer too little. For each entry you are given you write three short sections that stand BELOW its existing
description on the page. You write ONLY from the saved English Wikipedia article (`wp/<slug>.txt`; the first line is its
address). Do not use the web or your memory for facts: an editor checks every number and name against that file, and a
fact that is not in it is taken out.

## What you are given
- `list.tsv`: slug and article title.
- `wp/<slug>.txt`: the article.
- `desc/<slug>.txt`: the entry as it stands (name, type, dates, description). Do NOT repeat it: the reader has just
  read it. Add what it leaves out.

## What you write: out/<slug>.json (UTF-8)
```
{
 "slug": "sonderbund-war",
 "sections": [
   {"h": "Background",                 "p": ["One paragraph.", "Perhaps a second."]},
   {"h": "Course of events",           "p": ["…"]},
   {"h": "Aftermath and significance", "p": ["…"]}
 ],
 "notes": ["for the editor: doubts, conflicting dates in the article, what you left out and why"]
}
```
- Three sections (two if the article supports no more), 260-420 words in all, each paragraph 40-110 words.
- Headings ONLY from this list, chosen to fit the subject, each at most once:
  - a person: "Early life and background", "Career", "Reign", "Works and ideas", "Death and legacy"
  - an event, war, battle or treaty: "Background", "Course of events", "Terms", "Aftermath and significance"
  - a place: "Setting", "History", "The place today"
  - a people, family, state, army or institution: "Origins", "History", "Organisation and way of life", "Legacy"
  - a text, object, monument, custom, idea or term: "Origins", "Contents", "What it is", "How it was used",
    "Reception and legacy", "Discovery and study"
- Plain text: no HTML, no Markdown, no lists, no quotation marks around ordinary words. A short quotation only where
  the article gives it, with who said it.

## How to write
- A general academic register about the past itself: plain sentences, no hype ("famous", "legendary", "remarkable",
  "greatest"), no "the article says", no "this entry", no questions to the reader.
- Dates, numbers and names exactly as the article gives them. Write dates day-first ("14 January 1526"), years with
  BCE or CE only where needed ("480 BCE"; a bare year is CE), never "BC" or "AD".
- Where the article hedges ("probably", "according to tradition", "historians disagree", "c."), you hedge too. Where
  its sources are late, legendary or one-sided, say whose account it is.
- Harm is told plainly and in the article's measure: the dead and enslaved of a war or conquest where the article
  counts them, a regime's acts where it names them. Do not praise or condemn in your own voice.
- Living peoples are written about in the present tense. Religious beliefs are told as what believers hold.
- Use the full name at first mention of anyone or anything other than the subject ("Emperor Karl I of
  Austria-Hungary", "the Battle of Gisikon"), so that the site can link it.
- Say nothing the article does not say. If you are unsure a detail belongs to this subject and not a namesake, leave
  it out and say so in the notes.

## When there is too little
If the article has under about 250 words of substance, or adds nothing to the existing description, write
`{"slug": "…", "skip": "why"}` instead. A short, true entry is better than a padded one.

## Before you finish
Count the words, check every heading is on the list, and validate each file
(`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`). Report the word count of
each entry, the ones you skipped and why, and your doubts.
