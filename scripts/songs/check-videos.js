// Songs in History: checks YouTube videos through the oEmbed endpoint: exists and embeddable, its title and channel.
//   node scripts/songs/check-videos.js id id ...          prints each candidate (for choosing)
//   node scripts/songs/check-videos.js   checks the chosen videos (slug, id, channel, note) and writes
//                                             videos-checked.json {slug: {id, title, channel, ok, checked}}
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
async function oe(id) {
  try { const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { headers: UA });
    if (!r.ok) return { ok: false, status: r.status }; const j = await r.json(); return { ok: true, title: j.title, channel: j.author_name }; }
  catch (e) { return { ok: false, status: e.message }; }
}
(async () => {
  const ids = process.argv.slice(2), file = ids.length ? '' : 'videos.tsv';
  if (!file) { for (const id of ids) { const r = await oe(id); console.log(id, r.ok ? `| ${r.channel} | ${r.title}` : `| NOT AVAILABLE (${r.status})`); await sleep(400); } return; }
  const rows = fs.readFileSync(path.join(__dirname, file), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'));
  const out = {}; let bad = 0;
  for (const [slug, id, channel, note] of rows) {
    const r = await oe(id); out[slug] = { id, title: r.title || '', channel: r.channel || channel, note: note || '', ok: r.ok, checked: new Date().toISOString().slice(0, 10) };
    if (!r.ok) { bad++; console.log('FAILED', slug, id, r.status); } else if (channel && r.channel !== channel) console.log('CHANNEL CHANGED', slug, id, channel, '->', r.channel);
    await sleep(400);
  }
  fs.writeFileSync(path.join(__dirname, 'videos-checked.json'), JSON.stringify(out, null, 1));
  console.log(rows.length, 'checked,', bad, 'failed');
})();
