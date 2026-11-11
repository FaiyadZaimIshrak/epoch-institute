// Finish the Line (winter round W3, Nov 2026): five songs a day; a few lines of a song are shown and the reader picks
// the line that comes next from four of the same song. #1 = 15 November 2026 (UTC).
//   node scripts/tools/make-finish-line.js [--to=2027-10-31] [--check] [--sample=N]
// Reads scripts/songs/songs.json (written by scripts/songs/make-data.js: the words are imported from their editions,
// never typed). A song can be dealt when its words are printed, it suits Kids mode (so the game is the same for
// everyone and no regime's or grim song is in it), it carries no caution note, neither part is under a licence that
// asks for credit (the ETCSL texts), the translation is not marked tentative, and it is either sung in English or
// has an English translation line for line (shown under each line). Only its first 48 lines are used.
// A puzzle is a line that has at least one line before it in its stanza, is 10 characters or more and stands only
// once in the song; the three wrong lines are other lines of the same song that never follow the last line shown.
// scripts/finish-line.tsv holds the order (slug, the line's number among the song's lines from 0, a hash of the
// line): this tool only APPENDS to it, so days already played keep their songs; a row whose line has changed since
// (a text fix) is dealt again in its place and reported. Each day's first and third songs are in English where one
// is free; no song again within 30 puzzles; no line twice. It writes line-data.js (LINEQ {d0, s: [[slug, title,
// date, culture, language, [lines], [their English] or 0]], p: [[song, line, lines shown before it (1-3), three wrong
// lines]]}) and stamps its ?v= into /games (LINE_SRC). build-pages.ps1 runs it after the songs' data.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..'), arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : ''; };
const CHECK = process.argv.includes('--check'), TO = arg('to') || '2027-10-31', SAMPLE = +arg('sample') || 0, N = 5, CAP = 48, GAP = 30;
const DAY1 = Date.UTC(2026, 10, 15) / 864e5, LAST = (Math.floor(Date.parse(TO + 'T00:00:00Z') / 864e5) - DAY1 + 1) * N;
const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'songs', 'songs.json'), 'utf8'));
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\(bis\)/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const h8 = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const S = {};   // slug -> {song, eng, lines, en, start: stanza start of each line, cands}
for (const s of songs) {
  if (!s.text || !s.text.parts.orig || !s.kids || s.caution || s.withheld || s.text.tentative) continue;
  const p = s.text.parts, o = p.orig.stanzas, e = p.en && p.en.stanzas, eng = !!(s.langs[0] && s.langs[0].code === 'en');
  if (/CC BY/.test((p.orig.licence || '') + ' ' + ((p.en && p.en.licence) || ''))) continue;
  const shape = !!e && s.text.aligned && e.length === o.length && o.every((st, i) => st.length === e[i].length);
  if (!eng && !shape) continue;
  const lines = [], en = [], start = [];
  for (let i = 0; i < o.length && lines.length < CAP; i++) { const at = lines.length; for (let j = 0; j < o[i].length && lines.length < CAP; j++) { lines.push(String(o[i][j]).trim()); en.push(eng ? '' : String(e[i][j]).trim()); start.push(at); } }
  const f = lines.map(fold), count = {}; f.forEach(x => { count[x] = (count[x] || 0) + 1; });
  const after = {};   // folded line -> the folded lines that follow it anywhere in the song
  f.forEach((x, i) => { if (i + 1 < f.length) (after[x] = after[x] || new Set()).add(f[i + 1]); });
  // a line with an editor's mark (a doubtful reading, a folio or verse number) or a very long one is never shown
  const bad = lines.map((l, i) => l.length < 10 || l.length > 90 || !f[i] || /[\[\]\p{N}]/u.test(l + ' ' + en[i]) || (!eng && !en[i]));
  const R = { song: s, eng, lines, en, start, f, after, bad, cands: [] };
  for (let i = 0; i < lines.length; i++) {
    if (i === start[i] || bad[i] || count[f[i]] > 1) continue;
    const n = Math.min(3, i - start[i]); if (bad.slice(i - n, i).some(Boolean)) continue;
    if (wrong(R, i).length >= 3) R.cands.push(i);
  }
  if (R.cands.length >= 4) S[s.slug] = R;
}
function wrong(R, a) {   // the lines that may stand beside line a as wrong answers
  const n = Math.min(3, a - R.start[a]), shown = new Set(R.f.slice(a - n, a)), last = R.f[a - 1], seen = new Set(), out = [];
  for (let i = 0; i < R.lines.length; i++) {
    const x = R.f[i];
    if (i === a || R.bad[i] || x === R.f[a] || shown.has(x) || seen.has(x)) continue;
    if (R.after[last] && R.after[last].has(x)) continue;
    const r = R.lines[i].length / R.lines[a].length; if (r < 0.5 || r > 2) continue;
    seen.add(x); out.push(i);
  }
  return out;
}
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const file = path.join(ROOT, 'scripts', 'finish-line.tsv');
const head = '# Finish the Line: five songs a day from 15 November 2026: slug, the line asked for (its number among the song\'s lines,\n# from 0), a hash of that line. Appended by scripts/tools/make-finish-line.js; never reorder or delete a line.\n';
let order = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const c = l.split('\t'); return { slug: c[0], a: +c[1], h: c[2] }; }) : [];
const rnd = rng(20261115), used = new Set(), lastUse = {};
const good = r => r && S[r.slug] && S[r.slug].cands.includes(r.a) && h8(S[r.slug].lines[r.a]) === r.h;
order.forEach((r, i) => { if (good(r)) { used.add(r.slug + ' ' + r.a); lastUse[r.slug] = i; } });
const slugs = Object.keys(S).sort();
function deal(i) {
  const wantEng = i % N === 0 || i % N === 2, day = new Set(order.slice(i - (i % N), i - (i % N) + N).filter((r, k) => r && i - (i % N) + k !== i).map(r => r.slug));
  const free = slugs.filter(g => !day.has(g) && (lastUse[g] === undefined || Math.abs(i - lastUse[g]) >= GAP) && S[g].cands.some(a => !used.has(g + ' ' + a)));
  let pool = free.filter(g => S[g].eng === wantEng); if (!pool.length) pool = free;
  if (!pool.length) throw new Error('Finish the Line: no song left for puzzle ' + (i + 1));
  const key = {}; pool.forEach(g => { key[g] = (lastUse[g] === undefined ? -1e6 : lastUse[g]) + rnd() * 40; });   // the longest unused first, loosely
  pool.sort((x, y) => key[x] - key[y]);
  const g = pool[0], R = S[g], c = R.cands.filter(a => !used.has(g + ' ' + a)), best = c.filter(a => a - R.start[a] >= 2), from = best.length ? best : c;
  const a = from[Math.floor(rnd() * from.length)];
  used.add(g + ' ' + a); lastUse[g] = i; return { slug: g, a, h: h8(R.lines[a]) };
}
let added = 0, redealt = 0;
for (let i = 0; i < order.length; i++) if (!good(order[i])) { const was = order[i].slug + ' ' + order[i].a; order[i] = null; order[i] = deal(i); redealt++; console.log('Finish the Line: puzzle ' + (i + 1) + ' (' + was + ') no longer fits its song\'s words; dealt again: ' + order[i].slug + ' ' + order[i].a); }
while (order.length < LAST) { order.push(null); order[order.length - 1] = deal(order.length - 1); added++; }
// the data: the songs in use, and each puzzle with its three wrong lines (chosen by the puzzle's own number)
const usedSlugs = [...new Set(order.map(r => r.slug))].sort(), idx = {}; usedSlugs.forEach((g, i) => { idx[g] = i; });
const year = s => s.undated ? 'date unknown' : s.date;
const sRows = usedSlugs.map(g => { const R = S[g], s = R.song; return [g, s.title, year(s), s.culture, s.langs[0].name, R.lines, R.eng ? 0 : R.en, s.langs[0].code]; });
const pRows = order.map((r, i) => {
  const R = S[r.slug], w = wrong(R, r.a), rr = rng(7919 * (i + 1) + 13);
  for (let k = w.length - 1; k > 0; k--) { const j = Math.floor(rr() * (k + 1)); [w[k], w[j]] = [w[j], w[k]]; }
  return [idx[r.slug], r.a, Math.min(3, r.a - R.start[r.a]), w[0], w[1], w[2]];
});
const js = '// line-data.js - written by scripts/tools/make-finish-line.js from scripts/songs/songs.json and scripts/finish-line.tsv. Do not edit.\n' +
  '// s: [slug, title, date, culture, language, [lines], [their English, line for line] or 0 for a song in English, language code]\n// p: [song, the line asked for, how many lines before it are shown, three wrong lines], five a day from d0 (a UTC day number)\n' +
  'var LINEQ = {d0: ' + DAY1 + ', s: [\n' + sRows.map(r => JSON.stringify(r)).join(',\n') + '\n], p: ' + JSON.stringify(pRows) + '};\n';
