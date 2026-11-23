// The editor's rule for dates: a stop keeps its date only when the article gives it AT the stop. For each stop with a
// year, the year must stand in the stop's quotation or within 700 characters of it in the article; or the day and
// month of its date must stand there and the year be one the article states for the journey. Otherwise the stop's date
// and year become null (the page then shows the stop without a date).   node years.js [--write] [slug …]
const fs = require('fs'), path = require('path'); const WRITE = process.argv.includes('--write'), only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const norm = s => String(s).normalize('NFC').replace(/[‘’ʻʼ]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
let nulled = 0, kept = 0;
for (const f of fs.readdirSync('out').filter(x => x.endsWith('.json')).sort()) { const slug = f.slice(0, -5); if (only.length && !only.includes(slug)) continue;
  const J = JSON.parse(fs.readFileSync('out/' + f, 'utf8')); if (J.skip) continue; const art = norm(fs.readFileSync('wp/' + slug + '.txt', 'utf8')); const out = [];
  for (const leg of J.legs || []) for (const s of leg.stops || []) { if (typeof s.year !== 'number') { if (s.date && /\d{3,4}/.test(s.date)) { out.push('  date without a year: ' + s.place + ' | ' + s.date); } continue; }
    const q = norm(s.quote || ''), at = art.indexOf(q), win = at >= 0 ? art.slice(Math.max(0, at - 1500), at + q.length + 700) : q, y = String(Math.abs(s.year));
    const yearNear = new RegExp('\\b' + y + '\\b').test(win) || new RegExp('\\b' + y + '\\b').test(q);
    const dm = (String(s.date || '').match(new RegExp('(\\d{1,2}) (' + MONTHS + ')')) || []), dmNear = dm[0] ? (win.includes(dm[0]) || win.includes(dm[2] + ' ' + dm[1])) : false;
    const mon = (String(s.date || '').match(new RegExp('\\b(' + MONTHS + ')\\b')) || [])[1], monNear = mon ? win.includes(mon) : false;
    const yearInArt = new RegExp('\\b' + y + '\\b').test(art);
    const single = /^\D*\d{1,4}( BCE)?\s*$/.test(String(J.years || '')) && String(J.years).includes(y);
    if (yearNear || ((dmNear || monNear) && yearInArt) || (single && yearInArt)) { kept++; continue; }
    out.push('  NULL ' + s.place + ' | ' + s.date + ' (' + s.year + ')'); nulled++; if (WRITE) { s.date = null; s.year = null; } }
  if (out.length) console.log(slug + '\n' + out.join('\n')); if (WRITE) fs.writeFileSync('out/' + f, JSON.stringify(J, null, 1) + '\n'); }
console.log(kept + ' dates kept, ' + nulled + (WRITE ? ' set to null' : ' would be set to null'));
