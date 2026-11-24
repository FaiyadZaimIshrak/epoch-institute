// The editor's changes to the faith maps: a line whose year the writer set without support in the article is taken out or
// set to the year the article gives.   node fix-maps.js      (run in the rel3 folder; out/<slug>.faith.tsv)
// Mormonism's years for Kirtland (1831), Nauvoo (1839) and the Salt Lake Valley (1847), which its own article does not
// give, were found in a second saved article (wp2/mormonism-history.txt) and stay.
const fs = require('fs'), path = require('path');
const DEL = {   // slug: [line prefixes to delete]
  'candomble': ['area\tArgentina and Uruguay', 'area\tWestern Europe'],
  'caodaism': ['area\tNorth America', 'area\tCambodia', 'area\tEurope', 'area\tAustralia'],
  'korean-shamanism': ["area\tJapan's Korean minority", 'mark\tplace\t1910\tInwangsan'],
  'mandaeism': ['area\tSydney and Australia'],
  'native-american-church': ['area\tMenominee country', 'area\tNavajo country', 'area\tSaskatchewan and Alberta', 'area\tMexico'],
  'santeria': ['area\tVeracruz and Mexico City', 'area\tToronto', 'area\tSpain and Germany', 'route\t1960\t23.13,-82.38 > 19.43,-99.13'],
  'tenrikyo': ['area\tSoutheast Asia', 'area\tAmericas', 'route\t1950', 'mark\tplace\t1950'],
  'spiritism': ['area\tCuba'],
};
const REP = {   // slug: [[old, new]], each once
  'candomble': [['route\t1900\t', 'route\t1890\t']],
  'korean-shamanism': [['\t80\t1400\t', '\t80\t1702\t']],
  'rastafari': [['\t500\t1964\t', '\t500\t1960\t']],
  'hittite-religion': [['mark\tplace\t-1250\tNerik', 'mark\tplace\t-1600\tNerik']],
  'hawaiian-religion': [['no later than 800 AD', 'no later than 800 CE']],
};
let n = 0;
for (const slug of new Set([...Object.keys(DEL), ...Object.keys(REP)])) { const f = path.join('out', slug + '.faith.tsv'); let L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  for (const p of DEL[slug] || []) { const k = L.filter(l => l.startsWith(p)).length; if (!k) throw new Error(slug + ': no line ' + p); L = L.filter(l => !l.startsWith(p)); n += k; }
  let t = L.join('\n'); for (const [a, b] of REP[slug] || []) { if (t.split(a).length !== 2) throw new Error(slug + ': not once ' + a); t = t.replace(a, () => b); n++; }
  fs.writeFileSync(f, t); }
console.log(n + ' map lines changed');
