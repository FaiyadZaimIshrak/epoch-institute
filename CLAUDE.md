# The Epoch Institute — Site

Multi-page historical research site. Static files; the reference pages (encyclopedia entries, states, days, country
histories, centuries, glossary, reading paths) are pre-built from the data by scripts/build-pages.ps1 (see
"Indexable reference pages").

## Pages
Root pages are **extensionless** files served as HTML by `.htaccess` (`ForceType`):
index · research · research-series · about · contributors · dataset · explorer · profiles · community · connections · atlas · quiz · contact · start · games · kids · search · timeline · passport · weekly · write · faiths · flashcards · race · inventions · governance · compare · new (generated) · today-card
A new root page goes into the FilesMatch list at the top of the root .htaccess as well as deploy.sh's PAGES: left out,
it goes out with no Content-Type under nosniff and browsers will not show it (/governance, 31 Oct 2026, for a few
hours). check-site.ps1 fails on a root page missing from either list, and on a folder page no .htaccess serves as HTML.
Folders with an `index` page (DirectoryIndex) and generated pages: encyclopedia/ · state/ · today-in-history/ ·
countries/ · centuries/ · paths/ · speeches/ · years/ · people/ · teachers/ · societies/ · songs/ (each has an .htaccess forcing text/html;
/folder redirects to /folder/). essays/ holds the generated essay pages only: /essays and /essays/ redirect to /research-series;
articles/ likewise holds the community article pages (/articles → /community).
maps/ — the atlas's data and outlines (generated, see "Atlas and maps").
Plus 404.html and generator.html (generator is NOT deployed — see scripts/deploy.sh).

## Menu (shared-nav.js initNav: MENUS, MORE)
Regrouped by theme on 31 Oct 2026 (the user: Explore had grown to 22 items and looked cramped):
Profiles · Encyclopedia · Maps & Time ▾ · Themes ▾ · Play ▾ · Today in History · More ▾.
- Maps & Time: Maps (Atlas, Faith Maps, Connections, States Register) | Time (World Timeline, Centuries, Year by Year, Country
  Histories, Rise and Fall Race, Power Curves). "States Register" and "Power Curves" (/state/ and /explorer; the page titles
  kept) since 4 Nov 2026.
- Themes: Societies and ideas (People, Forms of Government, Social Ladders, Inventions Tree, Great Speeches, Songs in History) | Read and discover (Reading
  Paths, Research Series, Glossary, Find Your Way In).
