# Writing a state profile for The Epoch Institute

You write one JSON file per state, in the format below, ONLY from the sources you are given: the state's saved English
Wikipedia article (`wp/<slug>.txt`; its first line is the URL) and, where present, `wp/<slug>.<lang>.txt`, the article
in another language. Do NOT use the web or your memory for facts. Every claim will be checked against those files by an
editor; a fact that is not in them is left out. Dates and names exactly as the article gives them.

## Voice
A general academic register about the past itself, as an encyclopaedia or a serious history writes. Plain sentences, no
hype ("mighty", "glorious", "fascinating"), no "the article says". Conquest, slavery, massacres and colonial rule are
named plainly as the sources name them, never softened, never in the state's own terms; the people ruled are given their
own agency and resistance where the sources show it. Use the names the article uses, in full at first mention (the
encyclopedia links entries by their exact names: "the Battle of Tondibi", not "at Tondibi").

## The file (out/<slug>.json), UTF-8
```
{
 "id": "<slug>",                      the register id you were given (the file name)
 "name": "Kingdom of Kano",           the register's name, exactly as given
 "region": "Sub-Saharan Africa",      as given (one of the Institute's nine regions)
 "start": 999, "end": 1805,           the register's years (negative = BCE); end null only if the state exists today
 "info": "One sentence of 20-35 words saying what the state was and what it is remembered for.",
 "facts": {
   "capital": "Kano (originally Dala)",                      seats in order, as the article gives them
   "founder": "Bagauda, according to the Kano Chronicle",    "not known" if the article names none
   "predecessor": "…",                                       the state(s) or peoples it rose from
   "successor": "…"                                          what took its place
 },
 "t": ["takeaway 1", "takeaway 2", "takeaway 3"],   three sentences a reader should keep, each a checked fact
 "dyk": "One striking checked fact, one or two sentences.",
 "ev": [["999", "Bagauda becomes the first king, by the Kano Chronicle's reckoning."], …],   5-8 key events, in order;
        the date as the article gives it ("c. 1230", "1463–1499", "1805"); each text one sentence
 "sections": {                       six sections, each 1,100-1,500 characters, as <p>…</p> paragraphs (two or three)
   "foundation":   "<p>origins, founding, the first rulers, the land and people it began with</p>",
   "socioeconomy": "<p>economy, trade, crafts, agriculture, society, population, towns</p>",
   "military":     "<p>armies, wars, fortifications, weapons, the enemies it fought</p>",
   "governance":   "<p>rulers, officials, law, religion in government, succession, provinces</p>",
   "impact":       "<p>what it changed around it: trade routes, religion, culture, neighbours, its reach</p>",
   "decline":      "<p>how and why it ended, what followed, what survived of it</p>"
 },
 "summary": "Two or three sentences (250-400 characters) summing the state up.",
 "references": ["Author, Title (Publisher, year)", …],   3-6 real works the ARTICLE cites, copied from it; [] if none
 "points": [[999, 1], [1095, 2], …, [1805, 1]],          the power curve: 8-20 turning points [year, strength 1-10],
        first the start year, last the end year, the peak(s) at 10 (strength is the state's own, scaled to its own peak;
        the years are those of events the article dates: a founding, a conquest, a peak reign, a defeat, a fall)
 "pointDescs": {"999": "One or two sentences on what happened at this point, from the article.", "1095": "…"},
        one for EVERY point
 "stats": {"militaryPower": 4, "territorialReach": 2, "economicStrength": 5, "tradeNetworks": 5,
           "administrativeSophistication": 4, "culturalIntellectualOutput": 4, "institutionalLongevity": 7,
           "historicalInfluence": 3},     each 1-10, your judgement from the article, on the scale of ALL states in
        history (the Roman Empire or Han China 9-10 on most; a Hausa city-kingdom 2-5; longevity by the years)
 "tags": ["Commercial", "Trade", "Military"],   three words of the kind the Institute uses: Commercial, Trade,
        Military, Maritime, Agricultural, Religious, Theocratic, Cultural, Nomadic, Colonial, Mercantile, Dynastic,
        Federal, Republican, Imperial, Tribal, Island, Caravan, Mining, River
 "notes": ["for the editor: doubts, conflicting dates, what you left out and why"]
}
```
Before you finish, count: six sections of 1,100-1,500 characters each; 5-8 events; 8-20 points, the first at the start
year and the last at the end year, a description for each; eight stats; three tags; every reference a real work from
the article. Report the counts and your doubts.
