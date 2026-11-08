# The weekly newsletter

Readers sign up for the newsletter on the site. Their addresses go into `subscribers.csv` in the private folder on the
hosting (see docs/MAIL.md). The site never sends the newsletter itself. Each week a script drafts an issue from the
site's own pages; you read it, change what you like, and send it from the `info@` mailbox.

## 1. Draft the issue

On the computer with the repository, in its folder:

```
node scripts/newsletter/make-issue.js
```

This drafts the issue for the next Monday to Sunday and writes two files into `scripts/newsletter/drafts/`:

- `issue-<date>.html`: the issue as it will look in a mail program.
- `issue-<date>.txt`: the same in plain text, for mail programs that show no formatting.

The script also prints the suggested subject line. Those folders are never published or committed.

Options:

- `--week=2026-11-16` drafts a different week. Give the Monday.
- `--since=2026-11-02` lists the site's news since that day. The default is the seven days before the week.
- `--max=4` lists at most four news items. The default is six; the rest are linked as "And N more on What's new".

Or ask Claude: "draft this week's newsletter".

## 2. What is in it

Everything comes from the site, and every line links the page it is about:

- **New on the site:** the newest release notes, which are written with each release (`scripts/whats-new.tsv`, shown
  on /new).
- **This week in history:** for each day of the week, the anniversary from that day's Today in History page.
- **Song of the week:** the first day's Song of the Day.
- **Play this week:** the numbers of the daily games for that week.
- A line on why the reader receives it, and how to stop.

Read it before sending. Some days' anniversaries are wars or massacres, as history is; you may prefer to cut or swap
one for another event on that day's page.

## 3. Send it

1. Open cPanel, **Email Accounts**, and **Check Email** for `info@the-epoch-institute.org` (Roundcube webmail).
2. In **File Manager**, open `epoch-mail/subscribers.csv` and copy the email column.
3. Write a new message:
   - **To:** `info@the-epoch-institute.org` (yourself).
   - **Bcc:** the subscribers' addresses. Always Bcc, never To or Cc, so that no reader sees another's address.
   - **Subject:** the line the script printed.
   - **Body:** open the `.html` file in a browser, select all, copy, and paste into the message. Or send the `.txt`
     text.
4. Send. Hosting mail servers limit how many messages leave per hour. If the list grows past about 100 addresses,
   send in batches of 100, or ask Claude about a mailing service.

## 4. Unsubscribes

When a reader replies "unsubscribe", delete their line from `subscribers.csv` before the next issue.
