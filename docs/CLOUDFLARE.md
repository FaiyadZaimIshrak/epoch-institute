# Putting Cloudflare in front of the site

## Why

The site is served by one server in **Singapore** (Namecheap shared hosting, LiteSpeed, server905-2.web-hosting.com,
209.74.67.182). Visitors far from Singapore wait for every connection to make the trip there and back, several times
over. Measured from Stockholm on 29 Oct 2026:

- **Round trip:** 0.2 s for each one.
- **New connections:** each needs three round trips before the page's first byte arrives (0.75–1.0 s).
- **First visits:** the first paint comes at 1.9–2.6 s.
- **Lost packets:** about 1 connection attempt in 15 loses its first packet and hangs a second or more; some time out
  altogether.
- **For comparison:** a site served from a nearby edge, such as GitHub, answers in 0.06 s.

Cloudflare's free plan answers visitors from a data centre in their own city. It keeps copies of the pictures, scripts,
styles and fonts there, compresses them better, and carries the long trip to Singapore over its own network. The pages
themselves (HTML) still come fresh from the server, as now.

## What is already done

The domain already uses Cloudflare's name servers (`clara.ns.cloudflare.com`, `cesar.ns.cloudflare.com`), so
**nothing changes at Namecheap**. In Cloudflare, though, the records are "DNS only" (grey cloud): Cloudflare only tells
browsers the server's address, and visitors still go straight to the server.

Turning the cloud orange ("Proxied") on two records sends visitors through Cloudflare. A grey cloud undoes it.

## Before you start

- It takes about 15 minutes. You need the Cloudflare login for the-epoch-institute.org.
- Don't push to `master` while you do it, so a deploy doesn't run in the middle.
- Note the speed before: run https://pagespeed.web.dev on the home page and one profile, such as /empire/roman-empire.
  Timings taken with curl on the office PC are not reliable, because its antivirus (Avast Web Shield) inspects every
  HTTPS connection.

## Step 1: encryption mode (do this first)

**SSL/TLS → Overview**: choose **Custom SSL/TLS**, then **Full (strict)**.

- The server already redirects `http://` to `https://`. In Flexible mode Cloudflare would fetch pages over `http://`,
  get that redirect, and loop for ever: Cloudflare's own documentation warns of exactly this (ERR_TOO_MANY_REDIRECTS).
- Full (strict) checks the server's certificate. The current one covers the-epoch-institute.org and
  www.the-epoch-institute.org and is valid until March 2027; cPanel's AutoSSL renews it.

## Step 2: switch off what would rewrite the pages

| Where | Setting | Set to | Why |
|---|---|---|---|
| Speed → Settings → Content Optimization | Rocket Loader | **Off** | It changes how scripts load; the site times its own scripts |
| Security → Settings (filter: Client-side abuse) | Email Address Obfuscation | **Off** | On by default; it would turn the addresses on /contact into Cloudflare links |
| Security → Settings (filter: Client-side abuse) | Hotlink Protection | **Off** | Leave off |
| Security → Settings (filter: Bot traffic) | Bot fight mode | **Off** | It can challenge automated requests: the deploy's last check and the daily feed's check are such requests, and on the free plan no rule can exempt them |

## Step 3: switch on what helps

| Where | Setting | Set to |
|---|---|---|
| Caching → Configuration | Browser Cache TTL | **Respect Existing Headers** (the site's `.htaccess` already decides: pages always rechecked, `?v=` files a year, the shared files 10 minutes) |
| SSL/TLS → Edge Certificates | Always Use HTTPS | **On** |
| Speed → Settings → Protocol Optimization | HTTP/3 | **On** |

## Step 4: turn on the proxy

In **DNS → Records**:

1. Edit `the-epoch-institute.org` (type A, 209.74.67.182): set **Proxy status** to **Proxied** (orange) and save.
2. Edit `www` (type CNAME, pointing to the-epoch-institute.org): set it to **Proxied** and save.
3. **Leave `mail` (type A, 209.74.67.182) as DNS only (grey).** It receives the Institute's email: the MX record points
   to it, and Cloudflare cannot carry email. MX and TXT records (SPF, DKIM, DMARC) are always DNS only anyway.
4. Leave every other record exactly as it is.

The change reaches visitors within about 5 minutes.

## Step 5: check

1. Open the site in a private window and try the home page, a profile, the atlas, the search and a game.
2. In the browser's developer tools (F12 → Network → reload → click the page → Headers), the response should show
   `server: cloudflare` and a `cf-ray` line. Or ask Claude to check.
3. Send an email to the Institute's address from another account, and reply to it.
4. In GitHub → Actions → **Daily feed** → **Run workflow**: it should end green. If it fails at "Write it to
   public_html/feeds", open Settings → Secrets and variables → Actions and set `CPANEL_HOST` to
   `server905.web-hosting.com`. The deploy itself is not affected: it connects to that server name over SSH.
5. The next push to `master` deploys as usual; its last step checks the home page.
6. Run https://pagespeed.web.dev again and compare.

## Undo

**DNS → Records**: set the two records back to **DNS only** (grey). Visitors go straight to the server again within
about 5 minutes. Nothing else needs undoing.

## After a deploy

Nothing to do.
- Cloudflare does not keep HTML pages by default, so new pages show at once.
- Files with `?v=` get a new address whenever they change.
- The shared files (`shared.css`, `shared-nav.js` and the others kept 10 minutes) refresh within 10 minutes, as in
  browsers today.

If something ever looks stale, use **Caching → Configuration → Purge Everything**.

## Later (optional)

Cloudflare can also keep the pages themselves for a few minutes (a Cache Rule for HTML). The deploy would then purge
them after every push, so visitors anywhere get pages in a fraction of a second, without the trip to Singapore. This
needs a Cloudflare API token
saved as a GitHub secret, and a purge step added to `.github/workflows/deploy.yml`. Claude can add the step.

Note: the server's address stays public through the `mail` record. That is normal for shared hosting.
