// Wave 2, fifth and sixth batches: the commanders' entries, matched by hand (the name and the years must be the same person), and the editor's
// yes or no to each entry's picture as a banner portrait, looked at on battles5/sheet.png.
// Writes leaderEntry into scen2/*.json and appends the new rows to portraits.tsv (a row already there is left alone).
const fs = require('fs'), path = require('path');
const WHO = {
 "battle-of-marignano": {
  "king": "francis-i-of-france",
  "bourbon": "charles-iii-duke-of-bourbon"
 },
 "battle-of-myriokephalon": {
  "emp": "manuel-i-komnenos",
  "sel": "kilij-arslan-ii"
 },
 "battle-of-puebla": {
  "diaz": "porfirio-diaz"
 },
 "battle-of-thapsus": {
  "cright": "julius-caesar"
 },
 "battle-of-warsaw-1920": {
  "ag": "jozef-pilsudski"
 },
 "battle-on-the-ice": {
  "mil": "alexander-nevsky",
  "wedge": "hermann-of-buxhoeveden"
 },
 "siege-of-jerusalem-1099": {
  "normandy": "robert-curthose",
  "godfrey": "godfrey-of-bouillon",
  "tancred": "tancred-prince-of-galilee",
  "raymond": "raymond-iv-of-toulouse"
 }
};
const PIC = [["francis-i-of-france","yes","Jean Clouet's portrait of his lifetime"],["charles-iii-duke-of-bourbon","yes","Jean Clouet's drawing of his lifetime"],["manuel-i-komnenos","yes","a manuscript miniature of his reign"],["kilij-arslan-ii","no","too unclear to show a likeness"],["porfirio-diaz","yes","a photograph"],["jozef-pilsudski","yes","a photograph"],["alexander-nevsky","no","an imagined portrait of the 17th century"],["robert-curthose","no","a later manuscript roundel"],["godfrey-of-bouillon","no","a later miniature"],["tancred-prince-of-galilee","no","a drawing of a coin without a likeness"],["raymond-iv-of-toulouse","no","an engraving of a seal, a horseman too small to read"]];
const D = path.join(__dirname, process.env.SCEN || 'scen2'); let n = 0;
for (const slug of Object.keys(WHO)) { const f = path.join(D, slug + '.json'), s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(WHO[slug])) { const u = s.units.find(x => x.id === id); if (!u) throw new Error(slug + ': no formation ' + id); if (!u.leader) throw new Error(slug + ': ' + id + ' has no leader'); u.leaderEntry = WHO[slug][id]; delete u.pic; n++; }
  fs.writeFileSync(f, JSON.stringify(s, null, 1) + '\n'); }
const pf = path.join(__dirname, 'portraits.tsv'); let t = fs.readFileSync(pf, 'utf8'); if (!t.endsWith('\n')) t += '\n'; const have = new Set(t.split(/\r?\n/).map(l => l.split('\t')[0])); let add = 0;
for (const r of PIC) if (!have.has(r[0])) { t += r.join('\t') + '\n'; add++; }
fs.writeFileSync(pf, t);
console.log(n + ' commanders matched to entries; ' + add + ' rows added to portraits.tsv (' + PIC.filter(r => r[1] === 'yes').length + ' yes, ' + PIC.filter(r => r[1] === 'no').length + ' no)');
