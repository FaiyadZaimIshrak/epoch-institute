# Where a song's words may come from (survey of 11 November 2026)

The rule of Songs in History stays as it was: the Institute prints only words that are in the public domain or freely
licensed, imported from an edition (never typed), and for everything else shows at most a provider's own official
embed, loaded when the reader presses a button. This is a reading of each provider's public terms on the day; read
them again before changing anything, and treat a site that answers automated requests with 403 as a site that does
not want to be read by scripts.

## Lyrics providers (words still in copyright)

| Provider | What its terms allow | Used? |
| --- | --- | --- |
| Genius | An official embed per song, served by Genius under its own licences; the API finds the song. | Yes: 90 songs (genius.tsv), press to load. |
| Musixmatch | API terms 1.1: a licence "solely … for non-commercial purposes", "subject to … the payment … of any applicable fees"; data must be deleted on termination. No embed for outside sites. | No. The Institute takes support and plans other income, so it is not plainly non-commercial; it would need a written agreement. |
| LyricFind | Licences lyrics to businesses by contract only; no free tier or public embed. | No. |
| LRCLIB | An open, keyless API of lyrics contributed by users. The API being open says nothing about the songwriters' rights: no licence from publishers is stated. | No. |
| AZLyrics | Its copyright page grants nothing; no API or embed. | No. |
| Lyrics.com (STANDS4) | Terms make use "personal"; no embed or licence for other sites. | No. |
| Letras | Refused the request (403); no public embed known. | No. |

So Genius remains the only provider. A plain link to another lyrics site would add nothing a search engine does not
give, and would send readers to pages the Institute cannot vouch for.

## Editions for public-domain words

| Source | What it holds | How it is read |
| --- | --- | --- |
| Wikisource (any language) | Transcribed editions with their licence templates. | fetch-texts.js, site = the language code. |
| Wikipedia (any language) | The public-domain words some articles quote. | fetch-texts.js, site = w-xx. |
| Project Gutenberg | Whole books as plain text. | fetch-texts.js, site = pg, page = the book's number. |
| ETCSL (Oxford) | Sumerian literature, CC BY-NC-SA: accepted for this non-commercial use with credit; such pages carry no prompts to pay. | fetch-etcsl.js. |
| Hymnary.org, CPDL (ChoralWiki) | Hymn and choral texts, many public domain. | Not read: both answered 403 to a script on the day. A text found there by hand must still be imported from a source a tool can read. |
| Sefaria | Jewish texts, each version with its own licence, through an open API. | No song of the site needs it yet. |
| Mutopia | Engraved music, not words. | Not a source of words. |
| Internet Archive | Scans with uncorrected OCR. | Not imported: OCR text is not an edition (see the songs left without words). |

Finding a page: scripts/songs/find-sources.js lists a song's Wikisource pages through Wikidata; a title search on the
language's Wikisource finds pages Wikidata does not link (Wikisource throttles after about fifteen searches in a row:
one request every seven seconds). `node scripts/songs/fetch-texts.js --peek=site:Page` shows a page's stanzas.
