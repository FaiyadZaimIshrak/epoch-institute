// Lists YouTube search results (id | channel | title | length | views) for choosing performances by eye.
//   node yt-search.js "query" ["query" ...]
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EpochInstitute/1.0 (the-epoch-institute.org)', 'Accept-Language': 'en' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function walk(o, out) {
  if (!o || typeof o !== 'object') return;
  if (o.videoRenderer) { const v = o.videoRenderer; out.push([v.videoId, (v.ownerText && v.ownerText.runs || []).map(r => r.text).join(''), (v.title && v.title.runs || []).map(r => r.text).join(''), v.lengthText && v.lengthText.simpleText || '', v.viewCountText && v.viewCountText.simpleText || '']); return; }
  for (const k in o) walk(o[k], out);
}
(async () => {
  for (const q of process.argv.slice(2)) {
    const r = await fetch('https://www.youtube.com/results?hl=en&search_query=' + encodeURIComponent(q), { headers: UA });
    const h = await r.text(), m = h.match(/var ytInitialData = (\{.*?\});<\/script>/s);
    console.log('== ' + q);
    if (!m) { console.log('  (no data, status ' + r.status + ')'); continue; }
    const out = []; walk(JSON.parse(m[1]), out);
    for (const v of out.slice(0, +(process.env.N || 8))) console.log('  ' + v.join(' | '));
    await sleep(1500);
  }
})();
