// Mechanical copy-edits, the same everywhere (22 Nov 2026): slips of form that need no judgement.
//   BC / AD            -> BCE / CE ("146 BC" -> "146 BCE", "AD 71" -> "71 CE", "5th century BC" -> "5th century BCE")
//   month-first dates  -> day first ("June 21, 1788" -> "21 June 1788")
//   American spelling  -> the site's British spelling (center -> centre, defense -> defence, labor -> labour …)
//   -ize spellings     -> -ise, the site's own (organized -> organised, civilization -> civilisation: nine in ten were
//                         already -ise); lower-case words only, and never inside a name the encyclopedia links by its
//                         own spelling ("Minoan civilization", "pasteurization", "World Health Organization")
//   a doubled function word ("the the", "a a") -> one
// Never inside quotation marks, italic titles, link targets or HTML tags, and never in references or credits.
//   node scripts/style/mech.js [--write] [--report=file.tsv] [--only=bce,dates,spelling,doubled]
// Without --write it only lists what it would change (id, rule, before, after). Entry descriptions change through
// "fixes" rows inserted as text in scripts/added-entries.json (then run scripts/apply-added-entries.ps1); their preview
// cards are patched; every other text is replaced where it stands, and each file must still parse.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2), WRITE = argv.includes('--write'), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const ONLY = opt('only') ? opt('only').split(',') : ['bce', 'dates', 'spelling', 'ise', 'doubled'];
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (t, v) => new Function(t.replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + v)();
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const BRIT = { center: 'centre', centers: 'centres', centered: 'centred', color: 'colour', colors: 'colours', colored: 'coloured', honor: 'honour', honors: 'honours', honored: 'honoured', favor: 'favour', favors: 'favours', favored: 'favoured',
  neighbor: 'neighbour', neighbors: 'neighbours', neighboring: 'neighbouring', theater: 'theatre', theaters: 'theatres', defense: 'defence', offense: 'offence', traveled: 'travelled', traveling: 'travelling', traveler: 'traveller', travelers: 'travellers',
  jewelry: 'jewellery', plow: 'plough', plows: 'ploughs', harbor: 'harbour', harbors: 'harbours', rumor: 'rumour', rumors: 'rumours', armor: 'armour', armored: 'armoured', fiber: 'fibre', fibers: 'fibres', maneuver: 'manoeuvre', maneuvers: 'manoeuvres',
  fulfill: 'fulfil', enrollment: 'enrolment', analyze: 'analyse', analyzed: 'analysed', analyzes: 'analyses', paralyze: 'paralyse', paralyzed: 'paralysed', paralyzes: 'paralyses', labor: 'labour' };
