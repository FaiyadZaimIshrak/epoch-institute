// Joins each final journey with its stops' points (points.tsv, written by check-journeys.js --points):
//   node freeze.js <journeys dir> <out dir>      -> <out dir>/<slug>.json, every stop with "ll": [lat, lng] and "psrc"
// Stops without a point stop it. The drafts' "quote" and "notes" are kept: they are the editor's record.
const fs = require('fs'), path = require('path'), [dir, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const pts = {}; for (const l of fs.readFileSync(path.join(dir, 'points.tsv'), 'utf8').split(/\r?\n/)) { if (!l || l[0] === '#') continue; const r = l.split('\t'); pts[r[0] + '|' + r[1] + '|' + r[2]] = r; }
for (const f of fs.readdirSync(path.join(dir, 'final')).filter(f => f.endsWith('.json'))) {
  const slug = f.slice(0, -5), J = JSON.parse(fs.readFileSync(path.join(dir, 'final', f), 'utf8')); let n = 0;
  J.legs.forEach((l, i) => l.stops.forEach((s, k) => { const p = pts[slug + '|' + (i + 1) + '|' + (k + 1)]; if (!p || p[3] !== s.place) throw new Error(slug + ' ' + (i + 1) + '.' + (k + 1) + ' ' + s.place + ': no point (run check-journeys.js --points on final/)');
    s.ll = [+p[4], +p[5]]; s.psrc = p[6]; n++; }));
  fs.writeFileSync(path.join(out, f), JSON.stringify(J, null, 1) + '\n'); console.log(slug + ': ' + n + ' stops');
}
