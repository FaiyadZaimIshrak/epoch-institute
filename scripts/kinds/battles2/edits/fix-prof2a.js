// The editor's changes to the profile drafts of the second wave's first nineteen, after reading them.
// Each pair must match exactly once in the draft's public texts (not its notes). A second run finds nothing to do.
const fs = require('fs'), path = require('path'), D = path.join(__dirname, 'prof2', 'out');
const FIX = {
 'battle-of-actium': [
  ['For the morning of 2 September Antony is given 250 larger galleys', 'On the morning of 2 September Antony is credited with 250 larger galleys'],
  ['gives Antony around 140 ships for Antony against 260 for Octavian', 'gives Antony around 140 ships against 260 for Octavian'],
  ['Few named authorities are given for the fighting, and little is said of the ancient texts themselves. Plutarch and Dio are named for the desertion and disease that plagued Antony’s camp.', 'Plutarch and Dio record the desertion and disease that plagued Antony’s camp.', "Few named authorities are given for the fighting, and little is said of the ancient texts themselves. Plutarch and Dio are named for the desertion and disease that plagued Antony's camp.", "Plutarch and Dio record the desertion and disease that plagued Antony's camp."],
  ['The narrative of the battle is the traditional one, in which Cleopatra', 'In the traditional narrative of the battle Cleopatra'],
  ['The figures disagree. They are 500 ships', 'The figures for the fleets disagree: 500 ships'],
  ['is dated 1 August 30 BCE in one place and 31 July in another', 'is dated either 31 July or 1 August 30 BCE'],
 ],
 'battle-of-alesia': [
  ['; no figure for the Roman army is given', ''],
  ['; no casualty figures for the battle are given', ''],
  ['No figure for the Roman army at Alesia is given. Its commanders named in the fighting are', 'The Roman commanders named in the fighting are'],
  [' No casualty figures for Alesia are given.', ''],
 ],
 'battle-of-austerlitz': [
  ['and it is described as the decisive engagement of the War of the Third Coalition', 'and it was the decisive engagement of the War of the Third Coalition'],
  ['a figure that fits none of the strengths given above', 'a figure that fits none of these strengths'],
 ],
 'battle-of-dien-bien-phu': [
  ['Điện Biên Phủ is described as the decisive battle of the First Indochina War', 'Điện Biên Phủ was the decisive battle of the First Indochina War'],
 ],
 'battle-of-issus': [
  ['and it is described as the beginning of the end of Persian power', 'and the battle has been called the beginning of the end of Persian power'],
  [' No total for the dead on either side is given.', ''],
 ],
 'battle-of-kursk': [
  ['Kursk is described as the single largest battle in the history of warfare', 'Kursk has been called the single largest battle in the history of warfare'],
 ],
 'battle-of-leipzig': [
  ['in what is described as the largest battle of the Napoleonic Wars', 'in the largest battle of the Napoleonic Wars'],
  ['Leipzig is described as the largest battle of the Napoleonic Wars, with about', 'Leipzig was the largest battle of the Napoleonic Wars, with about'],
  ['is described as the largest of the Napoleonic Wars, surpassing', 'was the largest battle of the Napoleonic Wars, surpassing'],
  ['The numbers for Leipzig differ from one count to the next.', 'Estimates of the numbers at Leipzig differ.'],
  ['and the Coalition at around 380,000 in one place and 360,000 in another', 'and the Coalition at around 380,000 or 360,000'],
  ['The whole battle is given as about 560,000 soldiers and 133,000 casualties in one count, and 80,000 to 110,000 killed, wounded or missing in another.', 'One estimate puts the whole battle at about 560,000 soldiers and 133,000 casualties, another at 80,000 to 110,000 killed, wounded or missing.'],
  ['The first day’s losses are given as approximately', 'The first day’s losses were approximately', "The first day's losses are given as approximately", "The first day's losses were approximately"],
  ['Several points rest on reports of the motives of one person.', 'Several points rest on reports of one person’s motives.'],
  ['is said to have been ‘purportedly’ due to news', 'was purportedly due to news', "is said to have been 'purportedly' due to news", 'was purportedly due to news'],
  [' Napoleon’s wish for one more victory on 18 October is reported without a named witness.', '', " Napoleon's wish for one more victory on 18 October is reported without a named witness.", ''],
  ['The blowing of the bridge is told as a chain of delegation, from General Dulauloy', 'The blowing of the bridge had been delegated from General Dulauloy'],
 ],
 'battle-of-mohacs': [
  ['Suleiman’s grief at the king’s body is only reported: he is ‘said to have’ spoken.', 'Suleiman is only said to have spoken his words of grief over the king’s body.', "Suleiman's grief at the king's body is only reported: he is 'said to have' spoken.", "Suleiman is only said to have spoken his words of grief over the king's body."],
  ['and in the account of the fighting at perhaps 45,000 fighting troops', 'and its fighting troops at perhaps 45,000'],
  ['The dead are given as over 14,000', 'The dead are put at over 14,000'],
  ['Some details of the fighting come only from ‘some accounts’, such as the bullets striking Suleiman’s cuirass.', 'Some details of the fighting, such as the bullets striking Suleiman’s cuirass, appear only in some accounts.', "Some details of the fighting come only from 'some accounts', such as the bullets striking Suleiman's cuirass.", "Some details of the fighting, such as the bullets striking Suleiman's cuirass, appear only in some accounts."],
 ],
 'battle-of-poltava': [
  [' Rehnskiöld’s words before the advance are preserved as a quotation.', '', " Rehnskiöld's words before the advance are preserved as a quotation.", ''],
  ['The times of the day are given to the half hour, from the arrival of the infantry at 2:30 a.m. to Roos’s surrender at 9:30 a.m. and the Swedish advance at 9:45', 'The day is timed to the half hour, from the arrival of the infantry at 2:30 a.m. to Roos’s surrender at 9:30 a.m. and the Swedish advance at 9:45', "The times of the day are given to the half hour, from the arrival of the infantry at 2:30 a.m. to Roos's surrender at 9:30 a.m. and the Swedish advance at 9:45", "The day is timed to the half hour, from the arrival of the infantry at 2:30 a.m. to Roos's surrender at 9:30 a.m. and the Swedish advance at 9:45"],
  [' No casualty totals for either army are given.', ''],
  ['The strength of the Russian army differ, 75,000 to 80,000 in one place and 80,000 in another, and neither is attributed.', 'Estimates of the Russian army’s strength run from 75,000 to 80,000.', 'The strength of the Russian army differ, 75,000 to 80,000 in one place and 80,000 in another, and neither is attributed.', "Estimates of the Russian army's strength run from 75,000 to 80,000."],
 ],
 'battle-of-thermopylae': [
  [' Robert von Fischer has estimated 40,000 troops and Hans 65,000.', ''],
  ['kept together and rotated.According to Ctesias', 'kept together and rotated. According to Ctesias'],
 ],
 'battle-of-trafalgar': [
  ['2148 cannons and 17000 crewmen and marines; the French', '2,148 cannons and 17,000 crewmen and marines; the French'],
  ['and some 30000 men, with 2632 cannons in one count and 2568 guns in another', 'and some 30,000 men, with 2,632 cannons in one count and 2,568 guns in another'],
  ['with 2148 cannons and a total of 17000 crewmen and marines', 'with 2,148 cannons and a total of 17,000 crewmen and marines'],
  ['with some 30000 men and 2632 cannons; another count gives nearly 30000 men and 2568 guns', 'with some 30,000 men and 2,632 cannons; another count gives nearly 30,000 men and 2,568 guns'],
  ['Counts of the allied guns differ, 2632 in one place and 2568 in another, and the lead of one account says 18 ships were captured or destroyed where its narrative says 20 were taken.', 'Counts of the allied guns differ, 2,632 or 2,568, and the allied ships lost are counted as 18 captured or destroyed, or as 20 taken.'],
 ],
 'battle-of-zama': [
  ['202 BCE (no day or month is given)', '202 BCE'],
  ['about 40,000 by the lead’s figure (modern historians usually give 29,000 or 30,000; Bagnall gives 40,000)', '29,000 or 30,000 by the usual modern figures, or approximately 40,000 (Bagnall)', "about 40,000 by the lead's figure (modern historians usually give 29,000 or 30,000; Bagnall gives 40,000)", '29,000 or 30,000 by the usual modern figures, or approximately 40,000 (Bagnall)'],
 ],
 'battle-of-the-catalaunian-plains': [
  ['sees in Aetius’s use of the federates a testament to his diplomatic and administrative skills', 'sees Aetius’s use of the federates as evidence of his diplomatic and administrative skills', "sees in Aetius's use of the federates a testament to his diplomatic and administrative skills", "sees Aetius's use of the federates as evidence of his diplomatic and administrative skills"],
 ],
 'normandy-landings': [
  ['The strengths of the fleet, the troops and the divisions on both sides are given as an order of battle, while the figures for the dead and wounded come with ranges. Some figures are plainly estimates.', 'The figures for the dead and wounded are ranges and estimates.'],
  ['Casualties for individual beaches are given as estimates, for instance about 1,000 at Gold', 'Casualties for individual beaches are estimates too, for instance about 1,000 at Gold'],
 ],
};
// every public string of a draft, with a setter
function fields(j) { const out = []; const add = (o, k) => { if (typeof o[k] === 'string') out.push([o, k]); };
  for (const k of ['info', 'summary', 'dyk', 'span']) add(j, k); for (const k of Object.keys(j.facts || {})) add(j.facts, k);
  (j.t || []).forEach((_, i) => add(j.t, i)); (j.ev || []).forEach(e => { add(e, 0); add(e, 1); }); for (const k of Object.keys(j.sections || {})) add(j.sections, k); return out; }
let done = 0, skip = 0, bad = 0;
for (const [slug, pairs] of Object.entries(FIX)) { const f = path.join(D, slug + '.json'), j = JSON.parse(fs.readFileSync(f, 'utf8')), fl = fields(j);
  for (const p of pairs) { const alts = [[p[0], p[1]]]; if (p.length === 4) alts.push([p[2], p[3]]); let hit = 0, was = 0;
    for (const [a, b] of alts) { for (const [o, k] of fl) { const n = o[k].split(a).length - 1; if (n) { hit += n; if (hit === 1) o[k] = o[k].replace(a, () => b); } }
      if (b && fl.some(([o, k]) => o[k].includes(b))) was++; }
    if (hit === 1) done++; else if (!hit && (was || !p[1])) skip++; else { bad++; console.log('!! ' + slug + ': ' + hit + ' x ' + p[0].slice(0, 80)); } }
  fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); }
console.log(done + ' changed, ' + skip + ' already done or absent, ' + bad + ' faults');
