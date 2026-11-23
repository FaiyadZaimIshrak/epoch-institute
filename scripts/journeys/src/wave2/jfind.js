// node jfind.js <regex> : the journeys' public texts (title, intro, ending, leg titles, stop texts) that match
const fs = require('fs'); const re = new RegExp(process.argv[2], 'i');
for (const f of fs.readdirSync('out').filter(x => x.endsWith('.json')).sort()) { const j = JSON.parse(fs.readFileSync('out/' + f, 'utf8')); const parts = [['title', j.title], ['intro', j.intro], ['ending', j.ending]];
  (j.legs || []).forEach((l, i) => { parts.push(['leg ' + (i + 1), l.title]); (l.stops || []).forEach((s, k) => parts.push([(i + 1) + '.' + (k + 1) + ' ' + s.place, s.text])); });
  for (const [k, v] of parts) for (const s of String(v || '').split(/(?<=[.!?])\s+/)) if (re.test(s)) console.log(j.slug + ' [' + k + '] ' + s.slice(0, 330)); }
