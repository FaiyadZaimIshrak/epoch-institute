// The editor's changes to the Kalka River draft (25 Nov 2026): no sentence speaks of "an account" where the text means
// its source, a line lifted whole from the article and a superlative go, the reserve's name as the Russian gives it.
//   node scripts/kinds/held4/edit-prof.js <draft> <out>
const fs = require('fs'); const [src, dst] = process.argv.slice(2); let t = fs.readFileSync(src, 'utf8');
const R = [
  ['One account describes the expedition of Jebe and Subutai as history\'s longest cavalry raid, with the Mongols riding 5,500 miles (8,900 km) in three years.',
   'On their expedition Jebe and Subutai rode 5,500 miles (8,900 km) in three years, and Subutai left spies in Rus\' who reported on what was happening there and in Europe.'],
  ['31 May 1223; one telling puts the main defeat three days earlier and the end of the fighting, at the Kievan camp, on 31 May',
   '31 May 1223; by another reckoning the main defeat came three days earlier and the fighting ended, at the Kievan camp, on 31 May'],
  ['The Secret History of the Mongols and Rashid al-Din, as a Russian account cites them, name the Cumans, Alans, Hungary and Rus\', Kiev included, as aims of the expedition, though it is traditionally regarded as a reconnaissance.',
   'The expedition is traditionally regarded as a reconnaissance, though the Secret History of the Mongols and Rashid al-Din name the Cumans, the Alans, Hungary and Rus\', Kiev included, as its aims.'],
  ['without a single military organisation; one Russian account names Yarun, the voivode of Mstislav of Galicia, as their commander.',
   'without a single military organisation; at the Kalka they were commanded by Yarun, the voivode of Mstislav of Galicia.'],
  ['Two weeks later, as one Russian account has it, they came to the Kalka and beat a second advance detachment.',
   'Two weeks later they came to the Kalka and beat a second advance detachment.'],
  ['Only the Rus\' losses are estimated; for the Cumans and the Mongols no figures are known. Richard Gabriel claims',
   'Richard Gabriel claims'],
  ['One version holds that the promise had been not to shed blood. The Kievan force is put at 10,000 men in one account.',
   'One version holds that the promise had been not to shed blood.'],
  ['by Ibn al-Athir only 4,000 survived.', 'according to Ibn al-Athir only 4,000 survived.'],
  ['<p>Another telling differs. It has the Mongols retreat', '<p>The tellings of the fighting differ. In another the Mongols retreat'],
  ['and Mstislav of Kiev holds a stockaded camp on a hill by the Dnieper. It also says Jebe\'s second envoys declared war, where the Russian telling lets them go. The date is also given differently: one account ends the fighting on 31 May, three days after the main defeat.',
   'and Mstislav of Kiev holds a stockaded camp on a hill by the Dnieper with 10,000 men. In that telling a second Mongol embassy declared war; in the one followed here it was let go in peace. The date is also given differently: by one reckoning the fighting ended on 31 May, three days after the main defeat.'],
  ['<p>The people of Rus\' trembled in fear of this unknown force that had come from the frontier. The Mongols were not there to conquer and went east after plundering, so that what the Rus\' feared did not come to pass.',
   '<p>The Mongols had not come to conquer and went east after plundering.'],
  ['and in 1237 Subutai and Batu, with 120,000 men according to one account, conquered the Kievan Rus\'.',
   'and in 1237 Subutai and Batu attacked again and conquered the Kievan Rus\'.'],
  ['<p>A Russian account describes the military organisation of the principalities as weakened by feudal fragmentation: the retinues were scattered over a huge territory, weakly linked and ill suited to a single command.',
   '<p>The retinues of the princes and towns were scattered over a huge territory and weakly linked to one another, and gathering a large force was difficult.'],
  ['A folklore festival at the Kamyani Mohyly reserve commemorates', 'A folklore festival at the Kamennye Mogily reserve commemorates'],
  ['"Subutai and Batu return with 120,000 men and conquer the Kievan Rus\'"', '"Subutai and Batu attack again and conquer the Kievan Rus\'"'],
];
for (const [a, b] of R) { if (t.split(a).length !== 2) throw new Error(a.slice(0, 60)); t = t.replace(a, () => b); }
JSON.parse(t); fs.writeFileSync(dst, t); console.log('ok');
// Second pass (same day): names as their entries have them, so they link.
if (process.argv[4] === '2') {
  let u = fs.readFileSync(dst, 'utf8');
  const S = [
    ['where the Volga Bulgars beat them at Samara Bend; according', 'where the Volga Bulgars beat them at the Battle of Samara Bend; according'],
    ['came back in 1237 under Subutai and Batu.', 'came back in 1237 under Subutai and Batu Khan.'],
    ['and in 1237 Subutai and Batu attacked again', 'and in 1237 Subutai and Batu Khan attacked again'],
  ];
  for (const [a, b] of S) { if (u.split(a).length !== 2) throw new Error(a.slice(0, 60)); u = u.replace(a, () => b); }
  JSON.parse(u); fs.writeFileSync(dst, u); console.log('ok 2');
}
