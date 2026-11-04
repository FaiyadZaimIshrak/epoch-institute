// Links the state histories (data/states/<c>.json: the fields o, r and e of each state) to encyclopedia entries added
// after they were first linked: the same rules as the profiles' linkify in generator.html (first mention of an entry per
// field, the longest name claims the text, a name several entries share goes to the one that fits the year in the
// sentence or the state's own years (ENC_FN.pick), a dated event next to a contradicting year is not linked), with every
// row of encyclopedia-links.js taking part, so that a new short name never links inside an older, longer one. Only links
// to the entries named in --entries are ADDED; nothing already linked moves. Rows from fs on (profile-only forms) are
// ignored, as are the state's own entry (same name or slug) and the [[e:…]] and [[s:…]] links already in the text.
//   node scripts/kinds/relink-states.js --entries=<file of slugs> [--report=<file.tsv>] [--write] [--only=<state id,…>]
// --write: rewrites the changed fields in place (the files mix escaped and raw apostrophes: each field is replaced in the
// form it was found) and data/enc-states.json (an entry's count, and its list of up to 12 states when there is room).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
if (!process.execArgv.some(a => a.startsWith('--max-old-space-size'))) {
  const r = require('child_process').spawnSync(process.execPath, ['--max-old-space-size=6144', __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status);
}
const argv = process.argv.slice(2), opt = k => (argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const WRITE = argv.includes('--write'), ONLY = new Set((opt('only') || '').split(',').filter(Boolean));
if (!opt('entries')) { console.error('usage: relink-states.js --entries=<file> [--report=f] [--write] [--only=ids]'); process.exit(1); }
const NEW = new Set(fs.readFileSync(opt('entries'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));
const L = new Function(fs.readFileSync(path.join(R, 'encyclopedia-links.js'), 'utf8') + ';return {ENC_LINKS, ENC_FN}')();
const { ENC_LINKS, ENC_FN } = L;
const ENC = new Map(new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')().map(e => [e.slug, e.name]));
const BYNAME = new Map(); for (const [s, n] of ENC) { if (!BYNAME.has(n)) BYNAME.set(n, []); BYNAME.get(n).push(s); }
const POL = new Map(JSON.parse(fs.readFileSync(path.join(R, 'data', 'polities.json'), 'utf8')).nodes.map(n => [n.id, n]));
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// rows: those before fs (the profile-only forms are not used outside their profiles); each row's literal words, to try
// a row only on texts that hold its longest word (compiling all of them would fill the heap)
const FS = ENC_LINKS.fs == null ? ENC_LINKS.e.length : ENC_LINKS.fs;
const ROWS = ENC_LINKS.e.slice(0, FS).map((en, i) => ({ i, slug: en[0], g: en[0] === '@g' ? { m: en[2], p: en[3] } : null,
  pats: en[1], key: en[1].map(p => fold(p[0]).split(/[^a-z0-9]+/).sort((a, b) => b.length - a.length)[0] || '') }));
const RX = new Map();
const rxOf = (r, k) => { const id = r.i + ':' + k; if (!RX.has(id)) { try { RX.set(id, ENC_FN.rx(r.pats[k][0], r.pats[k][1])); } catch (e) { RX.set(id, null); } } return RX.get(id); };
const isNew = r => (r.g ? r.g.m.some(s => NEW.has(s)) : NEW.has(r.slug));
function linkField(text, ctx, selfSlugs) {
  const parts = text.split(/(\[\[[^\]]*\]\])/), linked = new Set(), cands = [];
  for (let p = 1; p < parts.length; p += 2) { const m = parts[p].match(/^\[\[e:([^|\]]+)\|/); if (m) linked.add(m[1]); }
  const plain = fold(parts.filter((_, k) => k % 2 === 0).join(' '));
  const rows = ROWS.filter(r => r.key.some(w => w && plain.includes(w)));
  if (!rows.some(isNew)) return null;   // nothing new can match here
  for (const r of rows) r.pats.forEach((_, k) => {
    if (!r.key[k] || !plain.includes(r.key[k])) return;
    const rx = rxOf(r, k); if (!rx) return;
    for (let p = 0; p < parts.length; p += 2) {
      const t = parts[p]; if (!t) continue; rx.lastIndex = 0; let m;
      while ((m = rx.exec(t))) {
        if (!m[0].length) { rx.lastIndex++; continue; }
        const s = m.index, e = s + m[0].length; let slug = r.slug;
        if (r.g) slug = ENC_FN.pick(r.g.m, t, s, e, ctx, {}, r.g.p);
        else if (!ENC_FN.ok(slug, t, s, e)) slug = null;
        cands.push({ p, s, e, slug });
      }
    }
  });
  cands.sort((a, b) => a.p - b.p || a.s - b.s || (b.e - b.s) - (a.e - a.s) || (b.slug ? 1 : 0) - (a.slug ? 1 : 0));
  const used = new Set(linked), chosen = []; let lastP = -1, lastEnd = -1;
  for (const c of cands) {
    if (c.p === lastP && c.s < lastEnd) continue;
    lastP = c.p; lastEnd = c.e;
    if (!c.slug || used.has(c.slug)) continue;
    used.add(c.slug); if (NEW.has(c.slug) && !selfSlugs.has(c.slug) && ENC.has(c.slug)) chosen.push(c);
  }
  if (!chosen.length) return null;
  const out = [];
  for (const c of chosen.sort((a, b) => b.p - a.p || b.s - a.s)) {
    let t = parts[c.p], txt = t.slice(c.s, c.e), tail = ''; const poss = txt.match(/(['’]s)$/); if (poss) { tail = poss[1]; txt = txt.slice(0, -tail.length); }
    out.push({ slug: c.slug, txt, ctx: t.slice(Math.max(0, c.s - 60), c.e + 40) });
    parts[c.p] = t.slice(0, c.s) + '[[e:' + c.slug + '|' + txt + ']]' + tail + t.slice(c.e);
  }
  return { text: parts.join(''), added: out };
}
const D = path.join(R, 'data', 'states'), report = [], ES = JSON.parse(fs.readFileSync(path.join(R, 'data', 'enc-states.json'), 'utf8'));
let nStates = 0, nLinks = 0;
for (const f of fs.readdirSync(D).filter(f => f.endsWith('.json'))) {
  let raw = fs.readFileSync(path.join(D, f), 'utf8'); const J = JSON.parse(raw); let changed = false;
  for (const [id, st] of Object.entries(J)) {
    if (ONLY.size && !ONLY.has(id)) continue;
    const node = POL.get(id) || {}, ctx = node.s != null ? [node.s, node.e == null ? 2025 : node.e] : null;
    const self = new Set([id, ...(BYNAME.get(node.n) || [])]);
    let any = false;
    for (const k of ['o', 'r', 'e']) {
      if (!st[k]) continue;
      const res = linkField(st[k], ctx, self); if (!res) continue;
      for (const a of res.added) { report.push([id, k, a.slug, a.txt, a.ctx.replace(/\s+/g, ' ')].join('\t')); nLinks++;
        const m = ES.m[a.slug] || (ES.m[a.slug] = [0, []]);
        if (!m[1].some(x => x[0] === id)) { m[0]++; if (m[1].length < 12) m[1].push([id, node.n || id]); } }
      // replace the field where it stands, in the form it was found (escaped or raw apostrophes)
      const forms = [JSON.stringify(st[k]), JSON.stringify(st[k]).replace(/'/g, '\\u0027')];
      const at = forms.map(x => ('"' + k + '":' + x)).find(x => raw.split(x).length === 2);
      if (!at) { console.error('cannot place ' + id + '.' + k + ' in ' + f + ' (not found once)'); continue; }
      const esc = at.includes('\\u0027') ? s => JSON.stringify(s).replace(/'/g, '\\u0027') : s => JSON.stringify(s);
      raw = raw.replace(at, () => '"' + k + '":' + esc(res.text)); st[k] = res.text; any = changed = true;
    }
    if (any) nStates++;
  }
  if (changed && WRITE) { JSON.parse(raw); fs.writeFileSync(path.join(D, f), raw); }
}
if (opt('report')) fs.writeFileSync(opt('report'), 'state\tfield\tentry\ttext\tcontext\n' + report.join('\n') + '\n');
if (WRITE) fs.writeFileSync(path.join(R, 'data', 'enc-states.json'), JSON.stringify(ES).replace(/'/g, '\\u0027'));   // as make-enc-states wrote it
console.log(nLinks + ' links in ' + nStates + ' states' + (WRITE ? ' written' : ' (dry run: --write)'));
