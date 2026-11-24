// Folds a duplicate entry into its twin (24 Nov 2026; the first fold, Lady Hyegyeong, was done by hand on 23 Nov).
//   node scripts/entries/fold-entry.js <old slug> <kept slug> [--dry]
// The old entry's line, preview card, search row and facets row go; its link row keeps its PLACE (byEmpire holds row
// numbers) with text that can match nothing, and the names it was found by go to the kept entry's row; a name group
// or profile-only form that named the old entry names the kept one; the source files that name the old slug as a whole
// slug are pointed at the kept one; the old address answers 301. Afterwards: link-scan the profiles that named either,
// regenerate the profiles, a full build. It stops, changing nothing, at anything it does not expect.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [OLD, KEEP] = process.argv.slice(2).filter(a => !a.startsWith('--')), DRY = process.argv.includes('--dry');
if (!OLD || !KEEP || OLD === KEEP) throw new Error('usage: fold-entry.js <old slug> <kept slug> [--dry]');
const out = {}, rd = f => (f in out ? out[f] : fs.readFileSync(path.join(R, f), 'utf8'));
const once = (f, a, b) => { const t = rd(f), n = t.split(a).length - 1; if (n !== 1) throw new Error(f + ': ' + n + ' x ' + JSON.stringify(a.slice(0, 80))); out[f] = t.replace(a, () => b); };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const whole = s => new RegExp('(?<![a-z0-9-])' + esc(s) + '(?![a-z0-9-])', 'g');

