// Saves Wikipedia articles as plain text from the REST HTML endpoint (16 Nov 2026). scripts/kinds/fetch-articles.js asks
// the action API for whole-article extracts, which Wikipedia limits to about one a minute; the REST endpoint is not
// limited so, and one article every 1.5 s is well inside what it allows. The text is made here from the article's HTML:
// paragraphs, list items and headings ("== History ==", as the extracts write them); no tables, infoboxes, figures,
// reference marks, reference lists, navigation boxes, hatnotes or maintenance notes.
//   node scripts/entries/fetch-html.js <list.tsv> <out dir> [--gap=1500]
// list lines: slug TAB Wikipedia title. Writes <out dir>/<slug>.txt: "Source: url", "Title: …", a blank line, the text.
// Articles already saved are kept. A 429 or 5xx is waited out (Retry-After, else 30 s) and tried again, five times.
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)', 'Accept': 'text/html' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), GAP = +((process.argv.find(a => a.startsWith('--gap=')) || '').slice(6) || 1500);
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', minus: '−', times: '×', deg: '°', thinsp: ' ', ensp: ' ', emsp: ' ', shy: '', zwj: '', zwnj: '' };
const decode = s => s.replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&([a-z]+);/gi, (m, n) => (n in ENT ? ENT[n] : m));
const SKIPTAG = new Set(['table', 'style', 'script', 'figure', 'figcaption', 'math', 'audio', 'video', 'map', 'gallery']);
const SKIPCLASS = /\b(infobox|navbox|vertical-navbox|sidebar|hatnote|metadata|ambox|mbox-small|reflist|refbegin|mw-references-wrap|references|reference|mw-ref|noprint|thumb|gallery|toc|shortdescription|mw-editsection|sistersitebox|portalbox|navigation-not-searchable|noexcerpt|mw-empty-elt|IPA|plainlinks|authority-control|side-box|quotebox-title|geo-nondefault|coordinates)\b/;
const VOID = new Set(['br', 'img', 'link', 'meta', 'hr', 'input', 'wbr', 'source', 'track', 'area', 'col', 'base']);
const BLOCK = new Set(['p', 'li', 'dd', 'dt', 'blockquote', 'h2', 'h3', 'h4']);
function toText(html) {
  const out = []; let buf = '', stack = [], skip = 0, block = null;
  const flush = () => { const t = decode(buf).replace(/\s+/g, ' ').replace(/ ([,.;:!?)])/g, '$1').replace(/\( /g, '(').trim(); buf = '';
    if (!t) return; if (block === 'h2') out.push('\n== ' + t + ' =='); else if (block === 'h3') out.push('\n=== ' + t + ' ==='); else if (block === 'h4') out.push('\n==== ' + t + ' ===='); else out.push(t); };
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g; let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) { if (!skip && block) buf += m[4]; continue; }
    if (!m[2]) continue; const tag = m[2].toLowerCase(), close = !!m[1], attrs = m[3] || '';
    if (VOID.has(tag) || /\/\s*$/.test(attrs)) { if (tag === 'br' && !skip && block) buf += ' '; continue; }
    if (!close) {
      const cls = (attrs.match(/\bclass\s*=\s*"([^"]*)"/) || [])[1] || '';
      const sk = SKIPTAG.has(tag) || SKIPCLASS.test(cls) || /\brole\s*=\s*"(navigation|note|presentation)"/.test(attrs) || (tag === 'sup' && /reference/.test(cls)) || /display\s*:\s*none/.test(attrs);
      stack.push([tag, sk]); if (sk) skip++;
      else if (!skip && BLOCK.has(tag)) { if (block && buf.trim()) flush(); block = tag; }
    } else {
      let i = stack.length - 1; while (i >= 0 && stack[i][0] !== tag) i--; if (i < 0) continue;
      for (let k = stack.length - 1; k >= i; k--) { const [t, sk] = stack.pop(); if (sk) skip--; else if (!skip && t === block) { flush(); block = null; for (const s of stack) if (!s[1] && BLOCK.has(s[0])) block = s[0]; } }
    }
  }
  let text = out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  // the sections that hold no prose of the subject
  text = text.split(/\n(?=== [^=])/).filter(s => !/^== (See also|References|Notes|Footnotes|Citations|Sources|Bibliography|Further reading|External links|Works cited|Explanatory notes|Notes and references|References and notes) ==/i.test(s)).join('\n');
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
if (require.main === module) (async () => {
  const [list, dir] = args; fs.mkdirSync(dir, { recursive: true }); let n = 0, got = 0; const miss = [];
  for (const l of fs.readFileSync(list, 'utf8').split(/\r?\n/)) {
    if (!l.trim() || l.startsWith('#')) continue; const [slug, title] = l.split('\t'); if (!slug || !title) continue;
    const f = path.join(dir, slug + '.txt'); if (fs.existsSync(f)) { n++; continue; }
    const u = 'https://en.wikipedia.org/api/rest_v1/page/html/' + encodeURIComponent(title.replace(/ /g, '_')) + '?redirect=true'; let html = null, final = title;
    for (let i = 0; i < 5 && html === null; i++) {
      try { const r = await fetch(u, { headers: UA, redirect: 'follow' });
        if (r.ok) { html = await r.text(); const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1]; if (t) final = decode(t.replace(/<[^>]+>/g, '')); }
        else if (r.status === 404) { html = ''; }
        else { const ra = +r.headers.get('retry-after') || 30; await sleep(Math.min(300, ra) * 1000 + 500); }
      } catch (e) { await sleep(10000); }
    }
    const text = html ? toText(html) : '';
    if (!text || text.length < 200) { miss.push(slug + ' (' + title + ')'); await sleep(GAP); continue; }
    fs.writeFileSync(f, 'Source: https://en.wikipedia.org/wiki/' + encodeURIComponent(final.replace(/ /g, '_')) + '\nTitle: ' + final + '\n\n' + text + '\n'); n++; got++;
    if (got % 100 === 0) console.log(got + ' fetched, ' + n + ' in the folder');
    await sleep(GAP);
  }
  console.log(n + ' articles in ' + dir + ' (' + got + ' fetched now)' + (miss.length ? '; missing ' + miss.length + ': ' + miss.slice(0, 40).join(', ') : ''));
})();
module.exports = { toText };
