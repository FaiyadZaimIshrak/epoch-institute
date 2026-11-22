// Gap round of 22-23 Nov 2026, the links found wrong while choosing section pictures for the 130 older profiles that had
// none (every candidate on the contact sheets is an entry its section links, so a namesake shows at once).
//   node scripts/kinds/gaps1/links.js [--write]
// It makes, as text insertions (nothing is re-serialised but data/enc-states.json, which is written as it always was):
//  1. "drop" rows in scripts/added-entries.json: four names that linked one entry wherever the word stood
//       armistice      -> the Armistice of 11 November 1918 (also for 1796, 1866, 1940, 1943, 1944, 1953 …)
//       Middle Kingdom -> Middle Francia (also for Egypt's Middle Kingdom, on eleven profiles)
//       Inquisition    -> the Portuguese Inquisition (also for the Spanish, Roman and medieval ones)
//       themes         -> the Byzantine theme system (also for the themes of poems and plays)
//  2. "forms" rows for the profiles where the bare name does mean one entry (FORMS below);
//  3. scripts/kinds/link-exclusions.tsv (excl.tsv here) and scripts/kinds/self.tsv (self.tsv here: profiles whose own
//     entry was linked in their own text);
//  4. the state histories that linked the dropped names (STATES below: unlinked, or moved to the right entry) and the
//     counts of data/enc-states.json for those entries;
//  5. rescan.txt: the profiles to scan again with link-scan.js --write (those that linked a dropped name, those given a
//     form, an exclusion or their own entry).
// Then: apply-added-entries.ps1, link-scan.js --write over rescan.txt five at a time, section-pictures.js write.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..', '..'), WRITE = process.argv.includes('--write');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const DROPS = [['armistice-of-11-november-1918', 'armistice', 1], ['middle-francia', 'Middle Kingdom', 0], ['portuguese-inquisition', 'Inquisition', 0], ['theme-system', 'themes', 1]];
// [entry, text, mode, the profiles where the bare name means it]
const FORMS = [
  ['armistice-of-11-november-1918', 'armistice', 1, ['German Empire', 'Weimar Republic', 'German East Africa']],
  ['middle-francia', 'Middle Kingdom', 0, ['County of Hainaut', 'Carolingian Empire']],
  ['middle-kingdom-of-egypt', 'Middle Kingdom', 0, ['Kingdom of Ugarit', 'Kerma culture', 'Ancient Egyptian', 'Ancient Egyptian religion', 'Great Pyramid of Giza', 'Book of the Dead', 'Great Sphinx of Giza', 'Jerusalem']],
  ['theme-system', 'themes', 1, ['Byzantine Empire']],
  ['spanish-inquisition', 'Inquisition', 0, ['Crown of Castile', 'Kingdom of Sicily', 'New Spain', 'United Provinces of the Río de la Plata', 'Isabella I of Castile', 'Kingdom of Galicia']],
  ['roman-inquisition', 'Inquisition', 0, ['Grand Duchy of Tuscany', 'Galileo Galilei', 'Talmud']],
  ['medieval-inquisition', 'Inquisition', 0, ['County of Toulouse']],
  ['portuguese-inquisition', 'Inquisition', 0, ['Colonial Brazil']]
];
// [state id, the entry linked, the entry it should link ('' = plain text)]; the states not listed keep their link
// (Estonia's commune and the Free State Bottleneck mean 11 November 1918; Porto Seguro and Goa the Portuguese tribunal)
const STATES = [
  ['mandatory-iraq', 'armistice-of-11-november-1918', ''], ['yemen-vilayet', 'armistice-of-11-november-1918', ''],            // Mudros, 30 October 1918
  ['hungarian-democratic-republic', 'armistice-of-11-november-1918', ''],                                                   // the Belgrade armistice
  ['italian-social-republic', 'armistice-of-11-november-1918', ''], ['republic-of-central-lithuania', 'armistice-of-11-november-1918', ''],
  ['state-of-slovenes-croats-and-serbs', 'armistice-of-11-november-1918', ''],                                              // Villa Giusti
  ['transcaucasian-commissariat', 'armistice-of-11-november-1918', ''],                                                     // Erzincan
  ['bonapartist-spain', 'portuguese-inquisition', 'spanish-inquisition'], ['crown-of-castile', 'portuguese-inquisition', 'spanish-inquisition'],
  ['new-kingdom-of-leon', 'portuguese-inquisition', 'spanish-inquisition'], ['new-spain', 'portuguese-inquisition', 'spanish-inquisition'],
  ['viceroyalty-of-peru', 'portuguese-inquisition', 'spanish-inquisition'],
  ['yanhuitlan', 'portuguese-inquisition', '']                                                                               // the bishops' inquisition of the 1540s
];
const ev = (f, v) => new Function(rd(f).replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + v)();
const SD = ev('shared-data.js', '{EMPIRES, PROFILE_KINDS, profileKind}'), P = ev('empire-profiles.js', 'EMPIRE_PROFILES'), G = ev('empire-glance.js', 'GLANCE'), F = ev('empire-facts.js', 'EMPIRE_FACTS');
const L = new Function(rd('encyclopedia-links.js') + ';return ENC_LINKS')(), ENT = rd('encyclopedia-data.js');
const names = new Set(SD.EMPIRES.map(e => e.name)), rescan = new Set(), esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const A0 = rd('scripts/added-entries.json'); let A = A0; const AJ = JSON.parse(A0), nl = A0.includes('\r\n') ? '\r\n' : '\n', keys = Object.keys(AJ);
const insert = (key, rows) => { if (!rows.length) return; const next = keys[keys.indexOf(key) + 1], start = A.indexOf(nl + ' "' + key + '": ['), end = next ? A.indexOf(nl + ' ],' + nl + ' "' + next + '":', start) : A.lastIndexOf(nl + ' ]' + nl + '}');
  if (start < 0 || end < 0) throw new Error(key + ' array not found');
  A = A.slice(0, end) + ',' + nl + rows.map(r => JSON.stringify(r, null, 1).split('\n').map(l => '  ' + l).join(nl)).join(',' + nl) + A.slice(end); };
