# Writing a state's history for the register (present-day states, Nov 2026)

You write the short history that a state's page in the register shows (/state/<id>). Each state has one saved Wikipedia
article; it is your only source. Never add a fact, number or name that is not in the article, and never write from
memory. If the article is silent on something, leave it out.

## What you write, per state
A JSON object keyed by the state's id, in `out/<batch>.json` (one file for your whole batch):

```json
{
  "kenya": {
    "t": "One sentence, at most 160 characters: what the state is and the one or two things most worth knowing.",
    "o": "Origins: how the present state came into being (independence, partition, revolution, union), from what, when, and under whom. 2-3 sentences.",
    "r": "Rule and society: how it has been governed since, its main changes of regime or constitution, its economy and people in broad strokes. 3-4 sentences.",
    "e": "Where it stands today: bare dated facts only (its present constitution, a recent turning point, who has held the presidency or crown since when). 2-3 sentences.",
    "ru": ["up to five leaders the article names as heads of state or government, in order"],
    "re": "the main religions, as the article gives them, comma-separated",
    "la": "the official or main languages, comma-separated"
  }
}
```

Lengths: t up to 160 characters; o 250-500; r 350-700; e 200-450. Plain prose, no HTML, no Markdown.

## The model
This is the register's text for Kenya. Write like it:

- t: "East Africa's leading economy, independent since 1963, which moved from one-party rule to a multi-party democracy
  with a new constitution in 2010."
- o: "Kenya Colony became independent on 12 December 1963 under Jomo Kenyatta, leader of the Kenya African National
  Union (KANU), after the Mau Mau emergency and negotiations at Lancaster House. It became a republic a year later,
  with Kenyatta as president."
- r: "Kenyatta built a centralised state, favouring capitalist development, land purchase by Africans and close ties
  with the West, while tourism, tea and coffee drove growth. Daniel arap Moi, president from 1978, made KANU the sole
  legal party in 1982. Domestic and foreign pressure restored multi-party politics in 1991, and Mwai Kibaki's victory
  in 2002 ended KANU's rule."
- e: "A disputed election in 2007 led to violence that killed more than 1,000 people, followed by a power-sharing deal
  and a new constitution in 2010 that devolved power to 47 counties. Kenya remains a republic, with William Ruto
  president since 2022."

## Rules
- **The state, not the land.** Write about the present state from its founding. Its land's older history belongs to
  other pages. One clause of background at most ("after 150 years of British rule").
- **Links to other states.** You may link only the register ids listed for your state in the batch file, written
  `[[s:id|text]]`, usually its predecessor in o ("[[s:kenya-colony|Kenya Colony]] became independent …"). Write no other
  link: the encyclopedia links are added afterwards by rule.
- **Dates.** Write dates day first ("12 December 1963"), years plain ("1963", "500 BCE"), never "AD" or "BC", never
  month-first.
- **Present-day politics.** Recent events are history and may be told, but as dated facts the article gives. No verdict
  on a present government or leader ("authoritarian", "corrupt", "successful") unless the article attributes it, and
  then attributed ("Freedom House rates …"; "critics accuse …"). No rankings, indices or "as of" figures. No
  forecasts.
- **Wars and violence.** Name them plainly with the article's figures and its hedges ("estimates range from …").
- **Partly recognised states** (Kosovo, the Sahrawi Republic, Northern Cyprus, Abkhazia, South Ossetia, Transnistria):
  say in t or o that their recognition is partial or absent and who claims the land, as the article says it.
  Attribute each side's position. Describe what they control, not who is right.
- **Voice.** Plain, factual and calm. No "testament to", "pivotal", "played a key role", "rich tapestry", "stands as",
  paired dashes or other stock phrases. No praise words (remarkable, famous, iconic, stunning, legendary). No
  rhetorical questions. Use British spelling.
- **Names.** Write the state's name as the register gives it. Write people's names as the article does on first
  mention, then the surname.
- **Never write "the article", "the source" or "according to Wikipedia".** Tell the fact. Where the article
  attributes a claim, attribute it to whom the article names ("Human Rights Watch reported …", "critics accuse …"),
  never to the article itself. (Wave ms1's writers wrote "which the article calls …" in fifteen places.)
- **Do not edit any file but your own batch's output.**

## Check your batch
Run `node scripts/states/check-states.js <wave dir> <your out file>` and fix every line it prints. It flags missing keys,
lengths, links to ids not allowed, month-first dates, BC/AD, stock and praise phrases, and every number and capitalised
name not in the article. A name or number it flags must be found in the article, or rewritten. Write your notes (where
the article contradicts itself, or something you left out and why) in `out/<batch>.notes.txt`.
