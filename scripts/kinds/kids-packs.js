// Kids story mode (Nov 2026): a source pack for each culture profile, the only material its Kids story may be written
// from: the profile's facts, takeaways, "Did you know?", key events and six sections as plain text, and the picture of
// each section (empire-section-images.js, chosen by eye for the profile), which the story's pages use.
// Since 8 Nov 2026 also the religions and movements (--kind=religion|movement; the default is culture).
//   node scripts/kinds/kids-packs.js <out dir> [--kind=culture] [names …]
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..');
const out = process.argv[2]; if (!out) throw new Error('usage: kids-packs.js <out dir> [--kind=k] [names]');
const KIND = ((process.argv.find(a => a.startsWith('--kind=')) || '').slice(7)) || 'culture';
const only = process.argv.slice(3).filter(a => !a.startsWith('--'));
const b = {};
for (const f of ['shared-data.js', 'empire-profiles.js', 'empire-section-images.js', 'empire-glance.js', 'empire-facts.js'])
  vm.runInNewContext(fs.readFileSync(path.join(R, f), 'utf8') + '\n;for (const k of ["EMPIRES","EMPIRE_PROFILES","SECTION_IMAGES","GLANCE","EMPIRE_FACTS","PROFILE_KINDS"]) { try { this[k] = eval(k); } catch (e) {} }', b);
const plain = h => String(h || '').replace(/<\/(p|li)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, '’').replace(/&#8212;|&mdash;/g, '—').replace(/&nbsp;/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
const slug = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
fs.mkdirSync(out, { recursive: true });
// more pictures a page may use: the profile's home picture (scripts/home-pictures.tsv, chosen by eye) and the pictured
// entries the profile names (these are checked by eye on a contact sheet before a story uses them)
const ed = {}; vm.runInNewContext(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + '\n;this.X = ENCYCLOPEDIA;', ed);
const named = {};
for (const x of ed.X) if (x && x.img && x.type !== 'person') for (const m of x.empires || []) { const n = typeof m === 'string' ? m : m.name; (named[n] = named[n] || []).push(x); }
const home = {};
for (const l of fs.readFileSync(path.join(R, 'scripts', 'home-pictures.tsv'), 'utf8').split(/\r?\n/)) { if (!l || l.startsWith('#')) continue; const [n, s] = l.split('\t'); if (s && s !== '-') home[n] = s; }
const kind = b.PROFILE_KINDS[KIND], n0 = []; if (!kind) throw new Error('no kind ' + KIND);
const LIVING = { culture: 'a LIVING people: write of them today in the present tense', religion: 'a LIVING faith, practised today: write of its believers today in the present tense', movement: 'still alive today: write of it today in the present tense' };
for (const e of b.EMPIRES.filter(e => e.kind === KIND && (!only.length || only.includes(e.name)))) {
  const p = b.EMPIRE_PROFILES[e.name] || {}, g = b.GLANCE[e.name] || {}, fx = b.EMPIRE_FACTS[e.name] || {}, pics = b.SECTION_IMAGES[e.name] || {};
  const living = e.end == null;
  let md = '# ' + e.name + '\n\nkind: ' + KIND + '\nprofile: /' + kind.path + '/' + slug(e.name) + '\nregion: ' + e.region + '\nyears: ' + e.start + ' to ' + (living ? 'today (' + (LIVING[KIND] || LIVING.culture) + ')' : e.end) + (e.circa ? ' (approximate)' : '') + '\n';
  md += '\n## Facts\n' + Object.entries(fx).map(([k, v]) => '- ' + k + ': ' + plain(v)).join('\n') + '\n';
  md += '\n## Takeaways\n' + (g.t || []).map(t => '- ' + plain(t)).join('\n') + '\n\n## Did you know?\n' + plain(g.dyk) + '\n';
  md += '\n## Key events\n' + (g.ev || []).map(v => '- ' + plain(v[0]) + ': ' + plain(v[1])).join('\n') + '\n';
  md += '\n## Pictures (one per page of the story: use the key)\n' + (kind.sections || []).map(s => { const k = String(s.key || s).split(',')[0]; const f = pics[k]; return '- ' + k + ': ' + (f ? f.name + ' (' + f.img + ')' : '(none)'); }).join('\n') + '\n';
  md += (home[e.name] ? '- home: the profile\'s own picture, entry ' + home[e.name] + '\n' : '') +
    '\nMore pictures (write the entry slug as the page\'s picture; each will be looked at before use):\n' +
    (named[e.name] || []).slice(0, 24).map(x => '- ' + x.slug + ': ' + x.name + ' (' + x.type + ')').join('\n') + '\n';
  for (const s of kind.sections || []) { const k = String(s.key || s).split(',')[0]; md += '\n## Section: ' + k + '\n' + plain(p[k]) + '\n'; }
  md += '\n## Summary\n' + plain(p.summary) + '\n';
  fs.writeFileSync(path.join(out, slug(e.name) + '.md'), md); n0.push(e.name);
}
console.log(n0.length + ' packs');
