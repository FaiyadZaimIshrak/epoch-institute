// Wikipedia title search for places the checker could not resolve: node wp-search.js "query" ["query" …]
const UA = { 'User-Agent': 'EpochInstituteAudit/1.0 (https://the-epoch-institute.org; research@the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  for (const q of process.argv.slice(2)) {
    const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=6&gsrsearch=' + encodeURIComponent(q) + '&prop=coordinates|description|pageprops&ppprop=disambiguation', { headers: UA });
    const j = await r.json(), pages = Object.values((j.query || {}).pages || {}).sort((a, b) => a.index - b.index);
    console.log('== ' + q); for (const p of pages) console.log('   ' + p.title + ' | ' + (p.description || '') + ' | ' + (p.pageprops && 'disambiguation' in p.pageprops ? 'DISAMBIG' : p.coordinates ? p.coordinates[0].lat.toFixed(2) + ',' + p.coordinates[0].lon.toFixed(2) : 'no coords'));
    await sleep(1500);
  }
})();
