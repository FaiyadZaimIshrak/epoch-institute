// Where Is This Song From? (/games#songq): deals every day from #1 (3 November 2026, UTC) to a given day exactly as
// games.js does (its own round() and stanza(), read from the file) for the full pool and the Kids pool, and checks:
// five different songs a day, every dealt stanza of at least two lines, and how often a song comes back with lines
// already shown (a song with fewer stanzas than its passes repeats; the report names them).
//   node scripts/tools/songq-test.js [YYYY-MM-DD]        (default 2027-06-30)    exit code 1 on a fault
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const SONGQ = new Function(fs.readFileSync(path.join(R, 'songq-data.js'), 'utf8') + ';return SONGQ')();
const js = fs.readFileSync(path.join(R, 'games.js'), 'utf8');
const SQ = js.indexOf('var SongQ = (function');   // the song game's own section (Who Said It? has a round() too)
const grab = name => { const a = js.indexOf('function ' + name + '(', SQ); if (a < 0) throw new Error('games.js has no ' + name + '()'); return js.slice(a, js.indexOf('\n', a)); };
const until = process.argv[2] || '2027-06-30', days = Math.round((Date.parse(until) - Date.UTC(2026, 10, 3)) / 864e5) + 1;
let faults = 0;
for (const kidsMode of [false, true]) {
  const D = SONGQ, N = 5, kids = () => kidsMode;
  const pool = () => kids() ? D.filter(s => s[8]) : D;
  const round = new Function('D', 'N', 'kids', 'pool', grab('stanza') + '\n' + grab('round') + '\nreturn round;')(D, N, kids, pool);
  const shown = new Map(); let repeats = 0; const rep = {};
  for (let d = 1; d <= days; d++) {
    const qs = round(d), slugs = new Set(qs.map(q => q[0]));
    if (qs.length !== N || slugs.size !== N) { console.log(`${kidsMode ? 'Kids ' : ''}#${d}: ${qs.length} songs, ${slugs.size} different`); faults++; }
    for (const q of qs) {
      if (!Array.isArray(q[6]) || q[6].length < 2 || typeof q[6][0] !== 'string') { console.log(`#${d} ${q[0]}: a stanza of ${q[6] && q[6].length} lines`); faults++; }
      const k = q[0] + '\n' + q[6].join('\n'); if (shown.has(k)) { repeats++; rep[q[0]] = (rep[q[0]] || 0) + 1; } else shown.set(k, d);
    }
  }
  const P = pool(), passes = Math.ceil(days * N / P.length);
  const st = P.map(s => typeof s[6][0] === 'string' ? 1 : s[6].length);
  console.log(`${kidsMode ? 'Kids pool' : 'Full pool'}: ${P.length} songs, ${days} days to ${until}, about ${passes} passes; stanzas a song: ` +
    `${st.filter(x => x >= passes).length} have ${passes} or more, ${st.filter(x => x === 1).length} have one; ${repeats} dealings repeat lines already shown` +
    (repeats ? ' (most: ' + Object.entries(rep).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, n]) => s + ' ' + n).join(', ') + ')' : ''));
}
console.log(faults ? faults + ' faults' : 'no faults');
process.exit(faults ? 1 : 0);
