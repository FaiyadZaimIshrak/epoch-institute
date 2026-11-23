// Wave 2, last batch: the commanders' entries, matched by hand (the name and the years must be the same person), and the editor's
// yes or no to each entry's picture as a banner portrait, looked at on battles6/sheet.png.
// Writes leaderEntry into scen2/*.json and appends the new rows to portraits.tsv (a row already there is left alone).
const fs = require('fs'), path = require('path');
const WHO = {
 "battle-of-alarcos": {
  "king": "alfonso-viii",
  "mans": "yaqub-al-mansur"
 },
 "battle-of-mikatagahara": {
  "tor": "honda-tadakatsu",
  "raid": "okubo-tadayo"
 },
 "battle-of-sagrajas": {
  "vang": "al-mutamid-ibn-abbad",
  "res": "yusuf-ibn-tashfin",
  "wa": "sancho-ramirez",
  "alf": "alfonso-vi-of-castile",
  "mright": "umar-al-mutawakkil"
 },
 "battle-of-uhud": {
  "mus": "muhammad",
  "umar": "umar-ibn-al-khattab",
  "kha": "khalid-ibn-al-walid"
 },
 "second-battle-of-panipat": {
  "he": "hemu"
 }
};
const PIC = [["alfonso-viii","yes","a miniature of the Tumbo menor de Castilla, of his time"],["yaqub-al-mansur","no","a building, not a likeness"],["honda-tadakatsu","yes","the portrait painted in his lifetime"],["okubo-tadayo","no","a later painting"],["al-mutamid-ibn-abbad","no","a coin without a likeness"],["yusuf-ibn-tashfin","no","a coin without a likeness"],["sancho-ramirez","no","a coin, too small to read"],["alfonso-vi-of-castile","no","a miniature of a generation later"],["hemu","no","an Akbarnama miniature of half a century later, showing him captive"],["umar-ibn-al-khattab","no","no likeness: his name in calligraphy"],["muhammad","no","never depicted"]];
const D = path.join(__dirname, process.env.SCEN || 'scen2'); let n = 0;
for (const slug of Object.keys(WHO)) { const f = path.join(D, slug + '.json'), s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(WHO[slug])) { const u = s.units.find(x => x.id === id); if (!u) throw new Error(slug + ': no formation ' + id); if (!u.leader) throw new Error(slug + ': ' + id + ' has no leader'); u.leaderEntry = WHO[slug][id]; delete u.pic; n++; }
  fs.writeFileSync(f, JSON.stringify(s, null, 1) + '\n'); }
const pf = path.join(__dirname, 'portraits.tsv'); let t = fs.readFileSync(pf, 'utf8'); if (!t.endsWith('\n')) t += '\n'; const have = new Set(t.split(/\r?\n/).map(l => l.split('\t')[0])); let add = 0;
for (const r of PIC) if (!have.has(r[0])) { t += r.join('\t') + '\n'; add++; }
fs.writeFileSync(pf, t);
console.log(n + ' commanders matched to entries; ' + add + ' rows added to portraits.tsv (' + PIC.filter(r => r[1] === 'yes').length + ' yes, ' + PIC.filter(r => r[1] === 'no').length + ' no)');