// the two entries
const ED = rd('encyclopedia-data.js'), line = s => { const i = ED.indexOf('  {slug:"' + s + '",'); if (i < 0 || ED.indexOf('  {slug:"' + s + '",', i + 1) >= 0) throw new Error('entry line of ' + s); return [i, ED.indexOf('\n', i)]; };
const [oi, oj] = line(OLD), [ki, kj] = line(KEEP); const oldLine = ED.slice(oi, oj), keepLine = ED.slice(ki, kj);
const nameOf = l => JSON.parse(l.match(/name:("(?:[^"\\]|\\.)*")/)[1]), typeOf = l => l.match(/type:"([^"]*)"/)[1];
const oldName = nameOf(oldLine), keepName = nameOf(keepLine); if (typeOf(oldLine) !== typeOf(keepLine)) throw new Error('the two are of different types');
console.log('fold ' + OLD + ' (' + oldName + ') into ' + KEEP + ' (' + keepName + ')');
{ // the old line goes; the kept entry is also known by the old name
  let t = ED.slice(0, oi) + ED.slice(oj + 1); if (t.split('\n').length !== ED.split('\n').length - 1) throw new Error('line count');
  if (oldName !== keepName) { const k = t.indexOf('  {slug:"' + KEEP + '",'), e = t.indexOf('\n', k); let l = t.slice(k, e);
    const m = l.match(/,aka:\[((?:"(?:[^"\\]|\\.)*",?)*)\]/);
    if (m) { if (!JSON.parse('[' + m[1] + ']').includes(oldName)) l = l.replace(m[0], () => ',aka:[' + m[1] + ',' + JSON.stringify(oldName) + ']'); }
    else { const a = 'type:"' + typeOf(keepLine) + '",'; if (l.split(a).length !== 2) throw new Error('type field'); const sub = l.match(/type:"[^"]*",(subtype:"[^"]*",)?/)[0]; l = l.replace(sub, () => sub + 'aka:[' + JSON.stringify(oldName) + '],'); }
    t = t.slice(0, k) + l + t.slice(e); }
  out['encyclopedia-data.js'] = t;
}
{ // the link rows
  const f = 'encyclopedia-links.js', t = rd(f), L = new Function(t + ';return ENC_LINKS')();
  const mine = [], keepRows = [];
  L.e.forEach((r, i) => { if (r[0] === OLD) mine.push(i); else if (r[0] === KEEP) keepRows.push(i); });
  const main = mine.filter(i => i < L.fs), forms = mine.filter(i => i >= L.fs), keepMain = keepRows.filter(i => i < L.fs);
  if (main.length !== 1 || keepMain.length !== 1) throw new Error('main rows: ' + main.length + ' old, ' + keepMain.length + ' kept');
  const oldRow = L.e[main[0]], keepRow = L.e[keepMain[0]];
  const has = new Set(keepRow[1].map(p => p[0])), add = oldRow[1].filter(p => !has.has(p[0]));
  const inGroup = L.e.some(r => r[0] === '@g' && r[2].includes(KEEP));
  once(f, JSON.stringify(oldRow), JSON.stringify([OLD, [[oldName + ', an entry folded into ' + keepName + ' (' + KEEP + ')', 0]]]));
  // a name several entries share (a group) is never also a plain name of one of them: such names stay with their group
  const groupNames = new Set(); L.e.forEach(r => { if (r[0] === '@g' && (r[2].includes(OLD) || r[2].includes(KEEP))) r[1].forEach(p => groupNames.add(p[0])); });
  const add2 = add.filter(p => !groupNames.has(p[0]));
  if (add2.length) once(f, JSON.stringify(keepRow), JSON.stringify([KEEP, keepRow[1].concat(add2)]));
  console.log('  names given to the kept row: ' + (add2.map(p => p[0]).join(' | ') || 'none') + (inGroup ? '  (the kept entry is in a name group)' : ''));
  for (const i of forms) { once(f, JSON.stringify(L.e[i]), JSON.stringify([KEEP, L.e[i][1]])); console.log('  form row ' + i + ' now names the kept entry: ' + L.e[i][1].map(p => p[0]).join(' | ')); }
  L.e.forEach(r => { if (r[0] !== '@g' || !r[2].includes(OLD)) return;
    const slugs = r[2].includes(KEEP) ? r[2].filter(s => s !== OLD) : r[2].map(s => s === OLD ? KEEP : s), prim = r[3] === OLD ? KEEP : r[3];
    const nr = ['@g', r[1], slugs, prim]; if (r.length > 4) throw new Error('group row with more fields');
    once(f, JSON.stringify(r), JSON.stringify(nr)); console.log('  group ' + r[1].map(p => p[0]).join(' | ') + ': ' + slugs.join(', ') + ' (first ' + prim + ')'); });
  let t2 = rd(f);
  // y (years), self and ex name entries by slug
  const y = L.y && L.y[OLD]; if (y) { const a = JSON.stringify(OLD) + ':' + JSON.stringify(y); if (t2.split(a).length === 2) { t2 = L.y[KEEP] ? t2.replace(a + ',', '') : t2.replace(a, () => JSON.stringify(KEEP) + ':' + JSON.stringify(y)); out[f] = t2; } else throw new Error('y of the old entry'); }
  for (const [p, s] of Object.entries(L.self || {})) if (s === OLD) throw new Error('a profile\'s own entry is the old one: ' + p + ' (set scripts/kinds/self.tsv first)');
  const N = new Function(rd(f) + ';return ENC_LINKS')(); if (N.e.length !== L.e.length) throw new Error('rows moved');
}
{ // the preview card
  const f = 'data/enc-preview/' + OLD[0] + '.json', t = rd(f), m = t.match(new RegExp('"' + esc(OLD) + '":\\{"n":(?:[^{}]|\\{[^{}]*\\})*\\},?')); if (!m) throw new Error('preview card');
  let t2 = t.replace(m[0], ''); if (t2.endsWith(',}')) t2 = t2.slice(0, -2) + '}'; const j = JSON.parse(t2); if (OLD in j) throw new Error('card still there'); out[f] = t2;
}
{ // the search row and the facets row of the same place
  const t = rd('search-index.js'), lines = t.split('\n'); let part = '', n = 0, at = -1, li = -1;
  const rowRx = new RegExp('^\\[(?:0|' + esc(JSON.stringify(OLD)) + '),' + esc(JSON.stringify(oldName)) + ',"' + typeOf(oldLine) + '"');
  for (let i = 0; i < lines.length; i++) { const l = lines[i];
    if (l.startsWith('var SEARCH_INDEX')) { part = 'e'; continue; } if (l.startsWith('var SEARCH_STATES')) part = 's'; if (l === '];') part = '';
    if (part === 'e' && /^\[(?:0|"[^"]*"),"/.test(l)) { if (rowRx.test(l)) { if (at >= 0) throw new Error('two search rows named ' + oldName); at = n; li = i; } n++; } }
  if (at < 0) throw new Error('search row of ' + oldName); if (!lines[li].endsWith(',')) throw new Error('the last row of the index');
  lines.splice(li, 1); out['search-index.js'] = lines.join('\n');
  const f = 'search-facets.js', ft = rd(f), m = ft.match(/\{n:(\d+),ns:/); if (+m[1] !== n) throw new Error('facets made for ' + m[1] + ' rows, the index has ' + n);
  const s = ft.indexOf('\ne:[') + 4, e = ft.indexOf(']],', s) + 1, rows = ft.slice(s, e).match(/\[-?\d+,-?\d+,-?\d+,[01]\]/g); if (rows.length !== n) throw new Error('facet rows ' + rows.length);
  rows.splice(at, 1); out[f] = (ft.slice(0, s) + rows.join(',') + ft.slice(e)).replace(/\{n:\d+,ns:/, '{n:' + (n - 1) + ',ns:'); console.log('  search row ' + at + ' of ' + n + ' removed');
}
{ // added-entries.json: an entry of a wave goes with its block; rows naming the old slug are pointed at the kept one, as text
  const f = 'scripts/added-entries.json'; let t = rd(f); const a = t.indexOf('  {\n   "slug": ' + JSON.stringify(OLD) + ',');
  if (a >= 0) { const e = t.indexOf('\n  }', a); const tail = t.slice(e + 4, e + 6); t = t.slice(0, a) + t.slice(e + 4 + (tail.startsWith(',\n') ? 2 : 0)); console.log('  its block left added-entries.json'); }
  const n = (t.match(whole(OLD)) || []).length; if (n) { console.log('  added-entries.json: ' + n + ' other rows name the old slug: READ THEM'); t = t.replace(whole(OLD), KEEP); }
  JSON.parse(t); out[f] = t;
}
// source files that name the old slug as a whole slug
const SRC = ['scripts/connections.tsv', 'data/history.json', 'data/enc-states.json', 'scripts/kinds/link-exclusions.tsv', 'scripts/own-name-links.tsv', 'scripts/entry-regions.tsv',
  'scripts/state-rulers-manual.tsv', 'scripts/state-rulers.tsv', 'scripts/state-rulers.js','scripts/entry-wikidata-manual.tsv', 'scripts/entry-coords-manual.tsv', 'scripts/entry-family-manual.tsv', 'scripts/entry-places-manual.tsv', 'scripts/entry-more-nolink.tsv',
  'scripts/game-pictures.tsv', 'scripts/kids-corner.tsv', 'scripts/word-hunt.tsv', 'scripts/crossword-words.tsv', 'scripts/quote-sources.tsv', 'scripts/quote-sources-words.tsv', 'scripts/day-people.tsv',
  'scripts/inventions.tsv', 'scripts/months.tsv', 'scripts/advent.tsv', 'scripts/home-pictures.tsv', 'scripts/kinds/pick.txt', 'scripts/kinds/self.tsv', 'scripts/journeys/journeys.tsv', 'scripts/faiths-side.tsv',
  'scripts/six-degrees.tsv', 'scripts/no-portrait.tsv', 'scripts/battles/portraits.tsv', 'empire-section-images.js', 'speeches-data.js', 'reading-paths.js']
  .concat(fs.readdirSync(path.join(R, 'data/states')).filter(x => x.endsWith('.json')).map(x => 'data/states/' + x))
  .concat(fs.readdirSync(path.join(R, 'scripts/societies')).filter(x => x.endsWith('.txt')).map(x => 'scripts/societies/' + x))
  .concat(fs.readdirSync(path.join(R, 'scripts/essays')).filter(x => x.endsWith('.html')).map(x => 'scripts/essays/' + x))
  .concat(fs.readdirSync(path.join(R, 'scripts/battles')).filter(x => x.endsWith('.json')).map(x => 'scripts/battles/' + x))
  .concat(fs.readdirSync(path.join(R, 'scripts/journeys')).filter(x => x.endsWith('.json')).map(x => 'scripts/journeys/' + x));
for (const f of SRC) { if (!fs.existsSync(path.join(R, f))) continue; const t = rd(f), n = (t.match(whole(OLD)) || []).length; if (!n) continue;
  let t2 = t.replace(whole(OLD), KEEP);
  if (f === 'data/enc-states.json') { const j = JSON.parse(t); if (KEEP in j && OLD in j) throw new Error('enc-states.json holds both: merge by hand'); }
  if (f === 'empire-section-images.js' && oldName !== keepName) t2 = t2.split('slug:"' + KEEP + '",name:' + JSON.stringify(oldName) + ',').join('slug:"' + KEEP + '",name:' + JSON.stringify(keepName) + ',');
  if (/\.json$/.test(f)) JSON.parse(t2); out[f] = t2; console.log('  ' + f + ': ' + n); }
{ // person-dates.tsv: the old row goes when the kept entry has dates of its own, else it moves
  const f = 'scripts/person-dates.tsv', t = rd(f), rows = t.split('\n'), i = rows.findIndex(l => l.startsWith(OLD + '\t'));
  if (i >= 0) { if (rows.some(l => l.startsWith(KEEP + '\t')) || /dates:"/.test(keepLine)) rows.splice(i, 1); else rows[i] = KEEP + rows[i].slice(OLD.length); out[f] = rows.join('\n'); console.log('  person-dates.tsv: row ' + (i + 1)); }
}
// the old address answers with the kept page
{ const f = '.htaccess', a = '  # profiles taken off the site: the old address goes to the entry (scripts/kinds/remove-profile.js)\n';
  once(f, a, '  RewriteRule ^encyclopedia/' + OLD + '$ /encyclopedia/' + KEEP + ' [R=301,L]\n' + a); }
// what the tool does not touch, for the editor
const more = ['scripts/entry-more/' + OLD[0] + '.json', 'scripts/entry-sources.json', 'scripts/entry-places.tsv', 'scripts/entry-family.tsv', 'scripts/entry-houses.tsv', 'scripts/entry-wikidata.tsv', 'scripts/entry-coords.tsv']
  .filter(f => fs.existsSync(path.join(R, f)) && whole(OLD).test(fs.readFileSync(path.join(R, f), 'utf8')));
if (more.length) console.log('  NAMED ALSO IN (generated by tools; read): ' + more.join(', '));
for (const k of Object.keys(out)) { const was = fs.readFileSync(path.join(R, k), 'utf8'); if (out[k] === was) continue; console.log((DRY ? 'would change ' : 'changed ') + k + '  ' + (out[k].length - was.length)); if (!DRY) fs.writeFileSync(path.join(R, k), out[k]); }
