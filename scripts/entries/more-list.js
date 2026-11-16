// The campaign to tell every entry in more detail (16 Nov 2026; MORE-GUIDE.md): the ledger and the waves.
//   node scripts/entries/more-list.js ledger
//       writes scripts/entries/more-ledger.tsv: every entry whose Wikipedia article is confirmed ("same" in
//       scripts/entry-wikidata.tsv), best known first (Wikipedia editions), with its state: done (it has a longer text),
//       thin (its article is too short, or a writer skipped it), held (a draft the checks did not pass) or empty.
//       A re-run keeps the states and adds new entries.
//   node scripts/entries/more-list.js fetch <count>
//       prints, as "slug TAB title" lines for scripts/kinds/fetch-articles.js, the next <count> entries without a state
//       whose article is not yet in the article folder
//   node scripts/entries/more-list.js wave <wave dir> <count> [--batch=25]
//       makes a wave of the next <count> open entries whose article is saved: <wave dir>/list.tsv, desc/<slug>.txt
//       (the entry as it stands), wp/<slug>.txt (a copy of the article) and batch-N.tsv; an article under 250 words
//       is marked thin in the ledger instead
//   node scripts/entries/more-list.js close <wave dir>
//       after check-more.js --write: marks the wave's entries done, thin (skipped by the writer) or held (no text)
// The articles live outside the repository: %LOCALAPPDATA%\epoch-tools\more-wp (EPOCH_MORE_WP to change it).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const WP = process.env.EPOCH_MORE_WP || path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'more-wp');
const LEDGER = path.join(R, 'scripts', 'entries', 'more-ledger.tsv');
const [cmd, a1, a2] = process.argv.slice(2).filter(a => !a.startsWith('--')), opt = (k, d) => ((process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d);
const rows = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
function moreKeys() {   // the entries that have a longer text: scripts/entry-more.json and scripts/entry-more/<c>.json
  const k = new Set(), one = path.join(R, 'scripts', 'entry-more.json'), dir = path.join(R, 'scripts', 'entry-more');
  if (fs.existsSync(one)) Object.keys(JSON.parse(fs.readFileSync(one, 'utf8'))).forEach(s => k.add(s));
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')) Object.keys(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).forEach(s => k.add(s));
  return k;
}
function readLedger() { const m = new Map(); if (fs.existsSync(LEDGER)) for (const r of rows(LEDGER)) m.set(r[0], { title: r[1], ed: +r[2] || 0, state: r[3] || '', wave: r[4] || '', words: r[5] || '' }); return m; }
function writeLedger(m) {
  const L = ['# slug\tWikipedia title\teditions\tstate (done, thin, held or empty)\twave\twords (written by scripts/entries/more-list.js)'];
  for (const [s, r] of [...m].sort((x, y) => y[1].ed - x[1].ed || (x[0] < y[0] ? -1 : 1))) L.push([s, r.title, r.ed, r.state, r.wave, r.words].join('\t'));
  fs.writeFileSync(LEDGER, L.join('\n') + '\n');
}
const words = t => (t.match(/\S+/g) || []).length;
// A long article is given to the writer as its lead and the opening of each main section (3,500 words at most): a
// writer needs material for 400 words, and twenty-five whole articles on France or the Second World War fit no reader.
// The checks compare a text with this same copy, so nothing can come from a part the writer was not given.
const SKIPSEC = /^(see also|references|notes|footnotes|citations|sources|bibliography|further reading|external links|gallery|works cited|explanatory notes|in popular culture|in fiction|filmography|discography)$/i;
function excerpt(art) {
  const lines = art.split('\n'), head = lines.slice(0, 3).join('\n'), body = lines.slice(3).join('\n');
  if (words(body) <= 4500) return art;
  // sections AND sub-sections each give their opening (until 16 Nov 2026 only the top-level ones did: a History of
  // seven sub-sections came through as its first sub-section alone, and the writers had the later ages from the lead only)
  const CAP = 4500, parts = body.split(/\n(?====? [^=])/), out = []; let total = 0;
  const take = (text, max) => { const ps = text.split(/\n+/).filter(p => p.trim()); let n = 0, keep = []; for (const p of ps) { if (/^=+ .* =+$/.test(p.trim())) { keep.push(p); continue; } const w = words(p); if (n && n + w > max) break; keep.push(p); n += w; if (n >= max) break; } return [keep.join('\n\n'), n]; };
  const lead = take(parts[0], 800); out.push(lead[0]); total += lead[1];
  let skipping = false; const secs = [];
  for (const s of parts.slice(1)) { const m = s.match(/^(===?) (.*?) ===?/); if (m && m[1] === '==') skipping = SKIPSEC.test(m[2]); if (!skipping) secs.push(s); }
  // every section gives at least its first paragraph, however many there are: an article of sixty sections once lost
  // its History, which stood after the cap
  const each = Math.max(40, Math.min(400, Math.floor((CAP - total) / Math.max(1, secs.length))));
  for (const s of secs) { const t = take(s, each); out.push(t[0]); total += t[1]; }
  return head + '\n' + out.join('\n\n') + '\n\n[The article continues: this is its lead and the opening of each section.]\n';
}
if (cmd === 'ledger') {
  const m = readLedger(), have = moreKeys(); let add = 0;
  for (const r of rows(path.join(R, 'scripts', 'entry-wikidata.tsv'))) { if (r[4] !== 'same' || !r[1]) continue; if (!m.has(r[0])) { m.set(r[0], { title: r[1], ed: +r[6] || 0, state: '', wave: '', words: '' }); add++; } }
  for (const [s, r] of m) if (have.has(s) && r.state !== 'done') { r.state = 'done'; if (!r.wave) r.wave = 'more1'; }
  writeLedger(m); const c = {}; for (const r of m.values()) c[r.state || 'open'] = (c[r.state || 'open'] || 0) + 1;
  console.log(m.size + ' entries (' + add + ' new): ' + Object.keys(c).map(k => k + ' ' + c[k]).join(', '));
} else if (cmd === 'fetch') {
  const m = readLedger(); let n = 0, out = [];
  for (const [s, r] of [...m].sort((x, y) => y[1].ed - x[1].ed || (x[0] < y[0] ? -1 : 1))) { if (r.state || fs.existsSync(path.join(WP, s + '.txt'))) continue; out.push(s + '\t' + r.title); if (++n >= +a1) break; }
  process.stdout.write(out.join('\n') + '\n');
} else if (cmd === 'wave') {
  const dir = a1, count = +a2, B = +opt('batch', 25), m = readLedger();
  const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
  for (const d of ['desc', 'wp', 'out']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const name = path.basename(dir), list = []; let thin = 0;
  for (const [s, r] of [...m].sort((x, y) => y[1].ed - x[1].ed || (x[0] < y[0] ? -1 : 1))) {
    if (list.length >= count) break; if (r.state || r.wave) continue; const f = path.join(WP, s + '.txt'), e = by[s]; if (!e || !fs.existsSync(f)) continue;
    const art = fs.readFileSync(f, 'utf8'), body = art.split('\n').slice(3).join('\n');
    if (words(body) < 250) { r.state = 'thin'; r.wave = name; thin++; continue; }
    // a living person gets no longer text (MORE-GUIDE.md "The present day"): no year of death in the dates, and the
    // article opens in the present tense
    if (e.type === 'person' && /^(?:b\.|born)\s|\bpresent\b|[–-]\s*$/.test(String(e.dates || '').trim()) || (e.type === 'person' && /\((?:born|b\.) [^)]*\d{4}\)\s+is (?:an?|the) /.test(body.slice(0, 600)))) { r.state = 'thin'; r.wave = name; r.words = 'living'; thin++; continue; }
    fs.writeFileSync(path.join(dir, 'wp', s + '.txt'), excerpt(art));
    fs.writeFileSync(path.join(dir, 'desc', s + '.txt'), 'Name: ' + e.name + '\nType: ' + e.type + (e.dates ? '\nDates: ' + e.dates : '') + (e.aka && e.aka.length ? '\nAlso: ' + [].concat(e.aka).join('; ') : '') + '\n\n' + e.desc + '\n');
    r.wave = name; list.push([s, r.title]);
  }
  fs.writeFileSync(path.join(dir, 'list.tsv'), list.map(x => x.join('\t')).join('\n') + '\n');
  for (let i = 0; i * B < list.length; i++) fs.writeFileSync(path.join(dir, 'batch-' + (i + 1) + '.tsv'), list.slice(i * B, i * B + B).map(x => x.join('\t')).join('\n') + '\n');
  writeLedger(m); console.log(name + ': ' + list.length + ' entries in ' + Math.ceil(list.length / B) + ' batches; ' + thin + ' articles too short (marked thin)');
} else if (cmd === 'close') {
  const dir = a1, name = path.basename(dir), m = readLedger(), have = moreKeys(), c = { done: 0, thin: 0, held: 0 };
  for (const [s] of rows(path.join(dir, 'list.tsv'))) { const r = m.get(s); if (!r) continue; let o = null; try { o = JSON.parse(fs.readFileSync(path.join(dir, 'out', s + '.json'), 'utf8')); } catch (e) {}
    if (have.has(s)) { r.state = 'done'; r.words = o && o.sections ? words(o.sections.map(x => x.p.join(' ')).join(' ')) : r.words; } else if (o && o.skip) r.state = 'thin'; else r.state = 'held';
    r.wave = name; c[r.state]++; }
  writeLedger(m); console.log(name + ': done ' + c.done + ', thin ' + c.thin + ', held ' + c.held);
} else { console.error('usage: more-list.js ledger | fetch <count> | wave <dir> <count> | close <dir>'); process.exit(1); }
