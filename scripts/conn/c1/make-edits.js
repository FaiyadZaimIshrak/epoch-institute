// The editor's decisions on the C1 proposals (7 Nov 2026), written as scripts/conn/c1/edits.json for assemble.js:
// groups dropped, single tiles dropped (named by label inside their group), and pairs of groups kept apart.
const fs = require('fs'), path = require('path'), D = __dirname;
const G = {}; for (const f of fs.readdirSync(D).filter(f => /^p-.*\.json$/.test(f))) for (const g of JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'))) if (!G[g.name]) G[g.name] = g;
const drop = [
  // loose "story" groups: a tile belongs to a person's story only by the editor's reading (B1 dropped "In Julius Caesar's story")
  "In Hannibal's story", "In Cleopatra's story", "In Attila's story", "In the life of Socrates", "In Augustus's story", "In Nero's reign",
  "In the reign of Ramesses II", "In Cyrus the Great's story", "In Hammurabi's story", "Linked to Gilgamesh", "Linked to Pericles",
  "The ancient Olympics", "In Mithridates VI's story", "In Diocletian's reign",
  // years only approximate or traditional
  "All in 546 BCE", "All in 587 BCE", "All in 509 BCE",
  // the same theme as another file's group
  "Founded schools of Japanese Buddhism", "Reformers in 19th-century India", "Lyric poets of ancient Greece", "Leaders of Cambodia",
  // grim for their own sake
  "Catastrophes in Europe", "Died after a hunt", "Islamist movements", "Soviet secret police chiefs and officers",
];
const tiles = {   // group: labels to drop
  "Gods of death and the underworld": ["Hermes"], "Boudica's revolt": ["Nero"],
  "Born in 1478": ["Francisco Pizarro", "Hayreddin Barbarossa"], "Born in 1491": ["Antonio Pigafetta"], "Born in 1797": ["Sojourner Truth"],
  "All in 334 BCE": ["Sparda"], "Early synagogues of the Americas": ["Touro", "Kahal Zur Israel"],
  "In the Kathmandu Valley": ["Patan Durbar Square"], "Afghans who ruled in India": ["Lodi dynasty", "Sur Empire"],
  "All in 1739": ["Koh-i-Noor"], "All in 1857": ["Bahadur Shah Zafar"], "All in 1498": ["Cesare Borgia"],
  "Gupta emperors": ["Sri Gupta"], "Scripts that grew from Brahmi": ["Tamil-Brahmi"], "All in 1591": ["Moroccan invasion of Songhai"],
};
const apart = [["Capitals of South America", "Countries of South America"], ["Early presidents of the United States", "Cold War presidents of the United States"],
  ["Colonial colleges of British America", "Universities"], ["Mesoamerican codices", "Codex ___"], ["Painters of the 1900s", "Expressionists"],
  ["Wars fought in Korea", "The Korean War"], ["The Heian court", "Classics of Japanese literature"], ["Rulers of Afghanistan", "Rulers of Afghanistan, 1919–1978"],
  ["Orishas of the Yoruba", "Gods of the waters"], ["Orishas of the Yoruba", "Gods of love"], ["Treaties over a canal across Central America", "Building the Panama Canal"],
  ["Translations of the Bible", "Codex ___"], ["Kings of Prussia", "Kings of France, 1589–1848"], ["Presidents of Indonesia", "Indonesia's road to independence"],
  ["Colonial rule over the subcontinent", "Laws that governed British India"], ["Hindu holy cities", "Temple towns of Tamil Nadu"],
  ["Fought Portuguese rule in Africa", "Liberation movements of Africa"], ["Landmarks of Cairo", "Cities on the Nile"]];
const out = { drop, dropTile: {}, apart };
for (const n of drop) if (!G[n]) throw 'no group ' + n;
for (const [n, ls] of Object.entries(tiles)) { if (!G[n]) throw 'no group ' + n; out.dropTile[n] = ls.map(l => { const t = G[n].tiles.find(t => t.label === l); if (!t) throw n + ': no tile ' + l; return t.slug; }); }
for (const [a, b] of apart) for (const n of [a, b]) if (!G[n]) throw 'no group ' + n;
fs.writeFileSync(path.join(D, 'edits.json'), JSON.stringify(out, null, 1) + '\n');
console.log('edits written: ' + drop.length + ' groups dropped, ' + Object.keys(tiles).length + ' groups trimmed, ' + apart.length + ' pairs apart');
