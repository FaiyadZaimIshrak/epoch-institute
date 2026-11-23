// Whose Life? (E3 of the editorial round, Nov 2026): one Great Life a day, told in five clues, the hardest first, each
// from that life's own profile (its "Did you know?", a key event, a takeaway, what it is known for, and who the
// person was with where and when they were born) with the name masked. #1 = 24 November 2026 (UTC).
//   node scripts/tools/make-whose-life.js [--to=2027-10-31] [--dry] [--show=<name>]
// scripts/whose-life.tsv holds the order, one profile name a line: this tool only ever APPENDS to it (a day already
// played keeps its life) until the days reach --to: a seeded choice among the lives not dealt within the last 60 days,
// those never dealt first, so a new life joins at the next build. It writes whose-data.js (WHOSE {d0, l: [[name,
// slug, span, region, dyk, [events], [takeaways], known, who]], p: [[life, pass, [nine others to choose among]]]}: a
// life dealt again shows its next event and takeaway) and stamps its ?v= into /games (WHOSE_SRC), where the page has it.
// Masking: the whole name, each word of the profile's name and of its own entry's names, and words grown from them
// ("Napoleonic", "Elizabethan", "Bolivia"); a clue that still names the person is left out, and a life with fewer than
// five clues stops the build. build-pages.ps1 runs it. --dry writes nothing; --show prints one life's clues.
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = path.resolve(__dirname, '..', '..'), arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const DRY = process.argv.includes('--dry'), TO = arg('to') || '2027-10-31', SHOW = arg('show');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (f, names) => new Function(read(f).replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {' + names + '}')();
const SD = ev('shared-data.js', 'EMPIRES, profileSpanText, toSlug'), G = ev('empire-glance.js', 'GLANCE').GLANCE, F = ev('empire-facts.js', 'EMPIRE_FACTS').EMPIRE_FACTS;
const SELF = new Function(read('encyclopedia-links.js') + ';return ENC_LINKS')().self || {};
const ed = read('encyclopedia-data.js');
const entry = slug => { const m = ed.match(new RegExp('^  \\{slug:"' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '",name:("(?:[^"\\\\]|\\\\.)*")(?:,type:"[^"]*")?(?:,subtype:"[^"]*")?(?:,aka:(\\[[^\\]]*\\]))?', 'm')); return m ? [JSON.parse(m[1])].concat(m[2] ? JSON.parse(m[2]) : []) : []; };
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻʼ’‘']/g, "'");
const STOP = new Set(('the of and ibn abi bint bin al el de da di von van mother father son great magnificent conqueror saint st king queen emperor empress apostle prophet lord lady sir mansa khan shi huang virgin blessed holy guru pope sultan caliph prince tsar shah president general chairman elder younger ' +
  'i ii iii iv v vi vii viii ix x xi xii').split(' '));
// words of a name that are a state or a house on their own ("king of Qin", "the Tokugawa shogunate"): always boxed
const BOX = { 'Qin Shi Huang': ['qin'], 'Tokugawa Ieyasu': ['tokugawa'], 'Sun Yat-sen': ['sun'], 'Ho Chi Minh': ['ho', 'chi', 'minh'] };
// words a life's name hides although the rules above would not: a surname that is also a title word reads "this person"
// (ALSO), a place after the name's "of" that gives the answer away is boxed (ALSOBOX)
const ALSO = { 'Martin Luther King Jr.': ['king'] }, ALSOBOX = { 'Rani of Jhansi': ['jhansi'] };
const lives = SD.EMPIRES.filter(e => e.kind === 'life');
function tokens(e) {
  // a name's words up to its "of": "Elizabeth I of England" and "Mary, mother of Jesus" must not hide England or Jesus
  const names = [e.name].concat(SELF[e.name] ? entry(SELF[e.name]) : []), words = new Set(), main = new Set();
  names.forEach((n, i) => { for (const w of fold(n).split(/\s+of\s+/i)[0].split(/[^\p{L}']+/u)) { const k = w.toLowerCase().replace(/^'+|'+$/g, ''); if (k.length >= 2 && !STOP.has(k)) { words.add(k); if (!i) main.add(k); } } });
  for (const w of ALSO[e.name] || []) { words.add(w); main.add(w); }
  for (const w of ALSOBOX[e.name] || []) words.add(w);
  for (const w of BOX[e.name] || []) main.delete(w);
  return { names: names.map(fold).sort((a, b) => b.length - a.length), words: [...words].sort((a, b) => b.length - a.length), main };
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function mask(text, tk) {
  // work on a folded copy of the same length so that accents never hide a name; replace in the original by position
  let t = String(text).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(), f = fold(t);
  if (f.length !== t.length) { t = f; }   // a decomposed letter changed the length: use the folded text itself
  const spans = [];
  const take = (rx, word) => { let m; rx.lastIndex = 0; while ((m = rx.exec(f))) { if (!spans.some(s => m.index < s[1] && m.index + m[0].length > s[0])) spans.push([m.index, m.index + m[0].length, word]); if (!m[0].length) rx.lastIndex++; } };
  for (const n of tk.names) take(new RegExp("(?<![\\p{L}])(?:the )?" + esc(n) + "(?:'s)?(?![\\p{L}])", 'giu'), 'P');
  // a word of the profile's own name standing alone reads "this person"; a word grown from it ("Napoleonic", "Maoism")
  // or a word only of another name of theirs ("Bonaparte") is boxed
  for (const w of tk.words) { if (tk.main.has(w)) take(new RegExp("(?<![\\p{L}])" + esc(w) + "(?:'s|s')?(?![\\p{L}])", 'giu'), 'p');
    take(new RegExp("(?<![\\p{L}])" + (w.length >= 6 ? esc(w.slice(0, Math.max(5, w.length - 2))) + "[\\p{L}']*" : esc(w) + "(?:'s|s'|ism|ist|ists|ian|ians|id|ids|ite|ites|nama|ic)?") + "(?![\\p{L}])", 'giu'), 'W'); }
  spans.sort((a, b) => b[0] - a[0]);
  for (let [a, b, kind] of spans) { const poss = /'s$|s'$/i.test(f.slice(a, b)); const start = a === 0 || /[.!?:]["”’)]?\s+$/.test(t.slice(0, a));
    // one word of the name inside another name ("Abu Talib", "President Lincoln", "Lincoln Memorial") or spoken of as a
    // word ("the title Buddha") is boxed, not read as the person
    if (kind === 'p') { const pv = (f.slice(0, a).match(/([\p{L}'-]+)\s+$/u) || [])[1] || ''; kind = /^\p{Lu}/u.test(pv) || /^(word|name|title|called|named|of|the)$/i.test(pv) || /^\s+(\p{Lu}|(dynasty|shogunate|armies|army|state|empire|era|period|code|wars|clan|family|court|government|regime)\b)/u.test(f.slice(b)) ? 'W' : 'P'; }
    t = t.slice(0, a) + (kind === 'P' ? (start ? 'This person' : 'this person') + (poss ? "'s" : '') : '▢▢▢' + (poss ? "'s" : '')) + t.slice(b); }
  return t.replace(/this person (I{1,3}|IV|V|VI{0,3})\b/g, 'this person').replace(/(▢▢▢[ -]?){2,}/g, '▢▢▢ ').replace(/\s+([,.;:])/g, '$1').trim();
}
const leaks = (text, tk) => { const f = fold(text).toLowerCase(); return tk.words.some(w => new RegExp("(?<![\\p{L}])" + esc(w.length >= 6 ? w.slice(0, Math.max(5, w.length - 2)) : w) + (w.length >= 6 ? '' : "(?:ism|ist|ists|ian|ians|id|ids|ite|ites|nama|ic)?(?![\\p{L}])"), 'iu').test(f)); };
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s, dot = s => /[.!?]["”’)]?$/.test(s) ? s : s + '.';
const L = lives.map(e => {
  const g = G[e.name], f = F[e.name]; if (!g || !f) throw new Error('no glance or facts for ' + e.name);
  const tk = tokens(e), ok = s => s && !leaks(s, tk) && s.length >= 30 ? s : null;
  const dyk = ok(mask(g.dyk, tk));
  const evs = (g.ev || []).slice(1, -1).map(x => ok(mask(x[0] + ': ' + x[1], tk))).filter(Boolean);
  const ts = (g.t || []).map(x => ok(mask(x, tk))).filter(Boolean);
  const known = ok('Known for: ' + mask(f.known, tk));
  const born = mask(f.born, tk).replace(/^born /i, ''), who = ok(dot(cap(mask(f.role, tk))) + ' Born: ' + dot(/^[A-Z][a-z]+ [a-z]/.test(born) ? born[0].toLowerCase() + born.slice(1) : born));
  const row = [e.name, SD.toSlug(e.name), SD.profileSpanText(e), e.region, dyk, evs, ts, known, who];
  if (!dyk || !evs.length || !ts.length || !known || !who) throw new Error('Whose Life?: ' + e.name + ' lacks a clue after masking: ' + JSON.stringify({ dyk: !!dyk, events: evs.length, takeaways: ts.length, known: !!known, who: !!who }));
  return row;
});
if (SHOW) { const r = L.find(x => x[0] === SHOW); if (!r) throw new Error('no life ' + SHOW); console.log(['1 ' + r[4]].concat(r[5].map(x => '2 ' + x), r[6].map(x => '3 ' + x), ['4 ' + r[7], '5 ' + r[8]]).join('\n')); process.exit(0); }

// the order: append only
const DAY1 = Date.UTC(2026, 10, 24) / 864e5, LAST = Math.floor(Date.parse(TO + 'T00:00:00Z') / 864e5) - DAY1 + 1;
const file = path.join(R, 'scripts', 'whose-life.tsv'), head = '# Whose Life?: the Great Life of each day, one profile name a line, #1 = 24 November 2026. Appended by\n# scripts/tools/make-whose-life.js; never reorder or delete a line (a day already played keeps its life).\n';
const order = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')) : [];
const idx = {}; L.forEach((r, i) => { idx[r[0]] = i; });
order.forEach((n, k) => { if (idx[n] === undefined) throw new Error('whose-life.tsv line ' + (k + 1) + ': no life ' + n); });
let seed = 20261124 + order.length * 7919; const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const before = order.length;
while (order.length < LAST) {
  const last = {}; order.forEach((n, k) => { last[n] = k; });
  const free = L.map(r => r[0]).filter(n => last[n] === undefined || order.length - last[n] > Math.min(60, L.length - 1));
  const never = free.filter(n => last[n] === undefined), pool = never.length ? never : free.sort((a, b) => last[a] - last[b]).slice(0, Math.max(8, Math.ceil(free.length / 3)));
  order.push(pool[Math.floor(rnd() * pool.length)]);
}
// each day's nine others: lives of the same region or age first, so that the choice is a real one; the same for everyone
const seen = {}, P = order.map((n, k) => {
  const i = idx[n], e = lives[i], pass = seen[n] = (seen[n] === undefined ? 0 : seen[n] + 1);
  let s = (k + 1) * 2654435761 >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const others = lives.map((o, j) => [j, (o.region === e.region ? 2 : 0) + (Math.abs(o.start - e.start) < 300 ? 2 : Math.abs(o.start - e.start) < 800 ? 1 : 0) + r()]).filter(x => x[0] !== i).sort((a, b) => b[1] - a[1]);
  const near = others.slice(0, 5).map(x => x[0]), rest = others.slice(5).map(x => x[0]); for (let a = rest.length - 1; a > 0; a--) { const b = Math.floor(r() * (a + 1)); [rest[a], rest[b]] = [rest[b], rest[a]]; }
  return [i, pass, near.concat(rest.slice(0, 4)).sort((a, b) => a - b)];
});
const out = '// Whose Life? (scripts/tools/make-whose-life.js): generated, do not edit\nconst WHOSE = ' + JSON.stringify({ d0: '2026-11-24', l: L, p: P }) + ';\n';
const v = crypto.createHash('sha1').update(out).digest('hex').slice(0, 8);
console.log('Whose Life?: ' + L.length + ' lives, ' + order.length + ' days to ' + TO + ' (' + (order.length - before) + ' new), whose-data.js ' + Math.round(out.length / 1024) + ' KB' + (DRY ? ' (dry run)' : ''));
if (!DRY) {
  if (order.length > before) fs.writeFileSync(file, head + order.join('\n') + '\n');
  fs.writeFileSync(path.join(R, 'whose-data.js'), out);
  const gf = path.join(R, 'games'); let g = fs.readFileSync(gf, 'utf8');
  if (/WHOSE_SRC = '[^']*'/.test(g)) { const g2 = g.replace(/WHOSE_SRC = '[^']*'/, "WHOSE_SRC = '/whose-data.js?v=" + v + "'"); if (g2 !== g) fs.writeFileSync(gf, g2); }
}
