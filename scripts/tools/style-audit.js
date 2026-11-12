// Stock phrases and habits that make prose read as overwritten, counted in every text the site shows:
//   node scripts/tools/style-audit.js [--list=<source>] [--top=N] [--tsv=out.tsv]
// Sources: the encyclopedia's descriptions and longer texts, the profiles (sections, summaries, takeaways, did-you-knows,
// key events, teasers), the state histories, the explorer's point notes, the day events, songs, speeches, social
// ladders, essays, reading paths, the Kids corner. Prints, per source, the texts, the words, the hits per 1,000 words
// and the commonest phrases; --list prints every hit of one source with its sentence; --tsv writes source, key, phrase,
// sentence for all.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (f, v) => new Function(rd(f).replace(/^\s*const /gm, 'var ') + ';return ' + v)();
const argv = process.argv.slice(2), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
// [label, regex]: phrases a careful editor would cut or replace
const TELLS = [
  ['testament to', /\b(?:a|as a|stands? as a|bears?|bore) testament to\b|\btestament to\b/i], ['tapestry', /\btapestr(?:y|ies)\b(?! of Bayeux)/i], ['delve', /\bdelv(?:e|es|ed|ing)\b/i],
  ['pivotal', /\bpivotal\b/i], ['crucial role', /\b(?:crucial|key|vital|significant|central|important|major|decisive|leading|instrumental) role\b/i], ['played a role', /\bplay(?:ed|s|ing)? an? [a-z-]+ role\b/i],
  ['underscore', /\bunderscor(?:e|es|ed|ing)\b/i], ['showcase', /\bshowcas(?:e|es|ed|ing)\b/i], ['boasts', /\bboast(?:s|ed|ing)?\b/i], ['vibrant', /\bvibrant\b/i], ['rich (history|heritage|culture)', /\brich (?:cultural |historical )?(?:history|heritage|culture|tradition|legacy|tapestry)\b/i],
  ['enduring legacy', /\b(?:enduring|lasting|indelible|profound) (?:legacy|mark|impact|influence|impression)\b/i], ['left a mark', /\bleft an? [a-z-]+ (?:mark|imprint|legacy)\b/i], ['landscape (figurative)', /\b(?:political|cultural|religious|intellectual|social|economic|geopolitical|literary|artistic|strategic) landscape\b/i],
  ['multifaceted', /\bmultifaceted\b/i], ['intricate', /\bintricate(?:ly)?\b/i], ['realm (figurative)', /\bin the realm of\b|\brealm of (?:ideas|politics|art|science|culture|religion|thought)\b/i], ['foster', /\bfoster(?:ed|s|ing)?\b/i], ['bolster', /\bbolster(?:ed|s|ing)?\b/i], ['garner', /\bgarner(?:ed|s|ing)?\b/i],
  ['not only … but', /\bnot only\b[^.]{3,90}\bbut (?:also\b)?/i], ['worth noting', /\b(?:it is|it's) (?:worth|important to) (?:noting|note|remember(?:ing)?)\b|\bnotably\b/i], ['in conclusion', /\b(?:in conclusion|in summary|overall|ultimately|in essence|all in all),/i],
  ['moreover', /(?:^|[.;] )(?:Moreover|Furthermore|Additionally|In addition|Consequently|Thus|Hence|Indeed|Importantly),/], ['serves as', /\bserv(?:es|ed|ing) as an? (?:reminder|symbol|testament|beacon|cornerstone|model|bridge|backdrop|catalyst|window|foundation)\b/i],
  ['beacon / cornerstone', /\b(?:beacon of|cornerstone of|bedrock of|linchpin|crucible|melting pot|crossroads of civilisations?|cradle of)\b/i], ['at the heart of', /\bat the (?:very )?heart of\b/i], ['profound', /\bprofound(?:ly)?\b/i], ['seamless', /\bseamless(?:ly)?\b/i],
  ['shaped the course', /\bshap(?:ed|ing|es) the (?:course|trajectory|destiny|future|contours) of\b/i], ['paved the way', /\bpav(?:ed|ing|es) the way\b|\blaid the (?:groundwork|foundations?) for\b|\bset the stage for\b/i], ['stands as', /\b(?:stands?|stood|remains?|endures?) as (?:a|an|one of|perhaps) /i],
  ['one of the most', /\b(?:perhaps |arguably )?(?:one|among) of the (?:most|greatest|largest|finest|earliest)\b|\barguably\b|\bperhaps the most\b/i], ['remarkable', /\b(?:remarkabl[ey]|extraordinar(?:y|ily)|unparalleled|unprecedented|formidable|renowned|iconic|legendary(?! (?:founder|king|first|ancestor|figure|hero|queen|ruler|account|origin))|awe-inspiring|breathtaking|stunning|magnificent(?! (?:\(|,))|illustrious|storied)\b/i],
  ['complex interplay', /\b(?:complex|delicate|dynamic) (?:interplay|balance|web|relationship)\b|\binterplay (?:of|between)\b/i], ['navigate', /\bnavigat(?:e|ed|es|ing) (?:the|a|its|their|between)\b(?! (?:river|sea|coast|strait|channel|waters|ocean))/i], ['era of', /\b(?:ushered in|heralded|marked the (?:beginning|dawn|end) of an?) (?:new |golden )?(?:era|age|chapter)\b/i],
  ['reflect / highlight', /\b(?:highlight(?:s|ed|ing)?|exemplif(?:y|ies|ied)|epitomi[sz]e[sd]?|encapsulat(?:e|es|ed)|embod(?:y|ies|ied))\b/i], ['today, …', /\b(?:Today|To this day), (?:it|the|its|they|he|she) (?:remains?|continues?|stands?|is remembered)\b/], ['continues to', /\bcontinues? to (?:inspire|resonate|shape|fascinate|captivate|influence|echo)\b/i],
  ['em dash', /\s—\s|—/], ['triple list of abstractions', /\b[a-z]+(?:ity|ism|tion|ance|ence|ment)s?, [a-z]+(?:ity|ism|tion|ance|ence|ment)s?,? and [a-z]+(?:ity|ism|tion|ance|ence|ment)s?\b/i]
];
module.exports = { TELLS };
if (require.main !== module) return;
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const src = {};   // name -> [[key, text]]
const add = (n, k, t) => { t = strip(t); if (t) (src[n] = src[n] || []).push([k, t]); };
for (const e of ev('encyclopedia-data.js', 'ENCYCLOPEDIA')) add('entries', e.slug, e.desc);
try { const M = JSON.parse(rd('scripts/entry-more.json')); for (const k in M) add('entries, longer texts', k, M[k].map(s => s[1].join(' ')).join(' ')); } catch (e) {}
const P = ev('empire-profiles.js', 'EMPIRE_PROFILES'), G = ev('empire-glance.js', 'GLANCE'), SD = ev('shared-data.js', '{EMPIRES,EMPIRE_INFO}'), kind = {}; for (const e of SD.EMPIRES) kind[e.name] = e.kind || (e.id ? 'state' : 'empire');
for (const n in P) { const k = 'profiles: ' + (kind[n] || '?'); for (const s in P[n]) if (s !== 'references' && typeof P[n][s] === 'string') add(k, n + ' / ' + s, P[n][s]); }
for (const n in G) { const k = 'profiles: ' + (kind[n] || '?'); add(k, n + ' / takeaways', (G[n].t || []).join(' ')); add(k, n + ' / dyk', G[n].dyk); add(k, n + ' / events', (G[n].ev || []).map(x => x[1]).join('. ')); }
for (const n in SD.EMPIRE_INFO) add('profiles: ' + (kind[n] || '?'), n + ' / teaser', SD.EMPIRE_INFO[n]);
for (const f of fs.readdirSync(path.join(R, 'data', 'states'))) { const o = JSON.parse(rd('data/states/' + f)); for (const id in o) add('state histories', id, [o[id].t, o[id].o, o[id].r, o[id].e].join(' ')); }
try { const PD = ev('point-descs.js', 'POINT_DESCS'); for (const n in PD) add('explorer point notes', n, Object.values(PD[n]).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' ')); } catch (e) {}
try { for (const d of JSON.parse(rd('data/history.json'))) for (const x of (d.events || [])) add('day events', (d.date || d.k || '') + ' ' + x.year, x.title + '. ' + x.description); } catch (e) { try { const H = JSON.parse(rd('data/history.json')); for (const k in H) for (const x of (H[k].events || H[k] || [])) add('day events', k + ' ' + x.year, x.title + '. ' + x.description); } catch (e2) {} }
for (const f of fs.readdirSync(path.join(R, 'scripts', 'songs'))) if (f.endsWith('.txt')) { const t = rd('scripts/songs/' + f), m = t.match(/== story\s*\n([\s\S]*?)(?=\n== )/), m2 = t.match(/== meaning\s*\n([\s\S]*?)(?=\n== )/); add('songs', f.slice(0, -4), (m ? m[1] : '') + ' ' + (m2 ? m2[1] : '')); }
try { for (const s of ev('speeches-data.js', 'SPEECHES')) add('speeches', s.slug, [s.setting, s.followed, s.context, s.after].filter(Boolean).join(' ')); } catch (e) {}
for (const f of fs.readdirSync(path.join(R, 'scripts', 'societies'))) if (f.endsWith('.txt')) add('social ladders', f.slice(0, -4), rd('scripts/societies/' + f).split('\n').filter(l => /^(text|rise|you|intro|kid):|^[A-Z][a-z].{80,}/.test(l)).join(' '));
for (const f of fs.readdirSync(path.join(R, 'scripts', 'essays'))) if (/^\d\d-.*\.html$/.test(f)) add('essays', f, rd('scripts/essays/' + f).replace(/<!--[\s\S]*?-->/, ''));
try { for (const p of ev('reading-paths.js', 'READING_PATHS')) add('reading paths', p.slug || p.title, [p.tagline, p.intro].concat((p.steps || []).map(s => s.why)).filter(Boolean).join(' ')); } catch (e) {}
try { add('kids corner', 'kids-corner.tsv', rd('scripts/kids-corner.tsv').split('\n').map(l => l.split('\t').slice(1).join(' ')).join(' ')); } catch (e) {}
for (const f of ['index', 'about', 'research', 'start', 'dataset', 'contributors', 'community', 'support', 'kids']) try { add('hand pages', f, rd(f).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ')); } catch (e) {}

const sentence = (t, i) => { const a = Math.max(t.lastIndexOf('. ', i) + 2, 0), b = t.indexOf('. ', i); return t.slice(a, b < 0 ? t.length : b + 1); };
const LIST = opt('list'), TOP = +opt('top') || 8, rows = [];
console.log('source'.padEnd(30) + 'texts'.padStart(7) + 'words'.padStart(10) + 'hits'.padStart(8) + ' /1000w  with a hit  commonest');
for (const n of Object.keys(src)) {
  let words = 0, hits = 0, withHit = 0; const by = {};
  for (const [k, t] of src[n]) {
    words += t.split(' ').length; let any = false;
    for (const [lab, rx] of TELLS) { const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'); let m; while ((m = g.exec(t))) { hits++; any = true; by[lab] = (by[lab] || 0) + 1; rows.push([n, k, lab, sentence(t, m.index)]); if (m.index === g.lastIndex) g.lastIndex++; } }
    if (any) withHit++;
  }
  console.log(n.padEnd(30) + String(src[n].length).padStart(7) + String(words).padStart(10) + String(hits).padStart(8) + (1000 * hits / (words || 1)).toFixed(2).padStart(7) + String(withHit).padStart(9) + '   ' + Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, TOP).map(x => x[0] + ' ' + x[1]).join(', '));
}
if (LIST) for (const r of rows.filter(r => r[0] === LIST)) console.log(r[1] + '\t' + r[2] + '\t' + r[3].slice(0, 260));
if (opt('tsv')) fs.writeFileSync(opt('tsv'), rows.map(r => r.join('\t')).join('\n') + '\n');
