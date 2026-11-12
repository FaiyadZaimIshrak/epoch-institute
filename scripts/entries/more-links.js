// The gold links of the entries told in more detail, for the editor to read: from the BUILT entry pages, every link in
// section.enc-more whose text stands beside another capitalised word (a name inside a longer name: "Free Democratic
// Party of Switzerland" linking the American party), and with --all every link with its target's name and dates.
//   node scripts/entries/more-links.js [--all]
// A wrong link is stopped by putting the whole name between ⟦ and ⟧ in the round's out/<slug>.json (edit.js): the
// builder prints what stands between them unlinked.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const M = JSON.parse(fs.readFileSync(path.join(R, 'scripts', 'entry-more.json'), 'utf8')), ALL = process.argv.includes('--all');
const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
let n = 0, shown = 0;
for (const slug of Object.keys(M)) {
  const f = path.join(R, 'encyclopedia', slug); if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, 'utf8'), m = h.match(/<section class="enc-more">([\s\S]*?)<\/section>/); if (!m) { console.log(slug + ': no section on the page'); continue; }
  const sec = m[1], rx = /<a class="enc-link" href="\/encyclopedia\/([^"]+)">([^<]*)<\/a>/g; let a;
  while ((a = rx.exec(sec))) {
    n++; const before = sec.slice(Math.max(0, a.index - 60), a.index).replace(/<[^>]+>/g, ''), after = sec.slice(a.index + a[0].length, a.index + a[0].length + 60).replace(/<[^>]+>/g, '');
    const t = by[a[1]], nm = t ? t.name : '?', txt = a[2].replace(/&amp;/g, '&').replace(/&#39;/g, "'");
    const capB = /(?:^|[\s(“"'])(?:\p{Lu}[\p{L}'’.-]*|of|de|al|ibn|von|van|the)\s$/u.test(before) && /\p{Lu}[\p{L}'’.-]*\s(?:of |de |al-|ibn |von |van |the )?$/u.test(before) && !/[.!?:;]\s$/.test(before);
    const capA = /^(?:\s|-)(?:(?:of|de|al|ibn|von|van)\s)?\p{Lu}/u.test(after) || /^['’]s?\s\p{Lu}/u.test(after);
    const same = txt.toLowerCase() === nm.toLowerCase() || (t && (t.aka || []).some(x => x.toLowerCase() === txt.toLowerCase()));
    if (ALL || capB || capA || !same) { shown++; console.log(slug + '\t' + txt + ' -> ' + nm + (t && t.dates ? ' (' + t.dates + ')' : '') + '\t' + (capB || capA ? 'CAPS ' : '') + '…' + before.slice(-38) + '[' + txt + ']' + after.slice(0, 38) + '…'); }
  }
}
console.log(n + ' links, ' + shown + ' listed');
