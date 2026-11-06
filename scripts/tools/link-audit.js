// Lists the gold links of the profiles worth reading by eye (the C1 audit, 6 Nov 2026), from a link-scan report
// (scripts/kinds/link-scan.js --report=…; join the reports of several runs, keeping one header line):
//   node scripts/tools/link-audit.js <report.tsv> caps     links whose text stands next to another capitalised word,
//        grouped by entry and text, most frequent first: often a name inside a longer name ("Gran Colombia" -> Esztergom)
//   node scripts/tools/link-audit.js <report.tsv> forms    links made by profile-only forms (rows from ENC_LINKS.fs on)
//   node scripts/tools/link-audit.js <report.tsv> period   people linked more than 60 years outside the profile's span
//        (profileSpan), forms and ordinary rows apart: a namesake ("Louis IX" -> the Duke of Bavaria on France)
// Wrong links go into scripts/kinds/link-exclusions.tsv (profile, entry, what the text really meant), or, when a name is
// wrong more often than right everywhere, into scripts/added-entries.json "drop"; then link-scan.js --write.
const fs = require('fs'), path = require('path'), vm = require('vm'), R = path.join(__dirname, '..', '..');
const [repF, mode = 'caps'] = process.argv.slice(2);
if (!repF) { console.error('usage: link-audit.js <report.tsv> caps|forms|period'); process.exit(1); }
const rows = fs.readFileSync(repF, 'utf8').split('\n').slice(1).filter(Boolean).map(l => l.split('\t'));
const L = new Function(fs.readFileSync(path.join(R, 'encyclopedia-links.js'), 'utf8') + ';return ENC_LINKS')();
const E = {}; for (const e of new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')()) E[e.slug] = e;
const formTxt = {}; for (let i = L.fs; i < L.e.length; i++) for (const p of L.e[i][1]) formTxt[L.e[i][0] + '|' + p[0]] = 1;
const isForm = (e, t) => formTxt[e + '|' + t] || formTxt[e + '|' + t.replace(/['’]s$/, '')];
const SMALL = 'the|of|and|in|to|by|from|for|with|under|on|at|as|a|an|its|his|her|their|into|against|between|over|near|after|before|until|during|than|or|but|while|when|where|which|who|that|whose|both|all|many|most|some|two|three|four';
function suspicious(t, c) {
  const i = c.indexOf(t); if (i < 0) return false; const before = c.slice(0, i), after = c.slice(i + t.length);
  return /\b[A-Z][\w’'.-]+\s$/.test(before) && !new RegExp('(?:^|[.;:!?]\\s|\\b(?:' + SMALL + ')\\s)[A-Z][\\w’\'.-]+\\s$').test(before)
    || /^[\s-][A-Z][a-z]/.test(after) && !/^\s(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\b/.test(after);
}
const ctx = (t, c) => { const i = Math.max(0, c.indexOf(t)); return c.slice(Math.max(0, i - 40), i + t.length + 40).replace(/\s+/g, ' '); };
if (mode === 'caps') {
  const G = new Map();
  for (const [p, , e, t, c] of rows) {
    if (!suspicious(t, c)) continue; const k = e + ' | ' + t;
    if (!G.has(k)) G.set(k, { n: 0, p: new Set(), c: ctx(t, c) }); const g = G.get(k); g.n++; g.p.add(p);
  }
  const out = [...G.entries()].sort((a, b) => b[1].n - a[1].n);
  for (const [k, g] of out) console.log(String(g.n).padStart(3) + ' ' + k + ' [' + [...g.p].join('; ') + '] :: ' + g.c);
  console.error(out.length + ' groups');
} else if (mode === 'forms' || mode === 'period') {
  const c = {}; vm.runInNewContext(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8').replace(/^const /gm, 'var ') + ';this.SP = profileSpan; this.EM = EMPIRES', c);
  const span = {}; for (const e of c.EM) span[e.name] = c.SP(e);
  const yrs = d => { if (!d) return null; const bce = /BCE|BC\b/.test(d) && !/\bCE\b/.test(d.replace(/BCE/g, ''));
    const m = [...d.matchAll(/\d{1,4}/g)].map(x => +x[0] * (bce ? -1 : 1)); return m.length ? [Math.min(...m), Math.max(...m)] : null; };
  const seen = new Set(); let n = 0;
  for (const [p, , e, t, cx] of rows) {
    const f = isForm(e, t); const en = E[e] || {};
    if (mode === 'forms' && !f) continue;
    if (mode === 'period') { if (en.type !== 'person') continue; const y = yrs(en.dates), sp = span[p]; if (!y || !sp || (y[1] >= sp[0] - 60 && y[0] <= sp[1] + 60)) continue; }
    const k = p + '|' + e + '|' + t; if (seen.has(k)) continue; seen.add(k); n++;
    console.log((f ? 'FORM ' : '     ') + p + ' | ' + t + ' -> ' + (en.name || e) + ' (' + (en.dates || '') + ') :: ' + ctx(t, cx));
  }
  console.error(n + ' links');
} else { console.error('mode: caps, forms or period'); process.exit(1); }
