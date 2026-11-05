// Imports the public-domain texts of the songs from Wikisource (never typed), as stanzas of lines, with each page's
// licence templates and translator. Reads sources.tsv:
//   slug  part(orig|en|rom)  site(en|fr|de…)  page  select  credit
//   select: all | "start words".."end words" (stanzas from the one holding start to the one holding end, inclusive)
//           | #n..#m (stanzas n to m, 1-based)
// Writes imported/<slug>.json {slug, parts: {orig|en|rom: {site, page, url, licences, translator, credit, stanzas}}}.
// Prints only counts and the first and last words of each part. Cache: %LOCALAPPDATA%epoch-toolssong-cache.
//   node scripts/songs/fetch-texts.js [--only=slug,slug] [--peek=site:Page]   (peek: stanza numbers with their first words)
const fs = require('fs'), path = require('path');
const UA = 'EpochInstitute/1.0 (the-epoch-institute.org)', sleep = ms => new Promise(r => setTimeout(r, ms));
const D = __dirname, CACHE = path.join(process.env.LOCALAPPDATA || D, 'epoch-tools', 'song-cache'), OUT = path.join(D, 'imported');
const FIX = fs.existsSync(path.join(D, 'text-fixes.json')) ? JSON.parse(fs.readFileSync(path.join(D, 'text-fixes.json'), 'utf8')) : {};
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
// "en", "fr" … are Wikisource; "w-en", "w-ar" … Wikipedia (whose articles quote the public-domain words of some songs)
const host = site => site.startsWith('w-') ? site.slice(2) + '.wikipedia.org' : site + '.wikisource.org';
async function page(site, title) {
  // a hash, not the title: long non-Latin titles, encoded, pass the 255-character limit of a file name
  const cf = path.join(CACHE, site, require('crypto').createHash('sha1').update(title).digest('hex') + '.json');
  if (fs.existsSync(cf)) return JSON.parse(fs.readFileSync(cf, 'utf8'));
  if (site === 'pg') {   // Project Gutenberg: the plain text of book <title> (its number), between the START and END marks
    const r = await fetch(`https://www.gutenberg.org/cache/epub/${title}/pg${title}.txt`, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('Gutenberg ' + title + ' ' + r.status);
    const t = (await r.text()).replace(/\r/g, ''), s = t.indexOf('\n', t.indexOf('*** START')), e = t.indexOf('*** END');
    const head = t.slice(0, s); const name = (head.match(/Title:\s*(.+)/) || [])[1] || title;
    const p = { title: name.trim(), text: t.slice(s + 1, e), wikitext: '{{PD-Gutenberg}}', pg: title };
    fs.mkdirSync(path.dirname(cf), { recursive: true }); fs.writeFileSync(cf, JSON.stringify(p)); return p;
  }
  const u = `https://${host(site)}/w/api.php?action=parse&format=json&redirects=1&prop=text|wikitext&page=${encodeURIComponent(title)}`;
  for (let i = 0; i < 5; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) { const j = await r.json(); if (j.error) throw new Error(site + ':' + title + ' ' + j.error.info);
      const p = { title: j.parse.title, html: j.parse.text['*'], wikitext: j.parse.wikitext['*'] }; fs.mkdirSync(path.dirname(cf), { recursive: true }); fs.writeFileSync(cf, JSON.stringify(p)); await sleep(1500); return p; } }
    catch (e) { if (/doesn't exist|missingtitle|invalid/i.test(e.message)) throw e; }
    await sleep(6000);
  }
  throw new Error('fetch failed ' + site + ':' + title);
}
const ent = s => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (a, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (a, n) => String.fromCodePoint(parseInt(n, 16)));
function stanzas(html) {
  // the licence footer and the category links close every page: cut the page at the first of them
  const cut = ['licenseContainer', 'class="licenseBanner', 'id="catlinks"', 'class="printfooter', 'class="wst-license', 'class="ws-license']
    .map(m => html.indexOf(m)).filter(i => i > 0);
  if (cut.length) html = html.slice(0, html.lastIndexOf('<', Math.min(...cut)));
  let h = html.replace(/<(style|script)[\s\S]*?<\/\1>/g, '')
    .replace(/<(div|table|span)[^>]*class="[^"]*(ws-noexport|noprint|mw-editsection|reference|wst-header|headertemplate|licenseContainer|licenseBanner|ws-header)[^"]*"[\s\S]*?<\/\1>/g, '')
    .replace(/<sup[^>]*>\.<\/sup>/g, '·')   // an editor's raised dot (Appel's Occitan: e·s, no·m), not a footnote
    .replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<span class="pagenum[\s\S]*?<\/span>/g, '');
  h = h.replace(/[ \t]*\n[ \t]*(?=[^<\n])/g, ' ')   // a newline inside running HTML is a space; lines end only at <br> or a block's end
    .replace(/<br\s*\/?>\s*/g, '\n').replace(/<\/(p|div|h\d|li|tr|dd|dt)>/g, '\n\n').replace(/<[^>]+>/g, '');
  // page numbers of the scanned books ("[179]", "[≡]") are not text: drop those lines
  return ent(h).split(/\n\s*\n+/).map(s => s.split('\n').map(l => l.replace(/[‎‏​]/g, '').replace(/[ﭐ-﷿ﹰ-﻿]/g, c => c.normalize('NFKC')).replace(/\s+/g, ' ').trim().replace(/^\[\d+\]\s+(?=\S)/, '')).filter(l => l && !/^\[(\d+|≡)\]$/.test(l))).filter(s => s.length);
}
// a Gutenberg book is plain text: stanzas are its blank-line blocks
const stz = p => p.text !== undefined ? p.text.split(/\n\s*\n+/).map(s => s.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)).filter(s => s.length) : stanzas(p.html);
function meta(wt) {
  const lic = [...new Set((wt.match(/\{\{\s*(PD[-\w ]*|CC[-\w. ]*|GFDL[-\w ]*|[Ll]icen[cs]e[-\w ]*|Translation license)[^}]*\}\}/g) || []).map(x => x.replace(/\s+/g, ' ').slice(0, 80)))];
  const tr = (wt.match(/\|\s*translator\s*=\s*([^\n|}]*)/) || [])[1];
  return { licences: lic, translator: tr ? tr.replace(/\[\[|\]\]/g, '').trim() : '' };
}
function pick(st, sel) {
  // flags after the range: " /N" regroups the lines into stanzas of N lines (pages that put every line in a block of
  // its own), " nonum" drops a stanza's leading verse number ("1 Amazing grace" -> "Amazing grace")
  const sm = (sel || 'all').match(/^(L?"[^"]*"\.\."[^"]*"|\S+)\s*(.*)$/), range = sm[1], fl = sm[2] ? sm[2].split(' ') : [];
  let out = range0(st, range).map(s => s.map(l => l.replace(/\s*[𝄆𝄇]\s*/gu, ' ').trim()).filter(Boolean)).filter(s => s.length);   // repeat signs are notation, not words
  const ev = fl.find(f => /^every\d+:\d+$/.test(f));   // columns read across: keep block k of every n (Arabic | pronunciation | English)
  if (ev) { const [n, k] = ev.slice(5).split(':').map(Number); out = out.filter((s, i) => i % n === k); }
  if (fl.includes('splitdanda')) out = out.map(s => s.flatMap(l => l.split(/(?<=।)\s+/)));   // a verse printed as one line: its halves end at the danda
  if (fl.includes('splitbar')) out = out.map(s => s.flatMap(l => l.split(/\s+\|\s+/)));   // verse lines run together with " | "
  if (fl.includes('firstline')) out = out.map(s => [s[0]]);   // a block holds the original and its translation side by side
  if (fl.includes('alt0')) out = out.filter((s, i) => i % 2 === 0);   // original and translation alternate block by block
  if (fl.includes('alt1')) out = out.filter((s, i) => i % 2 === 1);
  if (fl.includes('noital')) out = out.map(s => s.map(l => l.replace(/_([^_]+)_/g, '$1')));   // Gutenberg's _italic_ marks
  if (fl.includes('nodash')) out = out.map(s => s.map(l => l.replace(/^[—–]\s*/, '')));   // a chorus set off by dashes
  if (fl.includes('nobis')) out = out.map(s => s.map(l => l.replace(/\s*('’bis’'|\(bis\))/g, '').trim()).filter(l => !/^'?’?refrain’?'?$/i.test(l))).filter(s => s.length);   // "bis" (sung twice) and refrain cues
  if (fl.includes('nolabels')) out = out.map(s => s.filter(l => !/^((\d+\s+)?verse|chorus|chor|refrain|estribillo|coro|hui|huryeom|후렴|كورال|\d+\s*절|[\d٠-٩]+|\d+\.?ª\.?|[IVX]+)[,:.]?$/i.test(l.trim()))).filter(s => s.length);
  if (fl.includes('nocaps')) out = out.map(s => s.filter(l => !/^[^a-zà-ÿ]*$/.test(l) || !/[A-ZÀ-Þ]{3}/.test(l))).filter(s => s.length);   // speakers' names set in capitals (UNE MÈRE DE FAMILLE.)
  if (fl.includes('noetc')) out = out.map(s => s.filter(l => !/(,?\s*etc\.?|,?\s*&c\.|\s+и\s+д\.)\s*$/i.test(l.trim()))).filter(s => s.length);   // refrain cues: "La république, etc."
  if (fl.includes('nonum')) out = out.map(s => [s[0].replace(/^(\d+|[一二三四五六七八九十]+)[.、．]?\s*/, ''), ...s.slice(1)]);
  if (fl.includes('novariants')) out = out.map(s => s.map(l => l.replace(/[，,]?\s*一作「[^」]*」/g, '')));   // Wikisource's "one version has …" notes
  if (fl.includes('noruby')) out = out.map(s => s.map(l => l.replace(/（[぀-ヿー]+）/g, '')));   // kana readings in brackets after the characters
  if (fl.includes('norefs')) out = out.map(s => s.map(l => l.replace(/\s*\([^)]{3,}\)/g, '').trim()));   // an edition's source references in parentheses
  if (fl.includes('nobrackets')) out = out.map(s => s.map(l => l.replace(/\s*\[[^\]]*\]/g, '').trim()));   // an editor's glosses inside the line
  if (fl.includes('nolinenum')) out = out.map(s => s.map(l => l.replace(/^\d+\s+(?=\S)/, '')));   // Wikisource's line numbers (every fifth or tenth line)
  if (fl.includes('gluednum')) out = out.map(s => s.map(l => l.replace(/^\d+(?=[^\d\s.,])/, '')));   // an edition's line numbers run into the line ("5i-na bi-ri-it")
  if (fl.includes('hebnum')) out = out.map(s => s.map(l => l.replace(/^([א-ת]{1,3}\s+){1,2}(?=[א-ת][֑-ׇ])/, '')));   // chapter and verse letters ("כג א") before a pointed word, on every line
  const nl = fl.find(f => /^nolast\d*$/.test(f));   // drop the last n lines (a verse past the song's end)
  if (nl) { const n = +(nl.slice(6) || 1); const ls = out.flat().length - n; let c = 0; out = out.map(s => s.filter(() => c++ < ls)).filter(s => s.length); }
  if (fl.includes('join2')) { const j = []; for (let i = 0; i < out.length; i += 2) j.push(out[i].concat(out[i + 1] || [])); out = j; }   // a stanza split in two blocks
  if (fl.includes('dropcap') && out[0] && /^\p{Lu}$/u.test(out[0][0]) && out[0][1]) out[0] = [out[0][0] + out[0][1], ...out[0].slice(2)];   // an initial set apart
  if (fl.includes('noparen')) out = out.map(s => s.filter(l => !/^[(\[].*[)\]]$/.test(l.trim()))).filter(s => s.length);   // an editor's note in brackets
  if (fl.includes('notitle')) out = [out[0].slice(1), ...out.slice(1)].filter(s => s.length);   // the text's own title heads the first stanza
  if (fl.includes('nofirst')) out = out.map(s => s.slice(1)).filter(s => s.length);   // a label line heads each stanza
  if (fl.includes('nopilcrow')) out = out.map(s => s.map(l => l.replace(/^¶\s*/, '')));
  const g = fl.find(f => /^\/\d+(,\d+)*$/.test(f));   // "/4" or cyclic sizes "/8,4"
  if (g) { const ns = g.slice(1).split(',').map(Number), ls = out.flat(); out = []; for (let i = 0, k = 0; i < ls.length; i += ns[k++ % ns.length]) out.push(ls.slice(i, i + ns[k % ns.length])); }
  return out;
}
function range0(st, sel) {
  if (!sel || sel === 'all') return st;
  const lm = sel.match(/^L"(.+)"\.\."(.+)"$/);   // lines, not stanzas: from the line holding a to the line holding b
  if (lm) { const ls = st.flat(), a = ls.findIndex(l => l.includes(lm[1])), b = ls.findIndex((l, i) => i >= a && l.includes(lm[2]));
    if (a < 0 || b < 0) throw new Error('line select not found: ' + sel); return [ls.slice(a, b + 1)]; }
  let m = sel.match(/^#(\d+)\.\.#(\d+|\$)$/); if (m) return st.slice(+m[1] - 1, m[2] === '$' ? st.length : +m[2]);
  m = sel.match(/^"(.+)"\.\."(.+)"$/); if (!m) throw new Error('bad select ' + sel);
  const low = s => s.join(' ').toLowerCase(), a = st.findIndex(s => low(s).includes(m[1].toLowerCase()));
  const b = st.findIndex((s, i) => i >= a && low(s).includes(m[2].toLowerCase()));
  if (a < 0 || b < 0) throw new Error('select not found: ' + sel); return st.slice(a, b + 1);
}
const words = (st, n, end) => { const w = st.flat().join(' ').split(' '); return (end ? w.slice(-n) : w.slice(0, n)).join(' '); };
(async () => {
  const links = arg('links');   // --links=site:Page lists the page's links (for "Versions of" and disambiguation pages)
  if (links) { const [site, ...t] = links.split(':'); const p = await page(site, t.join(':'));
    console.log([...new Set((p.wikitext.match(/\[\[[^\]|#]+/g) || []).map(x => x.slice(2)).filter(x => !/^(Category|Kategorie|Catégorie|Kategoria|Author|Autor|Auteur|d:|w:|wikipedia:|File|Image|:)/i.test(x)))].join('\n')); return; }
  const peek = arg('peek');
  if (peek) { const [site, ...t] = peek.split(':'); const p = await page(site, t.join(':')); const st = stz(p); console.log(p.title, '|', st.length, 'stanzas |', JSON.stringify(meta(p.wikitext)));
    // --full: every line with its stanza number (find-lines.js searches them)
    if (process.argv.includes('--full')) st.forEach((s, i) => s.forEach((l, j) => console.log(String(i + 1).padStart(4) + '.' + (j + 1), l)));
    else st.forEach((s, i) => console.log(String(i + 1).padStart(4), String(s.length).padStart(3) + ' lines:', s[0].slice(0, 50))); return; }
  const only = arg('only') ? arg('only').split(',') : null;
  const rows = fs.readFileSync(path.join(D, 'sources.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  fs.mkdirSync(OUT, { recursive: true }); const done = {}, USED = {};
  for (const [slug, part, site, title, select, credit] of rows) {
    if (only && !only.includes(slug)) continue;
    try {
      const p = await page(site, title), m = meta(p.wikitext); let st = pick(stz(p), select);
      // slips of an import fixed by hand, each logged in text-fixes.json ("slug|part": [[old, new], ...]), each matching once
      // a part gathered from several rows (pages or chapters): a fix must match once in one of its rows and in none of the others
      const many = rows.filter(r => r[0] === slug && r[1] === part).length > 1;
      for (const [a, b] of (FIX[slug + '|' + part] || [])) { const all = st.flat().join('\n'), n = all.split(a).length - 1; if (many && n === 0) continue; if (n !== 1) throw new Error('fix must match once: ' + a); (USED[slug + '|' + part] || (USED[slug + '|' + part] = new Set())).add(a); st = st.map(s => s.flatMap(l => l.split(a).join(b).split('\n')).filter(l => l !== '')); }   // a "\n" in a fix splits the line (half-lines a page's columns ran together)
      const o = done[slug] || (done[slug] = { slug, parts: {} });
      const url = p.pg ? `https://www.gutenberg.org/ebooks/${p.pg}` : `https://${host(site)}/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`;
      // a second row for the same part adds its stanzas (verses gathered from several pages: Martí's Versos sencillos)
      if (o.parts[part]) { const q = o.parts[part]; q.stanzas.push(...st); (q.also || (q.also = [])).push({ site, page: p.title, url }); }
      else o.parts[part] = { site, page: p.title, url, ...m, credit: credit || '', stanzas: st };
      console.log(slug.padEnd(30), part.padEnd(4), String(st.length).padStart(3), 'st', String(st.flat().length).padStart(4), 'ln |', m.licences.join(' ').slice(0, 40), '|', words(st, 5), '…', words(st, 4, true));
    } catch (e) { console.log(slug.padEnd(30), part.padEnd(4), 'ERROR', e.message.slice(0, 120)); }
  }
  for (const k of Object.keys(USED)) for (const [a] of FIX[k]) if (!USED[k].has(a)) console.log(k.padEnd(35), 'ERROR fix matched in none of its rows:', a.slice(0, 60));
  for (const o of Object.values(done)) fs.writeFileSync(path.join(OUT, o.slug + '.json'), JSON.stringify(o, null, 1));
})();
