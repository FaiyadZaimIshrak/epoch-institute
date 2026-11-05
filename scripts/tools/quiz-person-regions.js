// The daily quiz's person puzzles (home-data.js HOME_QUIZ.entries.person) open with "A person · dates · region": the region
// as the people pages give it (PersonRegion, people-data.js), after the audit of 6 Nov 2026. This rewrites only that
// clue, in place, so the quiz keeps its order and every other byte (re-running the old make-home-data would reshuffle it).
//   node scripts/tools/quiz-person-regions.js [--write]      then bump home-data.js?v= on index and quiz
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..');
const pd = {}; vm.runInNewContext(fs.readFileSync(path.join(R, 'people-data.js'), 'utf8'), pd);
// the clues' own labels for the regions ("Middle East", "The Americas", "and" for "&")
const LABEL = { 'Islamic Caliphates & Middle East': 'Middle East', 'Americas': 'The Americas' };
const reg = {}; for (const p of pd.PEOPLE) reg[p[0]] = p[6] >= 0 ? (LABEL[pd.PEOPLE_REGIONS[p[6]]] || pd.PEOPLE_REGIONS[p[6]].replace(/&/g, 'and')) : null;
const F = path.join(R, 'home-data.js'); let t = fs.readFileSync(F, 'utf8');
const hd = {}; vm.runInNewContext(t + '\n;this.Q = HOME_QUIZ;', hd);
let n = 0, same = 0;
for (const q of hd.Q.entries.person) {
  const c = q.clues[0], parts = c.split(' · ');
  if (parts.length !== 3 || !(q.slug in reg) || !reg[q.slug]) continue;
  if (parts[2] === reg[q.slug]) { same++; continue; }
  const nc = [parts[0], parts[1], reg[q.slug]].join(' · ');
  const a = JSON.stringify(c), b = JSON.stringify(nc);
  let at = t.indexOf('{slug:' + JSON.stringify(q.slug)); if (at < 0) at = t.indexOf('"slug":' + JSON.stringify(q.slug)); if (at < 0) throw new Error('no puzzle ' + q.slug);
  const i = t.indexOf(a, at); if (i < 0 || i - at > 2000) throw new Error('clue not found for ' + q.slug);
  t = t.slice(0, i) + b + t.slice(i + a.length); n++;
  console.log(q.slug.padEnd(32) + parts[2] + '  ->  ' + reg[q.slug]);
}
console.log(n + ' clues changed, ' + same + ' already right');
if (process.argv.includes('--write') && n) fs.writeFileSync(F, t);
