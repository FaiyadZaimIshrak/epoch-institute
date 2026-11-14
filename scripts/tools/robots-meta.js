// Every indexable hand page says "index, follow, max-image-preview:large" (so Google Discover and image results may
// use the full pictures), as the generated pages and profiles do. 14 Nov 2026: twelve hand pages, the home page among
// them, had no robots meta at all. Adds it after the description; a page that has one (also "noindex") is left alone.
//   node scripts/tools/robots-meta.js [--write]      exits 1 when a page lacks it (without --write)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const PAGES = 'index research research-series about contributors dataset explorer profiles community connections atlas quiz contact start games kids search timeline passport weekly write faiths flashcards race inventions governance compare privacy terms support advent now today encyclopedia/index state/index today-in-history/index'.split(' ');
const TAG = '<meta name="robots" content="index, follow, max-image-preview:large">'; let n = 0;
for (const p of PAGES) { const f = path.join(R, p); if (!fs.existsSync(f)) continue; const t = fs.readFileSync(f, 'utf8'); if (/<meta name="robots"/.test(t)) continue;
  const m = t.match(/<meta name="description" content="[^"]*">(\r?\n)/); if (!m) { console.log(p + ': no description line'); n++; continue; }
  n++; console.log(p + ': no robots meta'); if (process.argv.includes('--write')) fs.writeFileSync(f, t.replace(m[0], () => m[0] + TAG + m[1])); }
console.log(n + ' pages' + (process.argv.includes('--write') ? ' set' : ' lack it')); process.exit(n && !process.argv.includes('--write') ? 1 : 0);
