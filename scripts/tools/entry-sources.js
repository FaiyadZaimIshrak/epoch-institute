// The growth plan's C1 (14 Nov 2026): the "Sources" block of an encyclopedia entry. An entry is written from the
// Wikipedia article it links; this tool reads that article's wikitext and takes the books the article itself lists
// (its Bibliography, Sources, Works cited or Further reading sections; where it has none, the books its footnotes
// cite), so the entry can name the article, the day it was read, and the works behind it.
//   node scripts/tools/entry-sources.js [--export=<Search Console export folder>] [--more] [--max=N] [slug …]
//     --export  the entries among that export's pages (the ones search sends readers to); read only, never copied
//     --more    the entries told in more detail (scripts/entry-more.json)
// Only entries whose article is confirmed ("same" in scripts/entry-wikidata.tsv). The wikitext is cached in
// %LOCALAPPDATA%\epoch-tools\refs-cache (one request every 2 s; a run can be stopped and started again). It writes
// scripts/entry-sources.json {slug: {t: article title, d: yyyy-mm-dd read, k: "b" listed by the article | "c" cited in
// its notes, w: [up to five works]}}, adding to what is there. A work needs an author, a title, a publisher and a
// year; chapters and journal articles are left out. The parsing is that of scripts/kinds/article-refs.js.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, CACHE = path.join(process.env.LOCALAPPDATA || require('os').tmpdir(), 'epoch-tools', 'refs-cache'), OUT = path.join(R, 'scripts', 'entry-sources.json');
fs.mkdirSync(CACHE, { recursive: true });
const clean = s => String(s || '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/''+/g, '').replace(/&nbsp;/g, ' ').replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1').replace(/\s+/g, ' ').trim();
function templates(text) { const out = []; let d = 0, st = -1; for (let i = 0; i < text.length - 1; i++) { if (text[i] === '{' && text[i + 1] === '{') { if (d === 0) st = i; d++; i++; } else if (text[i] === '}' && text[i + 1] === '}') { d--; i++; if (d === 0 && st >= 0) out.push(text.slice(st + 2, i - 1)); if (d < 0) d = 0; } } return out; }
function fields(t) { const f = {}; let d = 0, cur = ''; const parts = []; for (let i = 0; i < t.length; i++) { const c = t[i], n = t[i + 1]; if ((c === '{' && n === '{') || (c === '[' && n === '[')) { d++; cur += c + n; i++; } else if ((c === '}' && n === '}') || (c === ']' && n === ']')) { d--; cur += c + n; i++; } else if (c === '|' && d === 0) { parts.push(cur); cur = ''; } else cur += c; } parts.push(cur); f._name = parts[0].trim().toLowerCase(); for (const p of parts.slice(1)) { const k = p.indexOf('='); if (k > 0) f[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim(); } return f; }
function books(text, max) {
  const refs = [], seen = new Set();
  const walk = t => { for (const x of templates(t)) { const f = fields(x);
    if (/^(cite book|citation|cite encyclopedia)$/.test(f._name) || /^cite book/.test(f._name)) {
      const last = clean(f.last || f.last1 || f['author-last'] || f.surname || ''), first = clean(f.first || f.first1 || f['author-first'] || f.given || ''), auth = (clean(f.author || f.author1 || '') || (last ? (first ? first + ' ' + last : last) : '')).replace(/^([^,]+), ([^,]+)$/, (m, a, b) => / and |&/.test(m) ? m : b + ' ' + a);   // "Barlow, Frank" as "Frank Barlow"
      const title = clean(f.title), pub = clean(f.publisher), year = (clean(f.year || f.date || '').match(/\b\d{4}\b/) || [])[0];
      if (auth && title && pub && year && !f.chapter && !f.contribution && !f.journal && !/\bet al\b|^\W|[<>{}|=]/.test(auth + title + pub)) { const line = auth + ', ' + title + ' (' + pub + ', ' + year + ')'; const key = title.toLowerCase(); if (!seen.has(key) && line.length <= 190 && line.length >= 25) { seen.add(key); refs.push(line); } }
    } else if (x.length > 40) walk(x);   // a template holding others (refbegin, a ref inside an infobox)
  } };
  walk(text); return refs.slice(0, max);
}
(async () => {
  const same = {}; for (const l of fs.readFileSync(path.join(R, 'scripts', 'entry-wikidata.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[0] && c[0][0] !== '#' && c[4] === 'same' && c[1]) same[c[0]] = c[1]; }
  let slugs = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (process.argv.includes('--more')) slugs = slugs.concat(Object.keys(JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'entry-more.json'), 'utf8'))));
  if (arg('export')) for (const l of fs.readFileSync(path.join(arg('export'), 'Pages.csv'), 'utf8').split(/\r?\n/)) { const m = l.match(/\/encyclopedia\/([a-z0-9-]+),/); if (m) slugs.push(m[1]); }
  slugs = [...new Set(slugs)].filter(s => same[s]); if (arg('max')) slugs = slugs.slice(0, +arg('max'));
  const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}; let n = 0, got = 0, withBooks = 0;
  for (const slug of slugs) {
    const cf = path.join(CACHE, slug + '.json'); let c = null;
    if (fs.existsSync(cf)) c = JSON.parse(fs.readFileSync(cf, 'utf8'));
    else {
      for (let i = 0; i < 4 && !c; i++) { try { const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&prop=wikitext&page=' + encodeURIComponent(same[slug]), { headers: UA }); if (r.ok) { const j = await r.json(); if (j.parse && j.parse.wikitext) c = { t: j.parse.title, d: new Date().toISOString().slice(0, 10), w: j.parse.wikitext['*'] }; else if (j.error) { c = { t: same[slug], d: new Date().toISOString().slice(0, 10), w: '' }; } } } catch (e) {} if (!c) await sleep(8000 * (i + 1)); }
      if (!c) { console.log(slug + ': not read'); continue; } fs.writeFileSync(cf, JSON.stringify(c)); got++; await sleep(2000);
    }
    if (!c.w) continue;
    const secs = c.w.split(/\n(?==+[^=\n]+=+\s*\n)/).filter(s => /^=+\s*(Further reading|Bibliography|Sources|Works cited|General sources|Secondary sources|Primary sources|Biographies|Cited sources|Books|General and cited sources|Modern sources|General references|References cited|Literature)\b/i.test(s));
    // cited works: never from the sections on fiction, film and popular culture (Jahangir's article cited a novel there)
    const body = c.w.split(/\n(?==+[^=\n]+=+\s*\n)/).filter(s => !/^=+\s*[^=\n]*(popular culture|fiction|film|television|media|novels?|adaptations|portrayals|depictions|games|music|literature and art|cultural (references|depictions))/i.test(s)).join('\n');
    // only works from scholarly publishers: an article's list may hold novels and popular retellings (Jahangir's had
    // four), and nothing here can tell them apart but the publisher. Precision over completeness.
    const SCHOLARLY = /Universit|Univ\.|\bUP\b|Brill|Routledge|De Gruyter|Springer|Palgrave|Wiley|Blackwell|Eisenbrauns|Harrassowitz|Peeters|Academic|Akademi|Institut|Society|Museum|Longman|Clarendon|Macmillan|Motilal|Asiatic|Variorum|Ashgate|Boydell|Brepols|Scholars|Curzon|Hakluyt|Thames (&|and) Hudson|Smithsonian|Dumbarton|School of|College|Académie|Accademia|Verlag|Böhlau|Franz Steiner|Archaeopress|Oxbow|Equinox|ABC-CLIO|Greenwood|Praeger|Westview|Rowman|Scarecrow|M\.? ?E\.? Sharpe|Hackett|Mouton|Benjamins|Otto|Presses|Editions du CNRS|Publications de|Manohar|Munshiram|Orient (Longman|Blackswan)|Sage\b|Zed Books|Hurst|I\.? ?B\.? ?Tauris|Bloomsbury|Continuum|Berghahn|Karthala|Maisonneuve|Geuthner|Mohr|Vandenhoeck|Reichert|Aris (&|and) Phillips|Osprey|Tempus|Pen (&|and) Sword|Sutton|Batsford|Weidenfeld|Faber|Allen (&|and) Unwin|Methuen|Edward Arnold|Duckworth|Kegan Paul|John Murray|Norton|Knopf|Basic Books|Free Press|Viking|Penguin Classics|Loeb|Library of|Archaeological Survey|Government|UNESCO/;
    const good = x => { const pub = (x.match(/\(([^()]*), \d{4}\)$/) || [])[1] || ''; return SCHOLARLY.test(pub) && !/Cancer|Britannica/i.test(pub) && !/\bnovel\b|\(PhD\)|\bthesis\b|dissertation|Wikipedia|Journal of|^Society,|, \d{4}, \d{4}\)/i.test(x); };
    let w = books(secs.join('\n'), 12).filter(good).slice(0, 5), k = 'b'; if (!w.length) { w = books(body, 12).filter(good).slice(0, 5); k = 'c'; }
    out[slug] = { t: c.t, d: c.d, k, w }; n++; if (w.length) withBooks++;
    if (n % 25 === 0) { fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"') + '\n'); console.log(n + ' / ' + slugs.length + ' (' + got + ' fetched, ' + withBooks + ' with works)'); }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"') + '\n');
  console.log(n + ' entries, ' + withBooks + ' with works, ' + Object.keys(out).length + ' in the file');
})().catch(e => { console.error(e); process.exit(1); });
