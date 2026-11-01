// Songs in History: finds candidate source pages for a song's words. node scripts/songs/find-pages.js site "query" ...
// site: a Wikisource code (en, fr, ar …) or w-xx for a Wikipedia. Prints page titles with a snippet, for choosing by eye.
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const host = site => site.startsWith('w-') ? site.slice(2) + '.wikipedia.org' : site + '.wikisource.org';
(async () => {
  const [site, ...qs] = process.argv.slice(2);
  for (const q of qs) {
    const r = await fetch(`https://${host(site)}/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=${encodeURIComponent(q)}`, { headers: UA });
    const j = await r.json(); console.log('== ' + site + ': ' + q);
    for (const x of (j.query && j.query.search) || []) console.log('  ' + x.title + ' :: ' + x.snippet.replace(/<[^>]+>/g, '').slice(0, 90));
    await sleep(6000);
  }
})();
