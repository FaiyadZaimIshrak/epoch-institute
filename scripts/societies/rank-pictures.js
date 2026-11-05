// Pictures for the ranks of the social ladders that have no fitting entry picture (scripts/society-pictures.tsv), chosen
// BY EYE on contact sheets of Wikimedia Commons searches: period art first, else a later engraving, painting, photograph
// or museum piece of the same people; never fantasy art, film stills or a degrading scene. Only free licences (public
// domain, CC0, CC BY, CC BY-SA; never NC or ND). Rebuilt Nov 2026 (the October tools were lost with their session).
//   node scripts/societies/rank-pictures.js need <ladder files…>                the ranks without a picture: <slug>-<n> TAB name
//   node scripts/societies/rank-pictures.js cands <queries.tsv> <cands.json>    queries: <slug>-<n> TAB query | query …
//   node scripts/societies/rank-pictures.js fetch <cands.json> <cache dir>       320 px thumbnails + credit, 3 s apart
//   node scripts/societies/rank-pictures.js sheet <cands.json> <cache dir> <out.html> [keys]   numbered "<key>.<k>"
//   node scripts/societies/rank-pictures.js apply <picks.tsv> <cands.json> <cache dir>
// picks: <slug>-<n> TAB k TAB caption [TAB crop x,y,w,h in per cent]. apply fetches an 800 px copy, crops it, scales it to
// at most 320 px wide, writes images/societies/<slug>-<n>.jpg and appends the row to scripts/society-pictures.tsv (a key
// already there is skipped). The 112 px thumbs/ copies are made by scripts/make-thumbs.ps1 (build-pages.ps1 runs it).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org; social ladder pictures)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const [cmd, ...a] = process.argv.slice(2);
async function getJson(u) {
  for (let i = 0; i < 8; i++) {
    try { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(1000 * (+r.headers.get('retry-after') || 30)); continue; } if (r.ok) return await r.json(); } catch (e) {}
    await sleep(3000 * (i + 1));
  }
  return null;
}
async function getBin(u) {
  for (let t = 0; t < 8; t++) {
    try {
      const r = await fetch(u, { headers: UA });
      if (r.status === 429) { const w = +r.headers.get('retry-after') || 600; process.stdout.write(' [429: waiting ' + w + ' s] '); await sleep(w * 1000 + 5000); continue; }
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch (e) { await sleep(5000); }
  }
  return null;
}
const strip = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const FREE = l => /^(public domain|pd\b|cc0|cc by(-sa)? \d|cc by(-sa)?$|cc-by|attribution|gfdl)/i.test(l) && !/\b(nc|nd)\b/i.test(l);
// PowerShell names ignore case: $W would be $w (the source width), so the sizes are $sw/$sh and $dw/$dh
const ps = s => s.replace(/'/g, "''");
if (cmd === 'need') {
  // a rank has a picture when its own picture: slug, else its first person, else its first term, is an entry with img:
  const E = fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8'), IMG = new Set();
  for (const m of E.matchAll(/^  \{slug:"([^"]+)".*,img:"/gm)) IMG.add(m[1]);
  const have = new Set(fs.readFileSync(path.join(R, 'scripts', 'society-pictures.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t').slice(0, 2).join('-')));
  for (const f of a) {
    const slug = path.basename(f, '.txt'), tiers = []; let cur = null;
    for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      if (/^==\s*tier\s*$/.test(l)) { cur = {}; tiers.push(cur); continue; } if (/^==/.test(l)) { cur = null; continue; }
      const m = cur && l.match(/^(\w+):\s*(.*)$/); if (m) cur[m[1]] = m[2].trim();
    }
    tiers.forEach((t, i) => {
      const key = slug + '-' + (i + 1); if (have.has(key)) return;
      const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
      const pic = t.picture && t.picture !== '-' ? [t.picture] : [];
      const cand = t.picture === '-' ? [] : [...pic, ...list(t.people), ...list(t.terms)];
      if (!cand.some(s => IMG.has(s))) console.log(key + '\t' + t.name + (t.term && t.term !== '-' ? ' (' + t.term + ')' : ''));
    });
  }
} else if (cmd === 'cands') {
  const [list, out] = a;
  (async () => {
    const rows = fs.readFileSync(list, 'utf8').split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).map(l => l.split('\t'));
    const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
    for (const [key, qs] of rows) {
      if (res[key]) continue;
      const files = [];
      for (const q of qs.split('|').map(s => s.trim()).filter(Boolean)) {
        const j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&list=search&srnamespace=6&srlimit=8&srsearch=' + encodeURIComponent(q + ' filetype:bitmap'));
        for (const s of (j && j.query && j.query.search) || []) { const t = s.title.replace(/^File:/, ''); if (!files.includes(t) && /\.(jpe?g|png|gif)$/i.test(t)) files.push(t); }
        await sleep(800);
      }
      res[key] = { query: qs, files: files.slice(0, 12) };
      fs.writeFileSync(out, JSON.stringify(res, null, 1)); process.stdout.write(files.length ? '+' : '.');
    }
    console.log('\n' + Object.keys(res).length + ' ranks, ' + Object.values(res).filter(r => r.files.length).length + ' with candidates');
  })();
} else if (cmd === 'fetch') {
  const [cf, dir] = a; fs.mkdirSync(dir, { recursive: true });
  (async () => {
    const C = JSON.parse(fs.readFileSync(cf, 'utf8')); let n = 0, skip = 0;
    for (const [key, c] of Object.entries(C)) {
      for (let k = 0; k < c.files.length; k++) {
        const base = path.join(dir, key + '.' + (k + 1)); if (fs.existsSync(base + '.json')) continue;
        const j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata|mime|size&iiurlwidth=320&titles=' + encodeURIComponent('File:' + c.files[k]));
        const ii = j && j.query && j.query.pages && j.query.pages[0] && j.query.pages[0].imageinfo && j.query.pages[0].imageinfo[0];
        if (!ii) { fs.writeFileSync(base + '.json', JSON.stringify({ file: c.files[k], error: 'no imageinfo' })); continue; }
        const m = ii.extmetadata || {}, lic = strip((m.LicenseShortName || {}).value), artist = strip((m.Artist || {}).value) || 'Unknown author';
        const meta = { file: c.files[k], licence: lic, artist, mime: ii.mime, width: ii.width, desc: strip((m.ImageDescription || {}).value).slice(0, 300), date: strip((m.DateTimeOriginal || {}).value).slice(0, 60) };
        if (!FREE(lic) || !/^image\/(jpeg|png|gif)$/.test(ii.mime)) { meta.error = 'not used: ' + lic + ' ' + ii.mime; fs.writeFileSync(base + '.json', JSON.stringify(meta)); skip++; continue; }
        const b = await getBin(ii.thumburl);
        if (b) { fs.writeFileSync(base + '.' + (ii.mime === 'image/jpeg' ? 'jpg' : ii.mime === 'image/png' ? 'png' : 'gif'), b); fs.writeFileSync(base + '.json', JSON.stringify(meta)); n++; process.stdout.write('+'); }
        await sleep(3000 + Math.random() * 2000);
      }
    }
    console.log('\n' + n + ' thumbnails fetched, ' + skip + ' files not free or not pictures');
  })();
} else if (cmd === 'sheet') {
  const [cf, dir, out, keys] = a; const C = JSON.parse(fs.readFileSync(cf, 'utf8')), only = keys ? new Set(keys.split(',')) : null;
  let h = '<!doctype html><meta charset="utf-8"><style>body{font:12px sans-serif;background:#222;color:#eee;margin:8px;width:1500px}div.p{margin:0 0 12px}h3{margin:0 0 3px;font-size:14px;color:#e8c97a}figure{display:inline-block;margin:0 5px 4px 0;width:180px;vertical-align:top}img{width:180px;height:150px;object-fit:contain;background:#111}figcaption{font-size:10px;line-height:1.2;max-height:36px;overflow:hidden}b{color:#fff;font-size:12px}</style>';
  for (const [key, c] of Object.entries(C)) {
    if (only && !only.has(key)) continue;
    const figs = [];
    for (let k = 1; k <= c.files.length; k++) {
      const b = path.join(dir, key + '.' + k), ext = ['jpg', 'png', 'gif'].find(e => fs.existsSync(b + '.' + e)); if (!ext) continue;
      figs.push('<figure><img src="file:///' + (b + '.' + ext).replace(/\\/g, '/') + '"><figcaption><b>' + k + '</b> ' + c.files[k - 1].replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</figcaption></figure>');
    }
    h += '<div class="p"><h3>' + key + ' · ' + String(c.query).replace(/</g, '&lt;') + '</h3>' + (figs.join('') || '<i>none</i>') + '</div>';
  }
  fs.writeFileSync(out, h); console.log('sheet written: ' + out);
} else if (cmd === 'apply') {
  const [pf, cf, dir] = a; const C = JSON.parse(fs.readFileSync(cf, 'utf8')), TSV = path.join(R, 'scripts', 'society-pictures.tsv');
  const have = new Set(fs.readFileSync(TSV, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t').slice(0, 2).join('-')));
  (async () => {
    const add = [], miss = []; fs.mkdirSync(path.join(R, 'images', 'societies'), { recursive: true });
    for (const l of fs.readFileSync(pf, 'utf8').split(/\r?\n/)) {
      if (!l.trim() || l.startsWith('#')) continue; const [key, k, caption, crop] = l.split('\t'); if (!k || k === '-') continue;
      if (have.has(key)) continue;
      const mm = key.match(/^(.+)-(\d+)$/), metaF = path.join(dir, key + '.' + k + '.json'); if (!mm || !fs.existsSync(metaF)) { miss.push(key + '.' + k + ' (no candidate)'); continue; }
      const meta = JSON.parse(fs.readFileSync(metaF, 'utf8')); if (meta.error) { miss.push(key + '.' + k + ' ' + meta.error); continue; }
      const j = await getJson('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&iiurlwidth=800&titles=' + encodeURIComponent('File:' + meta.file));
      const ii = j && j.query.pages[0].imageinfo && j.query.pages[0].imageinfo[0], bin = ii && await getBin(ii.thumburl);
      if (!bin) { miss.push(key + ' (download failed)'); continue; }
      const tmp = path.join(dir, key + '.big'), dest = path.join(R, 'images', 'societies', key + '.jpg'); fs.writeFileSync(tmp, bin);
      const [cx, cy, cw, ch] = (crop || '0,0,100,100').split(',').map(Number);
      cp.execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Drawing; $s=[Drawing.Image]::FromFile('${ps(tmp)}');
        $x=[int]($s.Width*${cx}/100); $y=[int]($s.Height*${cy}/100); $sw=[int]($s.Width*${cw}/100); $sh=[int]($s.Height*${ch}/100);
        $dw=[Math]::Min(320,$sw); $dh=[int]($sh*$dw/$sw); $c=New-Object Drawing.Bitmap $dw,$dh; $g=[Drawing.Graphics]::FromImage($c);
        $g.InterpolationMode='HighQualityBicubic'; $g.Clear([Drawing.Color]::White); $g.DrawImage($s,(New-Object Drawing.Rectangle 0,0,$dw,$dh),(New-Object Drawing.Rectangle $x,$y,$sw,$sh),[Drawing.GraphicsUnit]::Pixel);
        $enc=[Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}; $p=New-Object Drawing.Imaging.EncoderParameters 1; $p.Param[0]=[Drawing.Imaging.EncoderParameter]::new([Drawing.Imaging.Encoder]::Quality,[long]85);
        $c.Save('${ps(dest)}',$enc,$p); $g.Dispose(); $c.Dispose(); $s.Dispose()`]);
      fs.unlinkSync(tmp); if (!fs.existsSync(dest) || !fs.statSync(dest).size) { miss.push(key + ' (the picture could not be written)'); continue; }
      add.push([mm[1], mm[2], caption, meta.file, meta.artist.slice(0, 140), meta.licence, crop || ''].join('\t')); process.stdout.write('+'); await sleep(3000);
    }
    if (add.length) fs.writeFileSync(TSV, fs.readFileSync(TSV, 'utf8').replace(/\n*$/, '\n') + add.join('\n') + '\n');
    console.log('\n' + add.length + ' pictures applied' + (miss.length ? '\n  ' + miss.join('\n  ') : ''));
  })();
} else { console.error('usage: rank-pictures.js need|cands|fetch|sheet|apply …'); process.exit(1); }
