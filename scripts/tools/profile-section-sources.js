// E8 of the editorial round (22 Nov 2026): the works behind each section of a profile. For a profile whose subject has
// a confirmed English Wikipedia article, this reads the article's wikitext, finds which works it cites in which of its
// own sections (cite book templates in its notes, and short citations {{sfn|Last|Year}} resolved against its
// bibliography), keeps scholarly publishers only, and gives each section of the profile the works cited in the
// article's matching sections (matched by heading: "Military", "Army" and "Wars" serve a state's Military section).
//   node scripts/tools/profile-section-sources.js [--max=N] [--out=<file>] [--report] [profile names …]
// The article: the profile's own entry (ENC_LINKS.self, else the entry of its slug or name) where scripts/entry-wikidata.tsv
// says "same"; else the article of the profile's own name, accepted only when it is no disambiguation page and its
// opening names the profile's first and last years (a namesake seldom does). The wikitext is cached in
// %LOCALAPPDATA%\epoch-tools\refs-cache (shared with entry-sources.js; one request every 2 s).
// Writes scripts/profile-section-sources.js: SECTION_SOURCES {profile name: {t: article title, s: {section key:
// {h: [the article's headings], w: [up to four works]}}}}, which generator.html shows folded under each section
// ("Sources for this section"), hidden in Kids mode. A section with no such works shows nothing.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, CACHE = path.join(process.env.LOCALAPPDATA || require('os').tmpdir(), 'epoch-tools', 'refs-cache');
fs.mkdirSync(CACHE, { recursive: true });
const OUT = arg('out') || path.join(R, 'scripts', 'profile-section-sources.js');
const sd = fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8');
const SD = new Function(sd.replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, PROFILE_KINDS, toSlug, profileSpan}')();
const EL = new Function(fs.readFileSync(path.join(R, 'encyclopedia-links.js'), 'utf8').replace(/^\s*const /gm, 'var ') + ';return ENC_LINKS')();
const same = {}, byTitle = {};
for (const l of fs.readFileSync(path.join(R, 'scripts', 'entry-wikidata.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[0] && c[0][0] !== '#' && c[4] === 'same' && c[1]) { same[c[0]] = c[1]; byTitle[c[1].toLowerCase()] = c[0]; } }

// ---- wikitext parsing (as scripts/tools/entry-sources.js) ----
const clean = s => String(s || '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/''+/g, '').replace(/&nbsp;/g, ' ').replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1').replace(/\s+/g, ' ').trim();
function templates(text) { const out = []; let d = 0, st = -1; for (let i = 0; i < text.length - 1; i++) { if (text[i] === '{' && text[i + 1] === '{') { if (d === 0) st = i; d++; i++; } else if (text[i] === '}' && text[i + 1] === '}') { d--; i++; if (d === 0 && st >= 0) { out.push(text.slice(st + 2, i - 1)); st = -1; } if (d < 0) d = 0; } } return out; }
function fields(t) { const f = { _pos: [] }; let d = 0, cur = ''; const parts = []; for (let i = 0; i < t.length; i++) { const c = t[i], n = t[i + 1]; if ((c === '{' && n === '{') || (c === '[' && n === '[')) { d++; cur += c + n; i++; } else if ((c === '}' && n === '}') || (c === ']' && n === ']')) { d--; cur += c + n; i++; } else if (c === '|' && d === 0) { parts.push(cur); cur = ''; } else cur += c; } parts.push(cur);
  f._name = parts[0].trim().toLowerCase().replace(/_/g, ' '); for (const p of parts.slice(1)) { const k = p.indexOf('='); if (k > 0 && /^[\w\s-]+$/.test(p.slice(0, k))) f[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim(); else f._pos.push(p.trim()); } return f; }
const SCHOLARLY = /Universit|Univ\.|\bUP\b|Brill|Routledge|De Gruyter|Springer|Palgrave|Wiley|Blackwell|Eisenbrauns|Harrassowitz|Peeters|Academic|Akademi|Institut|Society|Museum|Longman|Clarendon|Macmillan|Motilal|Asiatic|Variorum|Ashgate|Boydell|Brepols|Scholars|Curzon|Hakluyt|Thames (&|and) Hudson|Smithsonian|Dumbarton|School of|College|Académie|Accademia|Verlag|Böhlau|Franz Steiner|Archaeopress|Oxbow|Equinox|ABC-CLIO|Greenwood|Praeger|Westview|Rowman|Scarecrow|M\.? ?E\.? Sharpe|Hackett|Mouton|Benjamins|Presses|Editions du CNRS|Publications de|Manohar|Munshiram|Orient (Longman|Blackswan)|Sage\b|Zed Books|Hurst|I\.? ?B\.? ?Tauris|Bloomsbury|Continuum|Berghahn|Karthala|Maisonneuve|Geuthner|Mohr|Vandenhoeck|Reichert|Aris (&|and) Phillips|Osprey|Tempus|Pen (&|and) Sword|Sutton|Batsford|Weidenfeld|Faber|Allen (&|and) Unwin|Methuen|Edward Arnold|Duckworth|Kegan Paul|John Murray|Norton|Knopf|Basic Books|Free Press|Viking|Penguin Classics|Loeb|Library of|Archaeological Survey|UNESCO/;
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const good = x => { if (/, which was|of course/i.test(x) || x.length > 190) return false; const pub = (x.match(/\(([^()]*), \d{4}\)$/) || [])[1] || ''; return SCHOLARLY.test(pub) && !/Cancer|Britannica/i.test(pub) && !/\bnovel\b|\(PhD\)|\bthesis\b|dissertation|Wikipedia|Journal of|^Society,|, \d{4}, \d{4}\)/i.test(x) && x.length < 230; };
// a book template as "Author, Title (Publisher, year)" with the key its short citations use (last name and year)
function book(f) {
  if (!(/^(cite book|citation|cite encyclopedia)$/.test(f._name) || /^cite book/.test(f._name))) return null;
  const last = clean(f.last || f.last1 || f['author-last'] || f['author1-last'] || f.surname || f.surname1 || ''), first = clean(f.first || f.first1 || f['author-first'] || f['author1-first'] || f.given || f.given1 || '');
  const auth = clean(f.author || f.author1 || '') || (last ? (first ? first + ' ' + last : last) : '') || (clean(f['editor-last'] || f['editor1-last'] || f.editor || '') ? clean((f['editor-first'] || f['editor1-first'] || '') + ' ' + (f['editor-last'] || f['editor1-last'] || f.editor || '')).trim() + ' (ed.)' : '');
  const title = clean(f.title), pub = clean(f.publisher), year = (clean(f.year || f.date || '').match(/\b\d{4}\b/) || [])[0];
  if (!auth || !title || !pub || !year || f.chapter || f.contribution || f.journal || /\bet al\b|^\W|[<>{}|=]/.test(auth + title + pub)) return null;
  const ln = (last || auth.replace(/ \(ed\.\)$/, '').split(' ').pop()).toLowerCase();
  return { line: auth + ', ' + title + ' (' + pub + ', ' + year + ')', key: ln + '|' + year };
}
const SKIP = /^(references?|notes?|footnotes|citations?|bibliography|sources|works cited|further reading|external links|see also|general (and cited )?sources|secondary sources|primary sources|literature|explanatory notes|gallery)\b/i;
const POP = /popular culture|fiction|film|television|media\b|novels?|adaptations|portrayals|video games|games|in music/i;
function sections(wt) {   // [{h: [level-2 heading, level-3 heading], text}]
  const out = []; let h2 = '', h3 = '', buf = [];
  const flush = () => { if (h2 && buf.length) out.push({ h: [h2, h3].filter(Boolean), text: buf.join('\n') }); buf = []; };
  for (const line of wt.split('\n')) { const m = line.match(/^(={2,4})\s*(.+?)\s*\1\s*$/);
    if (m) { flush(); const lv = m[1].length, t = clean(m[2]); if (lv === 2) { h2 = t; h3 = ''; } else if (lv === 3) h3 = t; continue; }
    buf.push(line); }
  flush(); return out.filter(s => !SKIP.test(s.h[0]) && !s.h.some(x => POP.test(x)));
}
// the works a stretch of wikitext cites: full templates in it, and short citations found in the article's bibliography
function cited(text, bib) {
  const count = new Map(); const add = line => count.set(line, (count.get(line) || 0) + 1);
  const walk = t => { for (const x of templates(t)) { const f = fields(x); const b = book(f);
    if (b) add(b.line);
    else if (/^(sfn|sfnp|harvnb|harv|harvp|harvtxt|sfnref)$/.test(f._name)) { const yi = f._pos.findIndex(p => /^\d{4}[a-z]?$/.test(p)); if (yi > 0) { const k = clean(f._pos[0]).toLowerCase() + '|' + f._pos[yi].slice(0, 4); if (bib[k]) add(bib[k]); } }
    else if (x.length > 40) walk(x); } };
  walk(text); return count;
}
// the headings of an article that serve each section of a kind's profile
const KW = {
  polity: { foundation: /origin|foundation|founding|formation|establish|early|rise\b|background|emergence|unification|beginning|prehistor/, socioeconomy: /econom|society|social|trade|commerc|agricultur|demograph|population|daily life|industr|currency|coinage|taxation|slavery|class\b|culture/, military: /militar|army|navy|warfare|armed forces|\bwars?\b|conquests?|campaigns?|expansion|defen[cs]e/, governance: /govern|administ|politic|\blaw|legal|bureaucra|institution|constitution|monarch|provinces|divisions|succession|\bcourt\b/, impact: /legacy|influence|foreign|diplomac|relations|religio|\barts?\b|architectur|science|literature|language|historiograph/, decline: /decline|\bfall\b|collapse|dissolution|\bend\b|downfall|aftermath|crisis|disintegration|partition|last years|abolition/ },
  government: { works: /structure|institution|characteristic|features|function|types?\b|forms?\b|definition|concept|mechanism|powers?\b/, origins: /origin|etymolog|early|ancient|antiquity|emergence/, history: /history|medieval|modern|century|\bera\b|examples|development/, strengths: /advantage|support|argument|justification|benefit|theory/, weaknesses: /critic|disadvantage|problem|opposition|failure|objection/, legacy: /legacy|influence|contemporary|today|current/ },
  culture: { origins: /origin|chronolog|periodi[sz]|history|formation|discover|research|genetic|emergence|early/, society: /society|social|settlement|econom|subsistence|agricultur|daily|population|demograph|lifestyle|political|organi[sz]ation|diet|housing/, beliefs: /religio|belief|burial|ritual|mytholog|cosmolog|funerary|spiritual|worship/, arts: /\barts?\b|architectur|pottery|ceramic|metallurg|material culture|technolog|craft|writing|script|language|music|textile|tools|science/, exchange: /trade|exchange|contact|relations|warfare|expansion|migration|network|neighbo|spread|colon/, legacy: /legacy|decline|collapse|\bend\b|aftermath|descendant|modern|historiograph|today|contemporary|revival/ },
  ideology: { origins: /origin|etymolog|history|early|background|precursor|roots|emergence/, ideas: /principle|ideas?\b|theory|doctrine|philosoph|tenet|concept|belief|core|themes|economic|views/, spread: /variant|types?\b|school|branch|movement|spread|tradition|by country|region|currents|forms/, power: /government|\bstate|in power|practice|regime|implementation|\brule|parties|countries/, critiques: /critic|opposition|debate|controvers|objection|analysis/, legacy: /legacy|influence|contemporary|today|modern|impact|21st/ },
  work: { origins: /background|origin|context|histor|setting|sources/, content: /content|synopsis|plot|summary|structure|description|themes|\btext\b|architectur|layout|design|features|teachings/, making: /composition|author|construction|building|creation|writing|compilation|\bdat(e|ing)\b|redaction|production|materials|technique/, reception: /reception|interpretation|commentar|criticism|influence|readers|translations?|scholarship|exegesis|significance/, survival: /manuscript|preservation|transmission|restoration|rediscover|conservation|excavat|damage|editions?|textual|survival|later history|archaeolog/, legacy: /legacy|cultural|adaptations|modern|tourism|heritage|impact/ },
  life: { early: /early|birth|youth|childhood|family|background|education|origins/, rise: /\brise\b|career|accession|ascen|election|coming to power|consolidation|early (reign|career)/, deeds: /reign|\brule\b|presiden|works?\b|achievement|policies|reforms|conquests?|teachings?|ministry|government|administration|thought|philosoph|discover|campaigns?/, opponents: /opposition|critic|controvers|rival|enemies|conflict|rebellion|trial|scandal/, last: /death|last\b|later|final|exile|illness|assassination|succession|burial|retirement/, legacy: /legacy|influence|memor|historiograph|reputation|honou?rs|commemorat|veneration|assessment|impact/ },
  movement: { background: /background|origin|causes|context|prelude|precursor|roots|early/, aims: /aims|goals|ideolog|demands|principles|program|objectives|beliefs|philosoph/, events: /history|events|course|timeline|campaign|phases|outbreak|development|protests?|\bwar\b|uprising|revolution/, people: /leaders|figures|people|participants|organi[sz]ations|members|women|supporters/, outcomes: /outcome|result|aftermath|consequence|effects|suppression|\bend\b|reforms|achievements|defeat|victory/, legacy: /legacy|influence|impact|historiograph|memory|commemorat|assessment|significance/ },
  religion: { origins: /origin|history|founder|founding|early|emergence|background|etymolog/, beliefs: /belief|practice|theolog|doctrine|worship|ritual|ethic|cosmolog|deit|\bgods?\b|festival|prayer/, texts: /scripture|\btexts?\b|canon|literature|teachers|prophets?|writings/, spread: /spread|expansion|distribution|demograph|mission|diaspora|geograph|by country|adherents/, community: /community|society|organi[sz]ation|denomination|\bsects?\b|branches|schools|institution|social|monastic|temples?|clergy/, legacy: /legacy|influence|decline|modern|contemporary|revival|criticism|relations|impact|today/ },
  language: { origins: /origin|history|classification|etymolog|early|prehistory|development|periodi/, structure: /phonolog|grammar|writing|script|orthograph|morpholog|syntax|vocabular|alphabet|sounds|lexicon/, speakers: /speakers|distribution|geograph|status|dialects?|varieties|demograph|official|usage/, literature: /literature|\btexts\b|corpus|education|learning|scholarship|inscriptions|poetry/, change: /change|descend|evolution|decline|influence on|later|revival|extinction|daughter|contact/, legacy: /legacy|influence|loanwords|modern|decipher|today|impact/ },
  city: { origins: /origin|foundation|founding|early|prehistor|antiquity|ancient|etymolog|toponym|\bnames?\b/, growth: /golden|growth|medieval|classical|imperial|econom|trade|population|demograph|expansion|capital/, rulers: /\brule\b|period|\bera\b|dynast|empire|caliphate|kingdom|ottoman|roman|byzantine|colonial|conquest|govern|administration/, life: /culture|society|religio|education|districts|quarters|architectur|communities|daily|cityscape/, crises: /siege|sack|plague|fire|earthquake|\bwars?\b|disaster|decline|destruction|invasion|massacre|flood/, legacy: /legacy|heritage|landmark|monuments|modern|today|contemporary|unesco|preservation|significance/ },
  battle: { background: /background|prelude|context|causes|origins|campaign|strategic|situation|preparation/, forces: /forces|armies|opposing|order of battle|strength|deployment|commanders|numbers|composition|plans?\b|dispositions/, course: /battle|engagement|fighting|assault|siege|attack|course|phase|\bday\b|charge|combat|action/, aftermath: /aftermath|casualties|losses|consequences|results|retreat|pursuit|prisoners|outcome/, sources: /sources|historiograph|accounts|archaeolog|location|\bsite\b|debate|dispute|evidence|analysis|controvers|chronicle/, legacy: /legacy|significance|memory|commemorat|cultural|monuments|assessment|impact|remembrance|depictions/ },
};
async function wikitext(key, title) {
  const cf = path.join(CACHE, key + '.json'); if (fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  let c = null;
  for (let i = 0; i < 4 && !c; i++) { try { const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&prop=wikitext|properties&page=' + encodeURIComponent(title), { headers: UA });
    if (r.ok) { const j = await r.json(); if (j.parse && j.parse.wikitext) c = { t: j.parse.title, d: new Date().toISOString().slice(0, 10), w: j.parse.wikitext['*'], dis: (j.parse.properties || []).some(p => p.name === 'disambiguation') }; else if (j.error) c = { t: title, d: new Date().toISOString().slice(0, 10), w: '' }; } } catch (e) {}
    if (!c) await sleep(8000 * (i + 1)); }
  if (c) { fs.writeFileSync(cf, JSON.stringify(c)); await sleep(2000); }
  return c;
}
(async () => {
  const names = process.argv.slice(2).filter(a => !a.startsWith('--')); let list = SD.EMPIRES.filter(e => !names.length || names.includes(e.name)); if (arg('max')) list = list.slice(0, +arg('max'));
  const out = {}, rep = []; let nArt = 0, nProf = 0, nSec = 0, guessed = 0, refused = 0;
  for (const e of list) {
    const kind = e.kind || 'polity', kw = KW[kind]; if (!kw) continue;
    let slug = EL.self && EL.self[e.name]; if (!(slug && same[slug])) { slug = SD.toSlug(e.name); if (!same[slug]) slug = byTitle[e.name.toLowerCase()]; }
    let c, by = 'entry';
    if (slug && same[slug]) c = await wikitext(slug, same[slug]);
    else { by = 'name';   // "Jin dynasty (1115-1234)" is "Jin dynasty (1115–1234)" there; without its years the name is another subject's
      c = await wikitext('pn-' + SD.toSlug(e.name), e.name.replace(/\((\d+)-(\d+)\)$/, '($1–$2)'));
      if (c && c.w) { const head = c.w.slice(0, 9000), yr = y => new RegExp('\\b' + Math.abs(y) + '\\b').test(head);
        // the article must bear the profile's own name, or name its first and last years at its head: a namesake
        // seldom does (approximate years prove nothing, and a state still living has no last year)
        const sp = SD.profileSpan(e), y0 = sp[0], y1 = sp[1] >= 2025 ? null : sp[1], firmS = !e.circa && y0 != null, firmE = !e.endCirca && y1 != null;
        const nm = s => fold(s).replace(/[–—-]/g, '-').replace(/z/g, 's'), yearsOk = firmS && yr(y0) && (y1 == null || (firmE && yr(y1)));
        if (c.dis || /\{\{\s*(disambiguation|dab|hndis|geodis)\b/i.test(c.w) || !(nm(c.t) === nm(e.name) || yearsOk)) { refused++; rep.push('refused\t' + e.name + '\t' + c.t); continue; } guessed++; } }
    if (!c || !c.w) continue; nArt++;
    const bib = {}; (function walk(t) { for (const x of templates(t)) { const b = book(fields(x)); if (b) { if (!bib[b.key]) bib[b.key] = b.line; } else if (x.length > 40) walk(x); } })(c.w);
    const GEN = new Set('empire kingdom republic dynasty sultanate caliphate state states united great first second battle history culture people movement language religion city fall siege'.split(' '));
    const nw = fold(e.name + ' ' + c.t).split(/[^a-z0-9]+/).filter(x => x.length >= 4 && !GEN.has(x) && !/^d+$/.test(x));
    const about = line => { const tw = fold(line.slice(line.indexOf(', ') + 2)).split(/[^a-z0-9]+/); return nw.some(n => tw.some(w => w.startsWith(n.slice(0, 5)))); };
    const secs = sections(c.w), res = {};
    for (const [key, rx] of Object.entries(kw)) {
      const tally = new Map(), heads = [];
      for (const s of secs) { const h = s.h[s.h.length - 1], hit = rx.test(h.toLowerCase()) || (s.h.length > 1 && !Object.values(kw).some(r => r.test(h.toLowerCase())) && rx.test(s.h[0].toLowerCase()));
        if (!hit) continue; const got = cited(s.text, bib); if (!got.size) continue; if (!heads.includes(h)) heads.push(h);
        for (const [line, n] of got) if (good(line)) tally.set(line, (tally.get(line) || 0) + n); }
      // a work counts when the article cites it at least twice in these sections, or when its title names the subject:
      // a single passing citation may be about anything the section touches (a book on Mande music under Mali's army)
      const w = [...tally].filter(x => x[1] >= 2 || about(x[0])).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]);
      if (w.length) { res[key] = { h: heads.slice(0, 4), w }; nSec++; }
    }
    if (Object.keys(res).length) { out[e.name] = { t: c.t, s: res }; nProf++; }
    rep.push(by + '\t' + e.name + '\t' + c.t + '\t' + Object.entries(res).map(([k, v]) => k + ':' + v.w.length).join(' '));
    if (nArt % 50 === 0) process.stderr.write(nArt + ' articles read\n');
  }
  fs.writeFileSync(OUT, '// Written by scripts/tools/profile-section-sources.js: the works the Wikipedia article on a profile\'s subject cites in\n// the sections that match each section of the profile (scholarly publishers only)\nconst SECTION_SOURCES = ' + JSON.stringify(out).replace(/\},"/g, '},\n"') + ';\n');
  if (process.argv.includes('--report')) console.log(rep.join('\n'));
  console.log(nArt + ' articles read (' + guessed + ' found by the profile\'s name, ' + refused + ' refused), ' + nProf + ' profiles with sources, ' + nSec + ' sections');
})().catch(e => { console.error(e); process.exit(1); });
