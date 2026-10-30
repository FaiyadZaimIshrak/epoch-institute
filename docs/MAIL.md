# The site's messages: how they reach the Institute

Every form on the website sends its message to one of the Institute's own mailboxes. A small program on the
Institute's hosting (`send.php`, on the same server as the site and its mail) receives each form and emails it on.
No outside service is involved.

## Which mailbox gets what

| Mailbox | What arrives |
|---|---|
| research@the-epoch-institute.org | Article submissions (with the Word, OpenDocument, RTF, PDF or text file attached, or the text pasted in), corrections, topic ideas, "write for us" ideas, questions about the data and pictures, applications to contribute |
| outreach@the-epoch-institute.org | Press and partnerships |
| info@the-epoch-institute.org | Opinions for the Community page, newsletter sign-ups, other messages |

Every message comes from **Epoch Institute website**. Its subject says what it is, for example:
- "Correction: /encyclopedia/battle-of-hastings"
- "Article submission: The Mughal Mints"
- "Opinion for the Community page: Reader's name"
- "Newsletter sign-up: reader@example.org"

The text lists every field, then where on the site it was sent from and when.

## Answering

**Press Reply.** The answer goes to the reader, because their address is the message's reply address. Opinions and
newsletter sign-ups carry no reply address: the opinion form asks for no email.

To read the mailboxes:
- in the browser: cPanel, then **Email Accounts**, then **Check Email**;
- in a mail app: cPanel's **Email Accounts**, then **Connect Devices**, shows the settings.

## Putting what arrives on the site

- **An article you accept:** send it to Claude ("publish the article in this email") with the file or text. It goes
  into `data/community/articles.json`, the build makes its page, and its card appears on /community. By hand, add
  `{"title": "…", "author": "…", "ts": <the date in milliseconds>, "content": ["paragraph", "paragraph", …]}` to that file
  and run the build.
- **An opinion you accept:** add it to the `OPINIONS` list near the end of the `community` page, as
  `{ name: "…", text: "…", ts: <milliseconds> }`, or ask Claude.
- **A correction:** check it, then fix the page, or send the message to Claude.
- **A new contributor:** reply to them. Once they join, add their card to the list on the `contributors` page.
- **A newsletter sign-up:** nothing to do. The address is already on the list (below).

## The private folder: a copy of everything for 30 days

On the hosting, outside the website and not reachable from the web, is the folder `epoch-mail`. In cPanel's **File
Manager** it is in your home folder, beside `public_html`. It holds:

- **`inbox/<year-month>/`:** a copy of every message, and of its file, deleted after 30 days. If a mailbox ever fails,
  the message is still here.
- **`subscribers.csv`:** every newsletter sign-up (date, email, where on the site), one line each. It opens in Excel.
  To remove someone who asks to unsubscribe, delete their line.
- **`log/<year-month>.log`:** one line per message: the time, the form, the mailbox, its size, and "sent" or
  "NOT SENT, kept". It holds no names or contents.
- **`rate/` and `salt`:** the bookkeeping for the spam limits. Leave them alone.

## Spam and limits

- Only the Institute's own pages can send. A hidden field catches most robots.
- One sender can send at most 5 messages in 10 minutes and 30 a day. Everyone together can send 300 a day. A reader
  who reaches a limit is told to write to the mailbox directly.
- An opinion may hold at most five links.
- Files are for articles only: Word (.docx, .doc), OpenDocument (.odt), RTF, PDF or plain text, up to 10 MB. Each is
  checked to be what its name says.

## Changing where things go

The `ROUTES` list at the top of `send.php` names the mailbox for each form and topic: `research`, `outreach` or
`info`. The /contact page's script names the same mailboxes (its `box` values), so a reader whose message fails is
told the right address. Keep the two in step, or ask Claude to change both and deploy.

## If messages stop arriving

1. Open https://the-epoch-institute.org/send.php. It should show `"ok":true` and `"mail":true`.
2. Look at the newest file in `epoch-mail/log/`.
   - "sent" means the server handed the message to the mail system.
   - "NOT SENT, kept" means the mail system refused it. The copy is in `inbox/`.
3. Check the mailbox's quota in cPanel's **Email Accounts** (a full mailbox refuses mail), and its spam folder.
4. Or ask Claude to check.

## The services the site no longer uses

- **Formspree.** Until 29 October 2026 the forms and the newsletter went there.
  1. Copy the old newsletter sign-ups from the form's **Submissions** tab on formspree.io. The free plan has no Export
     button; each sign-up also reached you by email when it came in.
  2. Add them as lines to `subscribers.csv` (File Manager, **Edit**), in the form `date,email,source`.
  3. Delete the Formspree form once you have them.
- **Google Apps Script and Drive.** See docs/APPS-SCRIPT.md.
