# Google Search Console: how Google sees the site, and how to hurry it

Search Console is Google's free tool for site owners. With it you can:
- see which pages Google has indexed and which searches show the site;
- ask Google to read a page again.

That last one is the quickest way to get the logo (the "E" icon) and the current description into Google's results.
Nothing is added to the website: the check that the site is yours is a DNS record at Cloudflare.

## 1. Add the site

1. Go to https://search.google.com/search-console, signed in with the Google account you want to use for it.
2. Add a property. Choose **Domain**, type `the-epoch-institute.org`, and continue. A Domain property covers the whole
   site, with and without `www`.
3. Google shows a TXT record that begins `google-site-verification=`. Copy it.
4. At Cloudflare, open the-epoch-institute.org, then **DNS**, then **Records**, then **Add record**:
   - **Type:** TXT
   - **Name:** `@`
   - **Content:** the copied text

   Save. A TXT record changes nothing on the website or for email, and the existing SPF record stays as it is.
5. Back in Search Console, click **Verify**. If the record isn't found yet, try again later: Google says a new record
   can take two or three days to show.
6. Keep the record afterwards. Removing it un-verifies the site.

(The Google Analytics method is meant for sites with Google's standard tag in the page head. This site loads Analytics
late on purpose, for speed, so that check may not find it. The DNS record is the dependable way.)

## 2. Submit the sitemap

Open **Sitemaps**, type `https://the-epoch-institute.org/sitemap.xml` in **Add a new sitemap**, and click **Submit**.
It is a sitemap index: it lists the site's five sitemaps (about 40,000 pages), and its status should become
**Success**.

## 3. Ask Google to read the home page again (the logo and the description)

Type `https://the-epoch-institute.org/` in the inspection bar at the top of Search Console, then click **Request
indexing**.

- Google says indexing usually takes about a day, but can take a week or two.
- The icon beside the results follows once Google has read the home page again. Google never guarantees it will show.
- Once is enough. There is a daily limit, and asking again does not make it faster.

## 4. What to look at now and then

- **Pages** (under Indexing): how many pages are indexed, and why some are not. "Crawled – currently not indexed" is
  common for a large new site, and the count grows over weeks.
- **Experience:** the site's speed as Google measures it. The host is slow from far away; turning on Cloudflare's
  proxy is the remedy (docs/CLOUDFLARE.md).
- **Enhancements:** problems in the pages' structured data (breadcrumbs and the like), if Google finds any.
- **Performance:** the searches that show the site, and how often people click.

## 5. Bing (optional)

At Bing Webmaster Tools (https://www.bing.com/webmasters) you can import the site from Search Console. The site
already tells Bing of every change it publishes, through IndexNow.

## 6. Export the figures for the monthly report

Once a month (and once now, for the baseline), export these files into one folder, for example
`Documents/search-export/2026-11`:

1. **Performance:** open **Performance > Search results**, set the date to **Last 3 months**, then **Export > Download
   CSV**. Unzip it: it holds `Queries.csv`, `Pages.csv` and others.
2. **Indexing:** open **Indexing > Pages**, then **Export > Download CSV** (top right). Then click each reason in the
   table "Why pages aren't indexed", for example "Crawled - currently not indexed", and export that page too. Put each in a
   subfolder named after the reason.

Then ask Claude to "read the Search Console export in <folder>", or run:

```
node scripts/tools/gsc-report.js <folder> --out=<folder>/report.md
```

It shows impressions, clicks, click rate and position for each kind of page (encyclopedia, profiles, day pages, songs
…). It also lists the searches that show the site often but are rarely clicked, whose page titles are reworked first,
and which kinds of page Google declines to index. Keep the report in your own export folder, not in the repository: it
lists the searches people made, and the repository is public.

On 8 November 2026, about 18,000 short encyclopedia entries were marked "noindex" for about two hours, then indexable
again: the first export showed they bring more than half the encyclopedia's clicks. If Search Console briefly lists
some under "Excluded by 'noindex' tag", they return as Google reads them again.