// 1. drops
for (const [slug, text] of DROPS) { const row = L.e.find(r => r[0] === slug); if (!row || !row[1].some(p => p[0] === text)) { console.log('(already dropped or absent: ' + slug + ' "' + text + '")'); continue; }
  const idx = L.e.indexOf(row); for (const p in L.byEmpire) if (L.byEmpire[p].includes(idx)) rescan.add(p); }
const drops = DROPS.filter(d => !AJ.drop.some(x => x[0] === d[0] && x[1] === d[1])); insert('drop', drops);
// 2. forms: the sections of each profile where the bare name stands (facts, takeaways, events and summary count as "summary")
const texts = n => { const p = P[n] || {}, kind = SD.PROFILE_KINDS[SD.profileKind(SD.EMPIRES.find(e => e.name === n))] || {}, t = {};
  const secs = (kind.sections || [['foundation'], ['socioeconomy'], ['military'], ['governance'], ['impact'], ['decline']]).map(s => s[0]);
  for (const k of secs) if (typeof p[k] === 'string') t[k] = p[k].replace(/<[^>]+>/g, ' ');
  const g = G[n] || {}, f = F[n] || {};
  t.summary = [p.summary || '', Object.values(f).join(' '), (g.t || []).join(' '), g.dyk || '', (g.ev || []).map(e => e[1]).join('. ')].join(' ').replace(/<[^>]+>/g, ' '); return t; };
const forms = [];
for (const [slug, text, mode, profs] of FORMS) {
  if (!ENT.includes('slug:"' + slug + '",')) throw new Error('no entry ' + slug);
  const re = new RegExp('(?<![\\p{L}\\p{N}-])' + (mode ? '[' + text[0].toUpperCase() + text[0].toLowerCase() + ']' + esc(text.slice(1)) : esc(text)) + '(?![\\p{L}\\p{N}-])', 'u'), where = {};
  for (const p of profs) { if (!names.has(p)) throw new Error('no profile ' + p); const t = texts(p), s = Object.keys(t).filter(k => re.test(t[k])); if (s.length) { where[p] = s; rescan.add(p); } else console.log('(the name is not in ' + p + ': ' + text + ')'); }
  if (Object.keys(where).length) forms.push([slug, text, mode, where]);
}
for (const r of forms) console.log('form  ' + r[1].padEnd(15) + ' -> ' + r[0].padEnd(30) + Object.entries(r[3]).map(([p, s]) => p + ': ' + s.join(',')).join(' | '));
insert('forms', forms.filter(r => !AJ.forms.some(x => x[0] === r[0] && x[1] === r[1])));
const AJ2 = JSON.parse(A); if (AJ2.entries.length !== AJ.entries.length || AJ2.fixes.length !== AJ.fixes.length) throw new Error('added-entries.json changed where it should not');
// 3. exclusions and own entries
const tsvAdd = (file, mine, check) => { let t = rd(file); const e = t.includes('\r\n') ? '\r\n' : '\n', have = new Set(t.split(/\r?\n/).map(l => l.split('\t').slice(0, 2).join('\t'))), add = [];
  for (const l of fs.readFileSync(path.join(__dirname, mine), 'utf8').split(/\r?\n/)) { if (!l || l.startsWith('#')) continue; const c = l.split('\t');
    if (!names.has(c[0])) throw new Error(mine + ': no profile ' + c[0]); if (!ENT.includes('slug:"' + c[1] + '",')) throw new Error(mine + ': no entry ' + c[1]);
    rescan.add(c[0]); if (!have.has(c[0] + '\t' + c[1])) add.push(l); }
  if (add.length) { if (!t.endsWith(e)) t += e; t += add.join(e) + e; } console.log(file + ': +' + add.length); return t; };
