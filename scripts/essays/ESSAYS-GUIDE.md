# Writing a Research Series essay for The Epoch Institute

An essay reads the Institute's own pages as evidence and says what they show together. Everything in it rests on the
site: the profiles, the encyclopedia entries, the data files you are given. Never use the web or your memory for a fact,
a date, a name or a number. If the material does not say it, the essay does not say it.

Read first: scripts/essays/07-before-the-state.html and scripts/essays/08-how-songs-travel.html (the models: their
header, their sections, their links, their voice, their "What the Data Shows" and "Further Reading").

## Length and shape
- 3,500 to 4,500 words of body text (the cap is 4,500). Six to eight sections, each an `<h2 id="sNN-word">` (NN the essay
  number: s9-origins, s9-roads …), then `<p>` paragraphs; at most one table (`div.essay-table-wrap > table.essay-table`
  with a caption).
- The second-to-last section is `<h2 id="sNN-data">What the Data Shows</h2>`: the figures, every one copied from the
  numbers file you are given (SCRATCH/numbers-NN.txt), never computed or typed by you. Round only as the file rounds.
- The last section is `<h2 id="sNN-reading">Further Reading</h2>` with `<ul class="essay-refs">`: 8 to 14 real works,
  each one a work that a page or file you were given names in its references or sources, written as the model writes
  them (Author, First. <i>Title</i>. Year.), place and publisher only where the page prints them.

## Header (an HTML comment at the top, one key a line)
```
<!--
title: Faiths on the Move
subtitle: How Thirty Religions Spread, Met and Ended
card: (the card text on /research-series, about 200 characters)
desc: (the meta description, at most 160 characters)
published: 2026-11-05
picture: <entry slug>|<caption: what the picture shows, as the entry's own text says it>
profiles: <profile slugs named in the essay, comma-separated, the most important first, at most 16>
-->
```

## Links
- Encyclopedia entries: `<a class="enc-link" href="/encyclopedia/<slug>">text</a>`; state pages likewise
  `/state/<id>`. Profiles plainly: `<a href="/religion/<slug>">`, `/empire/`, `/language/`, `/culture/` … Other pages
  plainly: `/societies/<slug>`, `/inventions?focus=<slug>`, `/songs/<slug>`, `/faiths?faith=<slug>`.
- Check every slug exists before you use it (grep encyclopedia-data.js for `{slug:"<slug>"`, shared-data.js for a
  profile's name, scripts/societies/<slug>.txt …). The build stops on a link to an unknown entry, profile or state.
- Link a thing the first time it is named, not again.

## Voice
- The site's general academic register: plain sentences, the past itself, no "fascinating", "rich tapestry", "delve".
- Say "the Institute's profiles record", "the faith maps show", when a claim is the site's own reading; otherwise write
  about the past directly.
- Religions, castes, slavery, colonial rule: as the pages tell them, neutral, without euphemism; contested matters
  attributed as the pages attribute them. No present-day politics beyond dated facts.
- BCE/CE; "c." for uncertain dates.

## Output
SCRATCH/NN-<slug>.html (the essay) and SCRATCH/NN-sources.md: for every paragraph, the pages or files it rests on and,
for any number, the line of numbers-NN.txt it comes from. The editor reads every paragraph against these.
