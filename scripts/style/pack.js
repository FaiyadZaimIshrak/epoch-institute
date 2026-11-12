// Packs profiles for a plain-prose rewrite (STYLE-GUIDE.md) and puts the rewrites back.
//   node scripts/style/pack.js make <dir> <kind>           writes <dir>/in/<slug>.json for every profile of the kind
//        (empire = the 94 without an id or a kind, state, or a PROFILE_KINDS key) and <dir>/batch-N.txt (lists of slugs)
//   node scripts/style/pack.js apply <dir> [--write]       checks every <dir>/out/<slug>.json (check.js) and writes the
//        fields into empire-profiles.js, empire-glance.js (t, dyk) and shared-data.js (EMPIRE_INFO), each found as it
//        stands in the file and replaced; the files must still evaluate to the new texts
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const [cmd, dir, a3] = process.argv.slice(2), WRITE = process.argv.includes('--write');
const rd = f => fs.readFileSync(path.join(R, f), 'utf8');
const ev = (t, v) => new Function(t.replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return ' + v)();
const slugOf = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const prT = rd('empire-profiles.js'), glT = rd('empire-glance.js'), sdT = rd('shared-data.js');
const P = ev(prT, 'EMPIRE_PROFILES'), G = ev(glT, 'GLANCE'), SD = ev(sdT.replace(/const EVENTS[\s\S]*$/, ''), '{EMPIRES, EMPIRE_INFO, PROFILE_KINDS: typeof PROFILE_KINDS === "undefined" ? {} : PROFILE_KINDS}');
const fieldsOf = n => { const f = {}; for (const k in P[n]) if (k !== 'references' && typeof P[n][k] === 'string') f[k] = P[n][k]; f.teaser = SD.EMPIRE_INFO[n] || ''; const g = G[n] || {}; (g.t || []).forEach((t, i) => f['t' + i] = t); if (g.dyk) f.dyk = g.dyk; return f; };
if (cmd === 'make') {
  const names = SD.EMPIRES.filter(e => a3 === 'empire' ? !e.kind && !e.id : a3 === 'state' ? !e.kind && e.id : e.kind === a3).map(e => e.name).filter(n => P[n]);
  fs.mkdirSync(path.join(dir, 'in'), { recursive: true }); fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
  const folder = a3 === 'empire' || a3 === 'state' ? 'empire' : SD.PROFILE_KINDS[a3].path, slugs = [];
  for (const n of names) {
    const slug = slugOf(n), page = path.join(R, folder, slug), keep = [];
    if (fs.existsSync(page)) { const h = fs.readFileSync(page, 'utf8'); for (const m of h.matchAll(/<a class="enc-link"[^>]*>([^<]+)<\/a>/g)) { const t = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'); if (!keep.includes(t)) keep.push(t); } }
    fs.writeFileSync(path.join(dir, 'in', slug + '.json'), JSON.stringify({ name: n, fields: fieldsOf(n), keep }, null, 1) + '\n'); slugs.push(slug);
  }
  const per = Math.ceil(slugs.length / (+process.argv[5] || 8)); for (let i = 0, b = 1; i < slugs.length; i += per, b++) fs.writeFileSync(path.join(dir, 'batch-' + b + '.txt'), slugs.slice(i, i + per).join('\n') + '\n');
  console.log(names.length + ' profiles packed, ' + names.reduce((s, n) => s + Object.values(fieldsOf(n)).join(' ').split(/\s+/).length, 0) + ' words');
} else if (cmd === 'apply') {
  const { checkOne } = require('./check.js'); let pr = prT, gl = glT, sd = sdT, n = 0, changed = 0; const bad = [];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // a field's text as the file writes it: raw in a template literal, or as a JSON / single-quoted string
  const forms = s => [s, s.replace(/\\/g, '\\\\').replace(/`/g, '\\`'), JSON.stringify(s).slice(1, -1), JSON.stringify(s).slice(1, -1).replace(/'/g, "\\'"), JSON.stringify(s).slice(1, -1).replace(/'/g, '\\u0027')];
  const swap = (text, oldS, newS, what) => { for (let i = 0; i < 5; i++) { const o = forms(oldS)[i]; const c = text.split(o).length - 1; if (c === 1) return text.replace(o, () => forms(newS)[i]); if (c > 1) { bad.push(what + ': the old text stands ' + c + ' times'); return text; } } bad.push(what + ': the old text was not found in the file'); return text; };
  for (const f of fs.readdirSync(path.join(dir, 'out')).filter(x => x.endsWith('.json')).sort()) {
    const slug = f.slice(0, -5), rep = checkOne(dir, slug); if (rep.length) { bad.push(slug + ': ' + rep.length + ' faults (run check.js)'); continue; }
    const I = JSON.parse(fs.readFileSync(path.join(dir, 'in', f), 'utf8')), O = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8')); n++;
    for (const k in I.fields) { const a = I.fields[k], b = O.fields[k]; if (a === b) continue; changed++;
      if (k === 'teaser') sd = swap(sd, a, b, slug + ' teaser'); else if (/^t\d$|^dyk$/.test(k)) gl = swap(gl, a, b, slug + ' ' + k); else pr = swap(pr, a, b, slug + ' ' + k); }
  }
  // the files must evaluate to the new texts
  const P2 = ev(pr, 'EMPIRE_PROFILES'), G2 = ev(gl, 'GLANCE'), S2 = ev(sd.replace(/const EVENTS[\s\S]*$/, ''), '{EMPIRES, EMPIRE_INFO}');
  for (const f of fs.readdirSync(path.join(dir, 'out')).filter(x => x.endsWith('.json'))) { const O = JSON.parse(fs.readFileSync(path.join(dir, 'out', f), 'utf8')), nm = O.name; if (bad.some(b => b.startsWith(f.slice(0, -5) + ':') || b.startsWith(f.slice(0, -5) + ' '))) continue;
    for (const k in O.fields) { const got = k === 'teaser' ? S2.EMPIRE_INFO[nm] : /^t\d$/.test(k) ? (G2[nm].t || [])[+k[1]] : k === 'dyk' ? G2[nm].dyk : P2[nm][k]; if (got !== O.fields[k]) bad.push(f.slice(0, -5) + ' ' + k + ': the file does not hold the new text'); } }
  console.log(n + ' profiles, ' + changed + ' fields changed' + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
  if (WRITE && !bad.length) { fs.writeFileSync(path.join(R, 'empire-profiles.js'), pr); fs.writeFileSync(path.join(R, 'empire-glance.js'), gl); fs.writeFileSync(path.join(R, 'shared-data.js'), sd); console.log('written'); }
  else if (WRITE) { console.log('NOT written: faults above'); process.exit(1); }
} else { console.error('usage: pack.js make <dir> <kind> [batches] | apply <dir> [--write]'); process.exit(1); }
