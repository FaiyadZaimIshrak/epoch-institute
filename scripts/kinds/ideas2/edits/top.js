// The editor's compact read of the work drafts: info, the four facts, takeaways, did-you-know, events and summary.
//   node top.js <from> <count> [section name to print too]
const fs = require('fs'), path = require('path'); const [from, count, sec] = process.argv.slice(2);
const plain = s => String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const dir = path.join(__dirname, 'out'), files = fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort().slice(+from, +from + +count);
for (const f of files) { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  console.log('== ' + f.replace('.json', '') + ' [' + j.name + ' | ' + j.region + '] ' + j.start + (j.circa ? 'c' : '') + '..' + (j.end == null ? 'now' : j.end + (j.endCirca ? 'c' : '')) + (j.span ? ' span=' + j.span : '') + ' refs=' + (j.references || []).length);
  console.log(' I ' + plain(j.info)); for (const k in j.facts) console.log(' F.' + k + ' ' + plain(j.facts[k]));
  (j.t || []).forEach((t, i) => console.log(' T' + (i + 1) + ' ' + plain(t))); console.log(' D ' + plain(j.dyk));
  (j.ev || []).forEach(e => console.log(' E ' + e[0] + ' :: ' + plain(e[1]))); console.log(' S ' + plain(j.summary));
  if (sec && j.sections[sec]) console.log(' [' + sec + '] ' + plain(j.sections[sec])); }
