// Today in History (A8): keeps a candidate only where a Wikipedia article about it states the day and the year
// together. For each candidate (scripts/days/otd-candidates.js) the main article saved as <dir>/<day>_<year>.txt (its
// lead from the feed, or the whole article from scripts/kinds/fetch-articles.js) is searched first, then the leads of
// the event's other pages (<day>_<year>~<n>.txt): for the day ("1 January", "January 1", "1st January") with the year
// within --win characters of it (default 120; BCE years with "BC"/"BCE" after them). A day given as uncertain ("c.",
// "or", "around") just before the match does not count. A decade, year or century page is never the event's article.
//   node scripts/days/check-dates.js <cands.tsv> <articles dir> <out.tsv> [--per=2] [--win=120]
// out: the candidate's columns, then the passage that proves the date and the file it is in; per day the best <per>.
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = (k, d) => +((args.find(a => a.startsWith('--' + k + '=')) || '').split('=')[1] || d);
const [candF, dir, outF] = args.filter(a => !a.startsWith('--')), per = opt('per', 2), WIN = opt('win', 120);
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const files = fs.readdirSync(dir);
function prove(file, k, y) {
  const t = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+/g, ' ');
  const [m, d] = k.split('-').map(Number), mon = MON[m - 1];
  const dayRx = new RegExp('(?<![\\d])(' + d + '(?:st|nd|rd|th)? ' + mon + '|' + mon + ' ' + d + '(?:st|nd|rd|th)?)(?![\\d])', 'g');
  const yrs = y < 0 ? new RegExp('(?<![\\d])' + (-y) + '\\s*(BC|BCE)\\b') : new RegExp('(?<![\\d])' + y + '(?![\\d])');
  let mm;
  while ((mm = dayRx.exec(t))) {
    const win = t.slice(Math.max(0, mm.index - WIN), mm.index + mm[0].length + WIN);
    if (!yrs.test(win)) continue;
    if (/\b(c\.|circa|or|around|about|possibly|probably)\s$/i.test(t.slice(Math.max(0, mm.index - 25), mm.index))) continue;
    return win.trim();
  }
  return null;
}
const out = [], byDay = {}; let pass = 0, fail = 0, missing = 0;
for (const l of fs.readFileSync(candF, 'utf8').split(/\r?\n/)) {
  if (!l.trim()) continue; const c = l.split('\t'), k = c[0], y = +c[1], base = k + '_' + c[1];
  if (/^(\d+s|AD \d+|\d+( BC)?|\d+(st|nd|rd|th) century( BC)?)$/.test(c[2])) { fail++; continue; }
  const cand = [base + '.txt', ...files.filter(f => f.startsWith(base + '~')).sort()].filter(f => files.includes(f));
  if (!cand.length) { missing++; continue; }
  let found = null, by = null;
  for (const f of cand) { found = prove(f, k, y); if (found) { by = f; break; } }
  if (!found) { fail++; continue; }
  pass++; (byDay[k] = byDay[k] || []).push(c.slice(0, 5).concat(found, by).join('\t'));
}
for (const k of Object.keys(byDay).sort()) out.push(...byDay[k].slice(0, per));
fs.writeFileSync(outF, out.join('\n') + '\n');
const days = Object.keys(byDay).length, short = Object.values(byDay).filter(v => v.length < per).length;
console.log(`${pass} candidates proved, ${fail} not, ${missing} without an article; ${out.length} kept for ${days} days (${short} with fewer than ${per})`);
