// The editor's changes to the drafts of the third wave of lives (22 Nov 2026), applied to out/<slug>.json in place.
// Run once after the writers: node scripts/kinds/lives3/edit.js   (a second run changes nothing)
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'out');
const rd = s => JSON.parse(fs.readFileSync(path.join(D, s + '.json'), 'utf8'));
const wr = (s, o) => fs.writeFileSync(path.join(D, s + '.json'), JSON.stringify(o, null, 1) + '\n');
const rep = (o, key, a, b) => {   // key: 'facts.died', 'sections.opponents', 'summary' …
  const p = key.split('.'), last = p.pop(); let t = o; for (const k of p) t = t[k];
  if (t[last].includes(b) && !t[last].includes(a)) return; if (t[last].split(a).length !== 2) throw new Error(o.name + ' ' + key + ': not once: ' + a.slice(0, 50));
  t[last] = t[last].replace(a, () => b);
};
// the years in words where they are a tradition or disputed (shared-data.js profileSpanText prints "span")
const SPAN = {
  'jesus': 'c. 6–4 BCE – 30 or 33 CE',
  'mary-mother-of-jesus': '1st century BCE – 1st century CE',
  'abraham': 'placed by tradition in the early 2nd millennium BCE',
  'moses': 'traditionally 14th–13th century BCE',
  'zoroaster': 'dates disputed: c. 1000 BCE, or 7th–6th century BCE',
  'laozi': 'traditionally 6th century BCE',
  'the-buddha': '6th or 5th century BCE',
  'mahavira': 'traditionally 599–527 BCE'
};
for (const s in SPAN) { const o = rd(s); o.span = SPAN[s]; wr(s, o); }
{ // Mary: the article gives no birth year; Wikidata (CC0) gives about 18 BCE, used only to place her on timelines
  const o = rd('mary-mother-of-jesus'); o.start = -18; o.circa = true; wr('mary-mother-of-jesus', o); }
{ // Muhammad: the facts box gives the death plainly (the report about Khaybar stays in the text, attributed);
  // "has refuted" is a verdict the page should not make its own
  const o = rd('muhammad');
  o.facts.died = '8 June 632 in Medina, after an illness of some days; buried where he died, in Aisha\'s house, later included in the Prophet\'s Mosque';
  rep(o, 'sections.opponents', 'while Meir J. Kister has refuted their arguments', 'and Meir J. Kister has argued against them in turn');
  wr('muhammad', o); }
{ // Abraham and Zoroaster: event labels in words (a label of digits could be read as a year)
  const o = rd('abraham'), L = ['Leaving Ur', 'The call', 'The rescue of Lot', 'Ishmael', 'The covenant', 'Isaac', 'The binding of Isaac', 'His death'];
  if (o.ev.length !== L.length) throw new Error('Abraham: ' + o.ev.length + ' events'); o.ev.forEach((e, i) => { e[0] = L[i]; }); wr('abraham', o);
  const z = rd('zoroaster'), W = { 'Age 7': 'Aged seven', 'Age 20': 'Aged twenty', 'Age 30': 'Aged thirty', 'Age 42': 'Aged forty-two', 'Age 77': 'Aged seventy-seven' };
  z.ev.forEach(e => { if (W[e[0]]) e[0] = W[e[0]]; }); wr('zoroaster', z); }
console.log('edited');
