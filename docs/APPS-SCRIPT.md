# Switching off the Institute's Google scripts

Since 29 October 2026 the website no longer uses Google Drive or Google Apps Script:

- The opinion on the community page and the contributors list are now part of the site itself.
- The forms (submit an article, share an opinion, apply to contribute, contact, newsletter) go to the Institute's own
  mailboxes, through a small program on the Institute's hosting: see docs/MAIL.md.
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

Since 29 October 2026 every form goes to the Institute's own mailboxes: research@, outreach@ and info@. Formspree is
no longer used. docs/MAIL.md says which mailbox gets what, and how to take the old newsletter sign-ups out of
Formspree before deleting its form.

## 5. Optional: email forwarding

If research@, outreach@ or info@the-epoch-institute.org forward to a Gmail address, cPanel shows the forwarding under
**Email → Forwarders**. You can remove it there.

## Adding things to the site from now on

docs/MAIL.md, "Putting what arrives on the site", covers articles, opinions, corrections and new contributors.
