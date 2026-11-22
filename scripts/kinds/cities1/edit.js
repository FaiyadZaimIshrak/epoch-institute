// The editor's changes to the battle drafts: node edit.js <battles dir>   (out/*.json -> final/*.json)
// [slug, old, new]: the old text stands exactly once in the profile's public text (all strings but notes);
// ['slug', 'ev-', 'date text'] drops the key event with that date; ['slug', 'ev=', 'old date', 'new date'] re-dates one.
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const ED = [];   // the changes are in edit-more.json: [slug, old, new], [slug, 'ALL', old, new], [slug, 'ev-', date], [slug, 'ev=', old date, new date], [slug, 'set', key, value]
try { for (const r of JSON.parse(fs.readFileSync(path.join(dir, 'edit-more.json'), 'utf8'))) ED.push(r); } catch (e) {}
fs.mkdirSync(path.join(dir, 'final'), { recursive: true });
const walk = (o, fn, k) => { if (typeof o === 'string') return fn(o); if (Array.isArray(o)) return o.map(x => walk(x, fn)); if (o && typeof o === 'object') { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = kk === 'notes' || kk === 'name' || kk === 'region' ? v : walk(v, fn, kk); return r; } return o; };
let n = 0;
for (const f of fs.readdirSync(path.join(dir, 'out')).filter(f => f.endsWith('.json'))) {
  const slug = f.slice(0, -5); let J = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8'));
  for (const e of ED.filter(e => e[0] === slug)) {
    if (e[1] === 'set') { J[e[2]] = e[3]; n++; continue; }
    if (e[1] === 'ev-') { const k = J.ev.findIndex(x => x[0] === e[2]); if (k < 0) throw new Error(slug + ': no event dated ' + e[2]); J.ev.splice(k, 1); n++; continue; }
    if (e[1] === 'ev=') { const k = J.ev.findIndex(x => x[0] === e[2]); if (k < 0) throw new Error(slug + ': no event dated ' + e[2]); J.ev[k][0] = e[3]; n++; continue; }
    const all = e[1] === 'ALL', a = all ? e[2] : e[1], b = all ? e[3] : e[2]; let hits = 0;
    J = walk(J, s => { const c = s.split(a).length - 1; hits += c; return c ? s.split(a).join(b) : s; });
    if (!hits || (!all && hits !== 1)) throw new Error(slug + ': found ' + hits + ' times: ' + a.slice(0, 60)); n++;
  }
  fs.writeFileSync(path.join(dir, 'final', f), JSON.stringify(J, null, 1) + '\n');
}
console.log(n + ' changes applied; final/ written');
