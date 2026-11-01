// Songs in History: finds where a song's words may be held, through Wikidata. node scripts/songs/find-sources.js
// <slugs.tsv> <out.txt> [slug ...]   (slugs.tsv: slug, English Wikipedia title, …, as fetch-wp.js writes it)
// For each song: its Wikidata item's Wikisource pages (any language) and the Wikipedia article in the song's own
// language (from scripts/songs/<slug>.txt "language:"), each peeked with fetch-texts.js: the page's verse-like blocks
// (two lines or more, short lines) with their stanza numbers and first words, for choosing a select by eye.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { for (let i = 0; i < 5; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return r.json(); } catch (e) {} await sleep(8000 * (i + 1)); } return null; };
(async () => {
  const [list, outF, ...only] = process.argv.slice(2), out = [];
  const rows = fs.readFileSync(list, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
  for (const [slug, title] of rows) {
    if (only.length && !only.includes(slug)) continue;
    const sf = path.join(__dirname, slug + '.txt'); if (!fs.existsSync(sf)) continue;
    const st = fs.readFileSync(sf, 'utf8'), status = (st.match(/^status:\s*(\w+)/m) || [])[1];
    if (status !== 'pd') continue;
    const langs = ((st.match(/^language:\s*(.*)$/m) || [])[1] || '').split(';').map(s => s.split('|')[0].trim()).filter(Boolean);
    const j = await get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(title));
    const p = j && Object.values(j.query.pages)[0], q = p && p.pageprops && p.pageprops.wikibase_item;
    const cands = [];
    if (q) {
      const w = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&ids=' + q);
      const sl = (w && w.entities[q].sitelinks) || {};
      for (const [k, v] of Object.entries(sl)) { const m = k.match(/^(\w+?)wikisource$/); if (m) cands.push((m[1] === 'mul' ? 'mul' : m[1]) + ':' + v.title); }
      for (const l of langs) { const k = l.replace(/-/g, '_') + 'wiki'; if (sl[k] && l !== 'en') cands.push('w-' + l + ':' + sl[k].title); }
    }
    cands.push('w-en:' + title);
    out.push('######## ' + slug + ' (' + langs.join(', ') + ')');
    for (const c of cands) {
      let o; try { o = execFileSync(process.execPath, [path.join(__dirname, 'fetch-texts.js'), '--peek=' + c], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { out.push('  ' + c + ': ' + (e.stdout || e.message).split('\n')[0].slice(0, 80)); continue; }
      const ls = o.split('\n'), verse = ls.slice(1).filter(l => { const m = l.match(/^\s*(\d+)\s+(\d+) lines: (.*)$/); return m && +m[2] >= 2 && m[3].length < 60; });
      out.push('  ' + c + '  [' + ls[0].split('|')[1].trim() + ']' + (verse.length ? '' : '  (no verse blocks)'));
      for (const v of verse.slice(0, 14)) out.push('    ' + v.trim());
      if (verse.length > 14) out.push('    … ' + (verse.length - 14) + ' more');
      await sleep(1500);
    }
    fs.writeFileSync(outF, out.join('\n') + '\n');
  }
  console.log('written', outF);
})();
