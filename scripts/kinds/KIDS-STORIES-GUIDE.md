# Writing a Kids story for a culture profile (The Epoch Institute)

In Kids mode a culture's profile opens with a short picture story, read aloud on request, before the full profile
(which stays folded behind "Read the whole story"). Readers are about 7 to 11 years old.

## Your material
One source pack per culture (packs/<slug>.md): the profile's facts, takeaways, "Did you know?", key events, its six
sections and summary, and the pictures it may use. EVERY fact in the story must be in the pack. Do not add anything
you know from elsewhere, however sure you are: no extra dates, names, numbers or customs.

## The story
- A title: "The story of the Vikings", "The story of the Inuit" (as the profile names them; "the" where it reads so).
- 4 to 6 pages. Each page has ONE picture and 1 or 2 sentences. 8 to 12 sentences in all.
- Sentences short and plain: at most 22 words, most of them under 16. Words a 9-year-old knows; a harder word
  explained in the same sentence ("an archaeologist, someone who digs up the past").
- The pages follow the culture's life: where and when they lived (in words a child can picture: "about 3,000 years
  ago", "where Mexico is today"), how they lived, what they believed or made, who they met, what we have from them.
  End on what remains: their ruins and treasures, or, for a LIVING people, how they live today (present tense).
- Dates as "about 4,000 years ago" or "more than 1,000 years ago", rounded down from the pack's dates, never more exact
  than the pack. "BCE" not used; years ago counted from 2025.
- Living peoples (the pack says LIVING): written in the present tense where it speaks of them today; their own names
  for themselves where the pack gives them; never "tribe", "primitive", "savage", "discovered" (of a land they lived
  in) or "disappeared" (of a people that lives on).
- Hard history is told honestly and gently: conquest, raids, sacrifice, slavery, land taken by settlers are named in
  plain words without gore ("Settlers from Europe took much of their land"). Do not leave them out where the pack makes
  them central, and do not dwell on them.
- No praise or hype words (amazing, incredible, mysterious, fascinating), no "you" addressed to the reader except one
  question at most, no jokes about the people.

## Pictures
Each page's "pic" is one of: a section key the pack lists WITH a picture (origins, society, beliefs, arts, exchange,
legacy), "home", or a slug from "More pictures". Prefer the section pictures and "home". From "More pictures" choose
only things of the people's own world (a site, an object, an artwork, the landscape they live in, a craft), never a
map, a flag, a coat of arms, a modern city view, a country's outline, a colonist's portrait or a weapon. No picture
twice in one story. The page's sentences should fit its picture.

## Output: stories/<slug>.json
```
{"name": "<profile name exactly as in the pack's title>", "title": "The story of ...",
 "pages": [{"pic": "origins", "text": ["First sentence.", "Second sentence."],
            "src": ["the pack's words that each sentence rests on", "..."]}, ...]}
```
"src" has one entry per sentence: the exact phrase (or phrases, joined with " / ") from the pack it rests on. Count:
4-6 pages, 8-12 sentences, each at most 22 words. Check every file parses as JSON.