const v = crypto.createHash('sha1').update(js).digest('hex').slice(0, 10);
console.log('Finish the Line: ' + order.length + ' puzzles (' + order.length / N + ' days, to ' + TO + '; ' + added + ' added' + (redealt ? ', ' + redealt + ' dealt again' : '') + '), ' + usedSlugs.length + ' of ' + slugs.length + ' songs that fit (' + slugs.filter(g => S[g].eng).length + ' in English), ' + Math.round(js.length / 1024) + ' KB');
if (SAMPLE) for (let i = 0; i < Math.min(SAMPLE, order.length); i++) {
  const r = order[i], R = S[r.slug], p = pRows[i];
  console.log('\n#' + (Math.floor(i / N) + 1) + '.' + (i % N + 1) + '  ' + R.song.title + ' (' + R.song.langs[0].name + ')');
  for (let k = p[2]; k > 0; k--) console.log('     ' + R.lines[r.a - k] + (R.eng ? '' : '   | ' + R.en[r.a - k]));
  console.log('   = ' + R.lines[r.a] + (R.eng ? '' : '   | ' + R.en[r.a]));
  p.slice(3).forEach(w => console.log('   x ' + R.lines[w] + (R.eng ? '' : '   | ' + R.en[w])));
}
if (CHECK) process.exit(0);
if (added || redealt) fs.writeFileSync(file, head + order.map(r => r.slug + '\t' + r.a + '\t' + r.h).join('\n') + '\n');
const out = path.join(ROOT, 'line-data.js'); if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) fs.writeFileSync(out, js);
const gp = path.join(ROOT, 'games'); const g0 = fs.readFileSync(gp, 'utf8'), g2 = g0.replace(/line-data\.js\?v=[0-9a-f]*/, 'line-data.js?v=' + v);
if (g2 !== g0) fs.writeFileSync(gp, g2);
