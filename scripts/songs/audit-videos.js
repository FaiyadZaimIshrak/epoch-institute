// Songs in History: what each chosen video really is. Reads videos.tsv, fetches each watch page and writes
// videos-audit.tsv (slug, id, channel, category, length, title, first words of the description) with a flag where the
// video may not be a performance: a category other than Music, Entertainment or People & Blogs, a talk-like title
// (news, explained, history of, documentary, lecture, story behind …), or a length under 40 s or over 15 min.
//   node scripts/songs/audit-videos.js [slug ...]
const fs = require('fs'), path = require('path'), D = __dirname, sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en' };
const TALK = /\bnews\b|explain|history of|documentary|lecture|story (of|behind)|the meaning|meaning of|what is|why |interview|report|reaction|lesson|tutorial|learn |podcast|analysis|facts|origin of|how .* (became|was)|\bvs\b|ranking|top \d+/i;
(async () => {
  const only = process.argv.slice(2);
  const rows = fs.readFileSync(path.join(D, 'videos.tsv'), 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => l.split('\t'))
    .filter(r => !only.length || only.includes(r[0]));
  const out = ['slug\tid\tflag\tchannel\tcategory\tseconds\ttitle\tdescription'];
  for (const [slug, id] of rows) {
    let cat = '', len = 0, title = '', ch = '', desc = '';
    for (let t = 0; t < 3 && !title; t++) {
      try {
        const h = await (await fetch('https://www.youtube.com/watch?v=' + id + '&hl=en', { headers: UA })).text();
        const m = h.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});(?:var|<\/script>)/s);
        if (m) { const j = JSON.parse(m[1]), v = j.videoDetails || {}, mf = (j.microformat || {}).playerMicroformatRenderer || {};
          title = v.title || ''; ch = v.author || ''; len = +v.lengthSeconds || 0; desc = (v.shortDescription || '').replace(/\s+/g, ' ').slice(0, 220); cat = mf.category || ''; }
      } catch (e) {}
      if (!title) await sleep(5000);
    }
    const flags = [];
    if (!title) flags.push('UNREAD');
    if (cat && !/^(Music|Entertainment|People & Blogs)$/.test(cat)) flags.push('CAT');
    if (TALK.test(title)) flags.push('TITLE');
    if (title && (len < 40 || len > 900)) flags.push('LEN');
    out.push([slug, id, flags.join(','), ch, cat, len, title, desc].join('\t'));
    process.stdout.write((flags.length ? '!' : '.'));
    await sleep(1200);
  }
  fs.writeFileSync(path.join(D, 'videos-audit.tsv'), out.join('\n') + '\n');
  console.log('\n' + (out.length - 1) + ' videos;', out.filter(l => /\t[A-Z,]+\t/.test(l)).length, 'flagged → videos-audit.tsv');
})();
