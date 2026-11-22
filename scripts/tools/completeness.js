// What each page lacks beside its peers (22 Nov 2026; the user: "find the missing pieces, and write them in").
//   node scripts/tools/completeness.js [--tsv=out.tsv] [--list=<gap>]
// Counts, per kind of page, the gaps a reader would notice: a profile without references, section pictures, an emblem,
// a home picture, five key events, a fact or a section; an entry of a person or event without dates, a well-known entry
// without a picture or without the longer text; a state history without a text or a picture; a song without words or a
// performance; a speech without its text. --list prints the pages of one gap (its label as printed); --tsv writes all.
// It only reads; each gap is filled by its own pipeline (see CLAUDE.md, "Editorial round").
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8'), has = f => fs.existsSync(path.join(R, f));
const ev = (f, v) => new Function(rd(f).replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + v)();
const argv = process.argv.slice(2), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const rows = [], gap = (kind, what, id, note) => rows.push([kind + ': ' + what, id, note || '']);
// profiles
const SD = ev('shared-data.js', '{EMPIRES, EMPIRE_INFO, PROFILE_KINDS}'), P = ev('empire-profiles.js', 'EMPIRE_PROFILES'), G = ev('empire-glance.js', 'GLANCE'), F = ev('empire-facts.js', 'EMPIRE_FACTS');
let SI = {}; try { SI = ev('empire-section-images.js', 'SECTION_IMAGES'); } catch (e) {}
let HP = {}; try { HP = ev('home-data.js', 'HOME_PICS'); } catch (e) {}
const hideHome = new Set(), noHome = new Set(); for (const l of rd('scripts/home-pictures.tsv').split(/\r?\n/)) { const c = l.split('\t'); if (c[1] === '-') noHome.add(c[0]); if (c.slice(2).includes('hide')) hideHome.add(c[0]); }
const POL = ['foundation', 'governance', 'socioeconomy', 'military', 'decline', 'impact'];
for (const e of SD.EMPIRES) { const n = e.name, kind = e.kind || (e.id ? 'state profile' : 'empire'), k = 'profile (' + kind + ')', p = P[n] || {}, g = G[n] || {};
  const secs = e.kind ? (SD.PROFILE_KINDS[e.kind].sections || []).map(s => Array.isArray(s) ? s[0] : s.key || s) : POL;
  for (const s of secs) if (!p[s] || String(p[s]).replace(/<[^>]+>/g, '').trim().length < 200) gap(k, 'a section missing or under 200 characters', n, s);
  if (!(p.references || []).length) gap(k, 'no references', n);
  if (!p.summary) gap(k, 'no summary', n);
  if ((g.ev || []).length < 5) gap(k, 'fewer than five key events', n, String((g.ev || []).length));
  if ((g.t || []).length < 3) gap(k, 'fewer than three takeaways', n); if (!g.dyk) gap(k, 'no "Did you know?"', n);
  const fk = e.kind ? (SD.PROFILE_KINDS[e.kind].facts || []).map(r => r[0]) : ['capital', 'founder']; for (const key of fk) if (!(F[n] || {})[key]) gap(k, 'a fact missing', n, key);
  if (!SI[n] || !Object.keys(SI[n]).length) gap(k, 'no section pictures', n); else if (Object.keys(SI[n]).length < 3) gap(k, 'section pictures in fewer than three sections', n, Object.keys(SI[n]).join(','));
  if (!has('logos/' + n + '.png')) gap(k, 'no emblem', n);
  if (!HP[n] && !noHome.has(n)) gap(k, 'no home picture', n);
}
// entries
const ENC = ev('encyclopedia-data.js', 'ENCYCLOPEDIA'); let W = {}; try { for (const l of rd('scripts/entry-wikidata.tsv').split(/\r?\n/)) { const c = l.split('\t'); if (c[0] && c[0][0] !== '#') W[c[0]] = c; } } catch (e) {}
let MORE = {}; try { MORE = require('../entries/more-store').readAll(); } catch (e) {}
const led = {}; try { for (const l of rd('scripts/entries/more-ledger.tsv').split(/\r?\n/)) { const c = l.split('\t'); if (c[0]) led[c[0]] = c; } } catch (e) {}
const weight = {}; try { const S = ev('search-index.js', 'SEARCH_INDEX'); for (const r of S) weight[r[0]] = +r[4] || 0; } catch (e) {}
for (const e of ENC) { const w = weight[e.slug] || 0, k = 'entry';
  if ((e.type === 'person' || e.type === 'event') && !e.dates) gap(k, 'a ' + e.type + ' without dates', e.slug, 'weight ' + w);
  if (!e.img && w >= 5) gap(k, 'well known (weight 5+) without a picture', e.slug, 'weight ' + w);
  if (!MORE[e.slug] && w >= 4) gap(k, 'weight 4+ without the longer text', e.slug, (led[e.slug] ? led[e.slug].slice(1).join(' ') : 'no confirmed article'));
  if (e.desc.length < 180) gap(k, 'a description under 180 characters', e.slug, String(e.desc.length));
}
// state histories
const POLS = JSON.parse(rd('data/polities.json')), ST = {}; for (const f of fs.readdirSync(path.join(R, 'data', 'states'))) Object.assign(ST, JSON.parse(rd('data/states/' + f)));
let GEO = {}; try { GEO = JSON.parse(rd('data/geo.json')); } catch (e) {}
for (const n of POLS.nodes) { if (n.p) continue; const s = ST[n.id], k = 'state';
  if (!s || !s.t) gap(k, 'no text', n.id, n.n); else { for (const key of ['o', 'r', 'e']) if (!s[key]) gap(k, 'a field of the history missing', n.id, key); if (!s.img) gap(k, 'no picture', n.id); }
  if (!GEO[n.id]) gap(k, 'no place on the atlas', n.id); else if (GEO[n.id][2] === 9) gap(k, 'only an approximate place', n.id);
}
// songs and speeches
try { const SG = JSON.parse(rd('scripts/songs/songs.json')); for (const s of SG) { if (!s.video) gap('song', 'no performance', s.slug); if (s.pd && !s.text && !s.withheld) gap('song', 'public-domain words not printed', s.slug, s.gap ? String(s.gap).slice(0, 80) : ''); } } catch (e) {}
try { const SP = ev('speeches-data.js', 'SPEECHES'); for (const s of SP) if (!has('data/speech-texts/' + s.slug + '.json')) gap('speech', 'no text', s.slug); } catch (e) {}
// report
const by = {}; for (const r of rows) by[r[0]] = (by[r[0]] || 0) + 1;
for (const k of Object.keys(by).sort()) console.log(String(by[k]).padStart(7) + '  ' + k);
if (opt('list')) for (const r of rows.filter(r => r[0] === opt('list'))) console.log(r[1] + (r[2] ? '\t' + r[2] : ''));
if (opt('tsv')) fs.writeFileSync(opt('tsv'), rows.map(r => r.join('\t')).join('\n') + '\n');
