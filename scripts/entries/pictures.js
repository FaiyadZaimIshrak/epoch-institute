// Pictures for new encyclopedia entries (A7, Nov 2026), chosen BY EYE: candidates from the article's lead image and its
// Wikidata item's image (P18), downloaded slowly as 320 px Commons thumbnails with their credit, shown on a contact sheet,
// and the editor's picks copied to images/encyclopedia/<slug>.jpg with img and credit written into
// scripts/added-entries.json. Only free licences are kept (public domain, CC0, CC BY, CC BY-SA; never NC or ND).
//   node scripts/entries/pictures.js cands <list.tsv> <cands.json>       list: slug <TAB> Wikipedia title
//   node scripts/entries/pictures.js fetch <cands.json> <cache dir>       320 px thumbnails + meta, 3 s apart (429: waits)
//   node scripts/entries/pictures.js sheet <cands.json> <cache dir> <out.html>   numbered "<slug>.<k>"
//   node scripts/entries/pictures.js apply <picks.txt> <cands.json> <cache dir>  picks: slug <TAB> k ("-" = none)
// apply writes JPEGs (a PNG or GIF thumbnail is converted by PowerShell's System.Drawing on white) and needs the
// entries already in added-entries.json (it fills img and credit; an entry that has a picture keeps it).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org; encyclopedia pictures)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [cmd, ...a] = process.argv.slice(2);
async function getJson(u) {
  for (let i = 0; i < 8; i++) {
    try { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(1000 * (+r.headers.get('retry-after') || 30)); continue; } if (r.ok) return await r.json(); } catch (e) {}
    await sleep(3000 * (i + 1));
  }
  return null;
}
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const FREE = l => /^(public domain|pd\b|cc0|cc by(-sa)? \d|cc by(-sa)?$|cc-by|attribution|gfdl)/i.test(l) && !/\b(nc|nd)\b/i.test(l);
if (cmd === 'cands') {
  const [list, out] = a;
  (async () => {
    const rows = fs.readFileSync(list, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
    const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
    for (const [slug, title] of rows) {
      if (res[slug]) continue;
      const files = [];
      const j = await getJson('https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1&prop=pageimages|pageprops&piprop=name&ppprop=wikibase_item&titles=' + encodeURIComponent(title));
      const p = j && j.query && j.query.pages && j.query.pages[0];
      if (p && p.pageimage) files.push(p.pageimage.replace(/_/g, ' '));
      const q = p && p.pageprops && p.pageprops.wikibase_item;
      if (q) {
        const w = await getJson('https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&property=P18&entity=' + q);
        for (const c of (w && w.claims && w.claims.P18) || []) { const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; if (v && !files.includes(v)) files.push(v); }
      }
      res[slug] = { title, files: files.slice(0, 3) };
      fs.writeFileSync(out, JSON.stringify(res, null, 1)); process.stdout.write(files.length ? '+' : '.'); await sleep(500);
    }
    console.log('\n' + Object.keys(res).length + ' entries, ' + Object.values(res).filter(r => r.files.length).length + ' with a candidate');
  })();
} else if (cmd === 'fetch') {
  const [cf, dir] = a; fs.mkdirSync(dir, { recursive: true });
  (async () => {
    const C = JSON.parse(fs.readFileSync(cf, 'utf8')); let n = 0, skip = 0;
    for (const [slug, c] of Object.entries(C)) {
      for (let k = 0; k < c.files.length; k++) {
        const base = path.join(dir, slug + '.' + (k + 1)); if (fs.existsSync(base + '.json')) continue;
        const j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=320&titles=' + encodeURIComponent('File:' + c.files[k]));
        const ii = j && j.query && j.query.pages && j.query.pages[0] && j.query.pages[0].imageinfo && j.query.pages[0].imageinfo[0];
        if (!ii) { fs.writeFileSync(base + '.json', JSON.stringify({ file: c.files[k], error: 'no imageinfo' })); continue; }
        const m = ii.extmetadata || {}, lic = strip((m.LicenseShortName || {}).value), artist = strip((m.Artist || {}).value) || 'Unknown author';
        const meta = { file: c.files[k], licence: lic, artist, source: 'https://commons.wikimedia.org/wiki/File:' + c.files[k].replace(/ /g, '_'), mime: ii.mime, desc: strip((m.ImageDescription || {}).value).slice(0, 200) };
        if (!FREE(lic) || !/^image\/(jpeg|png|gif)$/.test(ii.mime)) { meta.error = 'not used: ' + lic + ' ' + ii.mime; fs.writeFileSync(base + '.json', JSON.stringify(meta)); skip++; continue; }
        let ok = false;
        for (let t = 0; t < 8 && !ok; t++) {
          try {
            const r = await fetch(ii.thumburl, { headers: UA });
            if (r.status === 429) { const w = +r.headers.get('retry-after') || 600; process.stdout.write(' [429: waiting ' + w + ' s] '); await sleep(w * 1000 + 5000); continue; }
            if (r.ok) { fs.writeFileSync(base + '.' + (ii.mime === 'image/jpeg' ? 'jpg' : ii.mime === 'image/png' ? 'png' : 'gif'), Buffer.from(await r.arrayBuffer())); ok = true; }
          } catch (e) { await sleep(5000); }
        }
        if (ok) { fs.writeFileSync(base + '.json', JSON.stringify(meta)); n++; process.stdout.write('+'); }
        await sleep(3000 + Math.random() * 2000);
      }
    }
    console.log('\n' + n + ' thumbnails fetched, ' + skip + ' files not free or not pictures');
  })();
} else if (cmd === 'sheet') {
  const [cf, dir, out] = a; const C = JSON.parse(fs.readFileSync(cf, 'utf8'));
  let h = '<!doctype html><meta charset="utf-8"><style>body{font:12px sans-serif;background:#222;color:#eee;margin:8px}div.p{display:inline-block;vertical-align:top;margin:0 6px 10px 0;width:410px}h3{margin:0 0 3px;font-size:13px;color:#e8c97a}figure{display:inline-block;margin:0 4px 0 0;width:130px;vertical-align:top}img{width:130px;height:110px;object-fit:contain;background:#111}figcaption{font-size:10px;word-break:break-all}</style>';
  for (const [slug, c] of Object.entries(C)) {
    const figs = []; for (let k = 1; k <= c.files.length; k++) { const b = path.join(dir, slug + '.' + k); const ext = ['jpg', 'png', 'gif'].find(e => fs.existsSync(b + '.' + e)); if (ext) figs.push('<figure><img src="file:///' + (b + '.' + ext).replace(/\\/g, '/') + '"><figcaption>' + slug + '.' + k + '</figcaption></figure>'); }
    if (figs.length) h += '<div class="p"><h3>' + slug + '</h3>' + figs.join('') + '</div>';
  }
  fs.writeFileSync(out, h); console.log('sheet written: ' + out);
} else if (cmd === 'apply') {
  const [pf, cf, dir] = a; const AE = path.join(R, 'scripts', 'added-entries.json'), A = JSON.parse(fs.readFileSync(AE, 'utf8'));
  const by = {}; for (const e of A.entries) by[e.slug] = e; let n = 0; const miss = [];
  for (const l of fs.readFileSync(pf, 'utf8').split(/\r?\n/)) {
    if (!l.trim() || l.startsWith('#')) continue; const [slug, k] = l.split('\t'); if (!k || k === '-') continue;
    const e = by[slug]; if (!e) { miss.push(slug + ' (not in added-entries.json)'); continue; } if (e.img) continue;
    const b = path.join(dir, slug + '.' + k), ext = ['jpg', 'png', 'gif'].find(x => fs.existsSync(b + '.' + x)); if (!ext) { miss.push(slug + '.' + k + ' (no file)'); continue; }
    const meta = JSON.parse(fs.readFileSync(b + '.json', 'utf8')), dest = path.join(R, 'images', 'encyclopedia', slug + '.jpg');
    if (ext === 'jpg') fs.copyFileSync(b + '.jpg', dest);
    else cp.execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Drawing; $s=[Drawing.Image]::FromFile('${(b + '.' + ext).replace(/'/g, "''")}'); $c=New-Object Drawing.Bitmap $s.Width,$s.Height; $g=[Drawing.Graphics]::FromImage($c); $g.Clear([Drawing.Color]::White); $g.DrawImage($s,0,0,$s.Width,$s.Height); $c.Save('${dest.replace(/'/g, "''")}',[Drawing.Imaging.ImageFormat]::Jpeg); $g.Dispose(); $c.Dispose(); $s.Dispose()`]);
    e.img = '/images/encyclopedia/' + slug + '.jpg'; e.credit = { artist: meta.artist.slice(0, 140), licence: meta.licence, source: meta.source }; n++;
  }
  fs.writeFileSync(AE, JSON.stringify(A, null, 1) + '\n');
  console.log(n + ' pictures applied' + (miss.length ? '\n  ' + miss.join('\n  ') : ''));
} else { console.error('usage: pictures.js cands|fetch|sheet|apply …'); process.exit(1); }