const RULES = [
  ['bce', /(\d)\s?BC(?![\p{L}\p{N}])/gu, '$1 BCE'], ['bce', /\b(centur(?:y|ies)|millenni(?:um|a)) BC(?![\p{L}\p{N}])/gu, '$1 BCE'],
  ['bce', /(?<![\p{L}\p{N}])AD\s?(\d{1,4})(?![\d,]*\d)/gu, '$1 CE'], ['bce', /(\d{1,4}) AD(?![\p{L}\p{N}])/gu, '$1 CE'], ['bce', /\b(centur(?:y|ies)) AD(?![\p{L}\p{N}])/gu, '$1 CE'],
  ['dates', new RegExp('\\b(' + MONTH + ') (\\d{1,2})(?:st|nd|rd|th)?,? (\\d{3,4})\\b', 'g'), '$2 $1 $3'],
  ['spelling', new RegExp('(?<![\\p{L}\\p{N}-])(' + Object.keys(BRIT).join('|') + ')(?![\\p{L}\\p{N}])', 'gu'), (m, w) => BRIT[w]],
  // not size, seize, prize, capsize, maize, assize and their kin
  ['ise', /(?<![\p{L}\p{N}-])(?!(?:re|down|out|over|under)?siz|seiz|priz|appriz|capsiz|maiz|baiz|assiz)([a-z]{3,})iz(e|es|ed|ing|ation|ations|ational|er|ers)(?![\p{L}\p{N}])/gu, (m, a, b) => a + 'is' + b],
  ['doubled', /(?<![\p{L}\p{N}'’-])(the|of|and|to|a|an|was|were|by|for|with|at|from|as|its|his|their) \1(?![\p{L}\p{N}'’-])/gu, '$1']   // not "on on": "the deportations went on on a smaller scale"
].filter(r => ONLY.includes(r[0]));
// the parts of a text no rule may touch
// (also words in single quotes, a law's own words "race, color, or previous condition of servitude", a Latin hymn's
// title and a word named as a word)
const PROTECT = /“[^”]*”|(?<![\p{L}\p{N}])'[^'\n]{3,200}'(?![\p{L}\p{N}])|race, color\b|laus et honor|or plow in the US|"[^"]*"|‘[^’]{2,200}’(?![\p{L}])|\[\[[a-z]+:[^|\]]*\||<(?:i|em|cite)\b[^>]*>[\s\S]*?<\/(?:i|em|cite)>|<[^>]+>|https?:\/\/\S+/gu;
const LINKED = (() => { try { const out = new Set(); for (const m of rd('encyclopedia-links.js').matchAll(/\["([^"\\]*(?:\\.[^"\\]*)*)",[012]\]/g)) if (/[a-z]{3,}iz(?:e|es|ed|ing|ation|ations)\b/.test(m[1])) out.add(m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return [...out]; } catch (e) { return []; } })();
const PROTECT_ALL = new RegExp(PROTECT.source + (LINKED.length ? '|' + LINKED.join('|') : ''), 'giu');
function fix(text) {
  const used = new Set(); let out = '', at = 0;
  const part = s => { for (const [name, rx, to] of RULES) { const n = s.replace(rx, to); if (n !== s) { used.add(name); s = n; } } return s; };
  for (const m of String(text).matchAll(PROTECT_ALL)) { out += part(text.slice(at, m.index)) + m[0]; at = m.index + m[0].length; }
  return [out + part(text.slice(at)), [...used]];
}
const items = [];   // {id, file, a, b, rules}
const add = (id, file, a) => { if (typeof a !== 'string' || !a) return; const [b, rules] = fix(a); if (b !== a) items.push({ id, file, a, b, rules }); };
// the texts
const ENC = ev(rd('encyclopedia-data.js'), 'ENCYCLOPEDIA'); for (const e of ENC) add('entry:' + e.slug, null, e.desc);
for (const f of fs.readdirSync(path.join(R, 'scripts', 'entry-more')).sort()) { const o = JSON.parse(rd('scripts/entry-more/' + f)); for (const s in o) o[s].forEach((sec, i) => sec[1].forEach((p, j) => add('more:' + s + '|' + i + '|' + j, 'scripts/entry-more/' + f, p))); }
const SD = ev(rd('shared-data.js').replace(/const EVENTS[\s\S]*$/, ''), '{EMPIRES, EMPIRE_INFO}'), P = ev(rd('empire-profiles.js'), 'EMPIRE_PROFILES'), G = ev(rd('empire-glance.js'), 'GLANCE'), F = ev(rd('empire-facts.js'), 'EMPIRE_FACTS');
for (const e of SD.EMPIRES) { const n = e.name;
  for (const k in P[n] || {}) if (k !== 'references' && typeof P[n][k] === 'string') add('prof:' + n + '|' + k, 'empire-profiles.js', P[n][k]);
  add('prof:' + n + '|teaser', 'shared-data.js', SD.EMPIRE_INFO[n]); const g = G[n] || {};
  (g.t || []).forEach((t, i) => add('prof:' + n + '|t' + i, 'empire-glance.js', t)); add('prof:' + n + '|dyk', 'empire-glance.js', g.dyk);
  (g.ev || []).forEach((x, i) => { add('prof:' + n + '|ev' + i + 'y', 'empire-glance.js', x[0]); add('prof:' + n + '|ev' + i, 'empire-glance.js', x[1]); });
  for (const k in F[n] || {}) add('prof:' + n + '|fact ' + k, 'empire-facts.js', F[n][k]); }
for (const f of fs.readdirSync(path.join(R, 'data', 'states')).sort()) { const o = JSON.parse(rd('data/states/' + f)); for (const id in o) for (const k of ['t', 'o', 'r', 'e']) add('state:' + id + '|' + k, 'data/states/' + f, o[id][k]); }
{ const H = JSON.parse(rd('data/history.json')); for (const d in H) (H[d].events || H[d]).forEach((x, i) => { add('day:' + d + '|' + i + '|title', 'data/history.json', x.title); add('day:' + d + '|' + i + '|description', 'data/history.json', x.description); }); }
try { const PD = ev(rd('point-descs.js'), 'POINT_DESCS'); for (const n in PD) add('point:' + n, 'point-descs.js', PD[n]); /* one text for each "Name|year" */ } catch (e) { console.log('point-descs.js not read: ' + String(e).slice(0, 80)); }
// files of running text: each paragraph line is a text of its own
const lines = (f, id, keep) => rd(f).split(/\r?\n/).forEach((l, i) => { if (keep(l)) add(id + '|' + (i + 1), f, l); });
for (const f of fs.readdirSync(path.join(R, 'scripts', 'songs')).sort()) if (f.endsWith('.txt')) { let blk = ''; rd('scripts/songs/' + f).split(/\r?\n/).forEach((l, i) => { const m = l.match(/^== (\S+)/); if (m) { blk = m[1]; return; } if ((blk === 'story' || blk === 'meaning') && l.trim()) add('song:' + f.slice(0, -4) + '|' + (i + 1), 'scripts/songs/' + f, l); }); }
for (const f of fs.readdirSync(path.join(R, 'scripts', 'societies')).sort()) if (f.endsWith('.txt')) { let blk = ''; lines('scripts/societies/' + f, 'ladder:' + f.slice(0, -4), l => { const m = l.match(/^== (\S+)/); if (m) { blk = m[1]; return false; } return blk !== 'sources' && blk !== 'checked' && /^(?:text|rise|you|intro|kid|sharenote):|^[A-Z][a-z].{80,}/.test(l); }); }
for (const f of fs.readdirSync(path.join(R, 'scripts', 'essays')).sort()) if (/^\d\d-.*\.html$/.test(f)) { const t = rd('scripts/essays/' + f), end = t.indexOf('-->'), ref = t.search(/<h2 id="[^"]*-reading"/); t.split(/\r?\n/).forEach((l, i, all) => { const pos = all.slice(0, i).join('\n').length; if (pos > end && (ref < 0 || pos < ref) && /<(?:p|li|td|h2|h3)\b/.test(l)) add('essay:' + f + '|' + (i + 1), 'scripts/essays/' + f, l); }); }
// report
const by = {}; for (const x of items) for (const r of x.rules) by[r] = (by[r] || 0) + 1;
console.log(items.length + ' texts to change', by);
const piece = (a, b) => { let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++; let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++; return [a.slice(Math.max(0, p - 40), a.length - s + 30), b.slice(Math.max(0, p - 40), b.length - s + 30)]; };
if (opt('report')) fs.writeFileSync(opt('report'), items.map(x => [x.id, x.rules.join('+'), ...piece(x.a, x.b)].join('\t')).join('\n') + '\n');
if (!WRITE) return;
// write: every text replaced where it stands, in whichever form the file writes it
const files = {}, bad = [], fixes = [], get = f => files[f] !== undefined ? files[f] : (files[f] = rd(f));
const js = s => JSON.stringify(s).slice(1, -1), ps = s => js(s).replace(/[<>&']/g, c => '\\u00' + c.charCodeAt(0).toString(16));
const forms = s => [s, s.replace(/\\/g, '\\\\').replace(/`/g, '\\`'), js(s), js(s).replace(/'/g, "\\'"), js(s).replace(/'/g, '\\u0027'), ps(s)];
// A text is replaced only as a WHOLE string of its file (between its quotation marks, or as a whole line of a text
// file). The first version looked for the bare words, and a short text such as an event's year, "404 BC", then matched
// inside every "404 BCE" already set right and left "404 BCEE" (258 places, found and mended on 22 Nov 2026).
function swap(f, a, b, what) { const t = get(f);
  if (/\.(txt|html|md|tsv)$/.test(f)) { const rows = t.split('\n'); let n = 0; for (let k = 0; k < rows.length; k++) { const cr = rows[k].endsWith('\r'), line = cr ? rows[k].slice(0, -1) : rows[k]; if (line === a) { rows[k] = b + (cr ? '\r' : ''); n++; } } if (n) { files[f] = rows.join('\n'); return true; } bad.push(what + ': not found as a line of ' + f); return false; }
  const Q = [['"', js], ['"', ps], ["'", s => js(s).replace(/'/g, "\\'")], ["'", s => js(s).replace(/'/g, '\\u0027')], ["'", s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")], ['`', s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`')]];
  for (const [q, fm] of Q) { const o = q + fm(a) + q; if (t.includes(o)) { files[f] = t.split(o).join(q + fm(b) + q); return true; } }
  bad.push(what + ': not found in ' + f); return false; }
for (const x of items) {
  if (x.id.startsWith('entry:')) { const slug = x.id.slice(6); fixes.push([slug, x.a, x.b, 'w']);   /* "w": wording only, so /corrections leaves it out */
    const pf = 'data/enc-preview/' + slug[0] + '.json'; if (fs.existsSync(path.join(R, pf))) { const t = get(pf), [pb] = fix(''); // the card holds the first two sentences: apply the same rules to its own text
      const cards = JSON.parse(t); if (cards[slug]) for (const k in cards[slug]) if (typeof cards[slug][k] === 'string' && k !== 'img') { const [nb] = fix(cards[slug][k]); if (nb !== cards[slug][k]) for (const fm of [js, ps]) { const o = '"' + fm(cards[slug][k]) + '"'; if (get(pf).includes(o)) { files[pf] = get(pf).split(o).join('"' + fm(nb) + '"'); break; } } } } }
  else swap(x.file, x.a, x.b, x.id);
}
if (fixes.length) { const f = 'scripts/added-entries.json', t = get(f), A = JSON.parse(t), addF = fixes.filter(x => !A.fixes.some(y => y[0] === x[0] && y[1] === x[1] && y[2] === x[2]));
  const i0 = t.indexOf('[', t.indexOf('"fixes"')); let d = 0, at = -1; for (let j = i0; j < t.length; j++) { if (t[j] === '"') { j++; while (t[j] !== '"') { if (t[j] === '\\') j++; j++; } } else if (t[j] === '[') d++; else if (t[j] === ']') { d--; if (!d) { at = j; break; } } }
  if (addF.length) files[f] = t.slice(0, at).replace(/\s*$/, '') + ',\n' + addF.map(x => '  ' + JSON.stringify(x)).join(',\n') + '\n ' + t.slice(at); }
for (const f in files) { if (f.endsWith('.json')) JSON.parse(files[f]); else if (f.endsWith('.js')) new Function(files[f].replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '')); }
if (bad.length) { console.log(bad.length + ' not found:\n  ' + bad.slice(0, 30).join('\n  ')); }
let n = 0; for (const f in files) if (files[f] !== rd(f)) { fs.writeFileSync(path.join(R, f), files[f]); n++; }
console.log(n + ' files written, ' + fixes.length + ' entry fixes' + (fixes.length ? ': now run scripts/apply-added-entries.ps1' : ''));
