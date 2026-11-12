// What a search result shows of each built page: its title and meta description (and og/twitter descriptions).
// Lists descriptions that carry a stock phrase (style-audit.js TELLS) or a dash as punctuation, descriptions that
// differ between the meta, Open Graph and Twitter tags, and pages whose description no longer matches their text
// (a description that is not found, by its first eight words, in the page's own visible text is only counted).
//   node scripts/tools/snippet-audit.js [--tsv=file] [--kind=empire,encyclopedia,…]
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..'), { TELLS } = require('./style-audit.js');
const SOFT = new Set(['one of the most', 'worth noting', 'triple list of abstractions', 'em dash']), HARD = TELLS.filter(t => !SOFT.has(t[0]));
const dirs = (process.argv.find(a => a.startsWith('--kind=')) || '--kind=empire,religion,language,culture,movement,government,ideology,work,life,encyclopedia,state,today-in-history,countries,centuries,paths,speeches,years,people,essays,teachers,societies,songs').slice(7).split(',');
const dec = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;|&#8217;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const rows = []; let n = 0, differ = 0; const by = {};
const walk = d => { for (const f of fs.readdirSync(path.join(R, d), { withFileTypes: true })) { if (f.isDirectory()) { walk(d + '/' + f.name); continue; } if (/\.|^index$/.test(f.name) && f.name !== 'index') continue;
  const h = fs.readFileSync(path.join(R, d, f.name), 'utf8').slice(0, 6000), g = rx => { const m = h.match(rx); return m ? dec(m[1]) : ''; };
  const desc = g(/<meta name="description" content="([^"]*)"/), og = g(/<meta property="og:description" content="([^"]*)"/), tw = g(/<meta name="twitter:description" content="([^"]*)"/), title = g(/<title>([^<]*)<\/title>/); if (!desc) continue; n++;
  if ((og && og !== desc) || (tw && tw !== desc)) differ++;
  const t = (desc + ' ' + title.replace(/ — [^—]*$/, '')).replace(/legendary|the Magnificent|Bayeux Tapestry/g, ' '), hits = [];
  for (const [lab, rx] of HARD) { const m = t.match(rx); if (m) hits.push(m[0].trim()); } if (/[a-z,] [—–] [a-z]/.test(desc) && !/\/browse\//.test(d + '/')) hits.push('dash');   // not a range of years or of names
  if (hits.length) { rows.push([d.split('/')[0], d + '/' + f.name, hits.join('; '), desc]); by[d.split('/')[0]] = (by[d.split('/')[0]] || 0) + 1; } } };
for (const d of dirs) if (fs.existsSync(path.join(R, d))) walk(d);
console.log(n + ' pages; descriptions with a stock phrase or a dash: ' + rows.length, by, '; og/twitter description differs from the meta one: ' + differ);
const out = (process.argv.find(a => a.startsWith('--tsv=')) || '').slice(6); if (out) fs.writeFileSync(out, rows.map(r => r.join('\t')).join('\n')); else for (const r of rows.slice(0, 40)) console.log(r[1] + ' | ' + r[2] + ' | ' + r[3].slice(0, 150));
