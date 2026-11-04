// The state and empire profiles alive in a year, with their page addresses, for a Today in History event's "profile"
// tag (the state where the event happened, or whose ruler or army acted, alive that year).
//   node scripts/days/profiles-alive.js <year> [word]      (BCE negative; word filters the names, case folded)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const ctx = {}; new Function('ctx', fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';ctx.E = EMPIRES; ctx.span = typeof profileSpan === "function" ? profileSpan : null; ctx.url = typeof profileUrl === "function" ? profileUrl : null;')(ctx);
const [y, w] = [+process.argv[2], (process.argv[3] || '').toLowerCase()];
if (isNaN(y)) { console.error('usage: profiles-alive.js <year> [word]'); process.exit(1); }
for (const e of ctx.E) {
  if (e.kind) continue;   // polities only: religions, cultures and the other kinds are not tagged
  const sp = ctx.span ? ctx.span(e) : [e.start, e.end == null ? 2025 : e.end];
  if (y < sp[0] || y > sp[1] || (w && !e.name.toLowerCase().includes(w))) continue;
  console.log(e.name + '\t' + (ctx.url ? ctx.url(e) : '/empire/' + e.name) + '\t' + sp[0] + '..' + sp[1] + '\t' + (e.region || ''));
}
