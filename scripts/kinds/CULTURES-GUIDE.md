# Writing a culture profile for The Epoch Institute

A culture profile is about a people or an archaeological culture that is not a state of its own: the Jōmon, the Kerma
culture, the Ainu, the Vikings. You write one JSON file per culture, in the format below, ONLY from the sources you are
given: its saved English Wikipedia article (`wp/<file>.txt`; the first line is the URL). Do NOT use the web or your
memory for facts. Every claim will be checked against that file by an editor; a fact that is not in it is left out.
Dates, numbers and names exactly as the article gives them; where the article hedges ("about", "perhaps", "scholars
debate"), you hedge too.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes. Plain sentences, no
hype ("mighty", "mysterious", "fascinating", "primitive", "advanced"), no "the article says", no "this profile". Write
about the people, not about the archaeologists, except in the facts' "sources" line and where the article's argument
is itself the story (a dating dispute, a misreading corrected).
- Living peoples (the San, Tuareg, Khoekhoe, Inuit, Navajo, Lakota, Kalinago, Aboriginal Australians) are written as
  living peoples: the present tense for what is true today, their own names for themselves where the article gives them,
  their own agency, resistance and survival. Conquest, dispossession, massacres, slavery, forced removal and assimilation
  are named plainly as the article names them, never softened, never in the colonisers' terms. No stereotypes and no
  romance ("timeless", "untouched", "noble"). Sacred matters only as the article describes them, without dwelling on
  what a people keep restricted.
- Archaeological cultures are named by their sites and type-objects; what they called themselves is unknown unless the
  article says otherwise. Say what the evidence shows and where scholars disagree.
- Use the names the article uses, in full at first mention (the encyclopedia links entries by their exact names: "the
  Battle of the Little Bighorn", not "at the Little Bighorn").

## The file (out/<slug>.json), UTF-8
```
{
 "name": "Hallstatt culture",           the name you were given, exactly
 "region": "Europe",                    as given (one of the Institute's nine regions)
 "start": -1200, "end": -450,           whole years, negative = BCE, from the article; end null for a living people
 "circa": true, "endCirca": true,       true when the year is approximate (almost always for archaeological cultures);
                                        endCirca false when end is null
 "info": "One sentence of 25-40 words saying who they were, where and when, and what they are remembered for.",
 "facts": {
   "homeland": "where they lived, as the article places it, with the key sites; for a living people where they live today",
   "period": "the periods or phases with their dates, as the article gives them",
   "known": "what they are known for: a list of 4-8 things, separated by semicolons",
   "sources": "how we know: excavations and who led them, written records and whose, oral tradition, genetics, as the article says"
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],   three sentences a reader should keep, each a checked fact
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["c. 1200 BCE", "One sentence."], …],     5-8 key events in order; the date as the article gives it
        ("c. 800 BCE", "1876", "7th century BCE", "1830s"); never a day-first date; each text one sentence, no full stop
 "sections": {                       six sections, each 1,100-1,600 characters, as two or three <p>…</p> paragraphs
   "origins":  "<p>where and when they appear, what came before, the debates over origins, language, genetics</p>",
   "society":  "<p>how they lived: settlements, food, work, family and kin, ranks, the economy</p>",
   "beliefs":  "<p>religion, ritual, burial, the sacred; for a living people their beliefs and their changes</p>",
   "arts":     "<p>art, crafts, metalwork, pottery, textiles, music, oral literature, buildings</p>",
   "exchange": "<p>contact, trade and conflict with neighbours; for a living people also colonisation and its effects</p>",
   "legacy":   "<p>what followed or survives: descendants, influence, rediscovery, museums and sites, the people today</p>"
 },
 "summary": "Two or three sentences (250-450 characters) summing the culture up.",
 "references": ["Author, Title (Publisher, year)", …],   3-6 real works the ARTICLE cites, copied from its reference list
        or bibliography as they stand; [] if it names none
 "notes": ["for the editor: doubts, conflicting dates, what you left out and why, any figure you were unsure of"]
}
```
No other keys. Every string plain text except the sections' <p> tags; typographic quotes and dashes are fine.

Before you finish, count: six sections of 1,100-1,600 characters each; 5-8 events in date order; three takeaways;
3-6 references, each copied from the article. Validate the file with
`node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" out/<slug>.json`. Report the counts and your
doubts, and list any fact you wanted to include but could not find in the article.
