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

## Religions and movements (8 Nov 2026)
The same rules, with these for the two other kinds whose packs say "kind: religion" or "kind: movement":
- Title: "The story of Buddhism", "The story of the Bhakti movement", "The story of Impressionism".
- A religion's beliefs, gods and sacred stories are told as what its believers hold, never as fact and never as error:
  "Buddhists believe that…", "In the stories of the Greeks, Zeus…", "Sikhs follow the teachings of ten Gurus". Its
  founders' lives are told as the pack tells them, with "according to tradition" where the pack says so.
- A LIVING faith is written in the present tense where it speaks of believers today ("Today about … people follow it",
  only with the pack's own figure, rounded down). An ancient religion that ended is told in the past tense, with what
  remains of it: temples, texts, festivals, words.
- No ranking of faiths, no "the true", "the first real", "superstition", "pagan" as an insult, "cult" or "sect" unless
  the pack names it so. Persecution of believers is told plainly and gently, by whom the pack says.
- A movement's pages follow it: the world before it (what people wanted to change), its people and what they did, what
  it changed, and what remains today. Its opponents and its failures are told as the pack tells them.
- Pictures: for a religion, the pack's section pictures and "home" first; from "More pictures" only the faith's own
  places, objects and art (a temple, a scripture, a sculpture, a festival), never a battle, a map or a flag.
