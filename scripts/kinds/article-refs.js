// The books an English Wikipedia article lists under Further reading, Bibliography, Sources or Works cited: the saved
// plain-text articles (fetch-articles.js) keep those headings but not their lists, so a profile's references are taken
// from here.   node scripts/kinds/article-refs.js <list.tsv> <out.json> [max per article, default 12]
// list lines: slug <TAB> Wikipedia title. Reads each article's wikitext, takes the {{cite book}} / {{citation}}
// templates of those sections that have an author, a title, a publisher and a year, and writes
// {slug: ["Author, Title (Publisher, year)", …]} in the article's order. One request every 2 s.
const fs = require('fs'), sleep = ms => new Promise(r => setTimeout(r, ms));
const [list, outF, maxArg] = process.argv.slice(2), MAX = +maxArg || 12, UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' };
const clean = s => String(s || '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/''+/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
function templates(text) { const out = []; let d = 0, st = -1; for (let i = 0; i < text.length - 1; i++) { if (text[i] === '{' && text[i + 1] === '{') { if (d === 0) st = i; d++; i++; } else if (text[i] === '}' && text[i + 1] === '}') { d--; i++; if (d === 0 && st >= 0) out.push(text.slice(st + 2, i - 1)); } } return out; }
function fields(t) { const f = {}; let d = 0, cur = ''; const parts = []; for (let i = 0; i < t.length; i++) { const c = t[i], n = t[i + 1]; if ((c === '{' && n === '{') || (c === '[' && n === '[')) { d++; cur += c + n; i++; } else if ((c === '}' && n === '}') || (c === ']' && n === ']')) { d--; cur += c + n; i++; } else if (c === '|' && d === 0) { parts.push(cur); cur = ''; } else cur += c; } parts.push(cur); f._name = parts[0].trim().toLowerCase(); for (const p of parts.slice(1)) { const k = p.indexOf('='); if (k > 0) f[p.slice(0, k).trim().toLowerCase()] = p.slice(k + 1).trim(); } return f; }
(async () => {
  const out = {};
  for (const l of fs.readFileSync(list, 'utf8').split(/\r?\n/)) {
    if (!l.trim() || l[0] === '#') continue; const [slug, title] = l.split('\t');
    let wt = '';
    for (let i = 0; i < 5 && !wt; i++) { try { const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&redirects=1&prop=wikitext&page=' + encodeURIComponent(title), { headers: UA }); if (r.ok) { const j = await r.json(); wt = (j.parse && j.parse.wikitext && j.parse.wikitext['*']) || ''; } } catch (e) {} if (!wt) await sleep(8000 * (i + 1)); }
    const secs = wt.split(/\n(?==+[^=\n]+=+\s*\n)/).filter(s => /^=+\s*(Further reading|Bibliography|Sources|Works cited|General sources|Secondary sources|Biographies|Cited sources|Books|General and cited sources|Modern sources|General references)\b/i.test(s) || /^=+\s*(Biograph|Studies|Scholarly|Monographs|General)/i.test(s));
    const refs = [], seen = new Set();
    for (const s of secs) for (const t of templates(s)) {
      const f = fields(t); if (!/^(cite book|citation|cite encyclopedia)$/.test(f._name) && !/^cite book/.test(f._name)) continue;
      const last = clean(f.last || f.last1 || f['author-last'] || f.surname || ''), first = clean(f.first || f.first1 || f['author-first'] || f.given || ''), auth = clean(f.author || f.author1 || '') || (last ? (first ? first + ' ' + last : last) : '');
      const title2 = clean(f.title), pub = clean(f.publisher), year = (clean(f.year || f.date || '').match(/\d{4}/) || [])[0];
      if (!auth || !title2 || !pub || !year || f.chapter || f.contribution || f.journal) continue;
      const line = auth + ', ' + title2 + ' (' + pub + ', ' + year + ')'; if (seen.has(title2) || line.length > 190) continue; seen.add(title2); refs.push(line);
    }
    out[slug] = refs.slice(0, MAX); console.log(slug.padEnd(22) + refs.length + ' books' + (secs.length ? '' : ' (no such section)')); await sleep(2000);
  }
  fs.writeFileSync(outF, JSON.stringify(out, null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
