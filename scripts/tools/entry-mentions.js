// "Across the Institute" (Nov 2026, the impressions plan R2): for each encyclopedia entry, the sentences elsewhere on the
// site that name it, quoted with their page and section, so an entry page carries the site's own context beside its
// description. Read from the BUILT pages (what readers see): every paragraph that links /encyclopedia/<slug> in the
// profiles of every kind, the essays, the social ladders, the speeches, the songs, the day pages and the state pages.
// One quote per source page, at most six per entry, profiles first, then essays, ladders, speeches, songs, days, states.
//   node scripts/tools/entry-mentions.js [--out=scripts/entry-mentions.tsv]
// Writes slug TAB html (the <li> items) per entry; build-pages.ps1 reads it (git-ignored: rebuilt from the pages).
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..');
const OUT = (process.argv.find(a => a.startsWith('--out=')) || '').slice(6) || path.join(R, 'scripts', 'entry-mentions.tsv');
// source folders in order of preference, with the label of their kind
const SRC = [['empire', 0], ['religion', 0], ['language', 0], ['culture', 0], ['movement', 0], ['government', 0], ['ideology', 0], ['work', 0],
  ['essays', 1], ['societies', 2], ['speeches', 3], ['songs', 4], ['today-in-history', 5], ['state', 6]];
const MAX = 6, MAXW = 48;
const ent = s => s.replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8216;|&lsquo;/g, '‘').replace(/&#8220;|&ldquo;/g, '“').replace(/&#8221;|&rdquo;/g, '”')
  .replace(/&#8212;|&mdash;/g, '—').replace(/&#8211;|&ndash;/g, '–').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// sentence ends: a full stop, ? or ! followed by a space and a capital or a quotation mark, but not after a common
// abbreviation, an initial or a regnal numeral's "c." (the site's Sentences rule, simplified)
const ABBR = /(?:\b(?:c|ca|St|Mr|Mrs|Dr|Jr|Sr|vs?|r|fl|b|d|i\.e|e\.g|no|Mt|ft|approx)|\b[A-Z])\.$/;
function sentences(t) {
  const out = []; let start = 0;
  const re = /[.!?]["”’)]?(\s+)(?=["“‘(]?[A-Z0-9])/g; let m;
  while ((m = re.exec(t))) { const end = m.index + m[0].length - m[1].length; const piece = t.slice(start, end); if (ABBR.test(piece.trimEnd().replace(/["”’)]+$/, ''))) continue; out.push([start, end]); start = m.index + m[0].length; }
  out.push([start, t.length]); return out;
}
const quotes = {};   // slug -> [{rank, html}]
let pagesRead = 0;
for (const [dir, rank] of SRC) {
  const D = path.join(R, dir); if (!fs.existsSync(D)) continue;
  for (const f of fs.readdirSync(D)) {
    const p = path.join(D, f); if (f.includes('.') || !fs.statSync(p).isFile() || f === 'index') continue;
    const html = fs.readFileSync(p, 'utf8'); pagesRead++;
    const h1m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/); if (!h1m) continue;
    const title = ent(h1m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    const url = '/' + dir + '/' + f;
    const main = (html.match(/<main[\s\S]*<\/main>/) || [''])[0];
    // walk headings and paragraphs in order
    const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>|<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g; let m, sec = '';
    const seenHere = new Set();
    while ((m = re.exec(main))) {
      if (m[2] != null) { sec = ent(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(); continue; }
      const ph = m[3]; if (!ph.includes('class="enc-link"')) continue;
      // the paragraph as text, with each linked entry's span remembered
      let text = '', links = []; const tr = /<a class="enc-link" href="\/encyclopedia\/([^"#?]+)"[^>]*>([\s\S]*?)<\/a>|<[^>]+>|[^<]+/g; let t;
      while ((t = tr.exec(ph))) {
        if (t[1]) { const s = ent(t[2].replace(/<[^>]+>/g, '')); links.push([t[1], text.length, text.length + s.length]); text += s; }
        else if (t[0][0] !== '<') text += ent(t[0]);
      }
      text = text.replace(/\s+/g, ' ');
      const ss = sentences(text);
      for (const [slug, a, b] of links) {
        if (seenHere.has(slug)) continue;
        const s = ss.find(x => a >= x[0] && a < x[1]); if (!s) continue;
        let q = text.slice(s[0], s[1]).trim(), qa = a - s[0] - (text.slice(s[0], s[1]).length - text.slice(s[0], s[1]).trimStart().length), qb = qa + (b - a);
        // a long sentence is cut around the name
        const words = q.split(' ');
        if (words.length > MAXW) {
          let pos = 0, wi = 0; for (; wi < words.length; wi++) { if (pos + words[wi].length >= qa) break; pos += words[wi].length + 1; }
          const from = Math.max(0, Math.min(wi - 18, words.length - MAXW)), to = Math.min(words.length, from + MAXW);
          const pre = words.slice(0, from).join(' ').length + (from ? 1 : 0);
          q = (from ? '…' : '') + words.slice(from, to).join(' ') + (to < words.length ? '…' : '');
          qa = qa - pre + (from ? 1 : 0); qb = qa + (b - a);
          if (qa < 0 || qb > q.length) continue;
        }
        if (q.split(' ').length < 6) continue;   // a bare caption, not a sentence
        seenHere.add(slug);
        const body = esc(q.slice(0, qa)) + '<b>' + esc(q.slice(qa, qb)) + '</b>' + esc(q.slice(qb));
        const label = esc(title) + (sec && rank === 0 ? ' · ' + esc(sec) : '');
        (quotes[slug] = quotes[slug] || []).push({ rank, q, html: '<li><blockquote>' + body + '</blockquote><a href="' + url + '">' + label + '</a></li>' });
      }
    }
  }
}
// keep the best: by kind, no sentence twice, at most MAX
const lines = []; let n = 0, nq = 0;
for (const [slug, list] of Object.entries(quotes)) {
  const seen = new Set(), keep = [];
  for (const x of list.sort((a, b) => a.rank - b.rank)) { const k = x.q.toLowerCase(); if (seen.has(k)) continue; seen.add(k); keep.push(x.html); if (keep.length >= MAX) break; }
  if (keep.length) { lines.push(slug + '\t' + keep.join('')); n++; nq += keep.length; }
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log('entry mentions: ' + pagesRead + ' pages read, ' + nq + ' quotes for ' + n + ' entries -> ' + path.relative(R, OUT));
