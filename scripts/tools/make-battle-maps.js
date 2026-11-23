// "How it was fought" on the battle profiles (battle-map.js): the plans of scripts/battles/<slug>.json, each written
// from one saved article with the article's words behind every piece of ground, formation and phase
// (scripts/battles/BATTLE-MAPS-GUIDE.md; scripts/battles/check-battle-maps.js checks them; a file holding only
// "skip" records a battle whose article does not give its formations, only "hold" one whose plan waits for a fuller source). This tool, run by build-pages.ps1, writes
//   data/battles/<slug>.json   what the page draws (no quotations)
//   scripts/battle-maps.js     BATTLE_MAPS {profile name: [slug, version, [[phase title, text], …]]}, read by generator.html,
//                              which puts the section and the phases as a list into the profile: regenerate the profiles
//                              after a plan is added or its words change
// and STOPS on a plan without a battle profile of its name, a commander's entry that does not exist, or a portrait
// asked for a person who is never depicted. A commander's banner carries a portrait only where
// scripts/battles/portraits.tsv says yes (entry slug TAB yes|no TAB what the picture is): chosen by eye, a likeness of
// the person's own time or their own emblem, never a modern imagined portrait.
//   node scripts/tools/make-battle-maps.js [--dry]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const R = path.join(__dirname, '..', '..'), DRY = process.argv.includes('--dry'), DIR = path.join(R, 'scripts', 'battles');
const NEVER = new Set(['muhammad', 'ali', 'ali-ibn-abi-talib']);   // never depicted, whatever a file says
const E = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';return {EMPIRES, profileUrl}')();
const PROF = new Map(E.EMPIRES.filter(e => e.kind === 'battle').map(e => [e.name, E.profileUrl(e).split('/').pop()]));
const ENT = new Map(); for (const l of fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8').split('\n')) { const m = l.match(/^\s*\{slug:"([^"]+)"/); if (m) ENT.set(m[1], (l.match(/,img:"([^"]+)"/) || [])[1] || ''); }
const PORT = new Map(); const pf = path.join(DIR, 'portraits.tsv');
if (fs.existsSync(pf)) for (const l of fs.readFileSync(pf, 'utf8').split(/\r?\n/)) { if (!l.trim() || l[0] === '#') continue; const c = l.split('\t'); PORT.set(c[0], c[1] === 'yes'); }
const out = {}, need = [], skipped = [], held = []; let n = 0, wrote = 0;
const write = (f, t) => { if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === t) return; wrote++; if (!DRY) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t); } };
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith('.json')).sort()) {
  const sc = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')), slug = f.slice(0, -5);
  if (sc.skip) { skipped.push(slug); continue; }
  if (sc.hold) { held.push(slug); continue; }
  if (!PROF.has(sc.name)) throw new Error(f + ': no battle profile named "' + sc.name + '"');
  if (PROF.get(sc.name) !== slug) throw new Error(f + ': the profile\'s page is /battle/' + PROF.get(sc.name) + ', the file must bear that name');
  const units = sc.units.map(u => {
    const o = { id: u.id, side: u.side, k: u.k, name: u.name, short: u.short }; if (u.leader) o.leader = u.leader; if (u.w) o.w = u.w; if (u.d) o.d = u.d; if (u.lab) o.lab = u.lab;
    if (u.leaderEntry) {
      if (!ENT.has(u.leaderEntry)) throw new Error(f + ': ' + u.id + ' names the entry ' + u.leaderEntry + ', which does not exist');
      if (PORT.get(u.leaderEntry) && NEVER.has(u.leaderEntry)) throw new Error(f + ': ' + u.leaderEntry + ' is never depicted');
      const img = ENT.get(u.leaderEntry);
      if (img && !PORT.has(u.leaderEntry) && !NEVER.has(u.leaderEntry)) need.push(u.leaderEntry + '\t' + slug);
      if (img && PORT.get(u.leaderEntry) && !NEVER.has(u.leaderEntry)) { const th = img.replace(/\/([^/]+)$/, '/thumbs/$1'); o.pic = fs.existsSync(path.join(R, th)) ? th : img; }
    }
    return o;
  });
  const data = { name: sc.name, field: sc.field || {}, terrain: (sc.terrain || []).map(t => { const o = { k: t.k, at: t.at }; if (t.name) o.name = t.name; if (t.lab) o.lab = t.lab; return o; }),
    sides: sc.sides.map(s => ({ id: s.id, name: s.name })), units,
    phases: sc.phases.map(p => { const o = { title: p.title, text: p.text }; for (const k of ['when', 'at', 'how', 'state', 'hits']) if (p[k] && (Array.isArray(p[k]) ? p[k].length : typeof p[k] === 'string' || Object.keys(p[k]).length)) o[k] = p[k]; return o; }) };
  if (sc.note) data.note = sc.note;
  const text = JSON.stringify(data), v = crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);
  write(path.join(R, 'data', 'battles', slug + '.json'), text);
  out[sc.name] = [slug, v, sc.phases.map(p => [p.title, p.text])]; n++;
}
// plans whose battle is no longer a profile leave no data file behind
const dd = path.join(R, 'data', 'battles'); if (fs.existsSync(dd)) for (const f of fs.readdirSync(dd)) if (!Object.values(out).some(o => o[0] + '.json' === f)) { wrote++; if (!DRY) fs.unlinkSync(path.join(dd, f)); }
write(path.join(R, 'scripts', 'battle-maps.js'), '// scripts/battle-maps.js - written by scripts/tools/make-battle-maps.js. Do not edit. Read by generator.html: the battle\n// profiles\' "How it was fought" (profile name: [slug, version of data/battles/<slug>.json, [[phase title, text]]]).\nvar BATTLE_MAPS = {\n' +
  Object.keys(out).sort().map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(out[k])).join(',\n') + '\n};\n');
const lack = [...PROF.keys()].filter(k => !out[k]);
console.log('battle plans: ' + n + ' drawn, ' + skipped.length + ' recorded as not drawable, ' + held.length + ' waiting for a fuller source' + (lack.length ? ', ' + lack.length + ' battle profiles without a plan (' + lack.slice(0, 6).join(', ') + (lack.length > 6 ? ' …' : '') + ')' : '') + '; ' + wrote + ' files ' + (DRY ? 'would be ' : '') + 'written');
if (need.length) console.log('commanders with a picture and no line in scripts/battles/portraits.tsv (look, then say yes or no):\n  ' + [...new Set(need)].join('\n  '));
