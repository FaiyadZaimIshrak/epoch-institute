// The figures of Research Series essays 13 and 14 (winter round, Nov 2026): 13 Midwinter (the festivals of the dark
// season: the entries of wave w1, the month pages' lists, the carols) and 14 Christmas Day in History (the day pages of
// 24-26 December, the entries and profiles that name Christmas). Every figure an essay quotes comes from this output.
//   node scripts/tools/essay-numbers-3.js 13|14
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const which = process.argv[2];
const H = JSON.parse(rd('data/history.json')), evs = k => (H[k].events || H[k]);
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const yl = y => y < 0 ? -y + ' BCE' : String(y);
const ed = rd('encyclopedia-data.js');
const ENT = [...ed.matchAll(/^  \{slug:"([^"]+)",name:("(?:[^"\\]|\\.)*"),type:"([a-z]+)".*?dates:("(?:[^"\\]|\\.)*").*?desc:("(?:[^"\\]|\\.)*")/gm)].map(m => ({ slug: m[1], name: JSON.parse(m[2]), type: m[3], dates: JSON.parse(m[4]), desc: JSON.parse(m[5]) }));
const BY = Object.fromEntries(ENT.map(e => [e.slug, e]));
// (an entry without dates, or with its keys in another order, is not in ENT: its name and dates are read on their own)
for (const m of ed.matchAll(/^  \{slug:"([^"]+)",name:("(?:[^"\\]|\\.)*")/gm)) if (!BY[m[1]]) { const ln = ed.slice(m.index, ed.indexOf('\n', m.index)), d = /dates:("(?:[^"\\]|\\.)*")/.exec(ln), ds = /desc:("(?:[^"\\]|\\.)*")/.exec(ln); BY[m[1]] = { slug: m[1], name: JSON.parse(m[2]), type: (/type:"([a-z]+)"/.exec(ln) || [])[1] || '', dates: d ? JSON.parse(d[1]) : '', desc: ds ? JSON.parse(ds[1]) : '' }; ENT.push(BY[m[1]]); }
const PPL = rd('scripts/day-people.tsv').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
const MT = rd('scripts/months.tsv').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
const SONGS = JSON.parse(rd('scripts/songs/songs.json')), SBY = Object.fromEntries(SONGS.map(s => [s.slug, s]));
const list = (m, k) => ((MT.find(r => r[0] === m && r[1] === k) || [])[2] || '').split(',').map(s => s.trim()).filter(Boolean);
const byMonth = MON.map((_, i) => Object.keys(H).filter(k => +k.slice(0, 2) === i + 1).reduce((n, k) => n + evs(k).length, 0));
console.log('events in the day pages, by month: ' + MON.map((m, i) => m + ' ' + byMonth[i]).join(', ') + '; all ' + byMonth.reduce((a, b) => a + b, 0));
if (which === '13') {
  const fest = list('12', 'fest'), songs = list('12', 'song');
  console.log('\nDecember festivals and observances listed on the month page: ' + fest.length);
  for (const s of fest) { const e = BY[s]; console.log('  ' + e.name + ' [' + (e.dates || 'no date') + '] /encyclopedia/' + s); }
  for (const m of ['01', '02', '10', '11']) console.log(MON[+m - 1] + ' festivals listed: ' + list(m, 'fest').map(s => BY[s].name).join(', '));
  console.log('\nsongs listed for December: ' + songs.length + '; with their words printed: ' + songs.filter(s => SBY[s].text).length + '; with a performance: ' + songs.filter(s => SBY[s].video).length);
  const sy = songs.map(s => SBY[s]).sort((a, b) => a.year - b.year);
  console.log('oldest: ' + sy.slice(0, 4).map(s => s.title + ' (' + s.date + ')').join('; '));
  console.log('newest: ' + sy.slice(-3).map(s => s.title + ' (' + s.date + ')').join('; '));
  const lang = {}; songs.forEach(s => (SBY[s].langs || []).forEach(l => { const n = l.name; lang[n] = (lang[n] || 0) + 1; }));
  console.log('languages of the December songs: ' + Object.entries(lang).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join(', '));
  const cen = {}; sy.forEach(s => { const c = s.year < 1500 ? 'before 1500' : s.year < 1700 ? '1500-1699' : s.year < 1800 ? '1700-1799' : s.year < 1900 ? '1800-1899' : '1900 on'; cen[c] = (cen[c] || 0) + 1; });
  console.log('December songs by age (sorting year): ' + Object.entries(cen).map(x => x.join(' ')).join(', '));
  const sol = ENT.filter(e => /winter solstice/i.test(e.desc));
  console.log('\nentries whose text names the winter solstice: ' + sol.length + ': ' + sol.map(e => e.name).join(', '));
  for (const k of ['12-13', '12-17', '12-21', '12-22', '12-25', '12-31', '01-06']) console.log('day ' + k + ': ' + evs(k).length + ' events, ' + PPL.filter(p => p[0] === k && p[1] === 'b').length + ' births, ' + PPL.filter(p => p[0] === k && p[1] === 'd').length + ' deaths listed');
}
if (which === '14') {
  for (const k of ['12-24', '12-25', '12-26']) {
    const e = evs(k).slice().sort((a, b) => a.year - b.year);
    console.log('\n' + k + ': ' + e.length + ' events, ' + yl(e[0].year) + ' to ' + yl(e[e.length - 1].year));
    for (const x of e) console.log('  ' + (x.yearDisplay || yl(x.year)) + ' | ' + x.title + (x.profile ? ' [' + x.profile[0] + ']' : ''));
    for (const kind of ['b', 'd']) { const p = PPL.filter(r => r[0] === k && r[1] === kind && BY[r[3]]); console.log('  ' + (kind === 'b' ? 'born' : 'died') + ' (' + p.length + '): ' + p.map(r => BY[r[3]].name + ' ' + yl(+r[2])).join('; ')); }
  }
  const cen = {}; evs('12-25').forEach(x => { const c = x.year < 500 ? 'before 500' : x.year < 1500 ? '500-1499' : x.year < 1800 ? '1500-1799' : '1800 on'; cen[c] = (cen[c] || 0) + 1; });
  console.log('\n25 December events by age: ' + Object.entries(cen).map(x => x.join(' ')).join(', '));
  const perDay = Object.keys(H).map(k => evs(k).length).sort((a, b) => a - b);
  console.log('events a day across the year: fewest ' + perDay[0] + ', most ' + perDay[perDay.length - 1] + ', median ' + perDay[perDay.length >> 1]);
  const ment = ENT.filter(e => /\bChristmas\b/.test(e.desc) && e.slug !== 'christmas');
  console.log('\nentries whose text names Christmas: ' + ment.length + ' (' + ['person', 'event', 'work', 'place', 'idea', 'polity', 'group', 'institution', 'term'].map(t => t + ' ' + ment.filter(e => e.type === t).length).join(', ') + ')');
  const day = ment.filter(e => /Christmas (Day|Eve)/.test(e.desc));
  console.log('of them naming Christmas Day or Christmas Eve: ' + day.length);
  for (const e of day) console.log('  ' + e.name + ' [' + e.dates + '] /encyclopedia/' + e.slug + ' :: ' + (e.desc.match(/[^.]*Christmas (Day|Eve)[^.]*\./) || [''])[0].trim().slice(0, 230));
  const P = rd('empire-profiles.js'), G = rd('empire-glance.js');
  console.log('\n"Christmas" in the profiles\' texts: ' + (P.match(/\bChristmas\b/g) || []).length + ' times; in their key events and takeaways: ' + (G.match(/\bChristmas\b/g) || []).length);
}
