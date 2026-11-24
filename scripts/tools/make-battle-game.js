// Which Battle Is This? (/games#battle, 24 Nov 2026): one battle a day for everyone (UTC; #1 = 27 Nov 2026), shown as its
// field in motion with the names taken off; each wrong answer puts a kind of name back (the ground, the year and region,
// the two sides, the commanders). The fields are the battle profiles' own plans (data/battles/<slug>.json, written by
// make-battle-maps.js from scripts/battles), so this tool only deals: which battle on which day, and the seven others
// to choose among.
//   node scripts/tools/make-battle-game.js [--to=2027-10-31] [--dry]
// scripts/battle-game.tsv holds the order, one profile name a line: this tool only ever APPENDS to it (a day already
// played keeps its battle): a seeded choice among the battles not dealt within the last 60 days, those never dealt
// first, so a new battle joins at the next build. It writes battleq-data.js (BATTLEQ {d0, b: [[name, slug, date in
// words, region, century label]], p: [[battle, [seven others]]]}) and stamps its ?v= into /games (BATTLEQ_SRC), where
// the page has it. Run by build-pages.ps1 after make-battle-maps.js.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), R = path.join(__dirname, '..', '..');
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : ''; };
const TO = arg('to') || '2027-10-31', DRY = process.argv.includes('--dry');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, toSlug, profileSpanText, profileSpan}')();
const cent = y => { const c = y < 0 ? Math.floor((-y - 1) / 100) + 1 : Math.floor(y / 100) + 1, s = c % 100 >= 11 && c % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][c % 10] || 'th'; return c + s + ' century' + (y < 0 ? ' BCE' : ''); };
// only battles whose field is built and has three phases or more
const battles = SD.EMPIRES.filter(e => e.kind === 'battle').filter(e => { const f = path.join(R, 'data', 'battles', SD.toSlug(e.name) + '.json'); if (!fs.existsSync(f)) return false; const d = JSON.parse(fs.readFileSync(f, 'utf8')); return d.phases && d.phases.length >= 3 && d.units && d.units.length >= 2; });
if (battles.length < 40) throw new Error('Which Battle Is This?: only ' + battles.length + ' battles have a field');
const B = battles.map(e => [e.name, SD.toSlug(e.name), SD.profileSpanText(e), e.region, cent(SD.profileSpan(e)[0])]);
const DAY1 = Date.UTC(2026, 10, 27) / 864e5, LAST = Math.floor(Date.parse(TO + 'T00:00:00Z') / 864e5) - DAY1 + 1;
const file = path.join(R, 'scripts', 'battle-game.tsv'), head = '# Which Battle Is This?: the battle of each day, one profile name a line, #1 = 27 November 2026. Appended by\n# scripts/tools/make-battle-game.js; never reorder or delete a line (a day already played keeps its battle).\n';
const order = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#')) : [];
const idx = {}; B.forEach((r, i) => { idx[r[0]] = i; });
order.forEach((n, k) => { if (idx[n] === undefined) throw new Error('battle-game.tsv line ' + (k + 1) + ': no battle with a field named ' + n); });
const mul = s0 => { let s = s0 | 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const rnd = mul(20261127 + order.length * 7919), before = order.length;
while (order.length < LAST) {
  const last = {}; order.forEach((n, k) => { last[n] = k; });
  const free = B.map(r => r[0]).filter(n => last[n] === undefined || order.length - last[n] > Math.min(60, B.length - 1));
  const never = free.filter(n => last[n] === undefined), pool = never.length ? never : free.sort((a, b) => last[a] - last[b]).slice(0, Math.max(8, Math.ceil(free.length / 3)));
  order.push(pool[Math.floor(rnd() * pool.length)]);
}
// each day's seven others: battles of the same region or age first, so that the choice is a real one
const P = order.map((n, k) => {
  const i = idx[n], e = battles[i], r = mul((k + 1) * 2654435761 >>> 0), y = SD.profileSpan(e)[0];
  const others = battles.map((o, j) => { const d = Math.abs(SD.profileSpan(o)[0] - y); return [j, (o.region === e.region ? 2 : 0) + (d < 150 ? 2 : d < 500 ? 1 : 0) + r()]; }).filter(x => x[0] !== i).sort((a, b) => b[1] - a[1]);
  const near = others.slice(0, 4).map(x => x[0]), rest = others.slice(4).map(x => x[0]); for (let a = rest.length - 1; a > 0; a--) { const b = Math.floor(r() * (a + 1)); [rest[a], rest[b]] = [rest[b], rest[a]]; }
  return [i, near.concat(rest.slice(0, 3)).sort((a, b) => a - b)];
});
const out = '// Which Battle Is This? (scripts/tools/make-battle-game.js): generated, do not edit\nconst BATTLEQ = ' + JSON.stringify({ d0: '2026-11-27', b: B, p: P }) + ';\n';
const v = crypto.createHash('sha1').update(out).digest('hex').slice(0, 8);
console.log('Which Battle Is This?: ' + B.length + ' battles, ' + order.length + ' days to ' + TO + ' (' + (order.length - before) + ' new), battleq-data.js ' + Math.round(out.length / 1024) + ' KB' + (DRY ? ' (dry run)' : ''));
if (!DRY) {
  if (order.length > before) fs.writeFileSync(file, head + order.join('\n') + '\n');
  fs.writeFileSync(path.join(R, 'battleq-data.js'), out);
  const gf = path.join(R, 'games'); let g = fs.readFileSync(gf, 'utf8');
  if (/BATTLEQ_SRC = '[^']*'/.test(g)) { const g2 = g.replace(/BATTLEQ_SRC = '[^']*'/, "BATTLEQ_SRC = '/battleq-data.js?v=" + v + "'"); if (g2 !== g) fs.writeFileSync(gf, g2); }
}
