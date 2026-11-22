// Gives every register state without a full profile a row in the site search (search-index.js SEARCH_STATES: [id,
// name, type, aliases, 1 if it has a picture]) and its /search filters (search-facets.js s: [first century, last
// century, region index, picture]), appended at the end of both lists so that they stay row for row (Nov 2026: the
// states added by scripts/states/merge-register.js had none; make-search-states.ps1, which wrote the list, was lost).
// A state with a profile is found through the profile, as before. Run it after the texts and pictures are written.
//   node scripts/states/search-rows.js [--write]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), WRITE = process.argv.includes('--write');
const SI = path.join(R, 'search-index.js'), SF = path.join(R, 'search-facets.js');
const si = fs.readFileSync(SI, 'utf8'), sf = fs.readFileSync(SF, 'utf8');
const S = new Function(si + ';return SEARCH_STATES')(), F = new Function(sf + ';return SEARCH_FACETS')();
if (S.length !== F.s.length || F.ns !== S.length) throw new Error('search-facets.js does not match SEARCH_STATES: ' + S.length + ' rows, ' + F.s.length + ' facets');
const have = new Set(S.map(r => r[0])), P = JSON.parse(fs.readFileSync(path.join(R, 'data', 'polities.json'), 'utf8')).nodes;
const cent = y => y < 0 ? -(Math.floor(-y / 100) + 1) : Math.floor(y / 100) + 1;
const rows = [], facets = [];
for (const n of P) {
  if (have.has(n.id) || n.p) continue;
  const pic = fs.existsSync(path.join(R, 'images', 'states', n.id + '.jpg')) ? 1 : 0;
  rows.push(JSON.stringify([n.id, n.n, n.t, (n.a || []).join('|')].concat(pic ? [1] : [])));
  facets.push('[' + [cent(n.s), cent(n.e == null ? 2025 : n.e), F.R.indexOf(n.b), pic].join(',') + ']');
}
console.log(rows.length + ' states get a search row');
if (!rows.length || !WRITE) process.exit(0);
const eol = si.includes('\r\n') ? '\r\n' : '\n';
const iS = si.indexOf('var SEARCH_STATES = ['), iE = si.indexOf(eol + '];', iS);
if (iS < 0 || iE < 0) throw new Error('search-index.js: SEARCH_STATES not found');
fs.writeFileSync(SI, si.slice(0, iE) + ',' + eol + rows.join(',' + eol) + si.slice(iE));
const iF = sf.indexOf('\ns:['); if (iF < 0) throw new Error('search-facets.js: the s rows were not found');
const lineEnd = sf.indexOf('\n', iF + 1), line = sf.slice(iF + 1, lineEnd < 0 ? sf.length : lineEnd).replace(/\r$/, '');
const close = line.lastIndexOf(']'); if (close < 0) throw new Error('search-facets.js: the s line has no end');
const line2 = line.slice(0, close) + ',' + facets.join(',') + line.slice(close);
let out = sf.replace(line, line2).replace(/ns:\d+/, 'ns:' + (S.length + rows.length));
fs.writeFileSync(SF, out);
const chk = new Function(fs.readFileSync(SI, 'utf8') + ';return SEARCH_STATES')().length, chf = new Function(out + ';return SEARCH_FACETS')();
if (chk !== chf.s.length || chf.ns !== chk) throw new Error('after writing: ' + chk + ' rows, ' + chf.s.length + ' facets');
console.log('written: ' + chk + ' rows and facets');
