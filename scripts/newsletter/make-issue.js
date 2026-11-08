// The weekly newsletter, drafted for the owner to read, correct and send (D2, 8 Nov 2026). Nothing is sent from here:
// the subscribers are in the private folder on the host (subscribers.csv, see docs/MAIL.md) and the owner mails the issue
// from the info@ mailbox with the addresses in Bcc (docs/NEWSLETTER.md).
//   node scripts/newsletter/make-issue.js [--week=YYYY-MM-DD] [--since=YYYY-MM-DD] [--out=dir] [--max=6]
// --max: at most this many release notes, the newest (default 6), then a line to /new. --week: the issue's first day (default: the next Monday); --since: the releases since then go under "New on the site"
// (default: the seven days before the week). Writes <out>/issue-<week>.html (inline styles, as mail programs need) and
// issue-<week>.txt (plain text) into scripts/newsletter/drafts/ by default (git-ignored, never deployed).
// Everything comes from the site's own data, so every line links the page it summarises:
//   - New on the site: scripts/whats-new.tsv (the release notes written by hand with each release)
//   - This week in history: data/days/<mm-dd>.json, the anniversary event of each day (the day pages' hero card)
//   - Song of the week: the first day's Song of the Day
//   - The daily games: this week's numbers of the Daily Ten, Connections, the Crossword, Who Said It?, Where Is This
//     Song From? and Six Degrees (#1 dates as games.js counts them)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), SITE = 'https://the-epoch-institute.org';
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const day = s => { const d = new Date(s + 'T00:00:00Z'); if (isNaN(d)) throw new Error('not a date: ' + s); return d; };
const iso = d => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
let week = arg('week') ? day(arg('week')) : (() => { const t = new Date(); const d = day(iso(t)); return addDays(d, ((8 - d.getUTCDay()) % 7) || 7); })();
const since = arg('since') ? day(arg('since')) : addDays(week, -7);
const OUT = arg('out') || path.join(__dirname, 'drafts'); fs.mkdirSync(OUT, { recursive: true });
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const label = d => d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
const dayUrl = d => SITE + '/today-in-history/' + MONTHS[d.getUTCMonth()].toLowerCase() + '-' + d.getUTCDate();

// New on the site
const notes = fs.readFileSync(path.join(ROOT, 'scripts', 'whats-new.tsv'), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => {
  const [date, title, text, links] = l.split('\t');
  return { date, title, text, links: String(links || '').split(' ; ').filter(Boolean).map(x => { const [t, h] = x.split('|'); return { t, h: h && h[0] === '/' ? SITE + h : h }; }) };
}).filter(n => n.date >= iso(since) && n.date < iso(week));
const MAX = +(arg('max') || 6), more = Math.max(0, notes.length - MAX); notes.splice(MAX);   // the newest first, as the file keeps them

// This week in history
const days = [];
for (let i = 0; i < 7; i++) {
  const d = addDays(week, i), k = String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  const f = path.join(ROOT, 'data', 'days', k + '.json'); if (!fs.existsSync(f)) continue;   // no page for 29 February
  const j = JSON.parse(fs.readFileSync(f, 'utf8')), ev = j.events[j.hero != null ? j.hero : 0];
  if (!ev) continue;
  days.push({ d, url: dayUrl(d), year: ev.yearDisplay, title: ev.title, desc: ev.description, song: j.song, intl: j.intl });
}
if (!days.length) throw new Error('no day files for the week of ' + iso(week));
const song = days[0].song;

// The daily games: the number each game shows on the week's first day (games.js: #1 on these days)
const GAMES = [['Daily Ten', '2026-10-26', '/games#first-daily'], ['History Connections', '2026-10-26', '/games#conn'], ['History Crossword', '2026-10-27', '/games#cross'],
  ['Who Said It?', '2026-10-28', '/games#said'], ['Where Is This Song From?', '2026-11-03', '/games#songq'], ['Six Degrees', '2026-11-06', '/games#six']];
const games = GAMES.map(([n, first, h]) => { const a = Math.round((week - day(first)) / 864e5) + 1; return { n, h: SITE + h, from: a, to: a + 6 }; }).filter(g => g.from >= 1);

const subject = 'This week in history: ' + days[0].title;
const wk = label(week) + ' – ' + label(addDays(week, 6)) + ' ' + addDays(week, 6).getUTCFullYear();

