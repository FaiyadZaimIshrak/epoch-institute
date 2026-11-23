const fs = require('fs'), D = __dirname + '/prof2/out/';
const ed = (slug, sec, pairs) => { const f = D + slug + '.json', j = JSON.parse(fs.readFileSync(f, 'utf8')); let t = j.sections[sec];
  for (const [a, b] of pairs) { if (t.split(a).length !== 2) { if (b && t.includes(b)) continue; throw new Error(slug + ': ' + a.slice(0, 60)); } t = t.replace(a, () => b); } j.sections[sec] = t; fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n'); };
ed('battle-of-trafalgar', 'course', [['At 8 a.m. he ordered it to turn about', 'At 8 a.m. Villeneuve ordered it to turn about']]);
ed('battle-of-manzikert', 'course', [['On the morning of the battle Alp Arslan, in a white robe like a funeral shroud, made a speech to his army. Romanos, unaware', 'Romanos, unaware'],
  ['On 26 August the Byzantines formed up', 'On the morning of 26 August Alp Arslan, in a white robe like a funeral shroud, made a speech to his army. The Byzantines formed up']]);
console.log('ok');
