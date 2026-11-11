// Quote Cipher (winter round W3, Nov 2026): a quotation a day as a letter-substitution puzzle. #1 = 14 November 2026 (UTC).
//   node scripts/tools/make-cipher.js [--to=2027-10-31] [--check]
// Reads data/quotes.json (the quotations of Who Said It?, imported from their sources, never typed) and said-data.js
// (the speakers' names). scripts/cipher.tsv holds the order, one quotation id a line: this tool only ever APPENDS to it
// (days already played keep their puzzle) until the puzzles reach --to, then writes cipher-data.js (CIPHER {d0: day 1,
// q: [[text, speaker, speaker's entry, work, credit, address, source, note, licence]]}) and stamps its ?v= into /games
// (CIPHER_SRC). A quotation fits when it is 60-120 letters of plain A-Z in at least 10 words and 14 different letters
// (short or repetitive ones cannot be worked out). Dealing: a seeded shuffle; no speaker again within 21 puzzles; never
// within 30 days of the day Who Said It? asks the same quotation (five a day in the file's order from 28 October 2026).
// scripts/cipher-drop.txt lists what is never dealt (old spellings, lines about killing).
// It stops if a listed id is no longer in data/quotes.json or no longer fits. build-pages.ps1 runs it.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..'), arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : ''; };
const CHECK = process.argv.includes('--check'), TO = arg('to') || '2027-10-31';
const DAY1 = Date.UTC(2026, 10, 14) / 864e5, SAID1 = Date.UTC(2026, 9, 28) / 864e5, LAST = Math.floor(Date.parse(TO + 'T00:00:00Z') / 864e5) - DAY1 + 1;
const quotes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'quotes.json'), 'utf8'));
const SAID = new Function(fs.readFileSync(path.join(ROOT, 'said-data.js'), 'utf8') + '; return SAID;')();
const NAME = {}; SAID.p.forEach(p => { NAME[p[0]] = p[1]; });
const byId = {}; quotes.forEach((q, i) => { byId[q.id] = q; q._i = i; });
const saidDays = Math.ceil(quotes.length / 5);
function fits(q) {
  const t = q.text; if (!NAME[q.speaker]) return false;
  if (/[^A-Za-z0-9 ,.;:!?'"‘’“”—–…()-]/.test(t)) return false;   // accented letters and other signs: not in a 26-letter cipher
  const L = t.replace(/[^A-Za-z]/g, ''), W = t.split(/\s+/).length;
  return L.length >= 60 && L.length <= 120 && W >= 10 && new Set(L.toUpperCase()).size >= 14;
}
// the days (0-based, in the cycle of Who Said It?) on which a quotation is asked there
function saidGap(q, num) {   // days between cipher puzzle num and the nearest day Who Said It? asks q
  const sd = Math.floor(q._i / 5), cd = (DAY1 + num - 1) - SAID1; let d = ((cd - sd) % saidDays + saidDays) % saidDays; return Math.min(d, saidDays - d);
}
const file = path.join(ROOT, 'scripts', 'cipher.tsv');
const head = '# Quote Cipher: the quotation of each day, one id of data/quotes.json a line, #1 = 14 November 2026. Appended by\n# scripts/tools/make-cipher.js; never reorder or delete a line (a day already played keeps its puzzle).\n';
let order = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')) : [];
order.forEach((id, k) => { if (!byId[id]) throw new Error('cipher.tsv line ' + (k + 1) + ': no quotation ' + id + ' in data/quotes.json'); if (!fits(byId[id])) throw new Error('cipher.tsv: ' + id + ' no longer fits (its text changed?)'); });
let seed = 20261114; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// scripts/cipher-drop.txt: the editor's list of quotations (or speakers) never dealt
const DROP = new Set(fs.readFileSync(path.join(ROOT, 'scripts', 'cipher-drop.txt'), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')));
const used = new Set(order), pool = quotes.filter(q => fits(q) && !used.has(q.id) && !DROP.has(q.id) && !DROP.has('speaker:' + q.speaker));
for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
let added = 0;
while (order.length < LAST) {
  const num = order.length + 1, recent = new Set(order.slice(-21).map(id => byId[id].speaker));
  const k = pool.findIndex(q => !recent.has(q.speaker) && saidGap(q, num) >= 30);
  if (k < 0) throw new Error('no quotation left for #' + num + ' (' + pool.length + ' in the pool)');
  order.push(pool.splice(k, 1)[0].id); added++;
}
const rows = order.map(id => { const q = byId[id]; return [q.text, NAME[q.speaker], q.speaker, q.work || '', q.credit || '', q.url || '', q.source || '', q.note || '', q.licence || '']; });
const js = '// cipher-data.js - written by scripts/tools/make-cipher.js from data/quotes.json and scripts/cipher.tsv. Do not edit.\n// q: [text, speaker, the speaker\'s entry, work, credit, address, source, note, licence], one a day from d0 (a UTC day number)\nvar CIPHER = {d0: ' + DAY1 + ', q: [\n' + rows.map(r => JSON.stringify(r)).join(',\n') + '\n]};\n';
const v = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10);
const speakers = new Set(order.map(id => byId[id].speaker)).size;
console.log('Quote Cipher: ' + order.length + ' puzzles to ' + TO + ' (' + added + ' added, ' + speakers + ' speakers, ' + pool.length + ' fitting quotations left)');
if (CHECK) process.exit(0);
if (added) fs.writeFileSync(file, head + order.join('\n') + '\n');
const out = path.join(ROOT, 'cipher-data.js'); if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) fs.writeFileSync(out, js);
const gp = path.join(ROOT, 'games'); let g = fs.readFileSync(gp, 'utf8'); const g2 = g.replace(/cipher-data\.js\?v=[0-9a-f]*/, 'cipher-data.js?v=' + v);
if (g2 !== g) fs.writeFileSync(gp, g2);