- Play: History Quiz, History Games, Flashcards, Write in Ancient Scripts, Kids Corner, My Passport, and "Surprise me" (also a dice
  button in the header since 4 Nov 2026, #nav-surprise-btn [data-surprise]: hidden at 480 px and below, where the phone
  menu has it, and at 1161-1279 px, where the links fill the bar and Kids mode's wider fonts ran into the buttons).
- More (the Institute): About, Research Hub, Open Data, Teachers' Corner, Community, Submit an Article, Write for Us
  (/contributors), Newsletter, Contact.
Every item has a short line under its name; the panels (.nav-mega, columns with .nav-col-h headings) open on hover,
click or ArrowDown and are shifted to stay 12 px inside the window (place()); opening one closes the others. A click
after the pointer has opened a panel keeps it open and a second click closes it (until 31 Oct 2026 that first click
closed it, so a menu clicked with a mouse or tapped on a tablet wide enough for the bar only flashed; scratchpad
gov/menu-test.js: mouse, keys, Edge touch, WebKit iPad). A new
page goes into MENUS (or MORE) with its page key, and into the footer. The bar is centred on one line (gap 24 px up to
1365 px) and gives way to the menu button at 1160 px and below; between 600 and 1160 px the phone menu opens as a 420 px
panel at the right. The phone menu: the Display row, Profiles, Encyclopedia, Today in History, then one folding group
(details.nav-dd-sec) per menu, the group of the current page open. The footer has four columns (Collections / Maps &
Time / Themes & Play / Institute) and the newsletter; the footer of every page except /contact starts with "Spotted a
mistake on this page? Suggest a correction" (/contact?topic=correction&page=<path>). Page keys for initNav / body[data-nav]: profiles, encyclopedia, states,
today, atlas, countries, centuries, explorer, connections, paths, quiz, glossary, series, dataset, research,
community, about, contributors, contact, start, games, kids, speeches, songs, timeline, years, people, passport, teachers, write, faiths, flashcards, race, societies, inventions, governance, home. The header also
carries the Kids mode star
(see "Kids mode") between the shelf and the theme toggle. At ≤480 px the star and the theme toggle leave the bar (it
holds search, shelf and the menu button; with five controls the menu button fell off a 390 px screen) and the phone
menu opens with a "Display" row (#nav-dd-theme, #nav-dd-kids) that works the same switches.

empire/* — 507 extensionless profile pages (94 empires + 413 states), religion/* (30), language/* (32), culture/* (65)
movement/* (35), government/* (20) and ideology/* (20), the profiles of the other kinds (see "Kinds of profile"); each folder's .htaccess
forces text/html, and /empire, /religion, /language, /culture, /movement, /government, /ideology without a page go to /profiles (?kind=). All generated by generator.html — regenerate with
scripts/regen-profiles.ps1 (headless Edge, no browser needed; byte-identical output; each page goes to its profileUrl)
logos/<Profile Name>.png — emblems at most 240 px, logos/thumbs/ 104 px (profile grid, related and compare lists); the
full-size originals are in logos-src/ (not deployed; the share posters are drawn from them). After adding or replacing an
original run scripts/resize-logos.ps1. 38 profiles have generated monogram placeholders (gold ring + initial, Oct
2026) until real emblems are found. The 34 religions and languages have emblems in the same house style with a sign of
the faith or a letter of its script (ॐ, ☸, ੴ, cuneiform 𒀭, Ifá marks, a Maya 13 …): scratchpad kinds/emblems.html draws
them on a canvas in headless Edge (real script shaping and font fallback) and kinds/save-emblems.ps1 saves them to
logos-src/; checked by eye on its contact sheet (no contested symbols: no swastika, no Othala or Algiz rune). The 30
cultures and movements (Oct 2026) likewise: a sign of their own where one is well attested (an Indus seal's fish sign,
Minoan horns of consecration, a Lapita dentate band, the Etruscan and Phoenician letters, a broken chain, 自強, स्व …),
otherwise a letter.
data/history.json, data/international-days.json — Today in History data (built by scripts/); data/days/<mm-dd>.json —
one day each for the home strip and the Today in History index (written by build-pages.ps1, see the day pages)
Every page head: theme-color metas (dark #0b0c10 / light #f4efe4) and the inline theme snippet, which honours the
OS scheme on a first visit (stored epoch-theme wins) and sets data-kids="1" when epoch-kids is stored. In Kids mode
(that, or /kids's own data-kids="1") it also preloads the two Kids fonts (nunito-normal-latin, baloo-2-latin), so they
come with the stylesheet instead of after it: arriving late, Nunito re-wrapped long facts and moved the page (38 of 192
Kids page/width pairs, 29 Oct 2026). The snippet
lives in build-pages.ps1 ($THEME), generator.html and every hand page; the builder hashes pages without it (sitemap
lastmod), so changing it dates no page ($THEME0, the pre-Kids snippet, only bridges the old hashes). llms.txt at the root describes the site for AI crawlers.
Analytics (every page head, one line: $GTAG in build-pages.ps1, generator.html, the hand pages): the page view is
queued in dataLayer at once and gtag.js itself loads after `load` and an idle moment (Oct 2026: loaded with the page
it cost a phone 250-310 ms of main thread). Pages are hashed with the old snippet ($GTAG0), so the change dated none.

## Shared files
- /shared.css — all CSS, the one stylesheet to edit (fonts: self-hosted variable woff2 in /fonts, @font-face at the
  top; pages preload the latin Crimson Pro and Cinzel files). Pages do NOT load it (since 29 Oct 2026): scripts/split-css.js
  cuts it into css/pages.css (every generated page and profile: 30 KB compressed) and css/<page>.css (each hand page
  and 404: 14-21 KB), where a page used to wait for all of it (67 KB) before its first paint. A rule goes into a file
  when every class and id its selector needs can occur on those pages (their class/id attributes - all pages, not a
  sample -, their inline scripts, every script they load including the lazy ones they name, generator.html's
  template, the builder's class strings; names put together in scripts count by their stem, 'gm-cl' + n). Rules keep
  their order and @media blocks, so a page renders exactly as with the whole file: checked by comparing every computed
  style of every element of 70 pages, desktop, phone (dark) and Kids mode, with search, share panel and menu open
  (scratchpad speed2/css-equal.js). build-pages.ps1 runs the split at the end; after editing only shared.css or a hand
  page's markup run `node scripts/split-css.js` yourself (check-site.ps1 fails while css/ is out of date). A new hand
  page needs its name in HAND there and a <link href="/css/<page>.css">. shared.css stays deployed for the poster
  template (scripts/posters/poster.html). A picture cropped to fill its box (object-fit: cover) keeps its upper part
  (object-position: center 25%, the "Alignment pass" block: the centre cut heads off portraits); emblems drawn whole
  (contain) stay centred. Checked by eye and by a layout audit of 59 pages at 390/768/1024/1280 px and in Kids mode
  (scratchpad audit/layout-audit.ps1: anything wider than the page, overlapping or cut text, broken pictures).
  WCAG 2.2 AA pass (6 Nov 2026): scripts/tools/a11y-audit.js runs axe-core (EPOCH_AXE or EPOCH_PW: a folder with axe-core;
  [--modes=light,dark,kids] [--phone] [--json=] [paths]) over lib.js KINDS. Fixed: labels drawn at partial opacity in the
  light theme (2.2-4.2:1) drawn whole, links among text underlined (.gl-list dt, .inv-list, .st-ties, method notes),
  maps holding links are role="group" not "img" (MapSvg, connections-map.js), picture credit links 24 px tall, essay
  tables focusable regions named by their caption, Galician-Portuguese tagged gl. Left as they are: the /centuries/ bar
  (narrow columns; the same centuries are linked full size below it, the 2.5.8 equivalent exception) and lang="wdt"
  (Wendat: a registered subtag that axe's list lacks). The block is the "WCAG 2.2 AA" section near the end of shared.css.
  Form fields take --field-border (3:1 against the page in both themes and Kids mode; --border, 1.4-1.7:1, is for
  cards and rules): one rule at the end of the file sets it on every bordered input, select and textarea not focused.
  Layout shift (CLS) fixed Oct 2026, keep it so: nothing above content may arrive late. The atlas's region buttons are
  in its HTML (build:atlas-presets, written from $PRESETS), /state/'s empty list holds a screen's height until the
  register arrives, the explorer's tabs have a fixed line height and the page preloads Source Sans 3, and the century
  bar (.ref-centuries, century and people pages) is a grid of equal cells above 700 px, so a late font re-wraps no
  chip (it moved one a line up: CLS 0.08). Test with scratchpad pw/cls-trace2.js and FONT_DELAY=1500. On a slow
  connection the fonts come seconds after the page (the live crawl of 28 Oct measured CLS up to 0.23 from the swap):
  the tokens name fallback faces sized like the fonts ('Crimson Pro Fallback', 'Cinzel Fallback' on local Georgia,
  'Source Sans 3 Fallback' on Arial; size-adjust calibrated so 95% of 3,128 paragraphs and 99% of titles keep their
  line count, scratchpad t/fontcal.html; ascent/descent from t/fontmetrics.html). Kids mode likewise: 'Nunito Fallback'
  (Arial 400 at 101.25%, Arial Bold 600-900 at 99.75%) and 'Baloo 2 Fallback' (Arial Bold: 90% for 400-600, 95% for
  700-900), from t/kidsmetrics.html and t/kidscal.html at Kids sizes (89-94% of text and interface lines, 99.6-99.8%
  of titles): Kids pages with the fonts 1.5 s late went from CLS 0.08-0.10 to about 0 (KIDS=1 FONT_DELAY=1500
  pw/cls-trace2.js). Re-measure if a font file changes.
- /shared-nav.js — initNav(activePage), escHtml(), buildPagination(), isValidEmail(), sharing (sharePoster, the share
  panel, scoreCard: see "Sharing"), in-app browser detection (EPOCH_INAPP, see "In-app browsers"). The old contact modal
  is gone; openContactModal() now just opens /contact. Also: the "My shelf" nav bookmark (saved pages + recently
  viewed, localStorage epoch-shelf/epoch-recent, reading pages only), the reading-progress line on /empire and
  /encyclopedia entry pages, "Surprise me" (Explore menu: random profile/day/century), the footer ✦ quotation, the
  site search (see "Homepage and site search") with its warm-up (only on hover/focus of the search button, or
  window.warmSiteSearch(): the index is ~650 KB compressed, so no page fetches it unasked), and hover prefetch: a
  speculationrules block (prefetch, eagerness moderate, same-site links except /contact, /feeds/ and data files;
  Chrome and Edge, others ignore it; only with a mouse, (hover: hover) and (pointer: fine): matching the rules against
  every link cost a slowed phone up to 200 ms on long lists, for a gain only at the tap). Startup measuring (back-to-top, reading progress, enc-page.js's century bar)
  waits for requestAnimationFrame: reading layout at once forced a whole layout mid-build (363 ms on /about, phone). Newsletter: subscribeNewsletter(email, source) posts
  {kind: newsletter, email, source} to /send.php (see "The site's mail"); every newsletter form calls it, so a page
  never needs more than shared-nav.js for it; newsletterPrompt(source) is the one-line form shown after the daily quiz and the Daily Ten
  (form[data-nl], handled in initNav; hidden once localStorage epoch-nl is set). shareThis(text, url, btn):
  navigator.share, else copy; any button with data-share-text (+ data-share-url) shares on click. Reading-path
  journeys: reading pages visited are kept in epoch-seen (capped at 3000); a path page ticks them, shows the
  progress and "Continue: <next stop>" (epoch-paths); a step opened from a path (epoch-path) shows the slim bar
  .path-journey at the foot of the stop ("Stop 3 of 9 · Next: … →"). The header search takes profiles from
  EMPIRES when present, else from /search-profiles.js (SEARCH_PROFILES, written by build-pages.ps1) — the generated
  pages do NOT load shared-data.js. The theme toggle also rewrites the theme-color metas. The page-transition click handler reads a link's address as
  text: an SVG `<a>`'s .href is an SVGAnimatedString (it once sent the country bubbles to /countries/[object …]).
- /shared-data.js — core data: EMPIRES (709: 94 empires, 413 state profiles with an `id`, 30 religions, 32 languages, 65 cultures, 35 movements, 20 forms of government and 20 ideologies with a `kind`), EMPIRE_INFO, REGIONS, ERAS, EVENTS, TRANSLATIONS, toSlug().
  Loaded by the profiles and the hand pages that use it (index, profiles, explorer, quiz, faiths, passport, search,
  404). Since Oct 2026 NOT by about, atlas, connections, dataset, research, research-series, timeline, write, community,
  contact, contributors (these three used it only for the Formspree address until 29 Oct) and the encyclopedia/,
  state/ and today-in-history/ indexes (they used nothing in it; 59 KB compressed each): a page that starts to need it
  must load it again.
- /enc-page.js — script of the generated pages (initNav from body[data-nav], random entry/state, citation copy,
  lazy state mini map, century bars scrolled to the current century on phones); its IDX_V is written by build-pages.ps1
- /share-card.js — EpochCard: score posters for the games and the daily quiz (see "Sharing"); loaded on demand
- /quiz.js — EpochQuiz: today's puzzle (home page and /quiz, same puzzle and streak) and practice rounds (/quiz).
  Needs shared-data.js, shared-nav.js (escHtml, searchFold, SEARCH_INDEX_SRC) and home-data.js. The answer
  suggestions load the search index only when the guess field is first touched (pointerdown/keydown).
- /atlas.js — the atlas app (loaded only by /atlas, after maps/basemap.js and maps/atlas-data.js)
- /point-descs.js — POINT_DESCS (632 KB compressed), loaded by the explorer only when an empire is first picked or
  searched (loadPointDescs; the dots are drawn again when it arrives)
- /d3-geo.js — the parts of d3 the globes use (d3-array 3.2.4 + d3-geo 3.1.0, the versions inside d3 7.8.5, as their
  own UMD builds: 54 KB instead of 280 KB, same results), self-hosted, loaded on demand by the home globe, atlas.js,
  faith-map.js and Globe Hunt (games.js) as `/d3-geo.js?v=1`. Only the explorer still loads full d3 (charts) from cdnjs.
- /empire-profiles.js — EMPIRE_PROFILES, loaded only by profiles and generator.html
- /epoch-stats.js — radar-chart stats, loaded by profiles and empire pages
- /test-yourself.js — TestYourself.mount(el): the "Test yourself" section at the foot of profiles, century and path
  pages (see "Test yourself"); loaded when the section nears the screen, without `?v=` (10-minute cache)
- /flashcards.js — the Flashcards page (see "Flashcards")
- favicon.svg / favicon.ico / apple-touch-icon.png / logo.png (Organization logo in the home page's JSON-LD) /
  favicon-192.png (logo.png downscaled). The icon beside Google's results comes from the HOME PAGE's icon links only, and
  Google's favicon guide takes BMP, GIF, ICO, PNG or JPEG (not SVG), larger than 48 px: so index lists favicon-192.png
  first, then the .ico, then the SVG (the other pages keep svg + ico; changing all 40,000 heads would only churn their
  lastmod). The icons first went up on 23 Oct 2026, so Google's results showed a globe for a while; Search Console's
  Request indexing on the home page hurries it (docs/SEARCH-CONSOLE.md, the owner's guide: a Domain property verified
  by a DNS TXT record at Cloudflare, since the late-loaded Analytics tag may fail Google's Analytics check).
  Every hand page but 404 carries JSON-LD (BreadcrumbList + its page: WebPage, CollectionPage, AboutPage, ContactPage,
  Map …; the description is the page's own meta description); the home page's Organization and WebSite name
  alternateName "Epoch Institute" (Google's site name). build-pages.ps1 keeps /connections' "Connections Map of N
  States" (title, og:title) at the register's count.

Caching (.htaccess): scripts a year, CSS a month, JSON a week, HTML always revalidated (the extensionless hand pages
get their Cache-Control in the FilesMatch block: ExpiresByType never reached them, and until 29 Oct 2026 they went out
with no cache header, so browsers kept them as long as they guessed). shared.css, shared-data.js,
shared-nav.js and enc-page.js are kept only 10 minutes (then stale-while-revalidate): EVERY page loads them WITHOUT
`?v=`, so changing them needs no rebuild and one cached copy serves the whole site (so are scribe.js and faith-map.js,
which the language and religion profiles load without `?v=`, and test-yourself.js). Until 29 Oct 2026 the hand pages
loaded them with `?v=`, a second address: a reader going from the home page to an entry downloaded 102-169 KB again
(+0.25-0.45 s first paint from Stockholm). Never give them a `?v=` again. The stylesheets in css/ are kept the same
10 minutes (css/.htaccess) and are linked without `?v=` too. Every other script tag carries a `?v=N`
cache-buster: when you change such a file, bump its `?v=` on every page that loads it. data/*.json are sent as
text/javascript (data/.htaccess) because the server does not compress application/json.

## The site's mail (send.php)
Every form posts to /send.php, the Institute's own PHP mail handler on the hosting (PHP 8.2 there, written for 7.4+;
`GET /send.php` is a health check: php, mail, uploads, maxUpload, private folder), which mails it to the Institute's
mailboxes on the same server (Exim; MX mail.the-epoch-institute.org), routed by `kind` and /contact's `topic` in ROUTES
at the top of the file: research@ gets articles, corrections, topic ideas, writing and data questions and applications;
outreach@ press and partnerships; info@ opinions, newsletter sign-ups and other messages. The recipient never comes
from the request. Subjects say what it is ("Correction: /page", "Article submission: <title>"); the reader is the
Reply-To (names always quoted or encoded: "Eve Bcc: x@y" must stay a name); From is "Epoch Institute website" <the
mailbox>, sent with -f the mailbox. Forms and fields (FIELDS): contact (name, email, page, message), article (name,
email, profession, affiliation, title, article text, file: .docx .doc .odt .rtf .pdf .txt checked by their first
bytes, 10 MB; a file or at least 100 words), opinion (name, opinion; at most 5 links), application (name, email, role,
region, interests, message), newsletter (email, source). Only https://the-epoch-institute.org may post (Origin, else
Referer); `_gotcha` is the honeypot (thanked, not sent); limits per sender (hashed IP, CF-Connecting-IP first) 5 in
10 minutes and 30 a day, 300 a day in all (429 with the mailbox to write to). Answers JSON to fetch/XHR (Accept:
application/json), else a small thank-you or error page (/contact without JavaScript: its form's action is /send.php
with a hidden kind=contact). The private folder /home/theeiorh/epoch-mail (outside public_html; never deployed; falls
back to public_html/.epoch-mail with its own deny .htaccess if PHP may not write there) keeps inbox/<year-month>/ (a
copy of every message and file, pruned after 30 days), subscribers.csv (date, email, source; no address twice: the
newsletter list), log/<year-month>.log (time, form, mailbox, size, result; no content), rate/ and salt. .user.ini asks
for a 12 MB request limit and display_errors Off, but the host does not read it (29 Oct 2026: GET still showed its own
1 GB limit): send.php's own 10 MB check and its ini_set('display_errors', '0') do the work. Only a request over the
host's post_max_size would print PHP's warning before the script runs (PHP 8), turning the JSON into a page. Pages post with fetch (contact,
contributors, subscribeNewsletter in shared-nav.js) or XMLHttpRequest (/community's postForm, for upload progress),
and on failure show the handler's reason and the mailbox to write to. Tests: scratchpad mail/test-send.js (the
handler under PHP 7.4 and 8.3, with EPOCH_MAIL_TEST: .eml files instead of mail(); portable PHP in
%LOCALAPPDATA%\epoch-tools\php74 and php83) and mail/test-forms.js (every form in the browser, /send.php routed to
the local PHP). docs/MAIL.md is the owner's guide. Until 29 Oct 2026 the forms went to Formspree (formspree.io/f/
mpqkezdj; its old newsletter sign-ups and the Research Series "Notify me" sign-ups are still there: the owner copies
them, then deletes the form). Do not bring a third-party form service back.
No Google service but Analytics: until 29 Oct 2026 two Google Apps Scripts (not in this repo, run from the owner's
Google account over Drive and Sheets) served the home page's announcements (a Drive folder), /community's articles and
opinions and its two forms, and /contributors' list and form. The site no longer calls them (the user's choice: no
dependency on Gmail or Drive; Analytics kept): the one opinion and the contributors' row were copied into the pages,
the announcement poster and the only community article (Sati Pratha: /articles/sati-pratha answers 410 Gone, root
.htaccess) were removed. docs/APPS-SCRIPT.md is the owner's guide to saving what only Drive holds (five article
submissions never published, the opinions and applications sheets) and archiving both web apps (one still lists
every submission publicly until then). Do not bring Drive, Docs or Apps Script back into the site.

## Contact, contributors and open data
- `/contact`: six topic cards (correction, suggest, write, data, press, other: heading, hint, placeholder, the mailbox
  (`box`, as send.php's ROUTES) and the team named in the thank-you follow the topic), `?topic=` and `?page=` preselect
  them; thank-you panel with next steps and a newsletter field; side column with the three addresses (copy buttons;
  mailto links fail for readers without a mail program), social links and short answers. ContactPage + contactPoint
  JSON-LD. It posts to /send.php (see "The site's mail").
- `/contributors` is "Write for the Institute": three ways to take part, the application form inline (to research@
  through /send.php), the list of contributors (static cards in the page: add one before "Your name here").
- `/dataset` is "Open Data". build-pages.ps1 writes the downloads as root files: epoch-institute-states.csv,
  epoch-institute-state-relations.csv, epoch-institute-states.json (the register; empire capitals from
  empire-facts.js), epoch-institute-power-curves.csv/.json (one row per point), and the page's `build:open-data`
  block (counts, samples, columns, Dataset JSON-LD). The old epoch-institute-empire-dataset.csv/.json addresses
  redirect (301) to the power curves.

## Deployment
Push to master → GitHub Actions (.github/workflows/deploy.yml) runs scripts/deploy.sh, which copies the site to
/home/theeiorh/public_html/ over SSH with rsync (server905.web-hosting.com, port 21098; repository secrets
SSH_PRIVATE_KEY, SSH_HOST, SSH_PORT, SSH_USER; the host key comes from ssh-keyscan). The server is in SINGAPORE
(server905-2.web-hosting.com, 209.74.67.182, LiteSpeed, HTTP/2, brotli, no HTTP/3): from Stockholm a round trip is
0.2 s, a cold page's first byte 0.75-1.0 s and its first paint 1.9-2.6 s, and about 1 connection in 15 loses its first
packet (measured 29 Oct 2026, scratchpad pw/live-speed.js, live-warm.js, ab-critical.js: dropping the font preloads or
lowering the scripts' priority gave no dependable gain). The host's own network is the weak link, not the distance: on
the evening of 29 Oct 2026 a 100 KB file took 4.9 s on average from here (max 24.7 s, 8 of 49 tries over 8 s) and the
same size from Vultr's Singapore server 1.7 s (max 3.1 s), over the same line; pages then took 10-80 s, and minutes
later under 2 s (scratchpad speed2/probe.tsv, pw/waterfall.js; check-host.net: 0.09 s from Jakarta, 0.7-2.8 s from
Europe). The owner's PC also has Avast's HTTPS scanning in every connection, which queues the files further. Every KB
counts on that line: hence css/ (above). The domain's DNS is at
Cloudflare (name servers clara/cesar.ns.cloudflare.com) with the records DNS only, so visitors reach the server
directly; docs/CLOUDFLARE.md is the owner's guide to turning the proxy on, the real cure for that distance (Full (strict) first, `mail` stays DNS only,
Bot Fight Mode off for the workflows' checks). docs/DEPLOY.md has the setup, dry
runs (Run workflow with "Dry run", the default; runs from any branch but master are always dry; DRY_RUN=1 by hand),
deploys by hand (Linux, macOS or WSL: Git Bash has no rsync) and rollbacks (revert and push, or Run workflow with a
Commit). Until 27 Oct 2026 cPanel deployed from its own clone of the repository by running .cpanel.yml; the clone
(95,718 inodes, 2.8 GB) put the account over Namecheap's 200,000-inode backup limit, so after the first deploy over SSH
it was taken off cPanel's Git list and deleted (201,865 → 106,147 inodes) and .cpanel.yml removed (git history has
it). cPanel's Git list still holds the-epoch-institute, an April 2026 clone of Rimonis/the-epoch-institute (324
inodes): never press Deploy there, its old .cpanel.yml would copy April's files over the site. deploy.sh reproduces
.cpanel.yml line by line (each step names its line): its lists at the top are the copy rules. New top-level files must match a root pattern there (*.html, *.css, *.js, *.csv, *.json,
.htaccess, send.php and .user.ini by name; *.txt, *.xml, *.svg, *.png, *.ico) or they won't be deployed. send.php is the
forms' mail handler (PHP on the host: see "The site's mail" and docs/MAIL.md); .user.ini holds its PHP settings (which
this host ignores), and .htaccess keeps .user.ini from being served. rsync writes to a temporary file and renames
it, so a page opened during a deploy never gets a half-written shared.css/shared-nav.js (with cp it could, and kept
the broken copy in its cache - Oct 2026). Files are compared by checksum (--checksum --no-times: a fresh checkout gives
every file a new time), so only changed files are sent and unchanged ones keep their time and Last-Modified; the
server reads the whole site once per deploy to compare (a few minutes). encyclopedia/, state/, today-in-history/,
countries/, centuries/, paths/, speeches/, years/, people/, essays/, articles/, teachers/ and societies/ (GENERATED) use rsync
--delete, so pages removed from the repo also disappear from the server (a FILE of the same name at the root is
removed first: /paths was a file until Oct 2026); nothing else in public_html is deleted except the old files of
.cpanel.yml's last three lines. Root pages are copied by name (PAGES: index, about, … write, faiths): add new ones
there. css/ is one of DIRS and goes out before the pages, which link it. The script deploys only a clean checkout of a commit (no changed, untracked or ignored deployed files, no CRLF
from core.autocrlf), stops before sending anything if a listed file or folder is missing, and fails loudly on any
SSH or rsync error; the workflow then checks that the home page answers.
After deploying, run scripts/ping-indexnow.ps1: it submits the pages the last build changed
(scripts/changed-urls.txt, written by build-pages.ps1; gitignored) to IndexNow. The key file
7887eeb120e9bc53cc20304b26431942.txt at the root proves ownership — keep it deployed.
The daily RSS feed, /feeds/today.xml (Today in History + the entry of the day, the last 14 days), is not deployed:
.github/workflows/daily-feed.yml builds it every morning at 00:05 UTC (and after a push that changes data/days,
home-data.js or its script) with scripts/make-feed.ps1 (pwsh-compatible) and writes it into public_html/feeds through
cPanel UAPI Fileman::save_file_content (upload_files as a fallback), with the secrets CPANEL_HOST, CPANEL_USER and
CPANEL_API_TOKEN. The deploy only makes feeds/ and copies feeds/.htaccess (RSS type, 1-hour cache), never
feeds/today.xml; check-site skips /feeds/ links. Home, the Today in History
pages and the footer link it.

## Indexable reference pages (SEO)
scripts/build-pages.ps1 (Windows PowerShell 5.1; keep the file saved with a UTF-8 BOM) writes from the data:
- `/encyclopedia/<slug>` — 32,149 entry pages: description gold-linked at build time with the encyclopedia page's
  rules (scripts/lib/enc-fn.ps1, a copy of the scratchpad enc2/enc-fn.ps1 — keep both in step with ENC_FN), picture
  and credit, profiles and state histories that mention it, a war's battles, see also, previous/next A–Z entry,
  citations; `/encyclopedia/browse/<letter>[-n]` (A–Z, 100 a page), `/encyclopedia/conflicts/<century>`;
  `encyclopedia/index-data.js` (slim index for the search on /encyclopedia/, 575 KB compressed: the page loads it
  only when its search or a chip is touched, a query is in the address or Random entry is pressed; until then the
  chips show ENC_COUNTS, the counts by type the builder writes into the page's `build:enc-counts` block).
  Entry pages link their century (/centuries/<c>, from the dates: an event's first year; a person's working life,
  two thirds from birth to death) and term entries link the glossary.
- `/state/<id>` — 4,961 state pages (the 507 states with a profile are redirected to it by state/.htaccess, also
  written by the builder); `/state/browse/<region>`. Key facts link the centuries and the present-day countries;
  the sidebar has a locator map (the state, its connected states, a link to the atlas at its middle year).
- `/today-in-history/<month>-<day>` — 365 day pages: event pictures (EvImg: the entry named in the title first, so
  Chaucer's portrait rather than London), descriptions gold-linked by LinkDesc with the event's year as context (so
  they get the hover previews), "N years ago" chips, the anniversary-of-the-day hero card (roundest centenary),
  international-day banner, own share poster (images/og/day-<slug>.jpg, see "Share posters"), and "Born on / Died on
  <day>" lists (the 12 best known with portraits, the rest folded; a note on Julian dates) from scripts/day-people.tsv
  (mm-dd, b or d, year, slug: 4,177 rows from Wikipedia's On this day births and deaths, kept only where Wikidata gives
  the same day, in its own calendar, and the entry the same year; scratchpad days\r3-people.js). In history.json a BCE
  event's year is negative (23 carried "49 BCE" with year 49 until Oct 2026: sorted, dated and filed as CE), and a
  `profile` tag names the state where the event happened or whose ruler or army acted, alive that year (98 of 247 were
  wrong: Bell's patent tagged the Brazilian Empire; profile-changes.md). Every day has at least eight events (3,122;
  921 added 28 Oct 2026, mostly BCE and 500-1499, outside Europe where the sources allowed): each new event's day and
  year were first found in the text of its Wikipedia article, then agents wrote it only from that article, the On this
  day line and the entries (scratchpad days\r3: R3-GUIDE.md, check-drafts.js flags any number or name not in the
  material, decisions.json holds the editor's drops and edits, merge-r3.js refuses an event the day already has). Add
  events the same way: a day with "c." or a disputed day is left out. 4 Nov 2026 (A8): 557 more, 3,679 in all, with
  tools now in scripts/days/: otd-candidates.js (Wikipedia's On this day feed, cached in %LOCALAPPDATA%\epoch-tools\
  otd-cache; per day the events of years the day lacks, older and outside Europe first; --leads saves each page's lead),
  check-dates.js (kept only where the main article, or another page's lead, states the day with the year), DAYS-GUIDE.md
  (the agents' brief), check-events.js (lengths, links, profiles, every number and name not in the material),
  profiles-alive.js and merge-events.js (--fixes: the editor's skips and edits); drafts and fixes in scripts/days/a8/.
  Wikipedia throttled whole-article downloads to about one a minute, so the second half of the year rests mostly on
  leads; 39 candidates were skipped as slight or unsupported (a fraternity, a television station, a single crash). The
  builder also writes
  `data/days/<mm-dd>.json` ({k, events [{year, yearDisplay, title, description, html (linked), links, profile}],
  hero, pic [img, slug], intl}, ~4 KB): the home strip and the Today in History index read only today's file instead
  of history.json (1.1 MB); its DAYS_V is stamped into both pages. With -SkipEntries (no linker) the day pages and
  data/days are left as they are. (data/tih-thumbs.json is gone.)
- `/countries/<slug>` + `/countries/` — 190 country histories (present-day countries with at least 3 states): map
  with the states' seats (inline outlines, the country lit up), a share poster of its own (images/og/country-<slug>.jpg;
  centuries likewise century-<slug>.jpg — drawn from these pages by scripts/make-posters.js: re-draw them after a
  build that changed them), profiles, "Empires that ruled here" (profiles outside the country that
  its states were part/province/colony/vassal/tributary/protectorate of or conquered by), a timeline on one scale by
  century of founding, encyclopedia entries naming the country, shared histories. TheCountry() adds "the" (the
  United Kingdom, the Netherlands …) and StateThe() does the same for states in running text: names that are or end
  in a state noun ($STATENOUN: the Kingdom of …, the French Fifth Republic) and one-word plural peoples (the Ligures).
  What was here? (4 Nov 2026): a tap or click on a country's map opens the atlas's lookup at that spot
  (/atlas?at=lat,lng; enc-page.js turns the map's point back into a place with the atlas's Equal Earth inverse; the
  caption says so, .cty-here).
  Index: bubble map + countries by continent.
- `/centuries/<nth-century[-bce]>` + `/centuries/` — 51 pages (30th century BCE – 21st): counts, world map at
  mid-century, great powers (epoch-stats military + territory + economy + influence, times the share of the century
  alive, times strength on the profile's own curve), key events, people, works and ideas (ranked by profile and
  state mentions and a picture), states founded / ended, On this day, Test yourself (see "Test yourself"), prev/next.
  Century labels follow the encyclopedia's Century(): 13th century = 1200–1299, 5th century BCE = 499–400 BCE. Dates
  are read by [EpochBuild.W]::Span: since Oct 2026 a year beside a century counts too ("c. 985–15th century" is
  985–1499, "13th century–1707" 1200–1707: 48 entries had been filed by the century alone) and a shortened second year
  is expanded ("1895–96": the Fourth Anglo-Ashanti War had been filed under the 1st century).
- `/encyclopedia/glossary` — the 723 term entries A–Z (DefinedTermSet JSON-LD).
- `/paths/<slug>` + `/paths/` — the 38 reading paths from reading-paths.js, each tagged with the /start reader types it suits (types:[…] in paths.json; shown as "Suits the …" on the page and card) and the eras it covers, main one first (eras:[…]: ancient, medieval, earlymodern, modern; used only by /start); /paths#slug forwards to /paths/slug.
  The picture strips (PathThumbs) never repeat a picture (compared by its Commons source) and put maps, plans and
  diagrams last (PicIsChart). Each path page ends with Test yourself.
- Lists of entries show a type glyph where an entry has no picture (PhSpan: `.ph .ph-person/-conflict/-place/…`,
  masked SVG icons in shared.css).
- `/years/<y>` (/years/1453, /years/480-bce) + `/years/` — year pages, one for every year with at least 4 items (6 until 4 Nov 2026, when 1,030 years had a page),
  2 of them events. Only FIRM years count ([EpochBuild.W]::Firm, Range, Life: "1453", "29 May 1453", "480 BCE"; never
  "c. 1450", "1450s", "1066 or 1067", a reign or a century): entry events and conflicts dated to the year, wars that
  began or ended in it, day events (history.json; their linked text from data/days), profile key events (empire-glance.js
  ev, "In the profiles"), births and deaths (lifespans, "b."/"d."), works, states with firm dates (polities x = approximate
  is left out) founded or ended, speeches. An entry a day event already names (its links, its name in the title, or
  every word of its name there: YCovered) is not listed twice. Event thumbnails are JPEG paintings or photographs only
  (GoodPic: battle maps and diagrams on Commons are PNG/GIF/SVG). Each page: lede with counts, nearby years, events by
  date, a world map of the states alive (YearDots, C#), births, deaths, works, states, prev/next, the century. Linked from
  entry dates (LinkYears links every firm year that has a page), day-page years, century pages ("Year by year"), the
  atlas ("What happened in <year>", data/years.json with its ?v= stamped into /atlas) and the 404 page (a year without a
  page goes to the nearest one). Their own sitemap: sitemaps/years.xml. Script-level year variables are $yv ($y is $Y,
  the link years); the year table is $YEARB ($yrs is a state page's year text).
- `/people/<century>` + `/people/` — the 12,992 people by the century of their working life (ENTCENT) and by broad
  region (PersonRegion, as the search filter and the quiz clue: scripts/entry-regions.tsv first, set by hand where the
  rule misleads; else most of the mentioning profiles of states, empires, religions and languages, else of the state
  histories, else of the cultures, else of the movements. A culture's or movement's region is where it lived or began,
  so they only place people nothing else does: counted with the others they made Lincoln and Douglass European through
  Abolitionism and moved the Pontic Scythian kings to Central Asia), a
  "who lived when" chart of the 40 best known (lifespans bright, reigns and "fl." pale) and picture tiles by region.
  people-data.js ([slug, name, dates, first, last, kind, region, picture, weight]; ?v= written into /people/) feeds
  people.js, the chart tool on /people/ (region, from/to century, with a picture; kept in the address).
  People by region (/people/<region>, 6 Nov 2026): the nine regions' pages (PRegSlug: ancient-near-east,
  egypt-and-north-africa … oceania; the best known, then century by century; a region with 20 dated people), "By region"
  cards on /people/, the century pages' region headings linking them. First the audit of PersonRegion (a first build of
  4 Nov had put Saint Nicholas and Wilfrid in the Americas, Louis Philippe in Oceania, Galen in the Islamic Caliphates
  and Mani in Sub-Saharan Africa): scripts/tools/person-regions-wd.js looks every person up on Wikidata (the article's
  item, accepted only when a human whose years agree), places their birth, death and work places by coordinates on
  maps/globe-land.js (overseas territories by where they lie: Martinique is the Americas, Raiatea Oceania), maps the
  country to a region by the register (most of its states, those ended before 640 apart) and lists the people whose
  region is none of those; scripts/tools/person-regions-text.js reads the first sentences of the people Wikidata could
  not place ("a Persian prophet"). Five agents decided the 2,046 listed by one principle (a person belongs where their
  life's significance lies: a conquistador with the Americas, Richelieu with Europe) and the editor read every change
  between regions and set the groups by their profiles' regions (Ayyubid and Mamluk sultans: the Islamic Caliphates, as
  their profiles; the Hellenistic kings of Anatolia: the Ancient Near East, as Pontus and Lydia; the Fatimids and Cairo's
  historians: Egypt and North Africa): 1,252 rows in scripts/entry-regions.tsv (386 corrected, 866 placed that had no
  region).
- `maps/atlas-data.js`, `maps/basemap.js`, `maps/world.svg` (see "Atlas and maps"), their ?v= stamped into /atlas.
- The `<!-- build:... -->` blocks of encyclopedia/index (with the Discover row: 8 notable entries with pictures, one
  kind each, re-picked daily by a small inline script from 10 per kind), state/index, today-in-history/index,
  research (hub: every section with its count and a picture, grouped Read / Through time / Explore / Play / The
  Institute), index
  (home-map, home-doors: 12 doors with live counts, home-centuries, home-countries) and atlas (atlas-centuries); enc-page.js's IDX_V; the .htaccess of state/, countries/, centuries/, paths/;
  `sitemap.xml` (an index) + `sitemaps/{pages,profiles,encyclopedia,states,years}.xml` with image entries; lastmod changes
  only when a page's content changes (scripts/sitemap-state.tsv); `search-profiles.js` (the profiles for the header
  search: the generated pages load it instead of shared-data.js); `scripts/changed-urls.txt` (for ping-indexnow.ps1).
SEO rules (31 Oct 2026, scratchpad nav/seo-audit.js checks all 40,235 pages: titles, descriptions, thin pages,
canonicals, JSON-LD, h1, sitemap coverage):
- Titles: Page() runs FitTitle: over 70 characters a title loses " — The Epoch Institute" (Google shows the site name
  above it), then its section label (" — Encyclopedia", " — States" …), which until then keeps an entry and a state of
  the same name apart; NameYears adds a name's years only when the name does not already hold them ("1931 Constitution
  of Ethiopia", "Duchy of Estonia (1219-1346)" said them twice). generator.html does the same for the profiles: years
  without "CE" on each ("Abbasid Caliphate (750–1517): History, Rise and Fall", "Roman Empire (27 BCE – 476 CE)") and no
  Institute name past 70 characters. Before: 5,046 titles over 70 and 488 with doubled years; after: 11, five essays
  (title and subtitle), two profiles ("United Kingdom of Great Britain and Ireland (1801–1922): History, Rise and
  Fall") and four names that long on their own or with their years (the Panama Canal neutrality treaty, Stedman's
  Narrative, the US Military Government of the Philippine Islands (1898–1902); William & Mary is 69 on screen, 73 only
  with its &amp;). No duplicate titles or descriptions, and no description under 70 characters.
- State descriptions name their state: a teaser that does not contain the state's name (3,971 did: "A minor chiefship of
  southern Kathiawar …", four pairs identical) is prefixed "Name (years): " with a leading A/An/The lowered.
- Entry pages never end in a dead end: every description is linked in a first pass ($DESCH, $LINKIN), and an entry with
  no "See also" from the profiles or the state histories gets one from the entries that mention it and those its
  description names (LinkedNear: pictured first, then the most mentioned; 2,462 pages had none). The pass replaces the
  loop's own LinkDesc call, so the build takes no longer.
Run it after any change to encyclopedia-data.js, encyclopedia-links.js, data/*.json, reading-paths.js, shared-data.js
EMPIRES or epoch-stats.js (about 15 minutes; -SkipEntries skips the entry pages, ~3 minutes, for testing), then
scripts/check-site.ps1 (every internal link resolves; one h1, title, description <= 160, canonical, JSON-LD per page;
every page served as text/html by an .htaccess; css/ up to date).
PowerShell 5.1 traps met in this script: variable names ignore case ($POS = $pos, $SM = $sm …: give script-level
tables distinct names); @($list) fails on New-Object generic lists (use foreach); ForEach-Object unrolls arrays it
outputs (write `, $point`); the comma binds tighter than arithmetic (`@((a + b) / 2, c)` needs parentheses); "$rr:" in a
double-quoted string is read as a drive-qualified variable and stops the parse (write "${rr}:").

## Atlas and maps
- `data/land.json` — present-day country outlines (Natural Earth 1:50m, public domain) projected with Equal Earth to a
  plane 1000 units wide (rings as hundredths): scripts/make-basemap.ps1 -Source <ne_50m_admin_0_countries.geojson>.
  Each country has n (ADMIN), names, sov (sovereign: dependencies carry it too, so it is matched last), ct
  (continent), label point, bounding boxes.
- `data/geo.json` — {state id: [lat, lng, source]} for all 5,468 states: scripts/fetch-geo.ps1 (Wikidata SPARQL, CC0;
  ids in scripts/geo-qids.tsv). Sources: 0 the register's capital (P36 with that name), 1 the state's own P625,
  2 another capital, 3 a place with the capital's name inside the present-day country (a capital met before, else
  the place with most sitelinks), 4 set by hand (scripts/geo-manual.tsv), 9 approximate: the country's centre
  (931 states; drawn as rings on the atlas, left out of static maps). A point outside the state's present-day
  countries and their dependencies is rejected and listed in scripts/geo-rejected.tsv (mostly wrong Wikidata ids).
- Geometry in scripts/lib/geo.cs (Add-Type): projection, Douglas-Peucker, rectangle clipping, compact path data.
  Maps are written in tenths of a unit (10000 wide, 4393 high: the plane is cut at 58° S).
- `/atlas` + atlas.js: a GLOBE by default (d3-geo orthographic on a canvas, /d3-geo.js — drag to turn, no projection) with a
  Flat map toggle (?view=globe|flat, localStorage epoch-atlas-view; falls back to flat if d3 or the canvas fails);
  year slider (3500 BCE–today) with play and a random-year die, zoom/pan/pinch, region presets, profile and kind
  filters, search, tooltips (nearest dot), labels from 2.2x zoom, the list of states shown (accessible view);
  ?year=, ?focus=<state id>, ?c=<country slug>, ?at=<lat>,<lng>. maps/atlas-data.js rows [id, name, start, end, x, y, flags (1 profile,
  2 approximate), kind (EmblemKind), region, lng, lat (degrees; approximate places keep their spiral spread via
  geo.cs Inv, the Equal Earth inverse), profile url (null when a 13th field follows), an approximate place's present-day
  countries (country-page slugs, | between)], plus presetsLL and countriesLL (centres + span in degrees);
  What was here? (the button by the view toggle, then a tap or click; a long press with a finger in either view; or
  "Use my location", which the browser asks for and which never enters the address): the states whose seat lay within
  250 km of the place (haversine on the rows' lng/lat; the 60 nearest when more, then oldest first), each with its
  years (a button: the atlas goes to its middle year and rings it), distance and a bar on one time axis, gold when
  alive in the slider's year; the approximate places of the present-day country under the point listed apart (by the
  13th field); the country's history linked (the smallest ring of globe-land.js around the point, fetched when
  needed); the place and its 250 km drawn on the map (a d3.geoCircle on the globe, a projected circle on the flat map).
  The flat map's point comes from atlas.js's Equal Earth port (EE.fwd/inv, as geo.cs; checked against the rows' x, y).
  "Seats, not borders" is said on the panel. Songs from here (4 Nov 2026): the panel also lists the songs of Songs in History whose
  place lies in the country under the point (data/songs-by-country.json {country page slug: [[song, title, year]]}, written
  by build-pages.ps1 from each song's place, the last present-day country named in it as a whole word; ATLAS_SONGS_SRC
  stamped into /atlas; deploy.sh DATA). window.epochAtlas for tests (scratchpad pw/r5-here.js). An address's
  place gets its panel before the first paint (the country line, with room kept for it on phones, and the places known
  only by their country fill in when globe-land.js arrives: globeData() fetches it once for the globe and the lookup).
  The page opens on ?focus=, ?c= or ?at= without a glide (rotateTo/animateTo "now"): the 650 ms turn redrew all
  the land every frame, 0.7-1 s of blocking on a slowed phone.
  maps/basemap.js outlines (styled by shared.css); maps/globe-land.js the same outlines in lng/lat (hundredths of
  a degree, rings rewound client-side with d3.geoArea), its ?v= stamped into /atlas's ATLAS_GLOBE_SRC. The globe's
  canvas colours come from the CSS tokens and repaint on data-theme changes. Note the hidden pitfall: an SVG
  element has no .hidden property - toggle the hidden ATTRIBUTE.
- `/timeline` + timeline.js: the World Timeline (hand page). maps/atlas-data.js (its ?v= stamped into /timeline as into
  /atlas and /games) drawn as bars founding–end in lanes by region (the 94 great empires first), packed into rows;
  Profiles (default, labelled gold bars, 190 rows) or All states (1,985 thin rows). The canvas is sticky inside a
  scrolling panel (#tl-spacer gives the height) and draws only the rows in view. Time zooms and pans on its own, without
  d3: drag sideways (touch-action: pan-y keeps vertical swipes for the panel), pinch, Ctrl/Cmd + wheel (a trackpad
  pinch), the buttons, arrow and +/− keys; a plain wheel scrolls the lanes. Era buttons, region toggles, search (opens
  the state's span and rings it), a click or a second tap opens the state or profile, "Open the atlas at <middle year>".
  The address keeps ?from=&to=&all=1&hide=. window.epochTimeline is there for tests.
- Small maps are inline SVG: state locators, century maps and the home page draw over `<image href=/maps/world.svg>`
  (fixed translucent gold, cached once); country pages carry their own clipped outlines, with the country itself
  drawn again on top as `map-land-hi` (lit gold with a glow; MapSvg -Hi, rings from $CRING) and its neighbours dimmed;
  their dots sit on a `map-dot-bg` halo. Dots are zero-length strokes with vector-effect: non-scaling-stroke
  (classes map-dot-*, sizes in shared.css).
Old #-addresses (/encyclopedia#slug, /state#id) still work: the index pages forward them. Every page has a title,
description cut at a sentence, canonical, Open Graph, BreadcrumbList + Article JSON-LD and visible breadcrumbs.

## Encyclopedia
- `encyclopedia/` index page (top-level nav item): search, type and conflict filters, 50 results a page, A–Z and
  century lists when nothing is searched; every entry has its own page at `/encyclopedia/<slug>`.
- `encyclopedia-data.js` — 32,149 entries (slug, name, type, aka, dates, desc, img, credit, tags, war, empires), 22,703
  with a picture. Generated.
  The entries added in Oct 2026 (people, places, events named in the state histories and profiles) were merged by scratchpad
  states/desc/enc-merge.ps1, which always starts from the saved originals (enc-orig/). Duplicate subjects are folded via
  enc-dupes.tsv, and pictures come from enc-images.ps1 / enc-img-credits.json (new entries only). 747 more pictures
  were chosen by eye on 28 Oct 2026 for the most-linked entries that had none (the Wikidata image and Wikipedia lead
  image, on contact sheets: the subject itself, a map only for a place, people, war or battle, never a namesake or a
  modern imagined portrait): scripts/entry-pictures.tsv, written in by scripts/apply-entry-pictures.ps1 (idempotent;
  an entry that has a picture keeps it). John F. Kennedy's White House portrait joined them on 29 Oct (for his Berlin
  speech page); as make-home-data was not re-run (it reshuffles the daily quiz), his rows in search-index.js and
  search-facets.js got their picture flag by hand.
- Entries added after the merges (R9, 29 Oct 2026): scripts/added-entries.json, applied by
  scripts/apply-added-entries.ps1 (idempotent): the sites, objects, texts, events and people the culture and movement
  profiles name and the encyclopedia lacked (Mohenjo-daro, Knossos, Mycenae, La Venta, Mesa Verde, Karl Marx, Mary
  Wollstonecraft, Harriet Tubman, Kabir …: written by agents with scratchpad r9/ENTRIES-GUIDE.md from one Wikipedia
  article each and checked one by one, log r9/factcheck-r9.md; pictures chosen by eye on contact sheets, as above),
  each with its link row; "patterns" (another name for an existing entry: the curly-apostrophe forms the kinds' texts
  use, "St. Bartholomew’s Day Massacre", and rows for the 55 entries of the speeches release that had never had one,
  so nothing could link Frederick Douglass, the Reign of Terror or the Ninety-five Theses), "pictures" (Afrasiab had
  the mythical king's picture), "fixes" (descriptions corrected: Lorenzo Valla, Kant, the Voting Rights Act, the
  Pazyryk burials, the Polynesians, the Self-Strengthening Movement's dates), "drop" (a name taken out of a row:
  "the Thirty", an aka of the Thirty Tyrants, starts further left than "Thirty Years' War" or "Thirty Comrades" and so
  took them on 155 pages; the 41 state histories it had claimed were relinked in data/states and the scratchpad's
  states/desc/linked.json and enc-states.json, r9b/fix-thirty-states.js) and "forms": short names that would
  also match something else in the entries or the state texts ("Kabir" inside "Ali Bey al-Kabir", "Vix" in the Vix
  Note, "Chaco" in the Chaco War, "San Lorenzo" in Genoa's cathedral), kept as profile-only rows for the profiles
  where they mean the entry ({profile: [sections]}: the row after fs, first in byEmpire, and the profile named on the
  entry). An entry's own row is skipped on its own page (LinkDesc), so a bare short name would link inside the
  entry's own title: test a new pattern with scratchpad r9/links-check.js (entries, profiles, state texts) and
  r9/form-where.js. The patterns were chosen in r9/link-patterns.tsv. Run it right after apply-entry-pictures, and
  again after enc2/enc-links-pack, a profile scan (enc-empires-apply / enc-prof-apply rebuild byEmpire) or
  enc2/prof-forms (it rebuilds the rows after fs): it sets the entries' rows back and restores the forms. It also
  gives every entry an `empires` list where it has none: the 55 entries of the speeches release had no list, so
  enc-prof-apply could never record a profile naming them (Frederick Douglass's page listed no profile).
  Since 30 Oct 2026 the file is edited directly (the R9 composer is not run again). Fixes found while checking the
  social ladders: chonin (Confucian theory, not law, ranked them below peasants), faxian (his journey 399–412, dates
  "fl. 399–414"), xiang-jun (the prefectural armies, not the standing army), millet-system (Braude's dating),
  benin-bronzes (from the 14th century, not Portuguese contact; dates "14th century–1897"), mamluk (often freed);
  "patterns" kiwalao "Kīwalaʻō"; ibn-battuta's dates are in person-dates.tsv. A fix's old text is replaced everywhere
  in the entry's line, so a fix whose text also stands in the dates goes after the one that changes the description.
  "drop" also takes out five names that linked wrongly almost everywhere: "homeland" (Bantustan: 171 entries, 45
  profiles, 39 state texts), "king of kings" (Negus nagast), "Moon" (Muhu: the Space Race linked an Estonian island),
  "Kitab" (Kitob) and "astronomy" (Babylonian astronomy); profile-only forms keep the right uses (South Africa's
  homelands, Aksum's king of kings), and "exclude" ([slug, profile] into ENC_LINKS.ex, which generator.html and the
  scans honour) keeps the Kitob form off the Sokoto and Ghaznavid profiles, where "Kitab" names books. After the drop
  the five entries' mention lists were rewritten from the pages (r9b/page-mentions.js + mentions-from-pages.js: 44
  removed), the state texts unlinked where wrong (scratchpad soc/unlink-states.js: 24 made plain, 9 kept; linked.json
  in step) and data/enc-states.json patched for those entries only (make-enc-states fresh + r9b/enc-states-patch.js).
  The state and empire profiles were then scanned for these entries alone (the R9 entries, the 56 without a list and
  those given new names): scratchpad t/design/t-encemp-r9.html (polities only, honours ENC_LINKS.ex and self, writes
  base64: --dump-dom reaches PowerShell through the console code page, which once turned "Canton of Zürich" into a
  stray profile name) and r9/enc-polity-apply.ps1, which only appends (mentions, byEmpire indexes), so nothing
  linked before moves and the profile-only forms keep their places; r9/polity-exclusions.tsv goes into ENC_LINKS.ex
  first (Eastern Jin x laozi: "the Laozi" there is the book). 27 mentions (the Thirty Years’ War in twelve more
  profiles through its curly form, Sidon, the Royal Society, the Peasants’ Revolt …); self["Knossos"] = knossos, so
  that profile claims its own name without linking it. r9/polity-diff.js compares the polity side with HEAD.
  The mention lists of the 64 profiles of the other kinds then became exactly what their pages link (168 removed, the
  sections of 111 set): t-encprof's scan tries each row on its own, so it counted "Priscus" inside "Tarquinius
  Priscus", "Martin Luther" inside "Martin Luther King Jr." and "Africa" inside "South Africa", and it reads the facts
  as JSON, so the key "homeland" named Bantustan in eleven profiles. Scratchpad r9b/page-mentions.js runs
  generator.html's own linkify in Node on the parts the template links (its output matches all 490 pages),
  r9b/mention-compare.js lists the differences and r9b/mentions-from-pages.js rewrites the lists (the kinds, or given
  entries on every profile). After a kinds scan, run it again before keep-order.js.
- Conflicts & Resolutions: entries carry `tags` (battle, siege, war, campaign, revolt, revolution, crisis, treaty, peace;
  2,528 entries) and `war:"<slug>"` (the war a battle/treaty belongs to). Written by enc2/apply-conflicts.ps1 — run it
  once on fresh enc-merge output (a rerun drops names).
- Person dates (Oct 2026): scripts/person-dates.tsv holds the dates checked by hand (lifespans only where well
  attested; otherwise the year the entry gave, marked "r." reigned or "fl." flourished) and, for the people in the
  dated games whose dates are a reign, an accession or a death, their birth year ("-" = not known: they stay out of
  Which Came First and Order the Ages). scripts/apply-person-dates.ps1 applies it to encyclopedia-data.js and
  data/enc-preview, writes "born/died N" as "b./d. N" and drops a doubled "around c."; it is idempotent. Run it right
  after every enc-merge (which starts again from the originals). The builder's YearOf/Span skip the day of a full
  date (Clean: "13 July 1260" is 1260, not the 1st century). 28 Oct 2026: every plain lifespan (the year pages list
  them as born/died) was compared with Wikidata's P569/P570 (scratchpad days/wd-persons.js, compare-dates.js) and with
  the entry's own text (terms-from-desc.js): 12 were terms of office (Albuquerque's 1509–1515 governorship, Baji Rao's
  years as Peshwa …) and are fixed here; most other disagreements were Wikidata namesakes or disputed births, left alone.
  Same day: 564 of the 1,019 people who had no dates at all got them (Napoleon, Charlemagne, Timur, Kublai Khan …;
  Wikidata's dates read by eye against each entry, a reign where the birth is unknown; scratchpad r6/dates-decisions.tsv
  says why the other 455 stay undated: legendary or biblical, no reliable item, or dates too uncertain).
- New entries since Nov 2026 (A7, scripts/entries/): candidates from what the site names and lacks
  (harvest-names.js: proper names in the profiles of the newer kinds; the ladders' MISSING lines; the speeches' gaps),
  prepare-list.js (titles through redirects, a slug as toSlug makes it, subjects that have an entry dropped),
  scripts/kinds/fetch-articles.js, agents with ENTRIES-GUIDE.md (one article each, 380-700 characters), check-entries.js
  (every number and name not in the article), the editor's read, merge-entries.js <wave> <links.json> <fixes.json> into
  added-entries.json (marked "wave"; links default to the name, surnames only where unambiguous), pictures.js (cands,
  fetch at 320 px with 3 s between files and Retry-After honoured, sheet, apply: free licences only, chosen by eye), then
  apply-added-entries, clean-credits, pattern-count (wave 1 dropped "Bodin": Constantine Bodin; "Qutb": Qutb al-Din
  Aibak; "Four Books": Palladio; "Orwell": the estuary), link-scan.js --write --entries=<slugs> over every kind in
  slices of 30 (append only), apply-added-entries again, regen-profiles, a full build. The builder gives new entries
  their search rows, facets and preview cards. Wave 1 (3 Nov 2026): 107 entries, 91 pictured, 261 profile links; wave 2
  (3 Nov): 137; wave 3 (4 Nov): 184, the ladders' ranks and people; wave 4 (4 Nov): the ladders' remaining names, the
  people and events the songs and speeches name. A row of encyclopedia-links.js is never deleted (byEmpire holds row
  INDICES: a deleted row shifts every later profile link); a pattern that must go is replaced by text that cannot
  match ("Indica of Megasthenes"). "dates" in added-entries.json ([slug, dates, "no-y"?]) date existing entries and
  their preview cards: 67 of the undated events (4 Nov 2026), each from its article (six left out: the crusade as a
  concept, the Dano-Swedish wars, decolonisation, the Literary Inquisition, the Sahel mission, Urshu). An event gets
  its years in ENC_LINKS.y unless "no-y": the world wars, the Reformation, the Black Death, the Treaty of Versailles,
  the Dutch Revolt, the Franco-Prussian, Livonian and Italian Wars stand beside other years in running text ("after
  the First World War, in 1920") and would have lost 31, 29, 8 … right links (scratchpad a7/ev/lost.js measured it).
- Pipeline after a merge: apply-conflicts, apply-person-dates, apply-entry-pictures, scripts/apply-added-entries.ps1, scripts/clean-credits.ps1 (see the pictures below), enc2/enc-links-pack, design/run-scan.ps1 -Page t-encemp + enc-empires-apply,
  run-scan -Page t-encprof + prof/enc-prof-apply, enc2/prof-forms, link-state-texts, make-previews, make-home-data,
  make-search-states, build-state-data, make-enc-states, prof/section-images, prof/regen (490 pages), then verify-pages
  and prof/verify, then scripts/build-pages.ps1 and scripts/check-site.ps1. Headless Edge pages that touch all profiles run in slices of 30–40 (one page for all crashes the
  renderer and Edge then waits forever), each in a job with a time limit, with --no-first-run --disable-sync and their
  own --user-data-dir (Edge 156 otherwise opens a sync sign-in page that blocks the run).
- `encyclopedia-links.js` — finds entry names in text. Loaded by `generator.html` (gold `.enc-link` links on
  empire pages: first mention per section, never the empire's own name) and by the encyclopedia page (links inside
  descriptions). Written by scratchpad states/desc/enc2/enc-links-pack.ps1 (run after enc-merge):
  - `e` rows `[slug, [[text, mode], ...]]`; `ENC_FN.rx(text, mode)` builds the regex (mode 0 name, 2 name with
    either-case first letter, 1 lowercase term). Rows from `fs` on are profile-only short forms (prof-forms.ps1),
    listed first in `byEmpire[profile]`; the encyclopedia page and the state linker ignore them.
  - Name groups `["@g", [[text, mode]], [slugs], primary]`: a name several entries share ("Sack of Delhi" 1739 /
    "Sack of Delhi (1398)", "Leopold II", "Treaty of Paris (1763)/(1783)…"). `ENC_FN.pick` chooses the entry that fits
    the year written in the same sentence, else the one whose dates overlap the page's period most (profile span,
    state s–e, or the host entry's dates), else the entry that has the plain name, else no link. `ENC_FN.ok`: a dated
    event next to a contradicting year is not linked. Undecided text is still claimed, so no shorter name inside links.
  - `y` {slug: [from, to, kind]}, `ex` {profile: [slugs not linked there]}, `byEmpire`, `self`.
  - `ENC_FN` is the file's footer (scratchpad enc2/enc-fn.js); enc2/enc-fn.ps1 is the PowerShell port used by
    link-state-texts.ps1 — keep them in step (design/t-pick.html + enc2/pick-test.ps1 check both on the same cases).
- `images/encyclopedia/<slug>.jpg` — freely licensed Wikimedia Commons thumbnails; author/licence/source
  are in each entry's `credit` and shown under the image. Keep the credit if an image is reused.
  Credits are plain text. scripts/clean-credits.ps1 (idempotent; -Check, -Review <file>) cleans the author field of
  encyclopedia-data.js, empire-section-images.js and data/states/*.json in place: Commons' Artist field arrives as
  flattened HTML, which had left entities escaped twice ("W. &amp;amp; D. Downey" on 173 pages), "(talk)" links,
  "User:" prefixes, file names of the maps a derivative was drawn from, URLs, doubled text ("Unknown authorUnknown
  author"), texts cut mid-word and wiki templates nobody filled in (Agricola's "{{creator:|Year = }}" is now
  "Unknown author"). A derivative becomes "Author; derivative work by Other"; a credit is at most 140
  characters, cut where a part or sentence ends (the source link carries the rest). scripts/credit-overrides.tsv
  gives the full Commons text for the 191 cut short at import (`File:<title>` TAB author). Run it after every
  enc-merge (which starts from the originals). build-pages.ps1 and generator.html also decode a credit before
  escaping it, so an entity can never show twice escaped again.
- `images/encyclopedia/thumbs/<slug>.jpg`, `images/states/thumbs/<id>.jpg` — 112 px (shorter side) JPEG copies, about
  a quarter of the bytes, for pictures shown at 56 px or less: list tiles (44 px), result thumbnails (.enc-thumb, 56),
  speech portraits on /speeches/ (56), the people chart (28). scripts/make-thumbs.ps1 makes them (only new or changed
  pictures; thumbs of removed pictures are deleted); build-pages.ps1 runs it first and ThumbOf() links a thumb only
  where one exists; /search, the /encyclopedia/ results and people.js link thumbs directly with an onerror fallback to
  the full picture. Measured Oct 2026: WebP copies of the full pictures saved only 8% at the same quality (the
  pictures are already well compressed), so the site stays on JPEG.

## Kinds of profile (not only empires)
The Institute profiles states and empires and, since Oct 2026, religions (18; 30 since 3 Nov 2026), languages (16; 32 since 3 Nov 2026), cultures (15: the Indus
Valley, Minoan, Mycenaean, Olmec, Maya, Nok, Lapita, Mississippian and Ancestral Puebloan cultures, the Scythians,
Celts, Etruscans, Phoenicians, Vikings and Sogdians; 30 more on 2 Nov 2026, the user asking for more of Asia and South
Asia: Mehrgarh, Vedic, Painted Grey Ware, South Indian megalithic, Sangam-age Tamilakam, Jōmon, Yayoi, Yangshao,
Liangzhu, Sanxingdui, Mumun, Dong Son (written without Đ, which toSlug drops), Ban Chiang, Oxus, Ainu, Natufians, Ubaid,
Yamnaya, Bell Beaker, Thracians, Sámi, Igbo-Ukwu, Kerma, Nazca, Hopewell, Taíno, Thule, Mapuche, Caral–Supe, Māori); 20 more on 3 Nov 2026 (release A2 of the expansion plan, ranked by scripts/kinds/rank-cultures.js): the San, Khoekhoe, Tuareg, Aboriginal Australians, Kalinago, Inuit, Navajo and Lakota as living peoples, and the Clovis, Paracas, La Tène, Hallstatt, Cucuteni–Trypillia, Nuragic, Iberian, Tocharian, Longshan, Hongshan, Erlitou and Hoabinhian cultures,
movements (15: Renaissance humanism to the anti-apartheid
movement) and, since 31 Oct 2026, forms of government (20: see "Forms of government") and, since 3 Nov 2026, ideologies (20: the A6 round below). A culture's sections are origins, society, beliefs, arts, exchange, legacy and its facts
homeland, period, known, sources; a movement's background, aims, events, people, outcomes, legacy and where, period,
figures, outcome. A kind that has a `period` fact shows it in the facts box instead of the bare span (generator.html
kindFact). `PROFILE_KINDS` in shared-data.js defines each kind: label, single, URL folder (`path`),
sections, the facts box (`facts`), the page title (`title`: "History, Beliefs and Spread"), the word for the living
(`alive`: "practised today" / "spoken today") and whether it has a power curve (`chart`: explorer, radar stats,
related empires, the mini connections map; religion and language have none). Helpers: `profileKind(e)`,
`profileSubtype(e)`, `profileUrl(e)`, `profileSpan(e)` ([first, last]: the curve's years, else start–end, end null =
living = 2025) and `profileSpanText(e)` ("c. 500 BCE – present"; `circa`, `endCirca`). EMPIRES rows without `kind` are
polities (/empire/<slug>, unchanged); a kind's rows are {name, region (of origin), kind, start, end, circa?, endCirca?}.
Code that needs `points` keeps to polities: explorer, the centuries' great powers and the open data (the builder's
$POLS), the radar stats; index, quiz.js and profiles use profileSpan; the builder's ProfUrl gives a name's page.
Since 2 Nov 2026 the tools are committed in scripts/kinds/ (the scratchpad tools below were lost with their sessions):
- the A2 round (3 Nov 2026): rank-cultures.js <titles> <out.tsv> ranks candidates (Wikidata editions, article length,
  mentions on the site; rank-cultures.tsv), fetch-articles.js saves them, CULTURES-GUIDE.md is the agents' brief (living
  peoples in the present tense, colonial violence named plainly, event dates with at most four digits), and
  check-drafts.js <kind> <drafts> <articles> [slug=article …] flags missing keys, counts, asides, hype words, events out
  of order and every number or name not in the article, for the editor to read first. Every draft was then read against
  its article (scratchpad a2/factcheck.md). generator.html's eventYear now reads commas, five-digit years and
  millennia ("c. 11,100 BCE", "5th millennium BCE"; until then "c. 14,500 BCE" plotted at 14 BCE on Jōmon's timeline).
- the A3 and A4 rounds (3 Nov 2026): twelve religions (Mesopotamian, Canaanite, Roman and Celtic religion, Slavic
  paganism, Mithraism, Tengrism, Bon, Chinese folk religion, the Druze faith, Yazidism, Haitian Vodou; ranked in
  rank-religions.tsv) and sixteen languages (Pali, Tamil, Malay, Mongolian, Armenian, Georgian, Middle Persian, Ottoman
  Turkish, Old English, Gothic, Old Church Slavonic, Phoenician, Coptic, Ge'ez, Guarani, Hawaiian; rank-languages.tsv).
  RELIGIONS-GUIDE.md also asks for each religion's faith-map block (scripts/faiths.tsv), drafted from the same article;
  LANGUAGES-GUIDE.md asks for plain glosses of technical terms. Where an article proved thin on a people's history the
  draft was rewritten from fuller articles (Yazidism from Yazidis and Persecution of Yazidis: its own article's History
  section is empty). update-counts.js [--check] rewrites the profile counts typed into index, /profiles, /faiths and
  llms.txt from EMPIRES (they had gone stale: 510 profiles, 15 cultures); the builder now counts the faith maps itself.
  New languages get no Write-in-scripts keyboard until scripts/scribe has their signs (generator.html hasScribe).
- the A5 round (3 Nov 2026): twenty movements (ranked in rank-movements.tsv) drafted with MOVEMENTS-GUIDE.md, which asks
  for contested modern subjects (Zionism, the Arab Spring) to give each side's view as the article does, attributed.
- the A6 round (3 Nov 2026): ideologies, a new kind (PROFILE_KINDS ideology: sections origins, ideas "Core Ideas", spread
  "Spread & Variants", power "In Power", critiques "Critiques & Debates", legacy; facts thinkers, texts, ideas, today; title
  "Origins, Ideas and Legacy", alive "held today"; folder ideology/, wired as the other kinds: .htaccess, deploy.sh, $PROF and
  the builder's kind lists, check-site, split-css, shared-nav, passport, seo-audit; a hatched grey bar on /profiles' timeline,
  .tl-k-ideology, as the five category colours and the grey were taken): liberalism, conservatism, republicanism,
  nationalism, capitalism, socialism, communism, anarchism, social democracy, Maoism, fascism, Legalism, mercantilism,
  imperialism, Kemalism, feminism, pan-Arabism, Hindutva, Islamism, Peronism. IDEOLOGIES-GUIDE.md asks for the record in power
  told as the article tells it (repression, famines and genocides named with the article's figures and attributions) and
  critics' arguments as theirs. make-ideology-entries.js wrote entries for the twelve without one (as make-form-entries.js);
  self.tsv names all twenty. 42 namesake links excluded (Isaiah Berlin as the prophet and the city, Fausto-Sterling as the
  pound, "Hume" as Hummay, Latin American as Latin, the Paris Commune as Paris …): a1/link-audit.js misses a link whose
  text is the entry's own name, so the scratchpad a6/caps.js also lists links standing next to another capitalised word.
  Ideologies stay out of PersonRegion (as the forms of government: they name people from everywhere). home-pics.js now
  writes the hide option (it had dropped it, so the Derg, Manchukuo, Rhodesia and the Confederacy were featured).
- great works (6 Nov 2026), a new kind (PROFILE_KINDS work: sections origins, content "What It Is", making "How It Was
  Made", reception, survival "Survival & Rediscovery", legacy; facts made "Made by", form, where "Where it is now", known; title
  "History, Meaning and Legacy", alive "surviving today"; folder work/, wired as the ideologies were: .htaccess, deploy.sh,
  the builder's kind lists, check-site, split-css, shared-nav, passport, seo-audit, update-counts, llms.txt, a gold-dotted
  bar on /profiles' timeline, .tl-k-work; a work places no person, PersonRegion): ten texts (the Epic of Gilgamesh, the Code
  of Hammurabi, the Iliad, the Mahabharata, the Analects, the Shahnameh, One Thousand and One Nights, The Tale of Genji, the
  Divine Comedy, the Popol Vuh) and ten monuments (the Great Pyramid of Giza, the Parthenon, the Great Wall, the Terracotta
  Army, the Hagia Sophia, Angkor Wat, Borobudur, the rock-hewn churches of Lalibela, Machu Picchu, the Taj Mahal). WORKS-GUIDE.md
  is the brief (authorship and dating as the article hedges them; sacred texts as believers hold them; removals such as the
  Parthenon sculptures with each side attributed; no place "discovered" that its people knew); every draft read against its
  article. make-work-entries.js wrote entries for the three without one (pictures chosen by eye); self.tsv names all twenty;
  22 namesakes excluded (Ezra Pound as the prophet, Vishnu Sukthankar as the god, Rimsky-Korsakov as Korsakov, New South
  Wales as South Wales …). Emblems: a sign of each work's own script or name (make-emblems.js). Genji has no section pictures
  (every candidate was another age's thing or a flag).
- sources: scripts/kinds/src/<slug>.json ({name, region, start, end, circa, endCirca, info, facts, t, dyk, ev, sections
  (<p> HTML), summary, references, notes}), drafted by agents from saved Wikipedia articles, then fact-checked by three
  other agents, each fix an exact old/new pair with the article's words (125 for the 30 cultures, applied after review;
  the scratchpad r2: CULTURES-GUIDE.md, CHECK-GUIDE.md, check-fixes.js);
- merge-kinds.js <kind> <slug> … (--replace to rewrite): appends to shared-data.js, empire-profiles.js, empire-glance.js
  and empire-facts.js, refusing a name already there; every file must still evaluate;
- link-scan.js [--write] [--report=f] <names> | --kind=k --from=N: runs generator.html's own linkify in Node (read from
  the file and instrumented), so the lists equal the pages; writes byEmpire (rows that matched anything, so claims stay)
  and the entries' "empires" lists; applies link-exclusions.tsv (ENC_LINKS.ex) and self.tsv (ENC_LINKS.self). Rows are
  pre-filtered by the longest word of their names (each pattern tried compiles to machine code: all 38,000 pass 1 GB),
  and the heap still fills after about 8 profiles: run it 5 profiles at a time. Checked against Nok, Olmecs, Vikings and
  Celts: the same mentions, but for entries added after their last scan. Read its report: names inside longer names link
  wrongly ("David" for David Anthony, "Chester" for Chester Gorman, "Havana" for the Havana Hopewell, "Dorset" for the
  Dorset people, "Middle Kingdom" for Middle Francia, "Glass" for Gla): 26 exclusions for the 30 cultures;
- section-pictures.js sheet <out.html> <name> (REPORT=<link-scan report>) | write: contact sheets, then pick.txt;
- make-emblems.js [names]: the house-style emblems drawn in headless Edge (EPOCH_PW = a folder with playwright-core).
Older kinds (before Nov 2026): the texts of these kinds are scratchpad kinds/src/<name>.txt (the cultures and movements written by agents with
r9/KINDS-GUIDE.md and checked one by one, log r9/factcheck-r9.md; format at the top of kinds/merge-kinds.ps1: header
lines, the kind's facts, three takeaways, a "Did you know?", 5–8 key events, six sections, summary, references; every
fact checked, references real), merged into shared-data.js (EMPIRES, EMPIRE_INFO), empire-profiles.js, empire-glance.js
and empire-facts.js by kinds/merge-kinds.ps1 -Only <names> (idempotent; shared-data.js keeps LF and its lone CR; never
run it without -Only: it would wipe the reviewed gold-link data of the other kinds). After a rescan, r9/keep-order.js puts
the earlier profiles' mentions in each entry's "empires" list back in their committed order (r9/mention-diff.js lists
what else changed; --gained=slug,… accepts an earlier profile that now names an entry by a new name), and
scripts/apply-added-entries.ps1 puts its profile-only forms back. Then:
- gold links: design/run-scan.ps1 -Page t-encprof -Kinds (t-encprof.html?kinds=1, served from the test folder t/; a
  profile's own entry is the one of its kind bearing its name, so Sumerian is not Sumer) and prof/enc-prof-apply.ps1;
  kinds/audit-links.ps1 lists every link with its entry (kinds/audit.txt, aliases starred) — wrong matches ("Middle
  Kingdom" → Middle Francia, "Book of Kings" → Pararaton) go into kinds/link-exclusions.tsv, which kinds/links-fix.ps1
  writes into ENC_LINKS.ex (the scan honours ex) after clearing the kinds' mentions from the entries for a fresh scan;
- section pictures: kinds/section-images-kinds.ps1 (t/prof/mentions-kinds.html; kinds/pick.txt holds the choices made
  by eye, "-" = no picture rather than a map, a flag or a modern city view);
- home pictures in scripts/home-pictures.tsv, make-home-data, scripts/regen-profiles.ps1, the posters, a full build.
To add a further kind: a PROFILE_KINDS entry, rows and texts as above, the folder's .htaccess (copy empire/.htaccess)
and redirect, the folder in PROFILES in scripts/deploy.sh and $PROF in build-pages.ps1, then the pipeline. The profiles
page filters by kind (?kind=).

## /start — Find Your Way In
A one-question-at-a-time wizard (progress dots, Back, auto-advance on choice, the optional region question can be
skipped; without JS the four questions show as one form). Four questions (pull, era, pace, region) score six reader
types (Strategist, Navigator, Thinker, Chronicler, Builder, Timekeeper). Recommendations come from reading-paths.js:
the paths whose types[] lists the reader type, ranked by the era answer (main era first, then paths reaching into it;
the type's own paths before shared ones, then paths keeping to fewer eras; "All of it" keeps the catalogue order), the
region answer (seven regions with Oceania) swapping in the last one; plus two tools. All client-side (epoch-reader-type; "Save these to My shelf" writes the paths into
epoch-shelf). Linked from the Explore menu, the footer and the homepage first-visit banner (epoch-start-seen),
which never shows once a reader type exists. The homepage also shows "Continue where you left off" (epoch-recent,
≥2 items) instead of the banner.

## /passport — My Passport
Hand page (noindex) + passport.js: what this browser has read and played, kept in localStorage only (built in Oct 2026
as "My History"; renamed My Passport, the name readers look for). shared-nav.js
records every reading page in epoch-seen (profiles of every kind, entries, states, countries, centuries, years,
people, days, speeches, paths, essays, articles, social ladders; at most 3000) and the UTC days with a visit in epoch-visits. The
page shows pages read, days, the visit run, 28 stamps with their rules and progress (earned stamps are kept in
epoch-badges, so a broken streak does not take one away; quiz, Daily Ten, Connections, Crossword and Who Said It?
streaks keep their best run as b), pages by kind, profiles by region (EMPIRES), the 51 centuries visited, paths
finished (epoch-paths + epoch-seen), Test yourself (epoch-tests: passed at 80% of a page's best score; the "Examined"
stamp for 10 passed), games played (of 11), recent pages. Share sends a poster of the stamps (share-card.js stamps layout). A backup
code (`EPOCH1.` + base64 JSON of the epoch-* keys) carries the passport to another browser, e.g. out of an in-app
browser; restoring adds to what is there (lists joined, best runs kept). Clear asks twice. Linked from the Explore
menu (desktop and phone), the shelf menu, the footer, the Research Hub ("Play") and the home page's "Continue where you
left off" header.
My timeline (the section after "What you have read"): every page in epoch-seen placed in time, as lanes on one axis of
years coloured by kind (the --cat slots: profiles gold, entries blue, states magenta, centuries/years/countries/speeches
green), with a key, the count of pages that have no date (days, paths, glossary terms, essays, undated entries), a list
of the same ("Show them as a list") and Share (share-card.js `timeline` layout, drawn as the pointer nears the button).
Profiles from EMPIRES (profileSpan); centuries, people by century and years from their addresses; entries, state pages
("s:<id>"), country histories ("c:<slug>", first state's founding to today) and speeches ("p:<slug>") from
data/spans/<c>.json ({key: [first, (last,) name]}, one file per first character of the address's last part, 1.2 MB
in all, only the files a reader's pages need, fetched when the section nears the screen; build-pages.ps1 "My timeline"
writes them, deploy.sh DATA carries them, SPANS_V in passport.js). Hover or a first tap names a line, a click or a
second tap opens it. window.epochPassport.timeline() / timelineCard() for tests (scratchpad pw/r5-tl.js).

## /weekly — My Week of Daily Games (4 Nov 2026)
Hand page (noindex, not in the sitemap, like /passport): the last seven UTC days of the daily games side by side, read
from the games' own records in localStorage epoch-games (daily-<day>, conn-<n>, cw-<n>, said-<n>, songq-<n>, each game's
#1 day as in games.js), with the week's totals and Share (a share-card.js rows poster and text). Linked from the Play
menu, the footer, the top of /games and the site search. The daily quiz keeps only today (epoch-quiz), so it is not in it.

## /games — History Games
Hand page, eleven client-side games behind tabs with a sliding marker (deep links #pairs #order #ranks #hunt #first #puzzle
#words #year #conn #cross #said; #words-<theme> opens a Word Hunt theme; last tab in localStorage epoch-games-tab). The logic is games.js
(bump games.js?v= on the page). Level switches (segmented buttons) and bests are kept in localStorage epoch-games; in
Kids mode an unchosen level starts easy. Every game carries a round token (P.id, O.id, F.id …) that its timers check:
a timer left from an earlier round (New round pressed mid-flip) does nothing. Sounds: tiny WebAudio tones (no
files) behind the speaker button, on by default only in Kids mode (woken on the first tap: see "In-app browsers").
Every finish card's Share sends a score poster (share(), see "Sharing").
- Pictures for the new games: scripts/game-pictures.tsv, chosen BY EYE from contact sheets (the subject itself: no
  maps, coins, diagrams, inscriptions or texts; slug, puzzle set, place in the set; the `# sets:` line orders the
  sets). build-pages.ps1 writes games-data.js: GAME_CARDS [slug, name, kind, first year, last year, dates, picture,
  big picture, caption, fit for Kids mode (0 for conflicts), credit, source], GAME_PUZZLES (sets of big pictures),
  GAME_WORDS (scripts/word-hunt.tsv), and stamps games-data.js?v= into the page. Years come from
  [EpochBuild.W]::Span (so BCE ranges sort right; a person's first year is the birth, which
  scripts/person-dates.tsv gives where the dates are a reign or a death: Alexander was "born 336 BCE" before). Big pictures:
  images/games/<slug>.jpg, 800 px Commons thumbnails from scripts/fetch-game-images.ps1. The entry's credit is shown
  under every picture.
- Emblem Pairs: 3-D flip cards, Easy/Medium/Hard = 6/8/10 pairs, timer, stars, "New best". Cards come only from
  games-emblems.js: GAME_EMBLEMS (199 profile emblems that are flags or coats of arms: no maps, portraits, coins,
  statues or lettered placeholders) and GAME_EMBLEM_CLASH (index pairs alike in colour, never dealt together).
  Written by scratchpad games/emblem-sort.ps1 (state profiles judged by the Wikimedia file name of their picture
  credit, the 94 empires by labelled contact sheets) and games/emblem-final.ps1 (hand list of look-alikes, 8x6
  colour signatures). Re-run both when logos change and bump games-emblems.js?v=.
- Order the Ages: 4/5/6 dated pictures at least 150/80/40 years apart, ordered by their first year; drag by the
  grip, arrows, or tap two cards to swap (FLIP animation), a staggered check, then the years. Its board is
  orderBoard(G) ({pre, key, label, img, reveal, rank, onWin}: deal, render, drag, arrows, tap-swap, FLIP and check),
  shared with Order the Ranks.
- Order the Ranks (#ranks): 4/5/6 ranks of one society (Easy/Medium/Hard), put in order from the top; only `firm`
  ranks at distinct levels are dealt (see "Social ladders"), from ranks-data.js (GAME_RANKS [slug, short, of, kids,
  [[title (the rank's own name, the English one in brackets), its other words, level, why, kid, picture, n, picture
  credit, its source]]], written by build-pages.ps1, RANKS_SRC stamped into /games). Every rank has a picture (no
  numbers on the cards since 31 Oct 2026). The check shows each rank's "why"; the finish card links the ladder, lists
  the pictures' credits (rkCredits) and shares a pics poster. Kids mode starts at 4 and deals only the Kids ladders.
- Globe Hunt: d3-geo orthographic globe (/d3-geo.js) loaded on first open; HUNT_SRC in the page holds the ?v= of maps/globe-land.js
  and maps/atlas-data.js (stamped by build-pages.ps1). Famous states (profiles) or all states; five rounds in five
  different regions (no state twice); drag with inertia, wheel/pinch/± zoom, keyboard (arrows turn, +/− zoom, Enter
  drops the pin at the crosshair), a hint (−20 points, names the region), a pin and a great-circle arc to the
  answer, medal dots and a summary. Three freezes fixed in Oct 2026, keep them fixed: zooming during an animation
  only retargets its zoom (replacing the animation dropped the reveal callback and the round never ended); a pinch
  that ends as a one-finger drag starts a fresh drag (a stale start made the rotation NaN; a non-finite rotation
  falls back to the last good one); size() skips a hidden canvas (0 px) and showing the tab sizes it again.
- Which Came First?: two pictures, tap the earlier one. "Cultures and ideas" (4 Nov 2026) deals the profiles of cultures,
  movements, ideologies, religions and languages instead (GAME_IDEAS in games-data.js: the first year of each and the
  picture of home-pictures.tsv; ideologies left out of Kids mode), at least 100 years apart, as their first years are
  often approximate; the Daily Ten and Order the Ages keep to GAME_CARDS. A ladder of gaps, not a lottery: at least 800 years apart,
  then 300/120/50/15 as the streak grows (never under 300 in Kids mode); no picture twice in a game, the kinds of
  pair alternate, three lives, best streak per choice (everything / people / events and works).
  The first choice, and what newcomers get, is the Daily Ten (#first-daily; the home page's "Today's challenges"
  card links it): the same ten pairs for everyone on a UTC day (dailyPairs: a shuffle seeded by the day of
  DATED cards, gaps narrowing band by band from 900 to 15 years), no lives, a score out of ten kept per day
  (epoch-games daily-<day> {m: answers}, resumed after a reload) with a streak (daily-streak {n, last}). The finish
  card shows 🟩🟥 squares, "Daily Ten #N" (#1 = 26 Oct 2026), the countdown to the next one, Share
  ("Epoch Daily Ten #N: 8/10" + squares + link) and the newsletter line. Every other game's finish card has Share.
- Picture Puzzle: the GAME_PUZZLES sets in order (six: Wonders of the World, Treasures, Famous Faces, Art Through the
  Ages, Great Cities, Sacred Places), 3×3/4×4/5×5, a square crop drawn on a canvas, a deal in which no
  tile starts in place, swaps by tap, drag or keyboard, tiles in place lock, Peek; solved pictures (pz-solved) fill
  a strip.
- Word Hunt (16 themes, the Kids corner's 16: Egypt, Greece, Rome, knights, Vikings, explorers, inventions, buildings,
  China, Africa's kingdoms, Aztecs/Maya/Inca, Pacific voyagers, India, the Islamic Golden Age, Japan, Mesopotamia):
  scripts/word-hunt.tsv: `@key, title, introduction, picture` lines, then `WORD, clue, entry slug` (A–Z,
  3–12 letters). Easy 8×8 across and down (6 words of up to 8 letters), Medium 10×10 with diagonals (8), Hard 12×12
  in all eight directions with clues only (10). Grids are made in the browser and kept only when every word reads
  exactly once. Drag, tap the first and last letters, or type the word.
- Clues never give an answer away (scripts/lib/clue-check.ps1, dot-sourced by build-pages.ps1, which STOPS on a fault):
  a Word Hunt clue may not hold its own word (as a word or plural, a word of the clue inside it: "ship" for LONGSHIP,
  the word inside a clue word: "silkworms" for SILK, the same first five letters: Olympia, or written in parts: "Zheng
  He" for ZHENGHE), nor name another word of its theme (Hard shows only the clues). The crossword's clues follow the
  same rules for their own answer (a part of a two-word answer counts: "Sea …" for BLACK SEA) and may not name another
  answer of the same day's puzzle; make-crosswords.ps1 keeps such pairs out of new puzzles. 98 clues were rewritten for
  this in Oct 2026 (facts kept).
- Guess the Year: five rounds, one big picture from each age (not a person, dated within 25 years); the slider gives
  more room to recent centuries, ±1/±10 buttons (no year 0); points = 100 × (1 − distance / (2 × allowance)),
  allowance = max(20, a quarter of the years since).
- History Connections (#conn): sixteen tiles, four groups of four, one puzzle a day for everyone (UTC; #1 = 26 Oct
  2026, the puzzles taken in order and repeated after the last), the tile order seeded by the number. Four mistakes,
  "One away…", a guess already made is not counted; Shuffle, Deselect; the groups found as coloured bands (level
  1–4: yellow, green, blue, purple; .gm-cl1–4). The day's game is kept in epoch-games conn-<number> {s: groups found,
  m: mistakes, h: the levels of each guess, k: the guesses, done} and resumed after a reload; conn-streak {n, last, b}.
  The finish card: the squares (🟨🟩🟦🟪, also on the score poster's grid layout), every tile's entry, the countdown,
  Share, the newsletter line; earlier puzzles can be replayed for practice (not kept). The home page shows today's
  number and result beside the Daily Ten. Puzzles: scripts/connections.tsv (`@` starts a puzzle, then
  `level, group, Label=slug ×4`; a tile may link a page instead: `Label=/empire/…`, `/state/…`, `/countries/…`);
  build-pages.ps1 writes connections-data.js (CONN_PUZZLES) and stamps its ?v= into /games, and STOPS on an unknown
  entry or page. Every group's facts are checked against the entries; "Born in / Died in <year>" groups are read
  with [EpochBuild.W]::Life (scratchpad conn/years-check.ps1). Each tile belongs to exactly one group: a decoy that
  seems to fit two (Beethoven: composer, but born in 1770) works only because the other group has four without it.
  249 puzzles (to 1 July 2027: append more, never reorder). #61-#129 (Oct 2026): groups proposed with
  six candidate tiles, each with a quotation from its own entry that proves it (scratchpad conn2: GROUPS-GUIDE.md,
  verify-proposals.js checks the quotations, weights and repeats of published groups), assembled by assemble2.js
  (levels spread 1-4, at most one year and one wordplay group, no entry twice within 30 puzzles, no tile that is
  another group's candidate or names a year group's year) and read by eye: edits.txt holds the editor's tile
  changes (two tiles telling one story, loose fits, obscure hidden words), plan-fix.txt the swapped groups.
  #130-#249 (4 Nov 2026, release B1) the same way with tools now committed in scripts/conn/: GROUPS-GUIDE.md (the
  proposers' brief), verify-proposals.js, assemble.js <count> <out.tsv> --edits=<edits.json> [--write] <proposals …>
  (edits: drop, dropTile, rename, label, keep, level, and "apart": pairs of groups whose categories overlap without
  sharing a tile, never in one puzzle: Mamluk sultans / Slave soldiers who became rulers) and check-puzzles.js [day]
  [--from=N], which re-checks the whole file (#1-#129 carry 59 faults from before the 30-puzzle rule). Eight agents
  proposed 560 groups by region and era (scripts/conn/b1: p-*.json, edits.json written by make-edits.js); 29 dropped as loose or as another file's theme,
  9 tiles dropped, one level-3 group moved up (the level-4 pool is the one that runs short: propose more hard groups).
- History Crossword (#cross): a 12 x 12 criss-cross crossword a day for everyone (UTC; #1 = 27 Oct 2026; the puzzles in
  order, repeated after the last), plain clues, 13-17 answers. Tap a square (again to turn), type (keyboard: letters,
  Backspace, arrows, Tab / Shift+Tab to the next clue, Space turns; on touch screens the letters on screen, #cw-kb, so
  the phone's keyboard never covers the grid); the clue bar (sticky on phones) with ‹ ›, Across and Down lists (filled
  clues greyed). Check marks the wrong letters, Reveal a letter / the word, Show the answers (asks twice) ends the game.
  The clock runs while the tab is shown (hidden in Kids mode). epoch-games cw-<number> {g: the 144 squares, '.' empty,
  t: seconds, c: checks, r: reveals, w: wrong squares, s: revealed squares, done, gave} resumed after a reload;
  cw-streak {n, last, b} counts days solved without showing the answers. Stars: 3 no help, 2 checks only, 1 reveals.
  The finish card: time and help, every answer linked to its entry, the countdown, Share ("Epoch Crossword #N: 7:42, no
  help"; the score poster's cw layout draws the grid's shape, no letters), the newsletter line; earlier puzzles are
  replayed for practice (not kept). The home page shows today's number and result beside Connections; the passport
  counts it (the "Crossword" stamp for a solve with no help).
  Data: scripts/crossword-words.tsv (ANSWER, a plain clue, the entry it links to; 774 answers, picked from entries that
  exist and checked against each entry's lede; no grim answers) and scripts/crosswords.tsv, which
  scripts/make-crosswords.ps1 [-Count N] only ever APPENDS to (a C# placer: every answer crosses another, all joined,
  no two answers side by side, no answer again within 30 puzzles, places at most 60% with at least two people and two
  other things, the answers reaching across the whole grid). build-pages.ps1 writes crossword-data.js (CW_DATA {w:
  [answer, clue, entry], p: [[answer, 0 across or 1 down, row, column, ...]]}) and stamps its ?v= into /games (CW_SRC;
  games.js loads it when the tab first opens), and STOPS on an answer without a clue or an unknown entry. Scratchpad
  cw/verify.js re-checks every puzzle on its own (stray runs, joins, crossings, repeats).
- Who Said It? (#said): five quotations a day for everyone (UTC; #1 = 28 Oct 2026; in the file's order, repeated
  after the last), each with four portraits to choose from; the answer names the work, the translation and the source
  (linked). epoch-games said-<number> {m: '10110', done}, said-streak {n, last, b}; the finish card lists the five
  with their speakers, the squares, the countdown, Share ("Epoch Who Said It? #N: 4/5" + squares; the score poster's
  squares layout), the newsletter line; earlier rounds are replayed for practice (not kept). The home page shows today's
  number and score beside the Crossword; the passport counts it ("Well quoted": all five right).
  Quotations are NEVER typed: scripts/quote-sources.tsv (speaker slug, page, "start".."end" phrase, work, credit,
  note) lists where each one is, and scripts/fetch-quotes.ps1 imports the exact words into data/quotes.json (build
  input, not deployed) with the cleaning and selecting of scripts/lib/source-text.ps1 (shared with
  fetch-speech-texts.ps1): 5–45 words, never a word of the speaker's name, "…" where a quotation starts or ends
  mid-sentence. -Peek <url> -Find a,b shows a page's paragraphs; -Test <file> prints rows as the game shows them.
  Sources: words first published in English before 1930, translations published before 1930 (translator named),
  works of the US federal government; Wikisource, Gutenberg, Avalon, Fordham, presidential libraries. Oct 2026: 326
  quotations by 114 people (66 days before the first round comes back), gathered by four agents with scratchpad
  r4/QUOTES-GUIDE.md and read one by one: left out were retellings pieced together later (Tecumseh's "Sell a country",
  Gurd 1912) and lines chiefly about contempt. Words that reach us through someone else stay, with the note saying so
  ("Plutarch's account", "as William Wirt reconstructed it", "spoken by Mr Micawber", "spoken by Socrates in the
  dialogue"): the note is shown with the answer. The builder writes said-data.js (SAID {p: [slug, name, dates,
  picture], q: [text, speaker, work, credit, url, source, licence, [three others], note]}; the others: three of the
  speaker's eight likeliest companions, drawn by the quotation's id: people with a picture that shows them (PicFace
  -Strict: not in scripts/no-portrait.tsv, the scenes, maps and faceless coins found by eye on contact sheets, and no
  map, diagram, coin, seal, stele or inscription by the Commons file name; a speaker in no-portrait.tsv gets a
  monogram) who lived within a century of the speaker, 60 years after 1500, other speakers first, then the same region
  and the best known; never one
  sharing a name with the speaker, nor anyone named in the quotation's work or note, so Plato is never a wrong answer
  for Socrates) and stamps its ?v= into /games (SAID_SRC); it STOPS on a speaker who is not a person entry or who has
  too few companions (a speaker needs dates: 28 undated speakers got theirs in person-dates.tsv). Add quotations at the
  END of quote-sources.tsv, so the rounds already played keep theirs; re-run fetch-quotes.ps1, then build.
  B2 (4 Nov 2026): 921 more, to 3 July 2027 (1,247 by 343 people, at most six each), gathered by six agents by
  age and region plus two extra batches of new speakers, every quotation read. Tools now in scripts/quotes/:
  QUOTES-GUIDE.md (the agents' brief), check-speakers.js (who can speak: a person entry with dates and a picture not in
  no-portrait.tsv; --all-people lists them) and assemble-quotes.js (puts new rows in the game's order and appends them:
  one from each age a day where it can, no speaker twice a day nor again within 7 days, the most overdue speaker first so
  a speaker's rows spread over the season, a cap of six each, exact repeats and the editor's drop list left out); the
  agents' files and drop.txt are in scripts/quotes/b2/. Translator years a page does not print are left off the credit
  rather than given from memory.

- Six Degrees (#six, Nov 2026): one puzzle a day (UTC; #1 = 6 Nov 2026): from one entry to another by the gold links of
  each entry's description (the links LinkDesc makes). build-pages.ps1 writes data/sixdeg/<c>.json ({slug: [name, dates,
  picture 0/1, [[linked slug, its name], ...]]}, by the slug's first character; deploy.sh DATA) and runs
  scripts/tools/make-six-degrees.js, which appends puzzles to scripts/six-degrees.tsv (start, target: well-known pictured
  entries named by 3+ profiles, no wars or atrocities, 3 or 4 clicks apart, no entry again within 60 puzzles; never
  reordered), re-solves every puzzle on the current links (stops if one no longer solves) and writes sixdeg-data.js
  (SIXD {v, p: [[start, target, shortest, route]], n: names}; SIXD_SRC stamped into /games). games.js SixD: the current
  entry with its links as buttons, Back (the click still counts), Show a route; epoch-games sixd-<n> {p, c, done, gave},
  sixd-streak; stars 3 at the shortest, 2 within two more; Share. Counted on My Passport (13 games) and My Week.

## Kids mode and the Kids corner (/kids)
- Kids mode is site-wide: html[data-kids="1"], set before first paint by the head snippet from localStorage
  epoch-kids, switched by the star button in the header (shared-nav.js: window.setKidsMode(on), kidsModeOn(), the
  'epoch:kids' event; shared-nav.js also sets the attribute on pages cached from before). The look is the
  `[data-kids]` block at the end of shared.css (before print): its own tokens for both themes (night sky / warm
  paper), Baloo 2 headings and Nunito text (self-hosted latin woff2 in /fonts, OFL, downloaded only in Kids mode),
  bigger text, pill buttons. Long pages show their short version first: an entry opens with "In short" (its first
  sentence; .kd-short), war and battle entries carry a gentle note (.kd-note), profiles and state pages hide their
  sections behind "Read the whole story" (.kd-story adds html.kd-open; a link or address into the folded text opens it
  first), and a community article's body waits behind a note (written by a reader for grown-ups) and "Read the article". The day pages fold their wars and killings behind "Show the battles and wars of this day too" (.kd-rough)
  and the home page's On This Day leaves them out: kidsGentle(title, desc) in shared-nav.js (grim words anywhere,
  military ones only in the title; about 40% of the events). shared-nav.js inserts all of this on every page; the
  CSS shows it only in Kids mode. Games start easy, timers are hidden, sounds are on.
- /kids is a hand page (always in Kids mode: html data-kids="1" data-kids-always; the star there changes only the
  other pages): an inline-SVG owl (Hoot), picture and fact of the day (chosen by the date), doors to the games and the crossword, "Who was who?" (the eight Kids ladders, build:kids-ladders: see "Social ladders"),
  sixteen themes, a site-wide switch, a note for grown-ups. Its build blocks (kids-doors, kids-themes, kids-facts =
  KIDS_FACTS) come from scripts/kids-corner.tsv: `@key, title, introduction, door picture` lines, then
  `entry slug, a line for young readers` (8–12 per theme, pictures checked by eye), and `!, fact, link` lines
  (facts checked: keep them true and simple). Each theme ends with its Word Hunt (/games#words-<key>, same keys as
  word-hunt.tsv). 24 themes since A14 (5 Nov 2026): the Mongols, ancient Persia, the Silk Road, Byzantium, the Celts, the
  Renaissance, the Ottomans and the Industrial Revolution added, every line from its entry's own text, the cards' pictures
  looked at by eye. A14 also added 208 game pictures (game-pictures.tsv; people only with a plain lifespan, nothing grim:
  no Hitler, Stalin, Holocaust) and the Picture Puzzle set Great Buildings.

## Great Speeches (/speeches/)
speeches-data.js (SPEECHES, 115 speeches, King Wu of Zhou to Reagan) → build-pages.ps1 writes /speeches/<slug> (The
setting, Key passage, What followed + "What it led to" chips, Connected chips) and /speeches/ grouped by era
(ancient, medieval, earlymodern, revolutions, nineteenth, twentieth = to 1945, postwar). Each speech carries its
key passage, a sentence or two, with a source line, and full:"url|source" links the complete text where a free,
reliable copy exists (Wikisource, Avalon Project, Hansard, Fordham Sourcebooks, presidential libraries, the Mandela
Foundation). Each URL was checked to hold the quoted speech itself, not just to load: a page of the same collection
can hold another speech (the Wikisource "To the Army in Italy" is Napoleon's April 1796 proclamation, not the March
one quoted; the March text comes from "Napoleon's Addresses").
Full texts (57 speeches, "The full speech" section; open up to 600 words, else folded with words and reading time;
a lang attribute for the Spanish Bolívar and Turkish Atatürk originals; a credit line): ONLY public-domain or
freely licensed texts, IMPORTED by scripts/fetch-speech-texts.ps1 from scripts/speech-sources.tsv (slug, page,
part: `all`, paragraphs `@a..@b`, sections `#a..#b` or `"start phrase".."end phrase"`, translator, licence) into
data/speech-texts/<slug>.json (build input, not deployed). NEVER type or paraphrase a speech text from memory: fix
a slip of the source in the script's $FIXES and re-run it (-Only <slug>; -Peek <url> -Find <words> shows a page's
paragraph numbers); a paragraph split by a plate or page break of the scanned book is joined again by $JOINS (Mazzini).
The script prints only counts and the first and last words: check the boundaries there.
Excluded on purpose: copyrighted or estate-held texts (Churchill ×2, King, Mandela, de Gaulle, Mao, Nkrumah) and
speeches with no free full text (Gandhi's Quit India, Jinnah, Nasser, Lumumba, Macmillan, Bismarck, Genghis Khan, Tariq, Muhammad,
Charles I, Cromwell, Garibaldi, Joan of Arc, Cixi, Toussaint, John Ball). The builder reads SPEECHES before
the entry pages, and every entry named as speaker, in links or in led lists those speeches ("Great speeches",
above See also). copyright:true (Churchill, King,
Mandela, de Gaulle, Mao, Nkrumah) adds a note; kind:"paraphrase" (Cixi, Moctezuma, Nasser) renders as "In substance"
without quotation marks. empire, links and led are "href|label" strings; the builder reports unknown encyclopedia
slugs and check-site every unresolved href. The data file breaks lines before keys, so the builder strips newlines
before QuoteKeys (never put a line break inside a string). speeches/ has a builder-written .htaccess, the
--delete folders of scripts/deploy.sh (GENERATED) and the root /speeches → /speeches/ redirect. The Research Hub has a card for it
and for /games. The speaker's portrait (SpPortrait: the speaker entry's picture) heads each speech page and its
index card; "Share this quote" (data-share-text) sits under the key passage, and "Read the full speech ↓" shows only
when the full text is folded (over 600 words).
The 20 added on 29 Oct 2026 fill the thin eras and voices beyond Europe and the US (Xerxes, Claudius on the Gauls,
Theodora, Abu Bakr, Gregory VII, Savonarola, Cranmer, Elizabeth I's Golden Speech, Raleigh, Winthrop, Frederick at
Parchwitz, Pitt, Red Jacket, Mazzini, Kossuth, Garvey, Gandhi's trial statement, Sun Yat-sen, Macmillan, Kennedy in
Berlin): their settings and aftermaths were checked against the entries and Wikipedia, every date against a source
(Parchwitz: Carlyle, from Retzow, "night of December 3d, 1757"), and their links use only entries that exist (no
entry yet for the Investiture Controversy, Young Italy, the UNIA, the Nika riots, Truman, Brandt, Tilak, Lafayette …).
A9 (4 Nov 2026): 35 more, 115 in all, drafted by six agents with scripts/speeches/SPEECHES-GUIDE.md from saved Wikipedia
articles (the setting and what followed) and the speech's own imported text (the key passage, copied exactly). Tools in
scripts/speeches/: check-speeches.js <drafts> <texts dir> <wp dir> (keys, era against year, lengths, praise words, every
link, the excerpt found in the imported text, numbers and names not in the articles or the text), merge-speeches.js
[--write] [--edits=] (appends records and source rows; edits: the editor's [slug, field, old, new], "skip" to leave a
draft out, "full" "" for a speech printed with its key passage only, which then adds no source row), and the agents'
drafts, sources and edits.json in scripts/speeches/a9/. fetch-speech-texts.ps1 -Sources <tsv> -OutDir <dir> imports
drafts into a scratch folder before they join the site. Kept with the key passage only (no clean free text): al-Hajjaj
at Kufa (de Goeje in the 1911 Britannica), Itō's rising sun speech (Lanman 1872, OCR only), Stanton's Solitude of Self
(an unsourced transcription), Lloyd George at Limehouse (a biography's extracts). Left out: the Buddha's first sermon
(no clean Rhys Davids text), the Sermon on the Mount (no date: every speech is placed in a year), Canassatego, Red
Cloud, Parkes at Tenterfield, Gladstone at Midlothian, Naoroji's 1906 address and Lamartine (OCR scans only), Black
Hawk (Stevens 1903 only "reported" it), Debs (an abridged text of unknown source). Ancient speeches say the words are
the historian's (Thucydides, Livy, Sallust, Plutarch); Powhatan, Logan, Seattle and Lenin (John Reed's report) say
through whom they reach us. 14 speakers got entries (wave a9 of added-entries.json; portraits by eye, none for Rumbold,
Canassatego or Logan: the candidates were a house and a modern statue).

## Songs in History (/songs/, /songs/<slug>; Nov 2026)
406 songs handed down through history (234, then 66 songs of states and causes: see "Nov 2026: songs of states"; 38 more
in A10a, 4 Nov 2026, below) (the user's brief: origin, writer, culture, language and place, type, the words
in the original, romanized and in English, what they inspired, a YouTube performance), from the Lament for Ur
(c. 2000 BCE) to Wind of Change (1990), every region, 78 languages. The user's choices: about 120 songs; a song still in
copyright gets its entry WITHOUT its words; one performance per song, hand-picked and checked.
Second wave (1-2 Nov 2026, the user: "find more songs, including a soudarded"): 107 more, chosen as the first
(scripts/songs/LIST2.tsv, candidates2/3-scored.tsv: Wikipedia language editions and article length, quotas for the
thin regions and eras), among them the Breton "Ar soudarded 'zo gwisket e ruz" the user remembered ("dim dim dam";
Max Ar Fur, c. 1880; in copyright, as its publication date is unknown). Same process: fetch-wp.js, agents with
SONGS-GUIDE.md, check-drafts.js (every number and name not in the article flagged) and the editor's decisions
(scratchpad songs2/decisions.json, apply-decisions.js); find-sources.js lists a song's Wikisource pages through
Wikidata and peeks their verse blocks. A year written "~1850" sorts only: the page says "date unknown" (make-data
`undated`). New select flags: nobis ("bis" marks and refrain cues), nodash, nolabels also takes Korean, Arabic and
Spanish labels; repeat signs 𝄆 𝄇 are always dropped; noetc also drops "и д." and "&c."; splitdanda breaks a
Sanskrit verse at its danda; an editor's raised dot (<sup>.</sup>, Appel's Occitan no·m) is kept as "·". The user's
second document (2 Nov 2026, texts and translations "written from knowledge") gave four more songs their words, each
imported from an edition and its translation fitted to the lines: Can vei la lauzeta mover (Appel 1915), Plaisir
d'amour (La Chanson française du XVe au XXe siècle), the Agincourt Carol (Percy's Reliques, 1765) and the Mahishasura
Mardini Stotra (Sanskrit Wikisource). Its other texts found no edition (Fengyang's Wikisource text is Li Jinhui's 1934
version, protected) and its Lament for Ur and Harper's Song renderings follow copyrighted translations closely, so
they were not used; its Breton text contradicts the sources for Ar soudarded and was not used either.
- Source: scripts/songs/<slug>.txt, one song each: header lines (title, local: its own title in its script / its
  romanization, status: "pd | reason" or "copyright | reason" (shown as "The words"), lyricist, composer, culture,
  language: "code | name ; code | name", place, date (as shown), year (sorting, the era band and the card's
  "c. …"), region (REGIONS), types (sacred, lament, celebration, love, lullaby, work, war, anthem, protest, ballad,
  epic, dance), people, places, events (";": chips to the profile of that name, else the one entry of that name, else
  plain; the entry pages list their songs, "Songs in history", and the entry with the song's own title lists it too:
  God Save the King, the Epic of Gilgamesh), kids (yes/no: "no" folds story, meaning and words in
  Kids mode behind a note) and kid), then "== story", "== meaning" (for a song in copyright its THEME only, in our
  words, never a paraphrase of its lines), "== inspired" and "== inspired-by" (lines "title | year | how"; a title
  that is another song's title or local title links it, and that song gets the reverse line; an album named after a
  song never matches), "== sources"; "== lyrics-source" and "== notes" are the editor's (a block header is a line
  "== name" alone: a note line "== meaning: …" once swallowed a meaning). Drafted by agents from saved Wikipedia
  articles (scripts/songs/SONGS-GUIDE.md), every fact checked (the scratchpad's factcheck.md), then cleaned of drafting
  notes ("death year not given in the article" …); era is derived from the year.
- The words: NEVER typed. scripts/songs/sources.tsv (slug, part orig|en|rom, site: a Wikisource language code, w-xx
  for the public-domain words quoted in a Wikipedia article, pg for Project Gutenberg, page, select, credit) →
  scripts/songs/fetch-texts.js (selects: all, #n..#m, "a".."b", L"a".."b"; flags: nonum, noruby, norefs, nolabels,
  dropcap … at its top; text-fixes.json for a source's slips, each matching once: Greensleeves' lost drop cap A;
  cache %LOCALAPPDATA%\epoch-tools\song-cache; --peek=site:Page shows a page's stanzas) → imported/<slug>.json.
  Only public-domain words: traditional or anonymous, authors dead long since, published before 1930 (US). Where no
  free old translation exists, the English and the romanization are the Institute's own, made line by line
  (translations/<slug>.json {en, rom, scheme, notes}: scripts/songs/TRANSLATION-GUIDE.md, every line checked;
  schemes: SBL Hebrew, ALA-LC Arabic, IAST/ISO 15919, modified Hepburn as sung, Revised Romanization,
  pinyin with tones, scientific transliteration), translation-fixes.json the editor's line fixes. merge-texts.js →
  data/song-texts/<slug>.json (build input, not deployed; {parts: {orig, rom, en: {stanzas, credit, url, source,
  own}}, aligned, tentative, scheme, notes}); a part with the original's shape stands beside it line by line, any
  other as a block of its own (Aloha ʻOe regrouped to its verses and chorus; Hanacpachap marked tentative). 167 songs
  carry words; 46 are in copyright (We Shall Overcome: printed only once its free status is beyond doubt); 21
  public-domain songs have no free edition found (make-data.js GAPS: their pages say so), the Great Hymn to the Aten
  only Budge's 1923 translation. Cielito Lindo, 'O sole mio and Hava Nagila are printed as published before 1930
  (public domain in the United States; the user's choice, 1 Nov 2026), though protected in Mexico, in Italy (Mazzucchi's
  share of the music, 2002 ruling) and wherever Nathanson counts as Hava Nagila's author: their status lines say so.
  Guantanamera prints only Martí's Versos sencillos, never the refrain. 13 songs (1 Nov 2026) came from the user's
  document of texts and translations, written from memory: their originals were imported from the pages that hold
  them (rows from "# Nov 2026" in sources.tsv; a "\n" in a text fix splits a line; several rows of one part add up,
  each page credited; translations "heads" title the pieces of the Llibre Vermell), the document's translations
  aligned to those lines, and lines it lacked translated. Its Hanuman Chalisa, Dle Yaman, Delphic hymns, Ninkasi and
  Kumbaya found no edition (Ninkasi's is ETCSL's, under the Oxford project's copyright; Kumbaya's versions on
  Wikipedia are cited to videos) and stay without words.
- Lyrics from Genius (6 Nov 2026, the user: "they have an embed option"): for a song whose words the site does not print
  (in copyright, or public domain with no free edition; never a WITHHELD one), Genius's official embed, which Genius serves
  under its own licence: the site copies no words. scripts/songs/genius-find.js searches the official API (token in
  GENIUS_TOKEN or %LOCALAPPDATA%epoch-toolsgenius-token.txt, never in the repository; the public search and the embed
  script sit behind a bot wall that headless browsers do not pass), accepting a match only where the title and a writer or
  performer agree; the editor chooses the rest (the song itself in its own words: no namesakes, instrumentals or
  adaptations); scripts/songs/genius-confirm.js checks each choice has complete lyrics and writes scripts/songs/genius.tsv
  (slug, id, page, title). make-data.js gives the song genius {id, url, title}; its page shows "Show the lyrics from
  Genius" (.sg-genius), and songs.js builds the embed only on that press, in a same-origin srcdoc frame (the embed writes
  into its page as it loads) that grows to the lyrics. 91 songs (6 Nov 2026); the ancient texts have no Genius page.
  The frame wears the site's look (gTheme: the page's tokens and fonts, every embed element's own colours and
  backgrounds overridden, gold links and titles), repainted when the theme or Kids mode changes; the "Loading" line is
  hidden once the embed has drawn beside it. Such a song's note under "The words" says Genius shows them below
  (.sg-nowords-g), and the /songs/ intro counts the words printed, shown by Genius and still missing (by reason).
  Genius's own English translations (6 Nov 2026, the user: "for the genius.com ones, make the translations"): the
  Institute does not translate words still in copyright, nor words it has no free edition of, so for the songs of
  genius.tsv not sung in English scripts/songs/genius-translations.js reads the API's translation_songs (language en)
  into scripts/songs/genius-en.tsv (22: 18 linked on Genius, 4 found by searching "Genius English Translations" and
  chosen by eye; La Llorona's are of other singers' versions, left out); make-data.js gives the song geniusEn, and the
  page a second button, "Show the English translation from Genius" (.sg-genius-btn-en), whose frame joins the
  lyrics' in .sg-genius-frames.
  The Institute's own translations of the public-domain songs printed without English (6 Nov 2026): 18 by four
  agents with TRANSLATION-GUIDE.md, every line read against the original by the editor; the Bhaja Govindam's ten
  slips of the Wikisource text and the Odia anthem's stray bar went into text-fixes.json; Tevaram and the Charyapada
  are marked tentative (merge-texts.js TENTATIVE). The Huron Carol's Wendat has none (its page says so: no line can be
  rendered with confidence). Amhrán na bhFiann prints Kearney's English, so its translations file sets lang en.
- Performances: scripts/songs/videos.tsv (slug, id, channel, note; 216 songs; 18 without one, among them Kumbaya,
  Ninkasi and anthems with no fitting channel): the
  performers' own channels, "- Topic" releases, choirs, ensembles, institutions and old records, never compilations
  or re-uploads of albums, chosen by looking at each (scripts/songs/yt-search.js lists a search's results).
  node scripts/songs/check-videos.js checks each through YouTube's oEmbed (exists, embeddable) into
  videos-checked.json: RE-RUN IT before a release; make-data.js STOPS on a video that failed or was not checked.
  A title alone does not show what a video is: node scripts/songs/audit-videos.js reads each watch page (category,
  length, description) into videos-audit.tsv and flags what may not be a performance. 2 Nov 2026 (the user: "some
  links are news links and explanations") eleven picks were talks, news clips, a singing lesson or promotions
  (CNEWS's Marseillaise, DD News, TV UNAM on a book launch, "The Story Behind the Happy Birthday Song", France
  Musique's Culture prime, "Recitation Methods Explained", "how to sing" Sōran Bushi, All Blacks promotions):
  replaced by performances, Cantares mexicanos left without one. Only a performance of the song, never a video about it.
  And a song with words is heard SUNG (the user, 2 Nov 2026: Yankee Doodle had fifes and drums): twelve instrumental
  picks (military band, koto, lyre, orchestra, guitar) became sung ones; audit-videos.js flags INSTR? (instruments
  named, no voice); it also records the view count, and eight little-known picks became established performers
  (Harpa Dei, the Dumka choir, the National Gugak Center, Atrium Musicae, Peter Pringle's Psalm 23 …). El Cóndor Pasa keeps Los Incas: its 1913 melody is instrumental, its words later and protected.
  The page shows a play button; songs.js loads youtube-nocookie.com's player only when it is pressed, plus a link out.
- The Epic of Gilgamesh (2 Nov 2026, the user: "include the epic of gilgamesh, the video is on youtube"): type epic, Peter
  Pringle's performance in Sumerian. It opens "ud re-a ud su₃-ra₂ re-a", the first line of the Sumerian poem Gilgamesh,
  Enkidu and the Netherworld (the user heard it; the Akkadian Pennsylvania Tablet first printed here was replaced), so the
  words are that poem's prologue, lines 1-26, from the Electronic Text Corpus of Sumerian Literature (ETCSL, Oxford), with
  ETCSL's translation: licensed CC BY-NC-SA 3.0, which the user accepted for this non-commercial site (the credit line says
  "licensed …, for non-commercial use with credit"). Imported by scripts/songs/fetch-etcsl.js (not typed: ETCSL's ASCII c,
  j, h become š, ĝ, ḫ, index digits subscripts, determinatives in braces as in Oracc). ETCSL could also give Ninkasi and the
  Lament for Ur their words the same way.
- Build: build-pages.ps1 runs scripts/songs/make-data.js before the entry pages (it STOPS on a missing key, an unknown
  type or region, public-domain words missing without a stated gap, copyright words present, a bad video row) and
  reads scripts/songs/songs.json; "Songs in History" writes the pages (prose gold-linked with the year ±200; facts box;
  the words with Original / Romanized / English switches, epoch-song-cols; over 40 lines the rest folds; credits and
  "Notes on the translation"; Listen; What it inspired / What it drew on; chips; Sources; Cite; MusicComposition
  JSON-LD) and /songs/ (filters by words, type, era, region, with the words, with a performance, kept in the address;
  "Songs that led to songs"; how the songs are told). Titles "X: Story, Meaning and Lyrics" (or "Story and Meaning")
  with " — Songs in History" (FitTitle drops it past 70). Listen reads the title, kid line, story, meaning and the
  English lines ([data-say]: class names in shared-nav.js would pull song rules into every hand page's css).
- A10a (4 Nov 2026): 38 songs of scripts/songs/LIST4.tsv (the scored candidates not yet taken, the thin regions first:
  the Ballad of Mulan, the Epic of Sundiata, the Song of Deborah, the Enūma Eliš, Kassia, the Akathist, Ma'oz Tzur,
  anthems of Turkey, Brazil, Odisha and the Nordic countries, the Ghost Dance songs, spirituals, hymns and ballads), drafted
  by six agents with SONGS-GUIDE.md and scripts/songs/WORDS-VIDEOS-GUIDE.md (the agents also propose the words rows and
  one performance each, checked by oEmbed and audit-videos.js). scripts/songs/merge-wave.js <drafts> <decisions.json>
  <rows.tsv> <videos.tsv> [--write] copies the drafts, appends the rows and performances, merges text fixes and adds the
  gaps to make-data.js (GAPS, WITHHELD); the editor's decisions are scripts/songs/a10/decisions.json (Ja nus hons pris
  dropped: its article is the king's; seven songs without words; the Ghost Dance songs withheld as sacred songs of a
  ceremony held in private, and given no performance; printed since 6 Nov 2026, see below). 31 have their words. make-entries.js HASENTRY skips a song whose
  entry exists under another spelling (Enūma Eliš: enuma-elish). Six of the list were already on the site (the scored
  lists hold titles, not slugs), and a seventh, İstiklal Marşı, was found after the release under another slug
  (istiklal-marsi, "Independence March"): removed, its link row pointed at the older entry. merge-wave.js now refuses a
  draft whose title or local title (folded) is a song the site has. make-entries.js keeps in added-entries.json only
  the song entries not yet applied: run it after make-data.js, which refreshes songs.json.
- A10b (4 Nov 2026): 67 more, 406 in all, from scripts/songs/LIST5.tsv: the 47 scored candidates left (score.js) and
  titles added for the thin regions, the songs the site has removed first (by title, local title, slug and the article
  named in the sources; most of the thin regions' best-known songs were already in). Eight agents, one brief (scripts/songs/
  a10b/drafts-notes holds their notes); the editor's decisions in scripts/songs/a10b/decisions.json: Lamma Bada
  Yatathanna dropped (its article says nothing of the words), Ethiopia, Be Happy and Alouette never drafted (a
  three-sentence article, a disambiguation page), twelve without words (no clean free edition: Japji Sahib's 1909
  English carries Macauliffe's footnote numbers; Taba Naba's author is claimed; the Railroad's later verses are undated),
  Old Folks at Home and Oh! Susanna printed as the historical record (the user, 6 Nov 2026: "that is what they actually
  said, and people should know"): Foster's minstrel-dialect words with their slurs, a note above them (make-data.js
  CAUTION, .sg-caution), kids: no; Oh! Susanna from the 1848 edition's verses 2-4 (its first verse is printed only under
  the music). Take Me Out to the
  Ball Game and Pelo Telefone printed as public domain in the United States, the Song of Songs cut to two chapters.
  45 have their words; no Institute translations yet for the originals without a free English (Aogeba Tōtoshi,
  Funiculì, Torna a Surriento, Ríu Ríu Chíu, Sari Gelin, La Paloma, the Bhaja Govindam, the Tevaram …). Tools changed:
  merge-wave.js ignores a local title "not known" in its duplicate check (it had matched the Seikilos epitaph);
  fetch-texts.js lets a fix of a part gathered from several rows match once in one of them (a verse number in one
  chapter of the Song of Songs). 56 titles link their entries (entry-links.tsv; pattern-count: only Tevaram and the
  Kesh Temple Hymn match, rightly).
- Wiring: menu Themes → Societies and ideas, footer, Research Hub (Read: nine cards, three columns), search
  (SEARCH_PAGES kind song, "X lyrics", "X meaning"), shelf and My Passport kind, sitemap, llms.txt, poster
  page-songs.jpg (make-posters.js page "songs"), deploy.sh GENERATED, split-css GENERATED, check-site FOLDERS, the
  root /songs → /songs/ redirect. Kids mode: the kid line, the "no" songs folded and left off the index.

## Kids stories of the cultures (Kids mode on /culture/<slug>, 6 Nov 2026)
In Kids mode each of the 65 culture profiles opens with a short picture story (.kid-tale, after the facts box; hidden
outside Kids mode, so grown-ups' pages are unchanged): a title and 4-6 numbered pages of one picture and one or two
sentences, 8-12 sentences of at most 22 words, read by "Read it to me" (shared-nav.js Listen: the profile selector lists
.kid-tale-title and .kid-tale-pages p; hidden elements are never read). Tools in scripts/kinds/: kids-packs.js <dir>
writes each culture's source pack (facts, takeaways, key events, sections, the section and home pictures and the pictured
entries the profile names); KIDS-STORIES-GUIDE.md is the writers' brief (every fact from the pack; living peoples in the
present tense; hard history plain and gentle; "src" names the pack's words behind each sentence); the stories are
scripts/kinds/kids-stories/<slug>.json, each read against its pack by the editor; kids-stories-merge.js [--check] checks
them, resolves the pictures and writes scripts/kids-stories.js (KIDS_STORIES, read by generator.html kidTaleHtml) and the
build:kids-tales block of /kids ("Stories of the peoples": every story, oldest first). Every page's picture was looked at on
contact sheets: kids-stories/no-pictures.txt lists those not shown (maps, satellite views, flags, modern cities, and other
peoples' objects a child would take for the culture's own: modern trade beads, a Mesopotamian bronze, Turkish Neolithic
houses, the British Museum's building); such a page shows its words alone (.kid-tale-np; 88 of 359 pages, 698 sentences in all). Regenerate the
profiles after a story changes.

## Write in ancient scripts (/write, the language profiles' #write)
scribe.js: a keyboard for the 12 languages with scripts of their own (Latin, Nahuatl, Swahili and Quechua, written in
the Latin alphabet, have none): Sumerian and Akkadian cuneiform, Egyptian hieroglyphs, Greek and Linear B, Imperial
Aramaic and Syriac, square and Paleo-Hebrew, Devanagari and Brahmi, Classical Chinese, Arabic, the Persian alphabet and
Old Persian cuneiform, Orkhon runes, and long-branch and short-twig runes (18 scripts). Every key shows the sign, its
value and its sound; a Latin field converts as you type (the romanised text is the source: Scribe.convert is pure and
tested in Node, scratchpad scribe/t-engine.js + cases.json); samples are real texts (Behistun DB 1.1, Kül Tigin S1, the
Jelling and Glavendrup stones, the Siloam inscription, Analects 1.1 …); "Make a picture" draws the writing on its
material (clay, papyrus, marble, parchment, rock, sandstone, palm leaf, stele, runestone, scroll: painted in code) as a
1080px PNG to download (not in in-app browsers: press and hold), copy (ClipboardItem) or share (sharePoster).
- The picture (Oct 2026, after "it malfunctions on phones"): one canvas reused (iOS caps all canvases' memory), a plain
  message when a picture cannot be made, made once per writing (picKey: script, words, sample, top to bottom) so that
  every share runs inside the tap (phones open the share sheet only then): Share sends the words and the link, with the
  picture when it is made; phones that share files get "Save or share the picture" (iOS: Save Image) instead of
  Download and Copy. Lines break at spaces and after a script's own word divider (runic ᛫, Old Turkic ⁚), at the largest
  size where no word is cut (a cartouche stays one ring) before words are broken between signs; Chinese breaks between
  characters. The tool's grid column is minmax(0, 1fr): a long sample once made Old Norse and Old Turkic wider than a
  phone. Tested in Edge and in WebKit (Playwright at iPhone size, scratchpad pw/scribe-webkit.js) for every sample.
- Data: scripts/scribe/<lang>.tsv (glyphs named by their Unicode names, "U+0301" for invisible marks; format at the top
  of scripts/make-scribe.ps1) → `make-scribe.ps1` checks every name against UnicodeData.txt (downloaded once to
  %LOCALAPPDATA%\epoch-tools\ucd) and writes data/scribe/<slug>.json (each page loads only its own) and LANGS_V into
  scribe.js; `-Hanzi` also writes data/scribe/hanzi.json (4,407 traditional characters with a Tang reading or in the
  Hong Kong school list, Mandarin reading and first English sense from Unihan, by frequency) and HANZI_V.
  _cuneiform-values.tsv: Borger's (MesZL 2004) 3,299 sign values, read by the Sumerian and Akkadian files. Generators
  of the long files are in the scratchpad (make-sanskrit.ps1, make-cuneiform.ps1: save PowerShell scripts with
  non-ASCII text WITH a BOM, or 5.1 reads them as ANSI).
- Engines (scribe.js): letters (abjads: short vowels unwritten, i/u as yod/waw, initial vowel on alef, final -a as he or
  aleph, finals, doubled letters once, "Vowel marks" adds niqqud/harakat; Greek: breathings, accents typed on Latin
  vowels, final sigma, "As on stone" capitals; runes: many-to-one, doubles once; Old Turkic: Tekin's spelling rules,
  back/front consonants by the word's vowels, keys type an exact sign in brackets [ök]); abugida (IAST and
  Harvard-Kyoto to Devanagari/Brahmi, virāma joins); syllabic (cuneiform: hyphenated values, words in CAPITALS (Akkadian)
  or lower case (Sumerian), {determinatives}, unhyphenated words cut into syllables and spelt CVC or CV+VC: šarrum →
  šar-ru-um; Old Persian: Kent's rules; Linear B: the scribes' spelling); hieroglyphs (one-sound signs by the Ptolemaic
  convention for names, [word signs] and [determinatives], ( ) a cartouche); han (pinyin search, themed keys checked
  against Unihan, "Top to bottom"). The line under the text spells out what is written (šlom, a-da-ma, þur).
- Fonts: fonts/noto-sans-*.woff2 (cuneiform 467 KB and hieroglyphs 399 KB, the rest 6–43 KB; OFL-Noto.txt), loaded with
  FontFace only when a tool opens; Hebrew, Arabic, Persian, Greek, Devanagari and Chinese use the device's fonts.
- Wiring: generator.html (SCRIBE_LANGS, hasScribe, scribeHtml: section #write after the Timeline, a contents entry, a
  loader that fetches /scribe.js when the section nears the screen or at once for #write); /write (hand page: 12
  cards with the emblems, #slug deep links, epoch-write-lang); scribe.js has no ?v= on the profiles (10-minute cache in
  .htaccess); localStorage epoch-scribe keeps each language's text, script and switches; Explore menu, footer, Research
  Hub (Explore group), Kids corner door "Write Like a Scribe", llms.txt, poster images/og/page-write.jpg.

## Faith maps (/faiths, the religion profiles' #faith-map)
faith-map.js: the spread of each of the 18 religions century by century: soft radial glows where it was a main faith of
the region or of its rulers (level 2, bright) or held communities (level 1, faint), arrows for how it spread (drawn out
in their century, faint for two more), a star where it began, dots for holy places and centres, rings for last places
(Philae 537, Nojpetén 1697, Cao'an 1339, Khotan 1006 …). A century slider with Play (a century every 1.8 s), the
century's caption, "This century in words" (the areas, new marks and routes as text) and the sources. Centuries follow
the site's labels (centOf: 1200 is the 13th century, 400 BCE the 5th BCE); a glow's strength is the share of the
century it fills; a faith that ended closes on its last note. Colours: --fm-a (the faith) and --fm-b (the one compared),
both themes and Kids mode; screen blending in the dark theme, multiply in the light one. Two views (Globe | Flat map,
localStorage epoch-faith-view; /faiths also ?view=flat):
- The globe (default): d3-geo orthographic (/d3-geo.js) on a canvas over maps/globe-land.js (both loaded on first use; GLOBE_V in
  faith-map.js is stamped by the builder), like the atlas and Globe Hunt and with their fixes (a zoom during a glide only
  retargets its zoom, a pinch ending as one finger starts a fresh drag, a non-finite turn falls back to the last good
  view, size() skips a hidden canvas). Glows are radial gradients squeezed towards the rim (by the cosine of their arc
  from the face's middle); routes are great circles drawn out over 1.4 s; fades ease toward each century's opacity.
  It FOLLOWS the spread: each century it glides (1.1 s) to the weighted middle of the living glows (main 3, communities
  1, by size) and the century's new marks and routes (a faith's last century: its marks), zoomed to fit but never past
  1.6 so it still looks round. Any drag, zoom or key hands it to the reader and shows "Follow the spread". Drag turns
  it (a flick coasts), two fingers zoom and turn, touch-action pan-y keeps vertical swipes for the page, the wheel
  zooms about the pointer only once the globe has focus (a click; the mouse leaving it gives the wheel back to the
  page) or with Ctrl/⌘ (otherwise a hint and the page scrolls), double click zooms in, arrows/+/−, the + − buttons. Hover or tap a mark (14 px), a route (7 px) or the
  smallest glow under the pointer for a tip (.atl-tip; a tap pins it beside the thing as the globe turns). Falls back
  to the flat map without d3 or canvas. M._globe() (the mount's return value) exposes the state for tests (scratchpad
  t/fm-int.html + fm-int.js: 22 checks).
- The flat map: an SVG over /maps/world.svg that glides to the century's new and living places; marks and arrowheads
  are scaled to stay the same size on screen, the names of a century's new marks are placed clear of each other; a
  click on a glow, mark or route writes its note under the map (.fm-pick).
- Data: scripts/faiths.tsv (format at its top: `@slug`, then area / route / mark / note / src lines; notes are captions
  that hold from their century until the next note). Written by hand from the standard histories named in each block's
  src lines and checked against the religion's profile (its key events and facts); keep the wording neutral and every
  date and place checked. build-pages.ps1 ("Faith maps") validates it (a religion profile, years inside its span with a
  century's grace, level 1 or 2, places on the map) and STOPS on a problem, projects the places with [EpochGeo.G]::P and
  writes data/faiths/<slug>.json ({slug, name, span, areas [x, y, r, from, to, level, name, note, lng, lat], routes
  [year, x1, y1, x2, y2, label, lng1, lat1, lng2, lat2], marks [kind, year, x, y, name, text, lng, lat], notes, src}, in
  tenths of the plane plus degrees for the globe; radius km / 4.0075) and FAITHS_V and GLOBE_V into faith-map.js. To
  test the section alone: scratchpad faiths/run.ps1 (seconds instead of a full build).
- Wiring: generator.html (hasFaithMap, faithMapHtml: section #faith-map, "Spread through the centuries", after the
  Timeline, a contents entry, a loader like the scribe's; the id is not "spread": that is the religions' text section);
  /faiths (hand page: the 18 cards oldest first, "Compare with" lays a second faith over the first, the address keeps
  ?faith=&vs=&c=&view=flat, epoch-faith); Explore menu, footer, Research Hub ("Through time" group), llms.txt, poster
  images/og/page-faiths.jpg, sitemap. faith-map.js has no ?v= on the profiles (10-minute cache in .htaccess).

## Research Series (/research-series, /essays/<slug>)
Eight essays, sources in scripts/essays/NN-slug.html: a comment of `key: value` lines (title, subtitle, card = the
text of its card, desc ≤ 160, published yyyy-mm-dd, picture `entry slug|caption` (the games' 800 px copy when
images/games/<slug>.jpg exists, else the entry's thumbnail; the entry's credit is shown) or cover `path|alt`,
profiles = slugs for "Profiles in this essay"), then the essay's HTML: `<h2 id="sN-…">` sections, the last one
`…-reading` (Further Reading, `ul.essay-refs`: real works only), p, i, gold links written by hand (class enc-link on
/encyclopedia/ and /state/ links for the preview cards; plain on /empire/), `div.essay-table-wrap > table.essay-table`.
build-pages.ps1 writes /essays/<slug> (kicker with date and reading time, Share, figure, contents list, body, Further
Reading, profile cards, Cite this essay, previous/next; Article JSON-LD with datePublished, wordCount and the works as
citation), the cards of /research-series (`build:essays`, with a script forwarding the old #series-0N addresses) and
feed.xml (guid = the old research-series#series-NN, so readers see no essay twice). A title ending in "?" or "!" joins
its subtitle with a space in the page title and share text ("Who Should Rule? One, Few or Many…"). It stops on a link to an unknown
entry, profile or state. 01 and 02 (May 2026) were moved out of the page's script in Oct 2026 with their text
unchanged; 03–05 were written then, their "What the Data Shows" figures computed from the power curves (shared-data.js
EMPIRES), the register (data/polities.json) and epoch-stats.js. 07 Before the State (the 45 culture profiles: life before and without states, the five living cultures) and 08 How Songs Travel (the 300 songs: the oldest kept songs, hymn to anthem, the tune families, songs put to work by states, their impact) were written on 2 Nov 2026 from the profiles and the song pages alone, every paragraph mapped to its page (scratchpad essays/07-sources.md, 08-sources.md) and read against it; their figures come from scripts/tools/essay-numbers.js 07|08 (culture spans against the register, songs by type, era and region, the tune families) and are quoted, never typed. The Listen button reads article.essay-view (h1,
.essay-sub, .essay-body h2/p/li): keep Further Reading and the contents list outside .essay-body.
Essays are capped at about 4,500 words (approved 3 Nov 2026): on 4 Nov 07 and 08 were cut from about 6,100 and 6,200 by
deletion only (whole paragraphs, sentences and clauses; seven connecting words added, listed in the commit; the figures,
headers and Further Reading untouched), checked by a longest-common-subsequence comparison with the originals.
Since 4 Nov 2026 (C3) the builder also writes scripts/essay-links.js (ESSAY_LINKS {profile name: [[/essays/slug, title]]}:
the profiles an essay lists in its header or links in its text), and generator.html adds "In the Research Series" with
those essays after a profile's legacy section, beside its inventions and songs: regenerate the profiles after an essay
is added or its profiles change.the profiles an essay lists in its header or links in its text), and generator.html adds "In the Research Series" withthose essays after a profile's legacy section, beside its inventions and songs: regenerate the profiles after an essayis added or its profiles change.

A14 (5 Nov 2026): essays 09 Faiths on the Move, 10 Who Invented It First?, 11 From Ruler to Enslaved and 12 The Written Word,
drafted by four agents with scripts/essays/ESSAYS-GUIDE.md from the site's own pages and data, their figures from
scripts/tools/essay-numbers.js 09-12 (essay-numbers-2.js; a faith-map area with no end year counts as alive), each paragraph
mapped in scripts/essays/notes/NN-sources.md, every number in each essay checked against those sources. Essays 07 and 08
now say their figures date from November 2026 (the site has since grown).

## Community articles (/articles/<slug>) and opinions
data/community/articles.json (build input, not deployed; `[]` since the Sati Pratha article was withdrawn on 29 Oct
2026) holds the community articles the Institute accepts, added by hand: {title (the key), author, ts (milliseconds),
content: [paragraphs]} (until Oct 2026 a snapshot of a Google Apps Script's approved articles, written by the deleted
scripts/fetch-community.ps1). build-pages.ps1 writes /articles/<slug>
(kicker with date and reading time, title, subtitle, byline, Share, the readers' note .cm-note: the author's own views,
not checked by the Institute, with Suggest a correction and Write for the Institute; body; Article JSON-LD with a Person
author) and the `build:articles` block of /community (BUILT_ARTICLES {snapshot title: {h page, t title, a author,
d date, e excerpt}}). Only the layout is made, never the words: leading short lines in capitals are the title (the
next line its second half, a third the subtitle), "PART n —" lines h2, other short unpunctuated lines h3 (leading emoji
dropped), "Source: …" lines source notes (.cm-src, which Listen skips), "— End of Document —" dropped.
scripts/community-overrides.tsv: title key, slug, title, subtitle, author (an empty field keeps what the text
gives; no author = "A community contributor"). /community draws its article cards (BUILT_ARTICLES, each opening its
page; the "Be the first to publish here" invite when there are none) and the readers' opinions (the page's own
OPINIONS list {name, text, ts}: one sent with the form is added there once read) in an inline script placed before
shared-data.js and shared-nav.js, so they are drawn before the first paint and nothing moves (no "Loading…" lines).

## Teachers' Corner (/teachers/)
build-pages.ps1 writes the guide (/teachers/: the worksheets, ideas for the classroom, ages, citing and picture
licences) and the worksheets: /teachers/path-<slug> and /teachers/century-<slug>, only where the data gives a task (two for a century; Oct 2026: 35 paths, 33 centuries - three paths are about undated people or terms, the early BCE centuries are thin).
Every task comes from the data, never from made-up claims: stops or events put in order by their first year
(WsSpread: no two within 10 years on a path, 3 in a century; century events dated "c." are left out), people matched to
their lifespans ([EpochBuild.W]::Range: a plain two-part lifespan), the numbered states of a century map (profiles
first, then the best-connected states alive at mid-century with a known seat, spread out) named from a word bank,
glossary terms the texts use (the rarest across all sheets, everyday words in $WSSTOP left out), and questions built
on each path stop's own "why" (first, middle and last stop, then the tagline). Orders are shuffled with a seed (the
same on every build, never the answer's order). The answer key is a folded details#answers; enc-page.js's
.ws-print buttons open or close it and print; @media print in shared.css sets A4, hides the tools and puts the key
on a page of its own. Menu: More → Teachers' Corner; footer Institute column; Research Hub card (hub-5 row).

## Test yourself (profiles, century and path pages)
Up to five questions at the foot of a page, built ONLY from what that page shows (never a made-up claim), shown when
there are at least three: the questions ride in the page as `script.ty-data` JSON ([{p prompt, q, o options, a answer,
w why, l link}]) and test-yourself.js (TestYourself.mount, loaded when the section nears the screen or at once for
#test-yourself) asks them one at a time with the answer explained; "Try again" reshuffles the options. Scores go to
localStorage epoch-tests {path: {b best, t questions, n tries, d last day}}; My Passport counts a test passed at 80%.
- Profiles (generator.html tyQuestions, seeded by the name so a regen is byte-stable): "In which year?" (a key event
  with a firm year, the other options the years of its other key events), "Which came first?" (two key events at least
  20 years apart), and for polities the capital, founder and successor from empire-facts.js against the same fact of
  profiles of the same kind and region, overlapping in time first (tyNames keeps only proper names: no "Royal seats",
  "Senior", tails like "under Kamehameha I" or "in the west"). 445 of 490 profiles (Oct 2026: 18 of the 30 cultures and movements, whose key events are often dated "c."); scratchpad
  r4/ty-harness.js prints them and r4/ty-scan.js every fact option, for reading.
- Century pages (build-pages.ps1 TyFirst/TyLived/TyPower/TyYear, from the events, people and great powers on the page;
  only plainly dated events, never "captured Jerusalem 1099"): which came first, who lived these dates, which was a
  great power of the century (three of the ten strongest profiles of other ages, by the century's seed, no two sharing
  a core word), in which year. 28 of 51: the centuries before the 7th century BCE have too little.
- Path pages (TyWhy, TyFirst, TyLived): which stop is on the path for this reason (a reason that names neither its stop
  nor another option: ClueOwnFault), who was born / which began / which came first, who lived these dates. 32 of 38.
Orders come from a seeded shuffle (TyShuffle, which may keep the given order: WsShuffle never does, and two options
would always swap). Hidden in print; outside the Kids-mode fold.

## Flashcards (/flashcards)
Hand page + flashcards.js. build-pages.ps1 ("Flashcards") writes the decks as data/cards/<deck>.json ({id, t, ask, pf
(0 the picture on the back, 1 only the picture in front: "who is this?", 2 picture and name in front), cards [[id,
front, back, picture, link, hint]]}) and lists them in the page's build:fc-decks block with each file's ?v=: the
glossary (the terms the profiles mention most first, everyday words in $WSSTOP left out), the 40 best-known people
of each century with a picture that shows them (PicFace -Strict, as Who Said It?; centuries with fewer than twelve
share a deck), the capitals (empire-facts.js) and the
dated key events (empire-glance.js, firm years) of the profiles by region, and every reading path (stop → its reason).
Leitner boxes in localStorage epoch-cards {deck: {c: {card: [box 1-5, due UTC day]}, d}}: a round deals up to 20 cards,
the due ones first, then up to 12 new; Knew it moves a card up a box (back in 1, 2, 4, 8, 16 days), Again puts it in
box 1 and once more at the end of the round (known then, it stays in box 1, back tomorrow); box 4 or higher counts as
learned. Space/Enter turns, 1/Left again, 2/Right knew it; a turned card swipes (the stage moves, so the card keeps its
turn). Kids mode deals only cards with a picture that kidsGentle lets through, and hides decks with fewer than five.
/flashcards#<deck> opens a deck. Menu (Explore), footer, Research Hub (Play), search (SEARCH_PAGES), sitemap, poster
page-flashcards.jpg; deploy.sh carries the page (PAGES) and data/cards (DATA).

## Rise and Fall Race (/race)
Hand page + race.js (needs shared-data.js and epoch-stats.js; ?v= on the page). Up to four polities (EMPIRES with
points) race year by year: a state's standing is its power curve there (0-10, scaled to its own peak) times its weight,
the mean of its militaryPower, territorialReach, economicStrength and historicalInfluence in EMPIRE_STATS_BY_NAME, over
ten (the weight the century pages' great powers use), so a small kingdom at its peak does not tie a great empire. Bars
sorted by standing glide to their places ("not yet" / "gone" outside a curve); below, every curve on one scale with the
year's line and dots, a crosshair readout on hover, tap or drag to choose a year; play (Slow/Normal/Fast = 20/50/120
years a second, localStorage epoch-race-speed; no year 0), a year slider, ten presets (the 2nd century's four empires,
the steppe, the oceans, West Africa, the caliphates, China, the Andes, Persia, India, Rome and its heirs), "Show the
numbers" (a table), Share (score poster, share-card.js `bars` layout). The address keeps ?p=<slugs>&y=<year>.
Colours follow the state, never its rank: four slots (--rc-0..3: blue, gold, magenta, green, one set per theme,
validated with the dataviz validator against #f4efe4, #0b0c10 and the Kids night sky); a removed state frees its slot.
Every line is also named: at its peak, measured and placed above it, else below, else left out (phones), as the bars
above name them all. A lone state in the address (the profiles' "Race its rivals →" beside "View on Explorer →":
/race?p=<slug>) gets three rivals: contemporaries that shared a quarter of its years, of comparable weight (within 3)
from its own region first, then from anywhere, strongest first (weight² × shared share), never one with a name word
of a state already racing (Rome never races Roman Egypt; "United Kingdom" counts as Britain). window.epochRace
exposes state, standing, presets and rivals for tests (scratchpad pw/r5-race.js). Menu (Explore), footer, Research
Hub (Explore: six cards, .hub-6 = three columns), search, sitemap, llms.txt, poster page-race.jpg (the 2nd-century race
on one scale: make-posters.js "race", poster.html curves with `abs`).

## Social ladders (/societies/)
The rank order of 50 societies, ruler to enslaved (30 in Oct 2026, twenty more in Nov 2026: see A12a below): New Kingdom Egypt, Old Babylonia, Achaemenid Persia,
Athens, Sparta, Rome, Byzantium, feudal Europe, the Vikings, Ancien Régime France, the Russian Empire, the Abbasids, the
Mamluks, the Ottomans, Classical India, the Mughals, Han, Song and Yuan China, Joseon, Tokugawa Japan, Mali, Benin,
Kongo, the Aztecs, the Classic Maya, the Inca, Spanish America, Saint-Domingue and Hawaii under the kapu.
- Source: scripts/societies/<slug>.txt, one file each. Header lines: name, of, short, in, year, period, region,
  population ("lo-hi million | whose estimate", or "est lo-hi million | what the estimate rests on"), profiles
  (profile names, comma-separated), nolink (optional:
  entries the prose's gold links never go to on this page, a name inside a longer one: "Medina" in Deir el-Medina, or
  another age's thing: the Qing bannermen on Tokugawa; checked against the entries), picture, kids (yes/no: the eight
  Kids ladders), title (≤70), desc (≤160), intro. Then "== tier" blocks from the top down: level (1 = top; equal levels
  stand side by side), band (ruler, nobility, religious, specialists, commoners, dependent, outcast, enslaved), name,
  term (the period's own words), local (the rank's own name, shown first with the English name in brackets wherever a
  rank is named: boxes, cards, Compare, Born into history, the game, the Kids corner, the posters, "Pipiltin (Nobles)";
  one name where both are the same word, "Shōgun"; "-" where no word of its own is attested; SocTitle, SocTitleHtml,
  societies.js title/titleHtml/inline, make-posters.js socChip; a hyphenated word stays whole, SocNw / .soc-nw), share,
  sharenote (whose estimate), firm (its place in the order is agreed: only these
  go into the Order the Ranks game, one per level), terms and people (entry slugs; people are members of the rank,
  never its rulers), picture (optional: an entry slug chosen by eye, "-" for none; else the first person or term with a
  picture; a rank left without one has its own in scripts/society-pictures.tsv, below), text, rise, you (Born into
  history: every fact in it is in the text), kid (≤140, Kids mode); then
  "== mobility", "== women", "== sources" (real works only); "== checked", NOTE: and MISSING: lines are the editor's.
- Shares (31 Oct 2026, the user: estimated figures everywhere, marked as estimates, never "no reliable count"): a
  percentage of the whole population, from the scholarship where a scholar or source gives a number (the writer's
  arithmetic from one is labelled "roughly"); where nobody counted, an estimate, written `est lo-hi`, its note starting
  "Estimate:" and saying what it rests on (related counts, the same rank in comparable societies, a share another
  figure implies; scratchpad soc2/est.tsv: 145 shares and 8 populations, applied by soc2/apply-est.js); "rest" for
  everyone else (one rank, itself an estimate when any other is), 0 for a ruler. "?" is refused. Labels (SocShare):
  "lo–hi%", "c. 3–6% (est.)", "Fewer than 1 in 1,000 (est.)", "One ruler" (only when the sharenote starts with "One";
  else "A handful": Sparta's two kings, Saint-Domingue's governor and intendant), "About N% (the rest, est.)"; an
  estimated population reads "c. 4–6 million (est.)". Estimated bars are dashed and lighter in the pyramid, To scale
  and Compare. The Russian and Tokugawa ladders have no rest: their ranks, counted or estimated, add up to 93–95%.
- build-pages.ps1 "Social ladders" (script-level names all start with soc: PowerShell names ignore case, $sec would be
  $SEC) STOPS on a missing key, an unknown band, region, entry, profile or nolink, levels out of order, a malformed
  share, numbered shares that leave nothing for the rest, a rank without a picture, or a society-pictures.tsv row
  without its file or for a rank that has an entry picture. It writes /societies/<slug> (header; intro with picture and
  facts; the ladder as a pyramid with a By rank / To scale switch, bars as wide as the shares, estimated ranks dashed;
  a card per rank: picture, kid line, text, "Moving in or out", "How many?", chips; Born into history; mobility;
  women; Compare; Test yourself: highest of four, lowest of four, "which rank was known as …", "which rank did X belong
  to"; sources and method; Cite; previous/next; Article JSON-LD; poster society-<slug>.jpg when drawn) and /societies/
  (Born into history with a society select, Compare, the ladders by region, how to read them), data/societies/<slug>.json
  ({slug, name, title, of, short, in, year, yl, period, region, pop, popEst, img, tiers [n, lv, band, name, loc, one,
  term, lbl, w, firm, est, pic, you, kid, rise, why, people]}), ranks-data.js (see /games), scripts/society-links.js (SOCIETY_LINKS
  {profile: [[url, of]]}: generator.html puts "The social ladder of X →" after the profile's socioeconomy or society
  section, so regenerate the profiles after a ladder is added or renamed) and the build:kids-ladders block of /kids
  ("Who was who?": the eight Kids ladders, a picture and the kid line per rank). The prose (intro, text,
  rise, mobility, women) is gold-linked by LinkDesc with the society's year ±200 as context (SocLink; without the link
  tables, as in scratchpad soc/run.ps1, it is only escaped). A -SkipEntries build compiles no patterns, so it keeps the
  ladder pages as they are, like the entry and day pages (31 Oct 2026: it had rewritten all 30 without their links).
- societies.js (?v= the file's hash, written by the builder): To scale; Born into history draws a rank weighted by the
  share midpoints (every rank but the ruler; an estimate is said to be one), says how many in a hundred lived so and
  the odds of being the ruler (one in the population midpoint), shares a rows poster (share-card.js) and keeps the
  draws in localStorage epoch-lives; a ladder with a single rank to draw would offer "Be born somewhere else" (on the
  index another society; on a ladder page a link to /societies/?born=1#born, which draws at once): none has since the
  estimates. Compare: two ladders side by side, ranks lined up by band,
  share bars on one scale, the address keeps ?a=&b= (no #compare: the page goes to the comparison itself, after load
  and the fonts and only if the reader has not scrolled; scrolled there at once, text rewrapping above it when the
  fonts came moved it, CLS 0.22 in Kids mode on phones; scratchpad soc/cmp-scroll.js). Kids mode shows the kid lines and folds the rest behind "Read the
  whole story". window.epochSocieties {draw, odds, load} for tests (scratchpad soc/born-test.js: 100,000 draws a ladder
  within 0.35 points of the weights).
- Writing: agents drafted in batches of at most five from Wikipedia articles (scratchpad soc/batches, the guide, the
  reference ladder ref-ancient-rome.txt); every ladder was read in full and its claims checked against the saved
  articles (soc/wp) or standard scholarship, changes logged in soc/factcheck.md (originals in soc/out-orig). Slavery,
  caste and colonial ranks of descent and colour are written as the period's law and ideology, never as a natural order,
  without euphemism, with the people at the bottom given their own lives and resistance. Pictures were chosen by eye on
  contact sheets (soc/sheet.js; the choices in soc/picks.js, which writes the picture: lines): period objects and
  depictions only, no modern statues or imagined portraits, maps, logos or another age's picture of a generic term; the
  "Slavery" entry's picture is an abolitionist medallion, so enslaved ranks have "-" unless the period gives one.
- Every rank has a picture (31 Oct 2026, the user: no numbers on the game's cards; "any fitting picture"): the 142
  ranks that had none, or "-", have one of their own in scripts/society-pictures.tsv (slug, rank number, caption,
  Commons file, author, licence, crop), chosen by eye on contact sheets of Commons searches (scratchpad soc2:
  rank-queries.tsv, rank-cands.js, rank-sheets.js, rank-picks.tsv, apply-picks.js, then encode-soc.ps1 and
  pick-preview.js for the crops): period art first, else a later engraving, painting, photograph or museum piece of the
  same people; never fantasy art, film stills or a degrading scene. Files images/societies/<slug>-<n>.jpg (cropped, at
  most 320 px wide) with 112 px copies in thumbs/ (make-thumbs.ps1); the author is the photographer where Commons'
  Artist names the object's maker (CC licences credit the photo). Credited on the rank's card (.soc-pic-cr: caption,
  author, licence, Commons link; such a picture links nowhere) and in the game's finish card. upload.wikimedia.org
  answers 429 with Retry-After 600 after about 60 thumbnails in a row, and the block re-arms on every request made
  during it: wait it out, then fetch one every 3-6 s (soc2/thumbs-slow.js, GAP= for apply-picks.js); a pick without a
  crop can use its 330 px candidate thumbnail instead (soc2/fill-from-thumbs.js).
- A12a (5 Nov 2026): ten more, Qing China, Heian Japan, Ayutthaya, Safavid Iran, Ptolemaic Egypt, Gaul, the Asante, Dahomey,
  Venice and the Soviet Union, drafted by five agents with scripts/societies/SOCIETIES-GUIDE.md (rebuilt: the October guide
  was lost with its session) from saved Wikipedia articles, every number checked against them and every source line found
  in them (places of publication the agents added from memory were cut where the articles do not print them). Population
  and shares nobody counted are estimates, marked est with what they rest on (the Soviet population: none of the articles
  gives a 1930s total, so the range is kept wide and says so). Rank pictures: scripts/societies/rank-pictures.js (need |
  cands | fetch | sheet | apply: Commons searches, contact sheets, picks by eye, crops, 320 px JPEGs and the rows of
  scripts/society-pictures.tsv; PowerShell names ignore case, so its sizes are $sw/$sh and $dw/$dh: $W was $w and every
  first picture came out as a 320 px strip). 49 ranks needed one; 47 came from three rounds of searches, two from entries
  (the Royal Palaces of Abomey, the Faiyum). Heian Japan links the Shinto profile, the only Japanese profile before 1868.
- A12b (5 Nov 2026): ten more, Ming China, Kievan Rus', the Khmer Empire, Majapahit, the Delhi Sultanate, Aksum, the Zulu
  Kingdom, the Haudenosaunee, the Dutch Republic and British India c. 1900, the same way; 49 rank pictures (two from entries:
  Rajputs, Angkor Thom; the Haudenosaunee's False Face masks were left out, as sacred objects the Confederacy asks not to be
  shown). Shares nobody counted, and the populations of Kievan Rus', Aksum, Majapahit and the Khmer Empire, are wide estimates
  that say so; British India's Brahmin and untouchable shares lean on present-day figures, as their notes say.
- Wiring: Explore menu, phone menu and footer; Research Hub card; search pages (kind "ladder", glyph group); shelf
  and My Passport kind; sitemap; llms.txt; posters (make-posters.js "societies": a mosaic per ladder, and
  page-societies.jpg); deploy.sh GENERATED and DATA (data/societies); split-css GENERATED; check-site's folders; the
  root /societies → /societies/ redirect.

## Forms of government (/governance, /government/<slug>; Release C, 31 Oct 2026)
Twenty profiles of the kind `government` (PROFILE_KINDS: sections works "How It Works", origins, history "Through
History", strengths, weaknesses, legacy "Impact & Legacy"; facts power, legitimacy, chosen, examples; title "How It
Works, Strengths and Weaknesses"; alive "in use today"; no chart): absolute, constitutional and elective monarchy,
tyranny (the Greek tyrannis, c. 657-146 BCE), dictatorship; aristocracy, oligarchy, theocracy, military junta, one-party
state; direct, parliamentary and presidential democracy, republic; chiefdom, nomadic confederation, city-state,
feudalism, federation, colonial rule. A form's start is the first clear example the profile treats as its beginning
(theocracy: the Judean temple community c. 515 BCE, the polity Josephus coined the word for; military junta: Goryeo's
council of generals, 1170; elective monarchy: the Fourth Council of Toledo, 633), its end empty while states still use it.
- Texts: scratchpad gov/out/<slug>.txt, drafted by four agents with gov/GOVERNMENT-GUIDE.md from saved Wikipedia
  articles (gov/wp) and standard works; every claim checked (gov/factcheck.md: 17 profiles corrected, from Urban IV's
  1263 letter and Joseph Bonaparte's 1806 abolition of feudalism in Naples to quotations that could not be traced),
  strengths and weaknesses as named writers' arguments with their evidence, present-day states only as facts. Merged by
  kinds/merge-kinds.ps1 -Only <names> (names in sentence case, as the other kinds: "Absolute monarchy"); kinds/src holds
  them. Call the script in the same PowerShell (& script -Only $names): through powershell -File a list splits.
- Gold links: design/run-scan.ps1 -Page t-encprof -Kinds -Kind government (t-encprof.html&kind=: one kind only, so the
  other kinds' lists stay as they were), states/desc/prof/enc-prof-apply.ps1, then r9b/page-mentions.js +
  mentions-from-pages.js --write (the lists equal what the pages link). The link audit (kinds/audit-links.ps1 with
  audit-names.html?names=) found 61 wrong matches, excluded per profile in ENC_LINKS.ex (gov/apply-ex.js; recorded in
  kinds/link-exclusions.tsv): names inside longer names (Perry Anderson -> Matthew C. Perry, Lewis Henry Morgan -> Henry
  Morgan, Josiah Ober -> Josiah, David Cannadine -> David, Ronald Syme -> Syme, Arno Mayer -> Arno, Porto Alegre -> Porto,
  Gran Colombia -> Esztergom, Republic and Canton -> Guangzhou, Titus Larcius -> Titus), other things of the name (the
  Cortes -> Corte, Argos -> Argo, Samos -> Samo, Venice's Council of Forty -> Chihalgani, the Tiepolo conspiracy -> the
  painter, Hobbes's Leviathan -> the sea monster, "Romans" in Rome's republic or the King of the Romans -> Roman Empire,
  electors of Venice or the United States -> Prince-elector, "Fifteen" realms -> the Jacobite rising of 1715).
- Section pictures: kinds/section-images-kinds.ps1 -Only <names> (weights for the six sections added), chosen by eye on
  gov/sheets/sec-*.png and written into kinds/pick.txt (Release C block; Chiefdom and Military junta weaknesses "-").
  Home pictures in scripts/home-pictures.tsv (Military junta hidden from the featured rotation) and written into
  home-data.js HOME_PICS without re-running make-home-data (which would change the daily quiz); its patched copy leaves
  the kind out of the quiz's profile puzzles (no capital or founder to clue) and out of the people's region rule, as the
  builder does (PersonRegion: the forms name rulers from everywhere).
- Emblems: gov/emblems-gov.html (house style: a crown for absolute monarchy, the crown over a book for constitutional and
  over seven dots, the electors, for elective monarchy; a Greek tau, a curule chair, a coronet, coins, light over an altar,
  three stars, one filled circle among hollow ones, a raised hand, a temple front, a hemicycle, the hemicycle with the
  president's seat apart, member circles bound to a centre, the conical clan, a yurt, a walled city, a shield with a
  chevron, a ship); never a party's or regime's symbol. Saved by gov/save-emblems-gov.ps1, then scripts/resize-logos.ps1.
- The hub /governance (hand page, governance.js, gv-* in shared.css, css/governance.css): Aristotle's six forms as a grid
  linking the profiles, the twenty forms in four groups (rule by one, by a few, by the many, other ways of ordering a state;
  $govGroups in the builder, which STOPS when a form is in EMPIRES and not in a group or the reverse), "Through the
  centuries" (the register's states alive in the middle of each century by recorded kind, six groups mapped from the
  register's types in $govKinds: STOPS on an unmapped type; GOV_CHART drawn by governance.js as a stacked area chart, Count
  or Share (epoch-gov-chart), crosshair readout, the numbers as a table; colours in stack order gold, blue, magenta,
  green, violet and a neutral Other, adjacent pairs validated on both surfaces) and the facts compared in a table.
  build:gov-lede, gov-forms, gov-chart, gov-table. Menu Themes -> Societies and ideas, footer, Research Hub (Explore;
  write moved to Play and start to The Institute so each group fills its rows), search (SEARCH_PAGES), sitemap,
  llms.txt, poster page-governance.jpg (make-posters.js page "governance"). window.epochGov for tests.
- "Design your state" (#design, after the six forms; governance.js, .gv-wiz): seven questions one at a time as on /start
  (who has the final say, how rulers are chosen, what limits them, the state's size, what holds the people together, who
  defends it, how power changes hands), each answer weighting the forms it describes; the result is the closest form
  with its emblem, teaser and profile (read from the page's own cards) and the next two. Colonial rule is never a
  result. Weights were tuned until 16 real states land on their form (gov/wizard-personas.js: Louis XIV's France,
  Britain, the United States, Athens, Venice, the Mongols, the Soviet Union, a junta, Iran, a feudal kingdom, Hawaii, a
  Greek tyrant, Poland-Lithuania, the Roman Republic, Roman nobles, Napoleon) and every form can win (gov/wizard-check.js
  runs all 78,125 answer sets); window.epochGovWizard.answer([...]) for tests (gov/wizard-test.js, gov/hub-test.js).
- Essay 06, "Who Should Rule? One, Few or Many: Forms of Government Compared" (Research Series, 31 Oct 2026): drafted
  by an agent from the 20 checked profiles and gov/register-counts.txt (the register by recorded kind per century,
  computed as the hub's chart counts it), every figure checked by gov/essay-numbers.js and every outside claim read
  (gov/essay/NOTES.md lists them).
- Not yet: encyclopedia entries for the forms that
  have none (only constitutional and elective monarchy, feudalism and federalism have one), which would let the
  encyclopedia's own texts link to the forms.

## Inventions tree (/inventions)
291 inventions and discoveries (218 until 4 Nov 2026) in eleven lanes (tools and materials, farming and food, building and engineering,
transport and navigation, weapons and war, writing and counting, science and discovery, chemistry, medicine and health,
energy and power, communication and computing), from stone tools (3.3 million years ago) to the World Wide Web
(Oct 2026). Each node is an encyclopedia entry; its date is the earliest firm evidence its source accepts (not a
claim the source calls speculative), and it is credited to a civilisation only where the source supports it (a
profile or an entry: the Kingdom of Lydia for coinage, CERN for the Web; nuclear fission and the jet engine are
credited to no state).
- Source: scripts/inventions.tsv, one row a node: slug, label (the card), category, year (negative BCE), circa (1),
  date (as shown), place, civ (profiles or entry slugs, `;`), people (entry slugs or `=Name`, `;`), also (independent
  origins, `place|date`, `;`: writing in Mesopotamia, China and Mesoamerica), built (the earlier nodes it built on,
  `,`), contested (a note, shown as "Note") and source (the Wikipedia article the facts were checked against).
  build-pages.ps1 ("Inventions and discoveries", script-level names start with inv) STOPS on an unknown entry,
  profile, person or category, a parent not on the tree, a parent dated after its child, or a cycle. It writes
  data/inventions.json ({cats, n: [[slug, label, cat, year, circa, date, place, [[civ, url, emblem]], [[person, url]],
  [[place, date]], [built-on indices], contested, picture, entry name, first sentence, source]]}; INV_SRC with its ?v=
  stamped into /inventions), the page's build:inv-lede and build:inv-list blocks (the accessible list, by lane),
  scripts/invention-links.js (INVENTION_LINKS {profile: [[slug, label, date]]}: generator.html puts "Inventions and
  discoveries credited here" chips after the profile's impact or legacy section, so regenerate the profiles after the
  file changes), on each node's entry page a kicker link to /inventions?focus=<slug> and the section "On the
  inventions tree" (date, place, credited, also, Note, Built on / Led to chips by year), and a flashcard deck for each
  lane (inventions-<lane>, "When and where did it first appear?").
- The rows were drafted by agents in ten batches (scratchpad inv/INVENTIONS-GUIDE.md, one Wikipedia article each,
  every builtOn link given a verdict) and checked one by one against the saved articles (inv/wp); the editor's
  decisions are inv/edits.json (field by field), inv/make-facts.js writes the table and the new entries and stops on a
  parent dated after its child or an entry date the site's parser would misread (five-digit years, "million": the
  Ishango bone's and the stone tools' dates live in the table only). 149 of the nodes were new entries
  (scripts/added-entries.json, applied by scripts/apply-added-entries.ps1), with pictures chosen by eye on contact
  sheets (inv/sheets, inv/pic-picks.tsv): the period object or depiction where one reads at a glance (the Antikythera
  mechanism, Röntgen's X-ray of his wife's hand, Dalton's symbols, Faraday's induction ring, Pasteur's flask, the first
  web server), a reconstruction where it does not (the trireme Olympias), three with none.
- inventions.js (?v= on the page; redesigned 31 Oct 2026, the user: "better formatted and better looking"): the
  eleven lanes stand in five families, one colour each (.inv-f-*: making = tools, building, energy, --cat-2 magenta;
  living = farming, medicine, --cat-3 green; moving = transport, weapons, --cat-0 blue; knowing = writing, science,
  chemistry, --cat-1 gold; connecting = communication, --cat-4 violet, a fifth slot added for it), in that order so
  neighbouring lanes differ most (checked with the dataviz validator, adjacent pairs, on #f4efe4, #0b0c10 and the
  Kids surfaces; the light gold and magenta sit under 3:1, so every lane is also named and has its icon, .inv-ic-*,
  masked SVGs). Every card, curve, chip, tile, list tag and strip dot carries its lane's colour.
  Wide screens: one toolbar row (view switch, "Trace the road to…" search, civilisation filter, a Lanes menu of
  checkboxes that keeps itself on screen, zoom − + ⟳); an era strip above the tree draws all of history at the tree's
  own scale, the five ages (AGES) as buttons that fit the age, a dot for every invention and a window on the part in
  view (drag it, or press anywhere on the strip to go there); the tree is HTML cards (200 x 58, a 48 px picture, a
  two-line name, the date, the lane's colour at the left) on one transformed layer with the SVG curves beneath, and a
  sticky column of lane names with icons and counts at the left that the cards pass under (176 px; its icons alone,
  46 px, below zoom 0.45: labW(k) knows both, so a fit leaves room for the column it will have). Time runs left to
  right in bands (BANDS) whose width follows how many cards one lane holds there, so 3.3 million years of prehistory
  and the crowded 19th century both read; a card sits at its year inside its band, links between non-adjacent cards
  of one lane arch above the row. The tree opens with every lane in view (the stage is the screen's height less the
  bar and strip; zoom never below 0.72 there). Hover or a first tap lights a card's whole lineage (ancestors and
  descendants) and dims the rest; the panel gives the picture, the lane tag, date, place, credited, also, Note, Built
  on / Led to and the entry; "Trace the road to" lights only the ancestors and fits them, following a long road from
  its end. Zoom 0.12 to 1.6 (KMIN, KMAX): below 0.55 the dates and below 0.38 the names give way (inv-far,
  inv-tiny), leaving the pictures as a map. Drag or the arrow keys move; Ctrl + wheel, pinch and the + and - keys
  zoom; the plain wheel scrolls the tree only after a click on it. On a touch screen one finger drags sideways and
  vertical swipes scroll the page (touch-action pan-y), two fingers zoom and move it.
  Phones (700 px and below, matchMedia, switching live): no stage, a vertical timeline instead: every invention in
  date order under the five ages and period headings (periodOf: deep-time stretches, millennia, centuries, half
  centuries after 1800), each a card with its picture, name, date, place and lane tag on a line of dots; a sticky bar
  (top 64 px) of the ages (they scroll) and lane switches; a tap opens the bottom sheet (z-index 950, above the to-top
  button) and dims all but the card's lineage, "Only its line" keeps just that line; ?focus= jumps to the card
  ('instant': the site's CSS smooth scrolling would glide through 10,000 px) and again once the fonts are in.
  By civilisation shows picture tiles; the list has lane tags, a header that sticks under the site's header, and on
  phones each invention as a block of its own. The address keeps ?focus=&view=&civ=&hide=. Kids mode starts without
  the weapons lane. window.epochInventions (nodes, cats, civs, state, layout, select, setView, fitYears, ages,
  families, fam, strip) for tests: scratchpad inv2/feature-test2.js (31 checks: every card, no overlaps, curves and
  colours by family, lane order and column, the era strip's fit and drag, the lineage of 25 nodes against the data,
  the lanes menu and the address, filter and views, focus and search; the phone timeline's order, ages, lane switches,
  sheet, lineage dimming, "Only its line" and ?focus=; WebKit). The layout audit's overlaps on a panned tree are cards
  passing under the opaque lane column and panel, by design.
- A13 (4 Nov 2026): 73 more nodes, 291 in all, the thin lanes first (farming, building, chemistry, communication,
  energy, medicine): from the sewing needle (Denisova Cave, about 50,000 years ago), Kuk Swamp, wine, cheese, the loom,
  fired brick, Egyptian blue and lacquerware to the shadoof, water clock, sundial, screw, lathe and crane, the
  seismoscope, wheelbarrow, kite, horseshoe and junk, the pencil, barometer and thermometer, canning, the stethoscope,
  lithography, the telegraph cable, Morse code, Braille and the phonograph, the electric motor, alternating current,
  the diesel engine, hydroelectricity, radar, the personal computer, email and the lithium-ion battery. Tools in
  scripts/inventions/: INVENTIONS-GUIDE.md (each agent writes the entry and the tree row from one saved article: the
  year of the earliest firm evidence the article accepts, claims it doubts in "contested", a state credited only where
  the article names it), check-inventions.js <drafts…> <wp dir> (lane, year, label, civ, people, parents on the tree or
  among the drafts and dated no later, numbers and names not in the article), merge-inventions.js [--write]
  [--edits=] <entries.json> <drafts…> (appends the rows; the entries go through scripts/entries/merge-entries.js as wave
  a13); the drafts, edits, link patterns and picture picks in scripts/inventions/a13/. Link patterns: none for bare
  everyday words (wine, cheese, coffee, loom, screw, crane, kite, pencil, junk, horseshoe, sewing needle), lower case
  only for words that are also surnames (canning, braille), either case for technical terms. Left out: the windcatcher
  (no date in the article), the sanitary sewer and faience (no early dated evidence), the dhow (no firm first evidence).
- Wiring: Explore menu ("Inventions Tree: what led to what, and who made it first"), phone menu and footer; Research
  Hub ("Through time"); search (SEARCH_PAGES); sitemap; llms.txt; poster page-inventions.jpg (make-posters.js page
  "inventions"); deploy.sh PAGES and DATA (data/inventions.json); split-css HAND; .htaccess (extensionless page).
- Link patterns of the new entries only where the name cannot mean something else (inv/link-patterns.tsv, tested
  with r9/links-check.js and inv/newdesc-check.js): no bare common nouns (wheel, sail, arch, pottery, irrigation,
  coinage, radio, television), "quarantine regulations" rather than "quarantine" (Kennedy's naval "quarantine" of
  Cuba), "Brahmi script" rather than "Brahmi" (inside Tamil-Brahmi on its own page). Words whose capitalised form
  names a company or an instrument match lower case only (mode 0: automobile, aeroplane/airplane, telescope, telephone,
  jarl; "Boeing Airplane Company", "Hubble Space Telescope", "Nippon Telegraph and Telephone", "Birger Jarl"); the
  check is inv/newdesc-check.js plus a scan of capitalised mid-sentence matches in the entries and the day events. The Cannon entry links
  "cannon" (lower case, mode 0, so the surname Cannon never matches) since 4 Nov 2026; until then Field artillery's row
  held it (["cannon", 1]): the move took the drop, the state texts' links moved and a profile rescan of both entries.
- The rank terms the social ladders lacked (36 entries: awīlum, muškēnum, kurtaš, metic, helots, perioikoi, dynatoi,
  pronoia, villein, thrall, jarl, the Third Estate, sosloviye, awlad al-nas, reaya, jati, vaishya, zamindar,
  yangban, nobi, cheonmin, hyakushō, hinin, nyamakala, pipiltin, macehualtin, ajaw, kuraka, ayllu, aclla, casta,
  peninsulares, gens de couleur libres, grands blancs, aliʻi, makaʻāinana) came with this release (agents with the
  entries guide, checked against the saved articles; inv/rank-edits.json holds the editor's changes: the Persepolis
  workers called kurtaš, villein status inherited, cheonmin as the lowborn set apart from the yangin, kawata for eta)
  and stand on their ranks' terms lines; "jeli" became a name of the Griots entry, whose text was rewritten. Lower-case
  patterns only for jati (Sunan Gunung Jati) and ajaw (rulers' names such as Bahlam Ajaw).
- Release B also corrected caravel (13th-century fishing boats before the Portuguese ships), gunpowder, the Maxim gun
  (its colonial effect "often embellished"), steamship (Nemesis, Perry; no "profiles describe") and the Royal Road
  (nine days, as the article has it) through added-entries "fixes".

## Voice
Write in a general, academic register about the past itself. The encyclopedia no longer says "the X profile
treats/notes/describes …" (786 such frames were rewritten in Oct 2026: a clause after "notes that" stands alone;
others read "Accounts of the X describe …"); ledes say "recorded states", not "states of the register". The
Institute and its register are still named where they are defined and credited (/dataset, About, method notes).

## Nov 2026: entries, links, look, features, speed (R3–R7 of the 2 Nov plan)
- Song entries (229) and form-of-government entries (16): scripts/songs/make-entries.js and scripts/kinds/make-form-entries.js
  write them into scripts/added-entries.json (song: / form: markers; a re-run replaces its own), apply-added-entries.ps1
  applies them. Descriptions come only from checked text (a song's story, a form's profile summary). Link patterns: song
  titles listed in scripts/songs/entry-links.tsv (not .txt: make-data.js reads every .txt there as a song), never the
  ambiguous ones (Imagine, Katyusha, Botany Bay, Wind of Change …); forms as lower-case terms, "aristocratic rule" only for
  Aristocracy ("the Macedonian aristocracy" is the class). scripts/kinds/pattern-count.js <slugs> shows how often patterns
  match the descriptions and day events, with samples: read it before patterns go live. A song entry's meta description
  starts "Name (dates), a song:" so it differs from the song page's.
- Profiles linked to the new entries by link-scan.js --entries=<slugs file> (append only: a profile's rows keep their places,
  only the given entries' rows are tried, only their mention lists change), all 540 profiles in slices of 30 (--count).
  self.tsv names each form profile's own entry.
- scripts/song-links.js (SONG_LINKS, written by the builder from the songs' people, places and events that name a profile):
  "Songs in history" chips after a profile's legacy/impact section (generator.html, the inventions chips' style).
- Look (R4): scripts/tools/shots.js (contact sheets of every kind of page, --width --mode --per --col),
  layout-audit.js (now skips what a clipped ancestor hides and float wraps). Fixed: the profile facts box is a grid of
  labels and left-aligned values (right-aligned long facts were ragged blocks; on phones the label stands above);
  /flashcards, /race and /governance had no container rule, so their breadcrumb sat under the fixed header.
- "Meanwhile in the world" (R5): <section class="meanwhile" data-y> on entry pages (the entry's year, $EAT) and dated song
  pages; enc-page.js loads meanwhile.js (MWJS_V) and data/meanwhile.json (MW_V; every profile with span, region, weight,
  emblem, and the years with pages) when it nears the screen: the heaviest profile of each region alive that year, six at
  most, then the year page (or the nearest within 25 years), the century and the atlas in that year.
- Song of the Day (R5): data/days/<mm-dd>.json carries "song" ([slug, title, culture, year, kid line, has words]: of the songs
  with a checked performance that suit Kids mode, by day of year times a prime stride); the home page's card after the entry
  of the day keeps its size while the file loads. Since 4 Nov 2026 the tuple ends with the performance's video id and
  channel, and a "Play the performance" button under the card loads YouTube's no-cookie player in its place when pressed;
  the page's static markup holds an invisible placeholder button (.sd-listen.sd-wait) so nothing moves when it arrives.
- Today's Number (home page, 4 Nov 2026): build:home-numbers holds HOME_NUMS [[number, text, address]], figures counted by
  build-pages.ps1 from the data (entries, states, profiles of each kind, speeches, songs, inventions and each lane, paths,
  ladders, people, the states founded in each century with ten or more); an inline script after the card shows one a day
  (UTC day x 29) before the first paint.
- Link colours: scripts/tools/link-colour-audit.js [--kids] [paths] opens a sample of every kind of page in both themes and
  flags links in running text left in the browser's default colour or in the colour of their text (4 Nov 2026: the
  /governance paragraphs and the Kids corner's subtitle; fixed, 0 flagged).
- Service worker (R5/R6): sw.js (network first for pages with a 4 s fallback to the kept copy, the 200 latest pages kept;
  cache first for ?v= files, pictures, emblems and fonts; stale-while-revalidate for the unversioned shared files),
  offline.html (lists the kept pages; exempt from check-site's page rules like 404.html), manifest.json; shared-nav.js
  registers it after load and idle, on the live host only, and adds the manifest link. .htaccess: sw.js and offline.html
  no-cache. Test: scripts/tools/sw-test.js (7 checks, localhost). To retire it, deploy a sw.js that unregisters itself.
- Speed (R6): scripts/tools/live-speed.js (cold and warm visits, 4G and 4x CPU, TTFB/FCP/LCP/CLS/TBT/KB; --json). Baseline
  2 Nov 2026 before the service worker: first paint 1.6–3.0 s cold, 0.4–1.0 s warm; the largest file on every page is
  Analytics (178 KB, after idle); home-data.js 117 KB on the home page; /songs/ and /profiles block 0.9–1.2 s on a slow phone.
- SEO (R7): scripts/tools/seo-audit.js (long and duplicate titles, short and duplicate descriptions, orphan pages, sitemap
  coverage, missing alt): 2 Nov 2026 it found the song entries' duplicate descriptions and /about linked only from the menus
  drawn in script (now linked from the home page's hero).

## Nov 2026: songs of states, and the features of the ranked list (second set, 2 Nov 2026)
- Songs of states and causes (the user: "add communist regime songs … I did not mean only communist, there are a lot of
  other songs like that too"): 66 more songs in scripts/songs/ (LIST3.tsv): Soviet, Chinese, North Korean, East German,
  Yugoslav, Cuban and Khmer Rouge songs, fascist and Nazi songs (Horst-Wessel-Lied, Giovinezza, Faccetta nera, Cara al Sol,
  Erika), imperial anthems, wartime songs of both world wars, nationalist and protest songs (Rota, A Nation Once Again,
  Glory to Hong Kong). SONGS-GUIDE.md has a paragraph for them: told as history, the regime's acts named where the sources
  name them (the Khmer Rouge anthem names the Cambodian genocide from its own article), "the song presents X as Y", kids:
  no for fascist, personality-cult and mass-killing regimes' songs. Thin English articles were joined by the song's own
  language edition (<slug>.<lang>.txt in the scratchpad songs3/wp). Tachanka dropped (its article is about the cart).
  make-data.js WITHHELD {slug: reason}: words in the public domain but not printed, the page saying why (the
  Marcha Real, an anthem without official words; the Horst-Wessel-Lied was withheld too until 6 Nov 2026, when the user
  asked for it, the Ghost Dance songs and Foster's minstrel songs to be printed as the historical record: make-data.js
  CAUTION gives each a note above its words, .sg-caution; the Horst-Wessel-Lied as English Wikipedia quotes it with its
  translation, the Ghost Dance songs as James Mooney recorded and translated them in 1896, Project Gutenberg 74335: a
  Paiute, a Lakota and a Caddo song; fetch-texts.js noital drops Gutenberg's _italic_ marks). 20 public-domain
  texts imported (sources.tsv "# Nov 2026, third wave"), 11 translated by the Institute (translations/), 2 gaps (Heil dir
  im Siegerkranz: only parodies quoted; Battōtai). Performances only from performers' own channels, Topic releases,
  archives (Gosteleradiofond, CCTV) and choirs; none where only re-uploads exist (most North Korean songs, the Khmer Rouge
  anthem, Uz maršala Tita) and none for the Horst-Wessel-Lied; the Falange's own channel is not embedded. 52 song titles
  link their new entries (entry-links.tsv); the profiles were scanned for them (link-scan --entries).
- encyclopedia-links.js byEmpire had "ilkhanate" (86 entries) and an empty "Ilkhanate": merged under "Ilkhanate", so the
  Ilkhanate's page links its entries (apply-added-entries.ps1 stops on keys that differ only in case).
- /compare (hand page, compare.js): any two profiles side by side: heads, their spans on one axis with the overlap or the
  gap in years, takeaways, facts (each kind's, PROFILE_KINDS facts; polities capital/founder/predecessor/successor) and key
  events merged by year; ?a=&b=; "Surprise me" deals two of one kind, other regions, alive together. Data
  data/compare/<slug>.json (builder, COMPARE_V stamped). /profiles' compare panel links to it; menu Themes → Read and
  discover; footer; hub (Explore).
- /profiles View: Cards | Timeline (?view=timeline): a bar per profile by region on a log scale of years before 2025
  (TL_MIN −15000), coloured by kind, name after, before or on its bar.
- Where Is This Song From? (/games#songq, games.js SongQ, songq-data.js SONGQ): five songs a day (UTC, #1 = 3 Nov 2026),
  four lines of the original (the English on request), four regions; epoch-games songq-<n> (Kids mode songq-k<n>, Kids songs
  only), songq-streak; Share; the passport counts twelve games.
  Every stanza is in the data (B3, 4 Nov 2026): a song dealt again, every 37 days or so, shows its next stanza (pass n,
  stanza n mod its count; choruses sung again and one-line stanzas left out). node scripts/tools/songq-test.js [day] deals
  every day to 30 June 2027 for both pools: 428 dealings still repeat lines, those of the 33 songs with one stanza.
- Born on This Day (home page): data/days "born" [slug, name, dates, thumb, year], the four best known with a picture.
- Next to read (shared-nav.js, every reading page): three unread pages the page links, by See-also lists, the reader's
  kinds (epoch-seen) and frequency; after idle, at the foot. window.epochNextRead.
- Find a line (/songs/): data/song-lines.json, every printed line of the 187 songs with words, fetched on first use.
- Encyclopedia filters: With a picture, Era (ancient to 499, medieval, early modern 1500–1799, modern, undated); ?pic=1&era=.
- Passport levels: a point a page read, ten a stamp; eight levels Visitor to Sage of the Ages (window.epochPassportLevel).
- Listen on reading paths: TYPES entry for main.paths-page; each stop read as "Stop n. Name. Why".
- /new and whats-new.xml (generated root page, split-css GENERATED_ROOT): scripts/whats-new.tsv (release notes, written by
  hand with each release) and the pages first seen in the last 30 days (scripts/first-seen.tsv: the day each path first
  built; pages before 2 Nov 2026 have no day). The user chose a page only, no mailing.
- /today-card: the embeddable On This Day card (self-contained, noindex, no analytics; ?theme=light, ?n=1-5; DAYS_V stamped);
  .htaccess lets only it be framed (frame-ancestors *); the code to copy is on /today-in-history/.
- Teachers' Corner: /teachers/cultures-<region> (order, homelands from the facts, takeaway questions) and
  /teachers/songs-<era> (Kids songs: order, places, listening questions).
- Home hero: on wide screens the globe is a square as tall as the text beside it (the figure a size container, the square
  min(100cqw, 100cqh − caption)); phones keep 25:14.

## Roadmap (not built yet)
Found while building the social ladders (30 Oct 2026), not done yet:
- The ladders' MISSING lines still name the people and some terms the encyclopedia lacks (bandaka, magi, Parnaka,
  horon, jon, numu, Balla Fasséké, calpolli, mayeque, tlacotin, calmecac …; the 36 rank terms came with the inventions
  release, 31 Oct 2026): add them by the R9 entries process, then the ladders' terms and people lines.
- The 185 entries added on 31 Oct 2026 (the inventions tree and the rank terms): the profiles were scanned for them on
  4 Nov 2026 (scripts/kinds/link-scan.js --entries over every kind, the 104 that had patterns and no profile mention):
  no profile names any of them, so nothing changed. The state texts were relinked on 4 Nov 2026 (C2:
  scripts/kinds/relink-states.js --entries=<slugs> [--report] [--write]: generator.html's linkify rules over every row, so a new
  short name never links inside an older, longer one; only links to the given entries are added, first mention per
  field; namesakes kept out by scripts/kinds/state-link-exclusions.tsv, e.g. "fief" on Chinese and Japanese states;
  data/enc-states.json counts kept in step): 463 links in 390 states for the entries of scripts/added-entries.json
  (chiefdom 141, fief 54, the Bolsheviks, forms of government, cacique, zamindar, Mycenaean and Maya sites …).
  "cannon" moved from Field artillery to the Cannon entry the same day (drop + pattern in added-entries.json, the 8 state
  links moved, every profile rescanned for both entries: 19 profiles now link Cannon).
- Generic link names still linking one thing everywhere, handled on the ladders by nolink: "printing" (the printing
  press, also for Song woodblock and movable type), "slave trade" (the Atlantic slave trade, also for Viking and Maya
  trades), "Gao" (the Malian city, also the Chinese surname), "magnates" (Polish-Lithuanian), "Mahdi" (the
  messianic figure, also the caliph al-Mahdi).
Songs in History, not yet: "Songs" chips on the profiles (a scripts/song-links.js read by generator.html, then
regen-profiles) and on the country histories; posters of their own (song-<slug>.jpg); the words of the 8 public-domain
songs without a free edition (Dle Yaman, Tizita, the Hanuman Chalisa, the Delphic hymns …); encyclopedia entries for the
songs (only God Save the King, Advance Australia Fair and the Gita Govinda have one); more songs by the same files.
Yoruba religion
has pictures in only two sections: the encyclopedia has no pictured entries for the orisha or Ifá yet.
455 people of the encyclopedia still have no dates (legendary and biblical figures, and people whose Wikidata dates are
missing or doubtful; scratchpad r6/dates-decisions.tsv): an undated person is on no century or people page and in no
year's births and deaths.
Found in the R9 checks (29 Oct 2026), not fixed yet:
- (Done 4 Nov 2026, A7 wave 4: 67 events dated, see "Encyclopedia") The rest of the 111 undated events are concepts,
  festivals, legendary events or ones whose article gives no year.
- The state and empire profiles' mention lists still disagree with their pages (r9b/mention-compare.js: 3,291
  recorded mentions no page links, 2,805 links no list records): the polity scans count names inside longer ones as
  the kinds' did. Some of those page links are wrong too (Arad, Romania on the Kingdom of Judah; Louis IX, Duke of
  Bavaria on the County of Toulouse; Ferdinand II of Aragon on the Kingdom of León): audit the polities' links as the
  kinds' were (kinds/audit-links.ps1), then rewrite the lists from the pages. The Ilkhanate's byEmpire key is spelt
  "ilkhanate", so its page links almost nothing.
- (Done 4 Nov 2026, C3: build-pages.ps1 links an entry to its profile, "Full profile: <name> →", from ENC_LINKS.self,
  where it has no plain state page.) Entries of profiled states did not link their profile: make-enc-states.ps1 maps only states without one, and
  data/enc-states.json was not re-run after R8, so the Kingdom of Zimbabwe and Purépecha entries still have the link a
  re-run would drop. Map profiled states too and name the link "Full profile".
- (Done 29 Oct 2026) Kids mode: a long fact in the facts box of a religion, language, culture or movement profile
  changed its line count when Nunito replaced 'Nunito Fallback', and everything below jumped (38 of 192 page and width
  pairs; /movement/renaissance-humanism at desktop: CLS 0.138). The head snippet now preloads the Kids fonts: CLS 0 on
  the 25 pages that jumped, at desktop and phone. Kids pages still fetch the two static normal-font preloads they do not
  use (73 KB): moving those into the snippet too would spare them.

## Homepage and site search
- Home (index): two-column hero (h1, search, the world in 1000 CE map from the builder, replaced after load and an idle
  moment by a slowly turning globe drawn by /home-globe.js (?v= in index's GLOBE_JS) IN A WORKER on an OffscreenCanvas
  (canvas.transferControlToOffscreen; the worker imports /d3-geo.js and maps/globe-land.js itself), so the page stays
  free while it turns: on a slowed phone each frame on the page had been a long task (60 in 6 s, 2.8 s of blocking; now
  2 and 0.16 s). Without OffscreenCanvas (Safari before 16.4) the same file draws on the page. Coasts thinned to about
  0.3°, 30 frames a second (15 on touch screens, at 1.5x at most; the sphere's glow and rim drawn once), colours read
  on the page and posted again on a theme or Kids change, turning only while on screen and the tab is shown (the page
  posts that too); the canvas is shown once the worker has drawn ('ready'); the still map stays under reduced motion or
  Save-Data; a head script sets html.home-globe-on with the
  same tests, so the link keeps the globe's 25:14 box from the first paint and nothing moves when it swaps; the canvas's
  [hidden] must win over .home-map canvas, which once showed an empty box under the map), then (regrouped 31 Oct 2026,
  the user: more engaging, nothing cramped, no gaps): "Continue where you left off" (returning readers), On this day
  (one row: the anniversary event's picture with its year and title as a caption, then the international day and/or
  events in year order, never the pictured one again; links today's day page), "Try it yourself" (build:home-try,
  $HOMETRY in the builder: six picture cards for the interactive tools, each with what to do: be born into history,
  trace an invention, race the empires, write in hieroglyphs, watch a faith spread, the Kids Corner), the daily row
  (Daily Quiz beside "Today's Puzzles", a 2 x 2 of the Daily Ten, Connections, the Crossword and Who Said It?, then
  "From the Encyclopedia", the entry of the day, as a wide card), "Ways into history" (build:home-doors: eight doors,
  picture on top, with the short line `s` of $SECTIONS: profiles, encyclopedia, states, atlas, countries, centuries,
  people, paths), featured profiles + era/region chips, centuries strip and country chips (builder), reading paths,
  newsletter (the announcements, a Google Drive folder, were removed on 29 Oct 2026). On phones the featured profiles
  and the chip rows scroll sideways (.browse-cols > div needs min-width: 0, or the column grows to the unwrapped chips
  and they cannot scroll), and the doors stand two to a row. Sections fade in a little before they reach the screen
  (IntersectionObserver rootMargin 20% at the bottom). The mission paragraph is on About.
- Daily quiz (quiz.js, on index and /quiz): rotates profile → person → event → place → profile → idea → work. Profiles of every kind (title from PROFILE_KINDS), entry puzzles from the encyclopedia with the name masked in the clues. `?quizday=N` previews another day. /quiz adds practice rounds by category with a score and best run.
  An entry puzzle's first clue names the kind (the subtype: "A river", "A siege"…), the dates and the entry's region
  (as the search filter, see /people/: "A battle · 31 BCE · Egypt and North Africa"; the clues of all 197 puzzles
  were read on 29 Oct 2026 and 18 set right in scripts/entry-regions.tsv: Alaska had been in Europe, Aden in
  Sub-Saharan Africa, the Vietnam War in Oceania, Toussaint Louverture in Europe). The result card has Share and, once, the
  newsletter line. Next to it, "Today's challenges" links the Daily Ten, Connections and the Crossword (status from epoch-games).
- `home-data.js` — HOME_QUIZ (profiles + entry puzzles by type), HOME_PICS (one picture per profile for the featured
  cards and the profile puzzles), HOME_ENTRIES (encyclopedia "entry of the day"), HOME_COUNTS. Loaded by `index` and
  `quiz` (bump home-data.js?v= on both). Scratchpad design/make-home-data.ps1; -HomeOnly leaves search-index.js
  alone. HOME_PICS: the automatic pick (the section picture most distinctive to the profile) is replaced by
  scripts/home-pictures.tsv for 169 profiles, chosen by eye on contact sheets in Oct 2026 (the automatic picks had
  given Detroit to New France, Versailles to Ayutthaya and death-camp photographs to Yugoslavia and Nazi Germany):
  `profile, entry slug` ("-" = no picture: Volga Bulgaria, which has none that fits), then options: `hide` keeps a
  profile out of the featured rotation (Nazi Germany), `top=NN` sets where a tall picture is cropped (HOME_PICS
  top, used by the cards and the quiz picture; the cards otherwise use 30%). Check new picks as the cards crop them
  (16:10, cover). The script warns when two profiles get the same picture.
- `search-index.js` — SEARCH_INDEX [slug, name, type, aliases, weight] for the header search (shared-nav.js
  `initSiteSearch`; loaded on first open; "/" or Ctrl+K opens it), then SEARCH_STATES (make-search-states.ps1;
  make-home-data.ps1 keeps that part as it is). weight 0–8 = 1.5 × log2(1 + 2 × profiles mentioning + state
  histories mentioning, from data/enc-states.json) + 1 for a picture; siteSearch adds twice the weight. Match
  scores: exact 100, prefix 80, the words after a leading "Battle of", "Kingdom of" … (SEARCH_LEAD) 90 if they are
  the query, 78 if they start with it, word start 70, every word in any order ("hastings battle") 60, inside 40;
  profiles +20, states +2. So "hastings" gives the Battle of Hastings before Hastings Banda. Since Oct 2026:
  - build-pages.ps1 PACKS the file after make-home-data/make-search-states: a slug that follows from its name (accents
    dropped, lower case, & as "and", other runs of signs "-"; only names plain ASCII without their accents) is written
    0 and the line after the list restores it, so every reader of SEARCH_INDEX still sees slugs; rows with a picture end
    in 1 (SEARCH_INDEX[5], SEARCH_STATES[4]; a row the generators wrote short, without aliases or weight, gets "" and 0
    written out so the flag keeps its place). It also writes `search-pages.js` (SEARCH_PAGES [name, address, kind,
    other names]: the tools under plain names ($HANDP), the 190 country histories, centuries ("fifteenth century",
    "1400s"), speeches (with the speaker), paths, essays; SEARCH_YEARS: the years with a page) and stamps both ?v=
    into shared-nav.js (SEARCH_INDEX_SRC, SEARCH_PAGES_SRC): never bump them by hand.
  - shared-nav.js folds every name once (searchPrep; it was redone on each key press, 200-350 ms on a phone); the
    dropdown waits 80 ms after typing. SEARCH_SYN: other names typed for the same thing (ww2, czar, mogul, peking,
    aya sofya, karl der grosse, ussr …; each checked to reach an existing entry or profile; aliases already in the
    index are not repeated). Fewer than 5 matches: close spellings (searchFuzzy: one edit for words of 4-6 letters,
    two from 7 — "ghengis" — first letter fixed), shown with "Did you mean …?" (didYouMean on the result array, also
    on /search). A year ("1066", "480 bce", "ad 800") gives its year page (or the nearest within 25 years) and its
    century first. A profile and the entry of the same name are twins: the dropdown shows the profile with a small
    "Encyclopedia entry" link, /search lists the entry right after it. Results show the 112 px thumbnail, the
    profile's emblem or the kind's glyph; an empty field shows the last 8 searches (localStorage epoch-search-recent).
    Enter opens the first suggestion, but while the index is still on its way it opens /search?q= instead: until
    then the suggestions come from the small page list alone (a quick Enter on "napolean" opened Napoleon's speech,
    not Napoleon; fixed 29 Oct 2026, scratchpad pw/search-enter.js).
  siteSearchAll(q) returns every match (with k: kind, src: 'p'/'P'/'e'/'s'/'g' (site page)/'y' (year) and i: its row);
  siteSearch(q) is its first 12; loadSearchData(cb) loads the index, the pages and (without shared-data.js) the profiles.
- `/search` (hand page, noindex): every result, 50 a page, kind chips with counts, region and century filters, "with a
  picture"; the address keeps the state (?q=&k=&r=&from=&to=&pic=1&p=). The filters read `search-facets.js`
  (SEARCH_FACETS: one row per SEARCH_INDEX row and per SEARCH_STATES row, [first century, last century (BCE
  negative, 0 undated), region index in REGIONS, picture], with the row counts it was made for; written by
  make-home-data.ps1 every run: century from the builder's Span, region by the people pages' rule (EntryRegion, with
  scripts/entry-regions.tsv), a state's from polities `b`). If the counts no longer match the index the filters do nothing:
  re-run make-home-data after make-search-states. Bump `search-facets.js?v=` (FACETS_SRC in /search) when it changes.
- 404.html: a search field (opens /search) with the broken address's words, "Were you looking for…" (the
  closest profiles, entries and states by word beginnings, so /encyclopedia/battle-of-hastingz still finds it) and
  six destinations.
- Listen (shared-nav.js): a "Listen" button ("Read it to me" in Kids mode) under the title of entries, states,
  profiles of every kind, speeches, day pages, essays and community articles, shown only where speechSynthesis has an
  English voice (Android in-app browsers have none). It reads the title, lede and sections (TYPES: a root and its
  selectors per page kind), never menus, pictures, credits, references or buttons, and nothing hidden (Kids-mode
  folds, a closed full speech). Dates are said in words (r. → reigned, c. → circa, 1066–1087 → 1066 to 1087). Text
  goes out in chunks of up to ~220 characters (Chrome cuts long utterances); Pause cancels and Resume restarts the
  chunk; a passage with another lang gets a voice of that language or one spoken note that it is skipped; the
  paragraph read is outlined (.is-speaking) and followed on screen until the reader scrolls; the player (.listen-bar)
  sits above .path-journey and to-top; pagehide stops it; speed 0.8/1/1.2 in epoch-listen-rate. window.epochListen
  exposes parts/chunks/speakable for tests (scratchpad t-listen.ps1 runs them against a stubbed speechSynthesis).
  Voices (Oct 2026, after "this sounds fake"): the device's English voices are ranked by how natural they sound —
  neural first (Edge's "Online (Natural)", Apple's "Premium"), then Apple's "Enhanced", network voices (Chrome's
  Google voices, localService false), the basic voices, and Apple's novelty and Eloquence voices (Bubbles, Grandpa …)
  only when there is nothing else; en-GB before en-US within a rank. The player's menu (.lb-voice) lists them
  ("Sonia (natural) · UK") and a choice is kept in epoch-listen-voice and applies at once (scratchpad t-voices.ps1:
  Edge, Chrome and Apple voice lists). The voice is still the device's: Edge and Apple's downloaded voices sound
  natural, a phone's basic voice does not.
- Both are generated from encyclopedia-data.js + empire-section-images.js; regenerate them whenever those change.

## Empire pages
- `empire-section-images.js` — SECTION_IMAGES: one picture per profile section (an encyclopedia entry linked in
  that section, with its image and credit). Loaded only by generator.html; rendered as `.profile-section-fig`.
- `empire-facts.js` — EMPIRE_FACTS: capital, founder, predecessor, successor per empire (key-facts box).
  Loaded only by generator.html. The template also builds the table of contents, reading time and
  related/earlier/later empires from EMPIRES (same region, overlapping years).
- `empire-glance.js` — GLANCE: per profile 3 takeaways (t), a 'Did you know?' (dyk) and 5-8 key events (ev: [year text, text]).
  Generator renders 'At a glance', and 'Rise & fall' (SVG from EMPIRES.points with numbered event ticks) + timeline.
- `profile-changes.md` — log of the Oct 2026 fact-check of all 94 profiles (corrections per empire). Not deployed.
- Editing profile text can break encyclopedia matching: entries are found by their exact name or aliases, so keep
  full names (e.g. "the Battle of Mohács", not "at Mohács") or the entry loses its link.

generator.html must produce output identical to the committed empire/* files — edit the template
there rather than editing the 490 pages by hand. To regenerate: open generator.html from a local
server, download empire-pages.zip, extract into empire/, commit and push.

## Encyclopedia previews
`data/enc-preview/<first char>.json` hold preview cards (name, type, dates, two sentences, image) for gold links; shared-nav.js `initEncPreviews` fetches them on hover/focus/first tap. Regenerate after rebuilding encyclopedia-data.js (scratchpad design2/make-previews.ps1 logic: first two sentences, max 280 chars).
Sentences are cut by one rule everywhere (build-pages.ps1 `[EpochBuild.W]::Sentences`, which make-previews.ps1 compiles
from the builder, and shared-nav.js firstSentence for the Kids-mode "In short"): no stop after an abbreviation ("c.",
"St.", "v.", "Jr."), an initial ("W. E. B. Du Bois", "H. V. Evatt") or inside "U.S."; a regnal numeral ("Charles V.
He …") and "D.C." end a sentence. Until 29 Oct 2026 any full stop before a capital did: 177 preview cards ended on
"Robert E." or "B. R.", meta descriptions could, and "Brown v. Board of Education" was "Brown v." in Kids mode.
Scratchpad r9/sent-compare.js checks that the three give the same first sentence for every description.

## Share posters (link previews)
`images/og/*.jpg` (1200x630, ~95 KB) are the pictures Facebook, Messenger, WhatsApp, X and the rest show for a shared
link, drawn by `node scripts/make-posters.js [kinds] [--only=words] [--out=dir]` (Node; Playwright once with
`npm install --prefix scripts playwright-core`, which drives the installed Edge on Windows; since Edge 156 closes
Playwright's pipe at start-up, the script then starts Edge with a debugging port and connects over CDP): it serves the repository, opens scripts/posters/poster.html (the template: render(job) per poster, check()
reports text that overflows) and screenshots each poster, writing only changed files (re-runs are byte-stable; an old
file that will not decode, from a run stopped mid-write, is simply redrawn). Kinds:
profiles `<slug>.jpg` (emblem as a seal on the HOME_PICS picture, dates, teaser, the rise-and-fall curve, or for religions
and languages a gold band for their span on the timeline of recorded history; no emblem for profiles marked `hide` in
home-pictures.tsv; `--dump=jobs.json` writes the jobs without drawing: where Playwright is not installed, scratchpad
kinds/render-posters.ps1 draws them through the same poster.html in headless Edge over CDP), days `day-<month>-<day>.jpg` (events and the day's picture, a
calendar plate when there is none), countries `country-<slug>.jpg` and centuries `century-<slug>.jpg` (maps taken
from their pages), speeches `speech-<slug>.jpg` (key passage + portrait; "In substance" for paraphrases), paths
`path-<slug>.jpg` (six step pictures, one per Commons file and maps last as in the path strips, + stops), and the sections `page-<name>.jpg` (games, quiz, kids, atlas, profiles,
explorer — the real power curves —, connections, start, encyclopedia, states, today, countries, centuries, speeches,
paths) and `default.jpg` (home and every page without a poster). Pictures carry their credit (licence) line.
Re-draw after changes to the profiles, the day data, a build that changed country/century pages, speeches or paths,
then commit the images. Wiring: profiles and day/country/century pages name their poster already; the builder's
Poster() gives speech, path and the countries/centuries/paths/speeches index pages theirs when the file exists;
hand pages name `page-<name>.jpg` in their og:image/twitter:image metas. Entries and states keep their own picture
(a small "summary" card) or default.jpg. The poster URLs keep their names, so Facebook may show a cached old card
for a link shared before: its Sharing Debugger ("Scrape again") refreshes one.

## Sharing (shared-nav.js) and score posters (share-card.js)
- sharePoster(o) — o: text, url, title, heading (the panel's), image (a poster address, a Blob or a pending
  {p, b}), file. Phones with Web Share and file support get the system share sheet with the picture (the address
  goes inside the text: apps given a picture may drop a url); otherwise, and in in-app browsers without a share
  sheet (Android WebViews), shareSheet(): the picture (press and hold to save; Save the picture on desktop, never
  in in-app browsers, where downloads go nowhere), WhatsApp, Facebook, X, Telegram, Email, Copy (copyText:
  Clipboard API, else execCommand) and the in-app tip. shareThis(text, url, btn) is kept for old callers.
- Any `[data-share-text]` button shares through it; `data-share-img` (fetched on pointerdown/hover/focus by
  warmPoster) adds the picture: speech pages' "Share this quote" sends speech-<slug>.jpg (written by the builder).
  Pages whose og:image is a poster of their own (profiles: in .info-share-row; day, country, century and path
  pages: under the header) get a Share button that sends it.
- scoreCard(spec) loads /share-card.js (SHARE_CARD_SRC in shared-nav.js: bump its ?v= when share-card.js changes)
  and draws a 1080x1350 score poster on a canvas (EpochCard.make): title, big score, unit, stars, and squares (Daily
  Ten), the grid's shape (Crossword: no letters), clue boxes (daily quiz: never the answer), pictures with years (Order the Ages, Which Came First?, Guess the
  Year), emblems (Emblem Pairs), rounds (Globe Hunt), the solved picture (Picture Puzzle), found words (Word Hunt), up to four bars with emblems and values (`bars`: the Rise and Fall Race);
  Kids colours in Kids mode. games.js share() draws it as a finish card appears; quiz.js when its Share button is
  first touched.

## In-app browsers (Instagram, Facebook, Messenger …)
shared-nav.js sets EPOCH_INAPP ({app, os, name} from the user agent; also any Android WebView "; wv)") and
html.in-app. inAppTip(why) says how to open the page in the reader's own browser (the app's ⋯/⋮ menu; on Android also
an intent:// link the apps hand to the system). The share panel above is the share sheet these browsers lack.
Game sound (games.js Sfx): the AudioContext is woken by a silent sample on the first touchend/pointerup/click/key
(Android WebViews and iOS start audio only inside a tap; Globe Hunt's sounds come from timers) and again after the
phone suspended it; on iPhones navigator.audioSession.type = 'playback' (iOS 16.4+, in-app browsers too) so the
ring/silent switch does not mute it ('auto' when sound is switched off). A hint under the switch says when the
browser still keeps the page quiet. Fields are 16px on touch screens (iOS zooms into smaller ones), game boards
have no tap flash or image callout, and the phone menu and the share panel use dvh (in-app toolbars cover 100vh).
Pitfall, fixed Oct 2026: body.page-entering's fade must not keep a transform on <body> (animation fill "forwards"
left translateY(0) there, which made the header, search, Back to top and the share panel scroll with the page):
it uses "backwards".

## Reading paths
`reading-paths.js` (READING_PATHS: themed routes of profiles and encyclopedia entries, each step with a one-line reason) feeds the pages /paths/<slug> and /paths/ (built by build-pages.ps1) and the homepage teaser. Generated from scratchpad design2/paths.json by make-paths.ps1, which validates every profile name and entry slug and slugs profile names as toSlug does (accents dropped). Every reason rests on the stop's own page. 29 Oct 2026: ten more (Voyagers of the Pacific, The Story of Writing, Revolutions in Asia, The First Cities, The Indian Ocean World, Al-Andalus, The Bronze Age Collapse, Decolonisation, The Renaissance, The Cold War; scratchpad r7/new-paths.js, merged by r7/merge-paths.js). 4 Nov 2026 (A11): 24 more, 62 in all (Ideas That Shaped Modern Politics, Forms of Government through History, Abolition and the End of Slavery, Votes for Women, The Living Peoples, Before the State, The Ancient Gods, Faiths of the Persian World, The Ancient Near East, Languages and Their Peoples, Empires of the Sea, The Reformation and Its Wars, Mesoamerica, the Andes, West Africa's Golden Age, East and Southern Africa, The Mongol World, Japan, Korea, Kingdoms of Southeast Asia, The Ottoman Centuries, Russia, Nations Born in the Nineteenth Century, Inventions That Changed the World), written by six agents with scripts/paths/PATHS-GUIDE.md from the stops' own pages (scripts/paths/stop.js prints what a stop's page says) and appended by scripts/paths/make-paths.js, which computes each step's name, picture and label as the old generator did; the agents' files are in scripts/paths/a11/.
Print this path (4 Nov 2026): a button under a path's header (.ws-print, the worksheets' handler in enc-page.js) prints
the path as a booklet: the stops with their reasons and, in print only, the first sentence of each stop's entry (or of a
profile's own entry, ENC_LINKS.self); menus, share, Test yourself and the prev/next links are left out (@media print).

## Connections map and the states register
- `data/polities.json` — register of every state (incl. the modern Levant: Israel, the State of Palestine, Jordan, Lebanon, Syria — added by hand Oct 2026, successor links to the mandates): nodes {id, n name, t type, b broad region, s/e years, a aka, m mode, c capital, mo modern countries, p profile url} and links {s, t, r relation, f/u years}. Successions stored one way (successor-of). Built from regional research files by the scratchpad states/merge.ps1 (dedupe, relation resolution, validation report).
- `connections` page + `connections-map.js` (no D3; radial layout, timeline, year slider, outliers). Empire pages include a lazy-loaded mini map (section #connections).
- Lines have one meaning each, with a key under every map listing only the kinds drawn (KIND in connections-map.js,
  .cm-* in shared.css): Rule (part of, province, colony, conquered by) thick glowing gold with a slow glimmer;
  Looser ties (vassal, tributary, protectorate, personal union) slimmer gold; Lineage (successor, merged into, split
  from) silver; Not in force in the chosen year: thinner faded silver; Second step: slim threads without glow;
  Groups: a soft band. No dashes or flowing: lines draw out from the centre once (pathLength 1); a redraw of the same
  map (year slider) shows them at once (.cm-still). Colours --cm-silver, --cm-thread, --cm-glint in both themes.
- Big hubs (Holy Roman Empire: 378 links): the inner ring shows the ~24 most important neighbours (successions, profiled states, well-connected states), the rest as type bubbles ("86 counties") that expand on click (`opts.expand`, back button); timeline capped at 40 rows + "Show more". Phones (<600px) get a tall layout with fewer nodes.
- `state/` page (Research → States): index of all 5,468 states (filters: name, region, type, present-day country,
  "existing in" year) and one page per state at `/state/<id>` (built by build-pages.ps1; states with a profile
  redirect to it): teaser, Origins / Rule and society / Decline and legacy, key facts, picture or emblem, lineage strip
  (successor-of, merged-into, split-from), lazy mini map, dated connections. Text and pictures come from `data/states/<first char>.json`
  ({t, o, r, e, ru, re, la, c confidence, img, cr {a, l, s}}); pictures in `images/states/<id>.jpg` (Wikipedia lead
  image, free Commons licence only, 320px JPEG; credit shown). Built by scratchpad states/desc scripts
  (DESC-GUIDE.md for the writers, check.ps1, build-state-data.ps1, pick-state-images.ps1, shrink-images.ps1). 123 more
  pictures were chosen by eye on 28 Oct 2026 from the 369 states with any candidate left (Wikidata flag, arms or image,
  Wikipedia lead images): a flag, arms or a period object or picture, never a modern map or a flag invented for a
  pre-modern state (scratchpad r6: state-picks.tsv, apply-states.js; img-credits.json has them, so build-state-data
  keeps them). The rest of the 1,722 states without a picture have no free picture of their own.
- Site search also covers states: `SEARCH_STATES` at the end of search-index.js (states/desc/make-search-states.ps1);
  the builder packs it and stamps its ?v= (see "Homepage and site search").
- merge.ps1 dedupes only when lifespans overlap and modern countries agree; ambiguous names ("Kingdom of Hungary") resolve to the state alive at the relation's date; relations to Rome before 27 BCE go to the Roman Republic. Bump `polities.json?v=` in connections-map.js (and connections-map.js?v= on all pages) after each merge.

## State profiles (413: 332 in Oct 2026, 81 more on 3 Nov 2026)
- The 300 most important states of the register (and 32 more for the thin regions, below) have full profiles in the empire format (URL /empire/<slug>, power
  curve, radar stats, glance, facts, section pictures). In EMPIRES they carry `"id": "<register id>"`; the 94 empires
  have none (explorer "Empires only" toggle uses this). States still existing run to 2025 and show "Into the Present".
- Chosen by a measured score (scratchpad states/desc/rank-states.ps1: Wikidata language editions, article length,
  mentions in other state histories, register links, lifespan; regional floor). User rules: keep modern countries,
  only major colonies.
- Source: scratchpad states/desc/prof/out/*.jsonl (written by agents with PROFILE-GUIDE.md, fact-checked with
  FACTCHECK-GUIDE.md; logs in check/). Build: merge-profiles.ps1 (starts from orig/ copies of shared-data.js,
  empire-profiles.js, point-descs.js, empire-glance.js, empire-facts.js, epoch-stats.js; adds Oceania, ERAS to 2025,
  accent-free toSlug), then states/merge.ps1 (profile links + regions), make-dataset.ps1, make-logos.ps1,
  t-encprof.html + enc-prof-apply.ps1 (gold links), section-images.ps1, design2/make-og.ps1, prof/regen.ps1,
  verify-pages.ps1.
- Second round (28 Oct 2026), 32 profiles for Oceania, the Americas and Africa (Hawaii, Tonga, Tuʻi Tonga, Tahiti,
  Saudeleur, Rapa Nui, Moche, Chavín, Chimor, Wari, Tiwanaku, Neo-Inca, Toltec, Purépecha, Tlaxcala, Mayapan, Tikal,
  Muisca, Cahokia, Powhatan, Cherokee Nation, Comancheria, Colombia, Paraguay, Kilwa, Zimbabwe, Mapungubwe, Ndongo,
  Kano, Nri, Burundi, Bamana): scratchpad states/desc/prof picks2.txt, out2/*.jsonl (agents with PROFILE-GUIDE.md),
  my check log factcheck-r8.md and its corrections fixes-r8.tsv (id, field, old, new; each must match once). Merged by
  add-profiles.ps1, which is INCREMENTAL (appends to the files as they are; keeps orig2\ and refuses a re-run if a file
  changed since it wrote it), never merge-profiles.ps1 (it starts from round-one originals and would drop later work).
  Then r8-register.js (data/polities.json edited in place: the file mixes PowerShell's & escapes with plain ones),
  r8-scan.ps1 + enc-prof-apply.ps1 (gold links), the link audit (kinds\audit-links.ps1 -Url ...audit-names.html?names=)
  with wrong matches in r8-link-exclusions.tsv (r8-links-fix.ps1 writes ENC_LINKS.ex and clears the mentions for a
  rescan), r8-section-images.ps1 (pictures rejected by eye go to prof\reject.txt for every section of the profile),
  r8-emblems.ps1 (12 flags or monuments from the state pictures, 20 gold monograms), home-pictures.tsv, regen,
  r8-verify.js (texts equal the corrected ones, links, pictures, emblems). Pacific states the register had under the
  Americas (Tahiti, Rapa Nui, Samoa, Uvea, Wallis and Futuna, American Samoa, French Polynesia, New Caledonia, Guam,
  Pitcairn) are Oceania; Chavín is -950..-400 and Mapungubwe 1220..1290 (checked chronologies).
- Regions: Oceania (Australia, New Zealand, Pacific). Pre-Islamic states (ended before 640) of Anatolia-Levant,
  Mesopotamia-Iran, Arabia and the Caucasus are "Ancient Near East" (rule in merge.ps1 and merge-profiles.ps1).
- empire-profiles.js (3.5 MB) is loaded only by generator.html; point-descs.js loads async on the explorer.
- Third round (3 Nov 2026, release A1 of the expansion plan), 81 profiles chosen by scripts/kinds/rank-states.js (the
  Oct 2026 score; list in scripts/kinds/list-a1.tsv): Ur, Lagash, Old Kingdom Egypt, Sidon, Phrygia, Colchis, Artaxiad
  Armenia, Macedon, the Etruscan League, the Qin, Sui and Northern Wei, Western Xia, the Huns, Hephthalites, Uyghurs,
  Qara Khitai and Qara Qoyunlu, the Visigoths, Vandals, Great Moravia, Wallachia, the Cossack Hetmanate, the Two
  Sicilies, Cilician Armenia, the Zengids, Aghlabids, Idrisids, Marinids, Funan, Chenla, Champa, the Pyu, Medang,
  Malacca, Travancore, the Indo-Greeks, the Durranis, Ife, Ibadan, Dagbon, Loango, Malindi, Ifat, Alodia, the Gold
  Coast, Rhodesia, the Derg, Manchukuo, Mandatory Palestine, New Netherland, Saint-Domingue, Colonial Brazil, the Río
  de la Plata, Texas, the Confederacy, Cuba 1902-1959, El Perú-Waka' and 22 modern republics and kingdoms (Hungary to
  East Timor). Tools, all in scripts/kinds/: POLITY-GUIDE.md (the agents' brief: one saved Wikipedia article each, the
  power curve, stats in the epoch-stats vocabulary, 5-8 key events with plain years), src/<slug>.json (the checked
  sources; the scratchpad a1/factcheck.md logged every fix), merge-polity.js [--check] (appends to shared-data.js,
  empire-profiles.js, empire-glance.js, empire-facts.js, epoch-stats.js, point-descs.js and the register's `p` link;
  refuses a name already there; every file must still evaluate), link-scan.js --write 5 at a time, then the link audit
  (scratchpad a1/link-audit.js on the joined reports: every link whose text is not the entry's own name, read by eye):
  105 wrong matches went into link-exclusions.tsv (names inside longer names and namesakes: "Soba" the Nubian capital
  linked the Japanese noodle, "King David Hotel" King David, "Song Contest" the Song dynasty, "Magyar" the prime
  minister, "viceroy" the Viceroy of India, "GDP"-style generic terms were kept) and the profiles rescanned.
  Section pictures by eye on contact sheets (section-pictures.js sheet, one PNG per profile), pick.txt "A1" block;
  home pictures in home-pictures.tsv (the Derg, Manchukuo, Rhodesia and the Confederacy hidden from the featured
  rotation; Ibadan and Dagbon have none that fits) through home-pics.js, whose entry() reader was fixed the same day
  (a lazy ".*?" before an optional group never captured the picture). Emblems: 39 flags or arms from the state
  pictures, 42 monograms (make-emblems.js --initial). Ea-nasir's entry got the Met's standing worshipper statue.
