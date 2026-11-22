// /religions, Faiths Side by Side (the built page, no browser): one row for every religion profile, the living faiths
// first and each group oldest first; every link of the table leads to a page that exists; a faith map is linked only
// where its data is; the page is served, deployed, styled and in the menu.
const fs = require('fs'), path = require('path'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, toSlug}')();
const rel = SD.EMPIRES.filter(e => e.kind === 'religion'), page = read('religions');
const rows = [...page.matchAll(/<tr data-live="([01])"><th scope="row"><a class="fs-name" href="\/religion\/([a-z0-9-]+)">/g)].map(m => [m[1], m[2]]);
ok('a row for every religion profile', rows.length === rel.length && rel.every(e => rows.some(r => r[1] === SD.toSlug(e.name))), [rows.length, rel.length]);
ok('the living faiths come first', rows.map(r => r[0]).join('').replace(/^1+0+$/, '') === '' && rows.filter(r => r[0] === '1').length === rel.filter(e => e.end == null).length);
const start = s => rel.find(e => SD.toSlug(e.name) === s).start, sorted = g => { const a = rows.filter(r => r[0] === g).map(r => start(r[1])); return a.every((x, i) => !i || a[i - 1] <= x); };
ok('each group runs oldest first', sorted('1') && sorted('0'));
const hrefs = [...new Set([...page.slice(page.indexOf('<table'), page.indexOf('</table>')).matchAll(/href="\/([a-z]+\/[a-z0-9-]+)"/g)].map(m => m[1]))];
const gone = hrefs.filter(h => !fs.existsSync(path.join(R, h)));
ok('every profile, life and work linked exists', hrefs.length > rel.length + 20 && !gone.length, gone.slice(0, 6));
const maps = [...page.matchAll(/href="\/faiths\?faith=([a-z0-9-]+)"/g)].map(m => m[1]);
ok('faith maps are linked only where there is one', maps.length > 15 && maps.every(s => fs.existsSync(path.join(R, 'data', 'faiths', s + '.json'))), maps.length);
ok('the lives of the founders are linked', ['/life/jesus', '/life/muhammad', '/life/the-buddha', '/life/moses', '/life/zoroaster', '/life/guru-nanak', '/life/laozi', '/life/mahavira'].every(h => page.includes('href="' + h + '"')));
ok('the sacred texts are linked', ['/work/hebrew-bible', '/work/new-testament', '/work/quran', '/work/rigveda', '/work/pali-canon', '/work/avesta', '/work/guru-granth-sahib', '/work/tao-te-ching'].every(h => page.includes('href="' + h + '"')));
const desc = (page.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
ok('title, description, canonical and its own stylesheet', /<title>Faiths Side by Side: \d+ Religions Compared — The Epoch Institute<\/title>/.test(page) && desc.length >= 70 && desc.length <= 160 && page.includes('rel="canonical" href="https://the-epoch-institute.org/religions"') && page.includes('href="/css/religions.css"') && fs.existsSync(path.join(R, 'css', 'religions.css')), desc.length);
ok('no rank is claimed and no index is refused', !/noindex/.test(page) && /says nothing of rank/.test(page));
ok('served, deployed and in the menu', /\|religions\|/.test(read('.htaccess')) && /\breligions\b/.test(read('scripts/deploy.sh')) && read('shared-nav.js').includes("'/religions', 'Faiths Side by Side'") && read('shared-nav.js').includes('href="/religions"'));
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
