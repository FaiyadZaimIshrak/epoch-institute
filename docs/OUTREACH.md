# Getting the site found: what only the owner can do

A new site is found when other sites point to it, and when search engines can fetch it quickly. The site does its part
on its own pages (titles, descriptions, structured data, sitemaps and IndexNow after every deploy). The steps below
happen outside it. The most useful come first.

## 1. Speed: turn on Cloudflare's proxy (once, about 30 minutes)

Every page takes 0.6–0.8 s to send its first byte from Europe, because the server is in Singapore. Cloudflare's proxy
keeps copies near the reader: about 0.1 s. Google counts speed, and slow pages lose readers before they appear. The
steps are in docs/CLOUDFLARE.md.

## 2. Search Console and Bing (once, then monthly)

- Export the Search Console figures each month (docs/SEARCH-CONSOLE.md, section 6). The report shows which kinds of page
  win impressions and which titles need work.
- Add the site to Bing Webmaster Tools (import it from Search Console). Bing also powers DuckDuckGo and Yahoo.

## 3. Teachers (an afternoon, then whenever a new worksheet set ships)

Teachers link to free resources that work, and their links count. List the Teachers' Corner
(https://the-epoch-institute.org/teachers/) and a few of its worksheets with free teaching-resource collections:

- OER Commons (https://www.oercommons.org/): "Add OER", free account.
- MERLOT (https://www.merlot.org/): "Add Material", free account.
- TES (https://www.tes.com/teaching-resources): free resources need a free author account.

Describe them as they are: printable worksheets with answer keys, made from the Institute's pages, for ages 11 to 16. The
printable Test yourself quizzes on every profile are a second resource to mention.

## 4. Data (an afternoon)

The power-curve dataset is already on Zenodo, and researchers who cite it link back. Publish the states register the same
way: https://the-epoch-institute.org/epoch-institute-states.csv and its relations file, on Zenodo (a DOI, citable) and on
Kaggle (where data people look), each describing the site and linking /dataset. Add the Zenodo link to /dataset afterwards
(ask Claude).

## 5. The embeddable On This Day card

/today-in-history/ offers a card that other sites can embed (the code is on the page). Offer it to history teachers' blogs,
local history societies and school websites: each embed shows the day's events and links the site daily.

## 6. Social posts and the newsletter

- Every profile, song, speech, day, country and century page has a share poster (1200 × 630). Posting one a day on the
  Institute's X, Facebook and Instagram, with its link, costs a minute. The day's page and the song of the day are good
  daily posts.
- The weekly newsletter (docs/NEWSLETTER.md) brings readers back, and returning readers are a good signal.

## What not to do

- Do not add links to the site on Wikipedia: editors remove them as self-promotion, and it can mark the domain as spam.
- Do not buy links or swap them in bulk: search engines penalise it.
- On Reddit and in forums, share a page only where it answers the thread's question, and follow each community's rules
  on self-promotion. Maps and posters suit map and history communities when posted as the thing itself, with the link in a
  comment.
