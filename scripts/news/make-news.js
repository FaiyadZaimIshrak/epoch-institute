// "In the news" (winter round W4, Nov 2026): history and archaeology headlines for /now and the home page's Now card.
//   node scripts/news/make-news.js [--out=news.json] [--from=<dir of saved feeds: 1.xml, 2.xml …>] [--save=<dir>] [--all]
// Reads the feeds of scripts/news/feeds.tsv and keeps, of each item, only the headline, its link, the source's name and
// the day. A headline is kept only when it names a page of the site (its "Background"): a profile, an entry of the
// encyclopedia (weight 3 or more in search-index.js; a one-word name only when the encyclopedia's own texts hardly
// ever use the word in lower case, so "Study" or "Cards" never match), a country history, or a word of
// scripts/news/terms.tsv. Left out: grim headlines, present-day politics, quizzes and offers, items older than 21 days,
// a second headline of the same story or with the same background, more than three of one source. Newest first, ten.
// It writes {t: when, items: [[headline, link, source, yyyy-mm-dd, background address, background label, picture, 1 when
// the picture is the publisher's, the background's own picture]]} and exits 1 (writing nothing) when fewer than four
// headlines are left, so the workflow keeps the last good file.
// Pictures (13 Nov 2026, the owner's choice): only a thumbnail a feed itself offers for syndication (media:thumbnail,
// media:content or an image enclosure: Smithsonian, Phys.org), never a photograph taken from an article's text or page.
// With --img=<dir> it downloads each into <dir>/n-<id>.src; the workflow makes them 240 px JPEGs and puts them into
// public_html/feeds beside news.json, so readers' browsers ask no other site. Every other headline, and one whose
// thumbnail did not arrive, shows the picture of the Institute page it links: the entry's thumbnail or the profile's
// emblem (a country history has none).
// Needs search-index.js, search-profiles.js, search-pages.js and encyclopedia-data.js beside the scripts folder.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..'), arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const OUT = arg('out') || 'news.json', FROM = arg('from'), SAVE = arg('save'), IMG = arg('img'), ALL = process.argv.includes('--all');
const DAYS = 21, PER = 3, MAX = 10, MIN = 4;
const tsv = f => fs.readFileSync(path.join(__dirname, f), 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
const load = (f, v) => new Function(fs.readFileSync(path.join(ROOT, f), 'utf8') + '; return ' + v + ';')();

// ── the names a headline may name ──────────────────────────────────────────────────────────────────────────────
const IDX = load('search-index.js', 'SEARCH_INDEX'), PROF = load('search-profiles.js', 'SEARCH_PROFILES'), PAGES = load('search-pages.js', 'SEARCH_PAGES');
const lower = {};   // how often the encyclopedia's texts use a word in lower case
for (const m of fs.readFileSync(path.join(ROOT, 'encyclopedia-data.js'), 'utf8').matchAll(/(?<=[ (])[a-z]{3,}(?=[ ,.;:)])/g)) lower[m[0]] = (lower[m[0]] || 0) + 1;
const names = new Map(), known = new Set();   // text -> [address, label, rank, weight]
function add(text, address, label, rank, weight) {
  text = text.trim(); if (text.length < 4) return;
  if (!/[\s-]/.test(text) && (lower[text.toLowerCase()] || 0) > 3) return;   // an everyday word
  const o = names.get(text); if (!o || o[2] < rank || (o[2] === rank && o[3] < weight)) names.set(text, [address, label, rank, weight]);
}
for (const r of PAGES) if (r[2] === 'country') add(r[0], r[1], r[0], 0, 0);
for (const r of IDX) {
  if (!r[0] || typeof r[0] !== 'string') continue; known.add('/encyclopedia/' + r[0]);
  const w = r[4] || 0; if (w < 3 || (r[2] === 'term' && !(w >= 6 && /^\p{Lu}.*\s/u.test(r[1])))) continue;   // of the terms only well-known proper names (Silk Road)
  const rank = r[2] === 'place' ? 1 : 2;
  add(r[1], '/encyclopedia/' + r[0], r[1], rank, w);
  for (const a of String(r[3] || '').split('|')) if (a && /^\p{Lu}/u.test(a) && (/\s/.test(a) || w >= 6)) add(a, '/encyclopedia/' + r[0], r[1], rank, w - 0.5);
}
for (const p of PROF) { known.add(p[1]); add(p[0], p[1], p[0], 3, 9); }
for (const [words, address, label, rank] of tsv('terms.tsv')) {
  if (!known.has(address)) { console.error('terms.tsv: no profile or entry ' + address); process.exit(2); }
  for (const w of words.split('|')) names.set(w.trim(), [address, label, +rank, +rank > 1 ? 10 : 0]);   // a rank 1 word gives way to any place named
}
// the Institute's own picture of a background page: an entry's 112 px thumbnail, a profile's emblem; never a flag (a
// present-day country's entry shows its flag, which says nothing of a find: Egypt's beside mummified cats)
const OWN = {};
for (const e of load('encyclopedia-data.js', 'ENCYCLOPEDIA')) if (e.img && !/\bFlag_of|Flag%20of|\bflag\b/i.test(String((e.credit || {}).source || '') + ' ' + e.img)) OWN['/encyclopedia/' + e.slug] = '/images/encyclopedia/thumbs/' + e.slug + '.jpg';
for (const p of PROF) OWN[p[1]] = '/logos/thumbs/' + encodeURIComponent(p[0]) + '.png';
const byFirst = {}; for (const [t, v] of names) { const k = t.split(/[\s-]/)[0]; (byFirst[k] = byFirst[k] || []).push([t, v]); }
function background(h) {   // the best page a headline names: the highest rank, then the longest name, then the best known
  const out = [];
  for (const m of h.matchAll(/[\p{L}\p{N}][\p{L}\p{N}.]*/gu)) {
    const c = byFirst[m[0]]; if (!c) continue;
    for (const [t, v] of c) if (h.startsWith(t, m.index) && !/[\p{L}\p{N}]/u.test(h[m.index + t.length] || ' ')) out.push([t, v]);
  }
  out.sort((a, b) => b[1][2] - a[1][2] || b[0].length - a[0].length || b[1][3] - a[1][3]);
  return out.length ? out[0][1] : null;
}

// ── the feeds ──────────────────────────────────────────────────────────────────────────────────────────────────
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…' };
const dec = s => String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] !== undefined ? ENT[e] : m))
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] !== undefined ? ENT[e] : m))   // feeds escape twice
  .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (it, n) => { const m = it.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>')); return m ? m[1] : ''; };
const GRIM = /\b(massacr\w*|genocide|murder\w*|rap(e|ed|es|ist)|suicide|behead\w*|tortur\w*|slaughter\w*|execut\w*|kill(s|ed|er|ing|ings)?|burned at the stake|crematori\w*|holocaust|sacrific\w*|abduct\w*|sexual\w*|sex|pogroms?|terror\w*|lynch\w*|death camps?|hanged|human remains|cannibal\w*|slasher|porn\w*)\b/i;
const NOW = /\b(Trump|Biden|Putin|Netanyahu|Hamas|Gaza|Zelensk\w*|election|elections|Republicans?|Democrats?|Congress|MAGA)\b/;
const PROMO = /\b(quiz|podcast|webinar|subscribe|giveaway|newsletter|book review|sponsored|call for (papers|applications))\b|^review:/i;
// a thumbnail the feed offers: media:thumbnail, media:content of an image, or an image enclosure (never an <img> of the text)
function feedPic(it) {
  for (const m of it.matchAll(/<(media:thumbnail|media:content|enclosure)\b([^>]*)>/g)) {
    const at = n => { const a = m[2].match(new RegExp('\\b' + n + '\\s*=\\s*"([^"]*)"')); return a ? dec(a[1]) : ''; };
    const u = at('url'), ty = at('type'), md = at('medium');
    if (!/^https:\/\/[^\s"<>]+$/.test(u)) continue;
    if (m[1] === 'media:thumbnail' || md === 'image' || /^image\/(jpeg|png|webp|gif)$/.test(ty) || (m[1] === 'media:content' && !ty && !md && /\.(jpe?g|png|webp)(\?|$)/i.test(u))) return u;
  }
  return '';
}
async function fetchPic(u, file) {   // the publisher's thumbnail, at most 3 MB and an image
  const c = new AbortController(), timer = setTimeout(() => c.abort(), 20000);
  try {
    const r = await fetch(u, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-reader)' } });
    const ty = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)$/.test(ty)) throw new Error('HTTP ' + r.status + ' ' + ty);
    const b = Buffer.from(await r.arrayBuffer()); if (b.length < 500 || b.length > 3e6) throw new Error(b.length + ' bytes');
    fs.writeFileSync(file, b); return true;
  } catch (e) { console.log('  picture ' + u.slice(0, 90) + ': ' + (e.message || e)); return false; } finally { clearTimeout(timer); }
}
const words = h => new Set(h.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);
const same = (a, b) => { let n = 0; for (const w of a) if (b.has(w)) n++; return n >= 3 && n / Math.min(a.size, b.size) >= 0.5; };

async function read(url, i) {
  if (FROM) { const f = path.join(FROM, (i + 1) + '.xml'); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''; }
  const c = new AbortController(), timer = setTimeout(() => c.abort(), 25000);
  try {
    const r = await fetch(url, { signal: c.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; feed-reader)', 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const s = await r.text(); if (SAVE) fs.writeFileSync(path.join(SAVE, (i + 1) + '.xml'), s); return s;
  } catch (e) { console.log('  ' + url + ': ' + (e.message || e)); return ''; } finally { clearTimeout(timer); }
}

(async () => {
  const feeds = tsv('feeds.tsv'), now = Date.now(), got = [];
  for (let i = 0; i < feeds.length; i++) {
    const [name, site, url, cat] = feeds[i], s = await read(url, i), items = s.split(/<item[\s>]|<entry[\s>]/).slice(1);
    let kept = 0;
    for (const it of items) {
      const h = dec(tag(it, 'title')), link = dec(tag(it, 'link')) || dec((it.match(/<link[^>]*href="([^"]+)"/) || [])[1]);
      const when = Date.parse(dec(tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date')));
      const why = !h || h.length < 20 || h.length > 220 ? 'length' : !/^https:\/\/[^\s"<>]+$/.test(link) ? 'link' : !(when <= now + 864e5 && when > now - DAYS * 864e5) ? 'date'
        : cat && !new RegExp('<category[^>]*>(?:<!\\[CDATA\\[)?\\s*' + cat + '\\s*(?:\\]\\]>)?</category>').test(it) ? 'category'
        : GRIM.test(h) ? 'grim' : NOW.test(h) ? 'politics' : PROMO.test(h) ? 'promo' : '';
      const b = why ? null : background(h);
      if (ALL) console.log((why ? '  - ' + why.padEnd(9) : b ? '  + ' + b[1].slice(0, 28).padEnd(29) : '  . no name   ') + ' ' + h.slice(0, 130));
      if (!why && b) { got.push({ h, link, name, when, b, w: words(h), fp: feedPic(it) }); kept++; }
    }
    console.log(name + ': ' + items.length + ' items, ' + kept + ' name a page of the site');
  }
  got.sort((a, b) => b.when - a.when);
  const out = [], per = {}, bg = new Set();
  for (const g of got) {
    if (out.length >= MAX) break;
    if ((per[g.name] || 0) >= PER || bg.has(g.b[0]) || out.some(o => same(o.w, g.w))) continue;
    per[g.name] = (per[g.name] || 0) + 1; bg.add(g.b[0]); out.push(g);
  }
  console.log(out.length + ' headlines');
  for (const o of out) console.log('  ' + new Date(o.when).toISOString().slice(0, 10) + '  ' + o.name.padEnd(22) + o.h.slice(0, 100) + '\n' + ' '.repeat(36) + '→ ' + o.b[1] + '  ' + o.b[0]);
  if (out.length < MIN) { console.error('Too few headlines (' + out.length + '): nothing written'); process.exit(1); }
  if (IMG) fs.mkdirSync(IMG, { recursive: true });
  let np = 0;
  for (const o of out) {   // the picture: the feed's own thumbnail on our host, else the background page's picture
    o.own = OWN[o.b[0]] || ''; o.pic = o.own; o.pub = 0;
    if (!IMG || !o.fp) continue;
    const id = require('crypto').createHash('sha1').update(o.link).digest('hex').slice(0, 12);
    if (await fetchPic(o.fp, path.join(IMG, 'n-' + id + '.src'))) { o.pic = '/feeds/n-' + id + '.jpg'; o.pub = 1; np++; }
  }
  console.log('pictures: ' + np + ' from the feeds, ' + out.filter(o => !o.pub && o.pic).length + ' of the Institute, ' + out.filter(o => !o.pic).length + ' none');
  fs.writeFileSync(OUT, JSON.stringify({ t: new Date(now).toISOString().slice(0, 16) + 'Z', items: out.map(o => [o.h, o.link, o.name, new Date(o.when).toISOString().slice(0, 10), o.b[0], o.b[1], o.pic, o.pub, o.own]) }) + '\n');
})().catch(e => { console.error(e); process.exit(2); });
