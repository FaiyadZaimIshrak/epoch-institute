// Waves 2b and 2c: the commanders' entries, matched by hand (the name and the years must be the same person), and the editor's
// yes or no to each entry's picture as a banner portrait, looked at on battles3/portraits-sheet.png.
// Writes leaderEntry into scen2/*.json and appends the new rows to portraits.tsv (a row already there is left alone).
const fs = require('fs'), path = require('path');
const WHO = {
 "battle-of-ayacucho": {
  "cordoba": "jose-maria-cordova"
 },
 "battle-of-carrhae": {
  "rsq": "marcus-licinius-crassus",
  "rpub": "publius-licinius-crassus",
  "pha": "surena"
 },
 "battle-of-crecy": {
  "king": "edward-iii-of-england",
  "wales": "edward-the-black-prince",
  "philip": "philip-vi-of-france"
 },
 "battle-of-guandu": {
  "craid": "cao-cao",
  "ymain": "yuan-shao"
 },
 "battle-of-kosovo": {
  "sc": "lazar-of-serbia",
  "sr": "vuk-brankovic",
  "oa": "bayezid-i",
  "og": "murad-i"
 },
 "battle-of-leuctra": {
  "sp": "cleombrotus-i",
  "theb": "epaminondas",
  "sb": "pelopidas"
 },
 "battle-of-magnesia": {
  "rr": "eumenes-ii",
  "sr": "antiochus-iii-the-great"
 },
 "battle-of-nagashino": {
  "oda": "oda-nobunaga",
  "nobutada": "oda-nobutada",
  "tok": "tokugawa-ieyasu"
 },
 "battle-of-nicopolis": {
  "hung": "sigismund-holy-roman-emperor",
  "sip": "bayezid-i",
  "serbs": "stefan-lazarevic",
  "main": "john-the-fearless"
 },
 "battle-of-san-jacinto": {
  "cav": "mirabeau-b-lamar",
  "sa": "antonio-lopez-de-santa-anna"
 },
 "battle-of-the-granicus": {
  "right": "alexander-the-great"
 },
 "battle-of-the-hydaspes": {
  "comp": "alexander-the-great",
  "eleph": "porus"
 },
 "battle-of-the-little-bighorn": {
  "custer": "george-armstrong-custer"
 },
 "battle-of-the-nile": {
  "bout": "horatio-nelson"
 },
 "battle-of-the-plains-of-abraham": {
  "brcentre": "james-wolfe",
  "frcentre": "louis-joseph-de-montcalm"
 },
 "battle-of-the-teutoburg-forest": {
  "roman": "publius-quinctilius-varus"
 },
 "battle-of-the-yarmuk": {
  "mr": "amr-ibn-al-as",
  "mlc": "abu-ubayda-ibn-al-jarrah",
  "guard": "khalid-ibn-al-walid"
 },
 "battle-of-vienna-1683": {
  "omain": "kara-mustafa-pasha",
  "pcav": "jan-iii-sobieski"
 },
 "fall-of-tenochtitlan": {
  "alvarado": "pedro-de-alvarado",
  "cortes": "hernan-cortes",
  "defenders": "cuauhtemoc"
 }
};
const PIC = [["jose-maria-cordova","yes","the portrait by José María Espinosa"],["marcus-licinius-crassus","no","a bust whose naming is doubted"],["edward-iii-of-england","no","a picture of two generations after him"],["edward-the-black-prince","yes","his tomb effigy"],["philip-vi-of-france","no","a manuscript picture of unknown date"],["cao-cao","no","a woodcut of many centuries later"],["yuan-shao","no","a woodcut of many centuries later"],["lazar-of-serbia","no","a wall painting made after he was held a saint"],["vuk-brankovic","no","a wall painting of unknown date"],["bayezid-i","no","a picture of about 1460"],["murad-i","no","a later painting"],["epaminondas","no","a modern statue"],["pelopidas","no","a painting of the 19th century"],["eumenes-ii","no","a bust whose naming is doubted"],["antiochus-iii-the-great","no","a later copy of a portrait"],["oda-nobunaga","yes","the portrait by Kanō Sōshū, of the year after his death"],["oda-nobutada","no","a portrait made after his death"],["tokugawa-ieyasu","no","a portrait made after his death"],["sigismund-holy-roman-emperor","yes","a portrait of his lifetime"],["stefan-lazarevic","no","a wall painting whose date is not known"],["john-the-fearless","yes","a copy of a portrait of his time"],["mirabeau-b-lamar","yes","a photograph of him"],["antonio-lopez-de-santa-anna","yes","a photograph of him"],["porus","yes","the elephant medallion struck after the battle"],["george-armstrong-custer","yes","a photograph of him"],["james-wolfe","yes","a portrait of his lifetime"],["louis-joseph-de-montcalm","no","an engraving of thirty years after his death"],["publius-quinctilius-varus","no","an imagined scene of a later age"],["kara-mustafa-pasha","yes","a print of his time"],["jan-iii-sobieski","yes","a portrait of his lifetime"],["pedro-de-alvarado","no","a painting of a later age"],["hernan-cortes","no","a portrait of unknown date"],["cuauhtemoc","no","a modern relief"],["khalid-ibn-al-walid","no","no likeness of his time"],["amr-ibn-al-as","no","no likeness of his time"]];
const D = path.join(__dirname, process.env.SCEN || 'scen2'); let n = 0;
for (const slug of Object.keys(WHO)) { const f = path.join(D, slug + '.json'), s = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const id of Object.keys(WHO[slug])) { const u = s.units.find(x => x.id === id); if (!u) throw new Error(slug + ': no formation ' + id); if (!u.leader) throw new Error(slug + ': ' + id + ' has no leader'); u.leaderEntry = WHO[slug][id]; delete u.pic; n++; }
  fs.writeFileSync(f, JSON.stringify(s, null, 1) + '\n'); }
const pf = path.join(__dirname, 'portraits.tsv'); let t = fs.readFileSync(pf, 'utf8'); if (!t.endsWith('\n')) t += '\n'; const have = new Set(t.split(/\r?\n/).map(l => l.split('\t')[0])); let add = 0;
for (const r of PIC) if (!have.has(r[0])) { t += r.join('\t') + '\n'; add++; }
fs.writeFileSync(pf, t);
console.log(n + ' commanders matched to entries; ' + add + ' rows added to portraits.tsv (' + PIC.filter(r => r[1] === 'yes').length + ' yes, ' + PIC.filter(r => r[1] === 'no').length + ' no)');
