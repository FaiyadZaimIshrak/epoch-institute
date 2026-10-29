# Switching off the Institute's Google scripts

Since 29 October 2026 the website no longer uses Google Drive or Google Apps Script:

- The opinion on the community page and the contributors list are now part of the site itself.
- The forms (submit an article, share an opinion, apply to contribute) go to Formspree, like the contact form.
  Formspree emails each one to you.
- The home page's announcement poster and the Sati Pratha article were removed.

Google Analytics still counts visitors and is not affected.

The two Google Apps Script web apps still answer at their addresses, though. One of them still lists every article
ever submitted, with each author's name, profession and affiliation, to anyone who asks for it. Switch both off with
the steps below.

## 1. Save what only Google holds

Do this first. Once you delete these, they are gone.

- **Submitted articles.** The old article form saved each Word file in a Google Drive folder. Five of them were never
  published. To download the folder, right-click it and choose **Download** (Drive makes a .zip).
- **Spreadsheets.** The opinions and the applications to contribute were written to Google Sheets. Open each one and
  choose **File → Download → Microsoft Excel (.xlsx)**.

The script's code names the folder and the spreadsheets it uses (step 2 shows how to open it). You can also search
your Drive for them.

## 2. Archive the two web apps

There are two script projects. For each one:

1. Go to script.google.com, signed in with the Google account that owns the scripts.
2. Open the project, then **Deploy → Manage deployments**.
3. Select the active deployment and click **Archive deployment**.

How to tell them apart: the main script's web-app address ends in `…MMac3-xfg/exec`. The contributors script's ends
in `…K2rXTxpQg/exec`.

Then open each address in a private browser window. Neither should return any data.

Archiving can be undone. Go to **Deploy → Manage deployments**, select the deployment under **Archived**, then click
**Edit** and **Deploy**.

## 3. Delete what you no longer need

Once you have your copies, you can delete:

- the two script projects;
- the Drive folder (or folders);
- the spreadsheets.

Nothing on the website uses them any more.

## 4. Where the site's messages go now

Every form on the site posts to one Formspree form, which emails the address of the Formspree account. If that is a
Gmail address and you would rather receive them at, for example, research@the-epoch-institute.org:

1. On formspree.io, open **Account** and add that address as a linked email. Confirm it.
2. Click the form in the left sidebar. In its **Workflow** panel, open the **Email** action (the ⋮ icon, then
   **Settings**) and set the target email to the new address.

On the free plan, Formspree accepts 50 submissions a month across all the forms together. That includes contact
messages, newsletter sign-ups, articles, opinions and applications.

## 5. Optional: email forwarding

If research@, outreach@ or info@the-epoch-institute.org forward to a Gmail address, cPanel shows the forwarding under
**Email → Forwarders**. You can remove it there.

## Adding things to the site from now on

Ask Claude, or make these changes yourself:

- **An opinion sent through the form:** add it to the `OPINIONS` list in the `community` page.
- **An article you accept:** add it to `data/community/articles.json` (title, author, date, paragraphs). The next
  build makes its page.
- **A new contributor:** add a card to the list in the `contributors` page.