const EX = tsvAdd('scripts/kinds/link-exclusions.tsv', 'excl.tsv'), SELF = tsvAdd('scripts/kinds/self.tsv', 'self.tsv');
// 4. the state histories
const POL = new Map(JSON.parse(rd('data/polities.json')).nodes.map(n => [n.id, n.n])), files = {}, touched = new Set();
for (const [id, from, to] of STATES) { const f = 'data/states/' + id[0] + '.json'; let t = files[f] || rd(f); const J = JSON.parse(t);
  if (!J[id]) throw new Error('no state ' + id); const a = t.indexOf(JSON.stringify(id) + ':{'), m = /\[\[e:([a-z0-9-]+)\|([^\]]*)\]\]/g; let hit = null, x;
  m.lastIndex = a; while ((x = m.exec(t))) { if (x[1] === from) { hit = x; break; } }
  if (a < 0 || !hit) { console.log('(not linked any more: ' + id + ' -> ' + from + ')'); continue; }
  const out = t.slice(0, hit.index) + (to ? '[[e:' + to + '|' + hit[2] + ']]' : hit[2]) + t.slice(hit.index + hit[0].length), J2 = JSON.parse(out);
  const diff = Object.keys(J2).filter(k => JSON.stringify(J2[k]) !== JSON.stringify(J[k])); if (diff.length !== 1 || diff[0] !== id) throw new Error(id + ': the edit touched ' + diff.join(','));
  files[f] = out; touched.add(from); if (to) touched.add(to); console.log('state ' + id + ': "' + hit[2] + '" ' + (to ? '-> ' + to : 'unlinked')); }
const ES = JSON.parse(rd('data/enc-states.json')), all = {};
for (const f of fs.readdirSync(path.join(R, 'data', 'states'))) all['data/states/' + f] = JSON.parse(files['data/states/' + f] || rd('data/states/' + f));
for (const slug of touched) { const ids = []; for (const f in all) for (const id in all[f]) if (['o', 'r', 'e'].some(k => (all[f][id][k] || '').includes('[[e:' + slug + '|'))) ids.push(id);
  const old = (ES.m[slug] || [0, []])[1].filter(r => ids.includes(r[0])), list = old.concat(ids.filter(id => !old.some(r => r[0] === id)).map(id => [id, POL.get(id) || id])).slice(0, 12);
  console.log('enc-states ' + slug + ': ' + ((ES.m[slug] || [0])[0]) + ' -> ' + ids.length); if (ids.length) ES.m[slug] = [ids.length, list]; else delete ES.m[slug]; }
console.log(drops.length + ' drops, ' + forms.length + ' forms, ' + rescan.size + ' profiles to scan again');
if (WRITE) {
  fs.writeFileSync(path.join(R, 'scripts/added-entries.json'), A); fs.writeFileSync(path.join(R, 'scripts/kinds/link-exclusions.tsv'), EX); fs.writeFileSync(path.join(R, 'scripts/kinds/self.tsv'), SELF);
  for (const f in files) fs.writeFileSync(path.join(R, f), files[f]);
  if (touched.size) fs.writeFileSync(path.join(R, 'data/enc-states.json'), JSON.stringify(ES).replace(/'/g, '\\u0027'));
  fs.writeFileSync(path.join(__dirname, 'rescan.txt'), [...rescan].sort().join('\n') + '\n'); console.log('written');
}
