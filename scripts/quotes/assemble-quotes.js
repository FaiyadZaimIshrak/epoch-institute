// Puts new Who Said It? rows (QUOTES-GUIDE.md, tested with fetch-quotes.ps1 -Test) in the game's order and APPENDS
// them to scripts/quote-sources.tsv. The game deals five quotations a day in the file's order (#1 = 28 October 2026),
// so the rows already there keep their days and the new ones continue the stream: each day takes one quotation from
// each age where it can (ancient to 499, medieval 500-1499, early modern 1500-1799, modern from 1800, by the speaker's
// first year), no speaker twice in a day, none again within GAP days (default 7), and between candidates the speaker
// heard least recently first, the rows' own order after that.
// --cap=N (default 6): no speaker gets more than N quotations in all; rows past it are left out, the files given first
// keeping theirs.
//   node scripts/quotes/assemble-quotes.js <out.tsv> [--gap=7] [--cap=6] [--drop=drop.txt] [--write] <rows.tsv> [...]
// drop.txt: lines "speaker<TAB>start phrase" (or a whole row) the editor leaves out. Without --write only <out.tsv>.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const args = process.argv.slice(2), opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const files = args.filter(a => !a.startsWith('--')); const outF = files.shift(); const GAP = +(opt('gap') || 7);
if (!outF || !files.length) { console.error('usage: assemble-quotes.js <out.tsv> [--gap=7] [--drop=f] [--write] <rows.tsv> …'); process.exit(1); }
const ENC = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const by = new Map(ENC.map(e => [e.slug, e]));
const firstYear = d => { const s = String(d || ''), m = s.match(/\d{1,4}/); if (!m) return null; const era = s.slice(m.index).match(/\b(BCE|BC|CE|AD)\b/); return era && /^B/.test(era[1]) ? -+m[0] : +m[0]; };   // the first year, with the era written after it
const age = s => { const y = firstYear((by.get(s) || {}).dates); return y === null ? 3 : y < 500 ? 0 : y < 1500 ? 1 : y < 1800 ? 2 : 3; };
const TSV = path.join(R, 'scripts', 'quote-sources.tsv'), text = fs.readFileSync(TSV, 'utf8');
const old = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
const key = l => { const c = l.split('\t'); return c[0] + '\t' + (c[2] || '').toLowerCase().replace(/\s+/g, ' '); };
const have = new Set(old.map(key));
const drop = new Set(); if (opt('drop')) for (const l of fs.readFileSync(opt('drop'), 'utf8').split(/\r?\n/)) if (l.trim()) { const c = l.split('\t'); drop.add(c[0] + '\t' + (c[1] || '')); }
const isDropped = l => { const c = l.split('\t'); return [...drop].some(d => { const [s, p] = d.split('\t'); return s === c[0] && (!p || (c[2] || '').includes(p)); }); };
const CAP = +(opt('cap') || 6), count = {}; for (const l of old) { const s = l.split('\t')[0]; count[s] = (count[s] || 0) + 1; }
let pool = [], capped = 0; for (const f of files) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { if (!l.trim() || l.startsWith('#')) continue; if (l.split('\t').length < 5) { console.log('short row skipped: ' + l.slice(0, 80)); continue; } if (have.has(key(l)) || isDropped(l)) continue; const sp = l.split('\t')[0]; if ((count[sp] || 0) >= CAP) { capped++; continue; } count[sp] = (count[sp] || 0) + 1; have.add(key(l)); pool.push(l); }
if (capped) console.log(capped + ' rows past the cap of ' + CAP + ' left out');
const last = {}; old.forEach((l, i) => { last[l.split('\t')[0]] = Math.floor(i / 5); });
const out = []; let pos = old.length; const left = {}; for (const l of pool) { const s = l.split('\t')[0]; left[s] = (left[s] || 0) + 1; }
while (pool.length) {
  const day = Math.floor(pos / 5), inDay = []; for (let p = day * 5; p < pos; p++) inDay.push(p < old.length ? old[p] : out[p - old.length]);
  const spk = new Set(inDay.map(l => l.split('\t')[0])), ages = new Set(inDay.map(l => age(l.split('\t')[0])));
  const ok = pool.map((l, i) => ({ l, i, s: l.split('\t')[0] })).filter(x => !spk.has(x.s) && !(x.s in last && day - last[x.s] < GAP));
  const pickFrom = ok.length ? ok : pool.map((l, i) => ({ l, i, s: l.split('\t')[0] })).filter(x => !spk.has(x.s));
  if (!pickFrom.length) { console.log('stopped: no row fits day ' + (day + 1)); break; }
  // the most overdue speaker first: one with k rows left in d days is due every d / k days, so a speaker with many rows
  // is spread over the whole season instead of piling up at its end
  const daysLeft = Math.max(1, pool.length / 5), due = x => daysLeft / left[x.s], since = x => x.s in last ? day - last[x.s] : due(x);
  const score = x => (ages.has(age(x.s)) ? 1e6 : 0) - since(x) / due(x) * 1000 + x.i * 1e-3;
  pickFrom.sort((a, b) => score(a) - score(b));
  const c = pickFrom[0]; out.push(c.l); pool.splice(c.i, 1); last[c.s] = day; left[c.s]--; pos++;
}
fs.writeFileSync(outF, out.join('\n') + '\n');
const days = Math.floor((old.length + out.length) / 5), endDay = new Date(Date.UTC(2026, 9, 28) + (days - 1) * 864e5).toISOString().slice(0, 10);
console.log(`${out.length} rows ordered into ${outF}; with the ${old.length} already there: ${days} full days, to ${endDay}`);
if (args.includes('--write') && out.length) { fs.writeFileSync(TSV, text.replace(/\s*$/, '\n') + out.join('\n') + '\n'); console.log('appended to scripts/quote-sources.tsv'); }
