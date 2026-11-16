// The longer texts of entries ("told in more detail", MORE-GUIDE.md) as the builder reads them:
// scripts/entry-more/<c>.json, {slug: [[heading, [paragraphs]]]}, one file per first character of the slug (16 Nov
// 2026: one file for 26,000 entries would be some 60 MB; scripts/entry-more.json, the first round's file, is read too
// while it exists). readAll() gives them all; merge(obj) adds or replaces entries and rewrites only the files touched.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const DIR = path.join(R, 'scripts', 'entry-more'), OLD = path.join(R, 'scripts', 'entry-more.json');
const key = slug => (/^[a-z0-9]/.test(slug) ? slug[0] : '_');
function readAll() {
  const all = {};
  if (fs.existsSync(OLD)) Object.assign(all, JSON.parse(fs.readFileSync(OLD, 'utf8')));
  if (fs.existsSync(DIR)) for (const f of fs.readdirSync(DIR).sort()) if (f.endsWith('.json')) Object.assign(all, JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
  return all;
}
function merge(obj) {
  fs.mkdirSync(DIR, { recursive: true }); const by = {};
  for (const [s, v] of Object.entries(obj)) (by[key(s)] = by[key(s)] || {})[s] = v;
  for (const c of Object.keys(by)) {
    const f = path.join(DIR, c + '.json'), cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    Object.assign(cur, by[c]); const o = {}; for (const k of Object.keys(cur).sort()) o[k] = cur[k];
    fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n');
  }
  return Object.keys(readAll()).length;
}
// the first round's single file moved into the folder
function migrate() { if (!fs.existsSync(OLD)) return 0; const o = JSON.parse(fs.readFileSync(OLD, 'utf8')); merge(o); fs.unlinkSync(OLD); return Object.keys(o).length; }
module.exports = { readAll, merge, migrate, DIR };
if (require.main === module) { if (process.argv[2] === 'migrate') console.log(migrate() + ' entries moved into scripts/entry-more/'); else console.log(Object.keys(readAll()).length + ' entries told in more detail'); }
