// Single texts with a stock phrase (scripts/tools/style-audit.js TELLS), gathered for a sentence-level fix and put back.
//   node scripts/style/lines.js make <dir> [per batch]   <dir>/in-N.json: [{id, text, hits}] from the entries, the
//        profiles that are not the 94 empires, the state histories, the day events and the songs
//   node scripts/style/lines.js check <dir>              every <dir>/out-N.json item against its original (check.js)
//   node scripts/style/lines.js apply <dir> [--write]    writes the changed texts back where they stand
// ids: entry:<slug> | prof:<Name>|<field> | state:<id>|<t,o,r,e> | day:<mm-dd>|<n>|<title,description> | song:<slug>|<story,meaning>
// An out item may carry "literal": ["tapestry"]: phrases left because they are meant literally (the editor reads these).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const { TELLS } = require('../tools/style-audit.js'), { checkPair } = require('./check.js');
const [cmd, dir, a3] = process.argv.slice(2), WRITE = process.argv.includes('--write');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (t, v) => new Function(t.replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + v)();
const SOFT = new Set(['one of the most', 'worth noting', 'triple list of abstractions']);
const HARD = TELLS.filter(t => !SOFT.has(t[0]));
// uses that are the thing itself, not a figure of speech
const literal = s => s.replace(/\[\[[^|\]]*\|/g, '').replace(/legendary|the Magnificent|Bayeux Tapestry|Foster\b|foster (?:brother|son|father|mother|child|parent|daught)\w*|tapestr(?:y|ies) (?:cloth|weav|work|of the)\w*|woven tapestr\w+|“[^”]*”|"[^"]*"/g, ' ');
const hitsOf = s => { const t = literal(String(s).replace(/<[^>]+>/g, ' ')), out = []; for (const [lab, rx] of HARD) { const g = new RegExp(rx.source, rx.flags.includes('g') ? rx.flags : rx.flags + 'g'); for (const m of t.matchAll(g)) { if (lab === 'em dash' && /\d\s?[—–]\s?\d/.test(m[0])) continue; out.push(m[0].trim()); } } return [...new Set(out)]; };
function gather() {
  const items = [], add = (id, text) => { if (!text) return; const h = hitsOf(text); if (h.length) items.push({ id, text, hits: h }); };
  for (const e of ev(rd('encyclopedia-data.js'), 'ENCYCLOPEDIA')) add('entry:' + e.slug, e.desc);
  const SD = ev(rd('shared-data.js'), '{EMPIRES, EMPIRE_INFO}'), P = ev(rd('empire-profiles.js'), 'EMPIRE_PROFILES'), G = ev(rd('empire-glance.js'), 'GLANCE');
  for (const e of SD.EMPIRES) { if (!e.kind && !e.id) continue; const n = e.name; for (const k in P[n] || {}) if (k !== 'references' && typeof P[n][k] === 'string') add('prof:' + n + '|' + k, P[n][k]);
    add('prof:' + n + '|teaser', SD.EMPIRE_INFO[n]); const g = G[n] || {}; (g.t || []).forEach((t, i) => add('prof:' + n + '|t' + i, t)); add('prof:' + n + '|dyk', g.dyk); }
  for (const f of fs.readdirSync(path.join(R, 'data', 'states')).sort()) { const o = JSON.parse(rd('data/states/' + f)); for (const id in o) for (const k of ['t', 'o', 'r', 'e']) add('state:' + id + '|' + k, o[id][k]); }
  const H = JSON.parse(rd('data/history.json')); for (const d in H) H[d].forEach((x, i) => { add('day:' + d + '|' + i + '|title', x.title); add('day:' + d + '|' + i + '|description', x.description); });
  for (const f of fs.readdirSync(path.join(R, 'scripts', 'songs')).sort()) if (f.endsWith('.txt')) { const t = rd('scripts/songs/' + f); for (const k of ['story', 'meaning']) { const m = t.match(new RegExp('(?:^|\\n)== ' + k + '[ \\t]*\\r?\\n([\\s\\S]*?)(?=\\r?\\n== |$)')); if (m) add('song:' + f.slice(0, -4) + '|' + k, m[1].trim()); } }
  return items;
}
const outs = () => fs.readdirSync(dir).filter(f => /^out-\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)));
function pairs() { const res = []; for (const f of outs()) { const I = JSON.parse(fs.readFileSync(path.join(dir, f.replace('out', 'in')), 'utf8')); let O; try { O = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { res.push({ id: f, rep: ['not JSON'] }); continue; }
  const byId = {}; for (const o of O) byId[o.id] = o; for (const i of I) { const o = byId[i.id]; if (!o) { res.push({ id: i.id, rep: ['missing in ' + f] }); continue; } const lit = o.literal || [];
    let rep = o.text === i.text ? [] : checkPair(i.text, o.text, []).filter(r => !lit.some(l => r.includes('stock phrase: ' + l)) && !/^paragraphs/.test(r));
    if ((i.text.match(/\[\[[^|\]]*\|/g) || []).join() !== (o.text.match(/\[\[[^|\]]*\|/g) || []).join()) rep.push('links changed');
    // a phrase meant literally in the original may stay
    rep = rep.filter(r => { const m = r.match(/^stock phrase: (.*)$/); return !m || hitsOf(o.text).some(h => h.includes(m[1].trim()) || m[1].includes(h)); });
    res.push({ id: i.id, a: i.text, b: o.text, rep, lit }); } }
  return res; }
if (cmd === 'make') {
  const items = gather(), per = +a3 || 110; fs.mkdirSync(dir, { recursive: true });
  for (let i = 0, b = 1; i < items.length; i += per, b++) fs.writeFileSync(path.join(dir, 'in-' + b + '.json'), JSON.stringify(items.slice(i, i + per), null, 1) + '\n');
  const by = {}; items.forEach(x => { const k = x.id.split(':')[0]; by[k] = (by[k] || 0) + 1; }); console.log(items.length + ' texts in ' + Math.ceil(items.length / per) + ' batches', by);
} else if (cmd === 'check') {
  const res = pairs(); let bad = 0, same = 0; for (const r of res) { if (r.rep.length) { bad++; console.log(r.id + '\n  ' + r.rep.join('\n  ')); } if (r.a === r.b) same++; }
  console.log(res.length + ' texts, ' + same + ' unchanged, ' + bad + ' with faults'); process.exit(bad ? 1 : 0);
} else if (cmd === 'apply') {
  const res = pairs().filter(r => !r.rep.length && r.a !== r.b), files = {}, bad = [], fixes = [];
  const get = f => files[f] !== undefined ? files[f] : (files[f] = rd(f));
  const js = s => JSON.stringify(s).slice(1, -1), ps = s => js(s).replace(/[<>&']/g, c => '\\u00' + c.charCodeAt(0).toString(16));
  const forms = s => [s, s.replace(/\\/g, '\\\\').replace(/`/g, '\\`'), js(s), js(s).replace(/'/g, "\\'"), js(s).replace(/'/g, '\\u0027'), ps(s)];
  const swap = (f, a, b, what) => { const t = get(f); for (let i = 0; i < 6; i++) { const o = forms(a)[i], c = t.split(o).length - 1; if (c === 1) { files[f] = t.replace(o, () => forms(b)[i]); return true; } if (c > 1) { bad.push(what + ': the old text stands ' + c + ' times in ' + f); return false; } } bad.push(what + ': not found in ' + f); return false; };
  // the smallest piece of a text that changed, widened to whole words
  const piece = (a, b) => { let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++; let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++; while (p > 0 && a[p - 1] !== ' ') p--; while (s > 0 && a[a.length - s] !== ' ') s--; return [a.slice(p, a.length - s), b.slice(p, b.length - s)]; };
  for (const r of res) { const [kind, rest] = [r.id.slice(0, r.id.indexOf(':')), r.id.slice(r.id.indexOf(':') + 1)], q = rest.split('|');
    if (kind === 'entry') { let [o, n] = piece(r.a, r.b); if (o.length < 12 || r.a.split(o).length !== 2 || r.a.includes(n)) { o = r.a; n = r.b; } fixes.push([rest, o, n]);
      const pf = 'data/enc-preview/' + rest[0] + '.json'; if (fs.existsSync(path.join(R, pf))) { const t = get(pf); for (const fm of [js, ps]) { const c = t.split(fm(o)).length - 1; if (c === 1) { files[pf] = t.replace(fm(o), () => fm(n)); break; } } } }
    else if (kind === 'prof') swap(q[1] === 'teaser' ? 'shared-data.js' : /^t\d$|^dyk$/.test(q[1]) ? 'empire-glance.js' : 'empire-profiles.js', r.a, r.b, r.id);
    else if (kind === 'state') swap('data/states/' + fs.readdirSync(path.join(R, 'data', 'states')).find(f => q[0] in JSON.parse(get('data/states/' + f))), r.a, r.b, r.id);
    else if (kind === 'day') swap('data/history.json', r.a, r.b, r.id);
    else if (kind === 'song') swap('scripts/songs/' + q[0] + '.txt', r.a, r.b, r.id); }
  if (fixes.length) { const f = 'scripts/added-entries.json', A = JSON.parse(get(f)), t = get(f); const add = fixes.filter(x => !A.fixes.some(y => y[0] === x[0] && y[1] === x[1]));
    const at = t.lastIndexOf(']', t.indexOf('"fixes"') < 0 ? 0 : (() => { let d = 0, i = t.indexOf('[', t.indexOf('"fixes"')); for (let j = i; j < t.length; j++) { if (t[j] === '"') { j++; while (t[j] !== '"') { if (t[j] === '\\') j++; j++; } } else if (t[j] === '[') d++; else if (t[j] === ']') { d--; if (!d) return j; } } })());
    if (add.length) { files[f] = t.slice(0, at).replace(/\s*$/, '') + ',\n' + add.map(x => '    ' + JSON.stringify(x)).join(',\n') + '\n  ' + t.slice(at); JSON.parse(files[f]); } }
  for (const f in files) if (f.endsWith('.json')) JSON.parse(files[f]); else if (f.endsWith('.js')) new Function(files[f].replace(/\nif \(typeof module[\s\S]*$/, ''));
  console.log(res.length + ' texts changed, ' + fixes.length + ' entry fixes, ' + Object.keys(files).length + ' files' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
  if (WRITE) { for (const f in files) if (files[f] !== rd(f)) fs.writeFileSync(path.join(R, f), files[f]); console.log('written' + (fixes.length ? ': now run scripts/apply-added-entries.ps1' : '')); }
} else { console.error('usage: lines.js make|check|apply <dir>'); process.exit(1); }
