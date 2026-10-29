# Removing the `articles` action from the Institute's Apps Script

The Google Apps Script behind the community page is not in this repository. The site reaches it at the address
`EPOCH_API_URL` in `shared-data.js`.

## Why

Anyone who adds `?action=articles` to that address gets every article ever submitted, reviewed or not. Each comes
with its title, the author's name, profession and affiliation, and the date. On 29 Oct 2026 the action returned 6
submissions; only 1 of them is approved.

No page of the site uses this action. The site uses only these:

| Action | Used by | Returns |
|---|---|---|
| `confirmed_articles` | /community, `scripts/fetch-community.ps1` | approved articles: title, author, date, text |
| `opinions` | /community | readers' opinions: name, text, date |
| `announcements` | the home page | announcement files: name, type, date |
| (a POST, `doPost`) | the forms on /community | receives new articles and opinions |

The contributors list uses a second script (`CONTRIB_URL`, action `contributors`), which this change does not touch.

## Steps

1. **Open the right project.**
   - Go to script.google.com, signed in with the Google account that owns the Institute's script.
   - In the project, open **Deploy → Manage deployments**. The web app's address must match the `EPOCH_API_URL` line in `shared-data.js` (the part ending in `/exec`).
2. **Find the action.**
   - In the code, find the function `doGet(e)` and the place where it reads the action (`e.parameter.action`).
   - The branch to delete is the one for exactly `'articles'`, for example `if (action === 'articles') { … }` or `case 'articles': … break;`.
   - **Careful:** `confirmed_articles` also contains the word "articles". Keep that branch.
3. **Delete only that branch.** Leave `confirmed_articles`, `opinions`, `announcements` and the whole of `doPost` as they are. Then save (Ctrl+S).
4. **Deploy as a new version of the same deployment.**
   1. Open **Deploy → Manage deployments**.
   2. Select the active web-app deployment and click **Edit** (the pencil).
   3. Under **Version**, choose **New version**.
   4. Click **Deploy**.

   Editing the existing deployment keeps the same address. Do **not** use **New deployment**: it makes a new address, and the site would go on calling the old one, which still has the action.
5. **Test in a private browser window.**
   - The `EPOCH_API_URL` address with `?action=articles` must no longer list submissions (an error or an empty answer is fine).
   - The same address with `?action=confirmed_articles` must still give the approved article.
   - https://the-epoch-institute.org/community must still show the articles and the opinions.

   Or ask Claude to check. It lists field names only, never the submitters' details.

## If something goes wrong

**Deploy → Manage deployments → Edit → Version** lists the earlier versions. Choosing the previous one and deploying
brings back the old code at the same address.