// plain text
const T = [];
T.push('THE EPOCH INSTITUTE', 'The week of ' + wk, '', 'Subject: ' + subject, '');
if (notes.length) { T.push('NEW ON THE SITE', ''); for (const n of notes) { T.push(n.title, n.text); for (const l of n.links) T.push('  ' + l.t + ': ' + l.h); T.push(''); } if (more) T.push('And ' + more + ' more: ' + SITE + '/new', ''); }
T.push('THIS WEEK IN HISTORY', '');
for (const x of days) T.push(label(x.d) + ', ' + x.year + ': ' + x.title, x.desc, '  ' + x.url, '');
if (song) T.push('SONG OF THE WEEK', '', song[1] + (song[3] ? ' (' + song[3] + ')' : '') + ': ' + song[4], '  ' + SITE + '/songs/' + song[0], '');
T.push('PLAY THIS WEEK', '');
for (const g of games) T.push(g.n + ' #' + g.from + '–#' + g.to + ': ' + g.h);
T.push('', '—', 'You receive this because you signed up for the newsletter on the-epoch-institute.org.', 'To stop receiving it, reply with "unsubscribe".', '');
fs.writeFileSync(path.join(OUT, 'issue-' + iso(week) + '.txt'), T.join('\n'));

// HTML: one column, inline styles, the site's paper and gold
const C = { bg: '#f4efe4', card: '#fbf8f1', text: '#2a2418', muted: '#6b6151', gold: '#7a5a14', rule: '#e2d8c4' };
const P = s => '<p style="margin:0 0 12px;font:16px/1.55 Georgia,serif;color:' + C.text + '">' + s + '</p>';
const H = s => '<h2 style="margin:28px 0 12px;font:600 13px/1.3 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:' + C.gold + '">' + s + '</h2>';
const A = (h, t) => '<a href="' + esc(h) + '" style="color:' + C.gold + ';text-decoration:underline">' + esc(t) + '</a>';
const B = [];
B.push('<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + esc(subject) + '</title></head>');
B.push('<body style="margin:0;padding:0;background:' + C.bg + '"><div style="max-width:600px;margin:0 auto;padding:24px 20px;background:' + C.card + '">');
B.push('<p style="margin:0;font:600 12px/1.3 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:' + C.gold + '">The Epoch Institute</p>');
B.push('<h1 style="margin:6px 0 18px;font:28px/1.2 Georgia,serif;color:' + C.text + '">The week of ' + esc(wk) + '</h1>');
if (notes.length) { B.push(H('New on the site')); for (const n of notes) B.push(P('<b>' + esc(n.title) + '.</b> ' + esc(n.text) + (n.links.length ? '<br>' + n.links.map(l => A(l.h, l.t)).join(' &middot; ') : ''))); if (more) B.push(P('And ' + more + ' more on ' + A(SITE + '/new', 'What’s new') + '.')); }
B.push(H('This week in history'));
for (const x of days) B.push('<div style="margin:0 0 14px;padding:0 0 12px;border-bottom:1px solid ' + C.rule + '">' + P('<b>' + esc(label(x.d)) + ', ' + esc(x.year) + '.</b> ' + A(x.url, x.title)) + '<p style="margin:-6px 0 0;font:15px/1.5 Georgia,serif;color:' + C.muted + '">' + esc(x.desc) + '</p></div>');
if (song) { B.push(H('Song of the week')); B.push(P(A(SITE + '/songs/' + song[0], song[1]) + (song[3] ? ' (' + esc(song[3]) + ')' : '') + ': ' + esc(song[4]))); }
B.push(H('Play this week'));
B.push('<ul style="margin:0 0 12px;padding-left:20px;font:16px/1.7 Georgia,serif;color:' + C.text + '">' + games.map(g => '<li>' + A(g.h, g.n) + ' #' + g.from + '&ndash;#' + g.to + '</li>').join('') + '</ul>');
B.push('<p style="margin:28px 0 0;font:13px/1.5 Arial,sans-serif;color:' + C.muted + '">You receive this because you signed up for the newsletter on ' + A(SITE + '/', 'the-epoch-institute.org') + '. To stop receiving it, reply with &ldquo;unsubscribe&rdquo;.</p>');
B.push('</div></body></html>');
fs.writeFileSync(path.join(OUT, 'issue-' + iso(week) + '.html'), B.join('\n') + '\n');
console.log('issue of ' + iso(week) + ': ' + notes.length + ' release notes since ' + iso(since) + ', ' + days.length + ' days, ' + games.length + ' games');
console.log('subject: ' + subject);
console.log('written: ' + path.join(OUT, 'issue-' + iso(week) + '.html') + ' and .txt');
