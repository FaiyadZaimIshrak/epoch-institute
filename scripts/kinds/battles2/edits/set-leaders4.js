// Wave 2, fourth batch: the commanders' entries, matched by hand (the name and the years must be the same person), and the editor's
// yes or no to each entry's picture as a banner portrait, looked at on battles4/sheet.png.
// Writes leaderEntry into scen2/*.json and appends the new rows to portraits.tsv (a row already there is left alone).
const fs = require('fs'), path = require('path');
const WHO = {
 "battle-of-boyaca": {
  "pvan": "francisco-de-paula-santander"
 },
 "battle-of-jena-auerstedt": {
  "bluch": "gebhard-leberecht-von-blucher"
 },
 "battle-of-poitiers-1356": {
  "pri": "edward-the-black-prince",
  "kin": "john-ii-of-france"
 },
 "battle-of-pydna": {
  "leg": "lucius-aemilius-paullus-macedonicus",
  "mrc": "perseus-of-macedon"
 },
 "battle-of-raphia": {
  "pph": "ptolemy-iv-philopator",
  "sct": "antiochus-iii-the-great"
 },
 "siege-of-baghdad-1258": {
  "hulegu": "hulagu-khan",
  "kitbuqa": "kitbuqa",
  "baiju": "baiju"
 }
};
const PIC = [["francisco-de-paula-santander","no","a painting made after his death"],["john-ii-of-france","yes","the panel portrait of his lifetime"],["lucius-aemilius-paullus-macedonicus","no","a statue whose naming is doubted"],["perseus-of-macedon","yes","a coin of his own"],["ptolemy-iv-philopator","yes","a gold coin of his reign"],["hulagu-khan","no","a miniature of two generations later"]];
const D = path.join(__dirname, process.env.SCEN || 'scen2'); let n = 0;
for (const slug of Object.keys(WHO)) { const f = path.join(D, slug + '.json'), s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(WHO[slug])) { const u = s.units.find(x => x.id === id); if (!u) throw new Error(slug + ': no formation ' + id); if (!u.leader) throw new Error(slug + ': ' + id + ' has no leader'); u.leaderEntry = WHO[slug][id]; delete u.pic; n++; }
  fs.writeFileSync(f, JSON.stringify(s, null, 1) + '\n'); }
const pf = path.join(__dirname, 'portraits.tsv'); let t = fs.readFileSync(pf, 'utf8'); if (!t.endsWith('\n')) t += '\n'; const have = new Set(t.split(/\r?\n/).map(l => l.split('\t')[0])); let add = 0;
for (const r of PIC) if (!have.has(r[0])) { t += r.join('\t') + '\n'; add++; }
fs.writeFileSync(pf, t);
console.log(n + ' commanders matched to entries; ' + add + ' rows added to portraits.tsv (' + PIC.filter(r => r[1] === 'yes').length + ' yes, ' + PIC.filter(r => r[1] === 'no').length + ' no)');
