// The editor's change to the Alarcos plan: the hill the Almohads formed around stands inside their formation, not off to one side.
const fs=require('fs'),f='scen2/battle-of-alarcos.json',j=JSON.parse(fs.readFileSync(f,'utf8'));
const h=j.terrain.find(t=>t.name==='La Cabeza');h.at=[[42,48],[50,46.5],[58,48],[58,52.5],[50,54],[42,52.5]];h.lab=[62,50.5];
j.note=j.note.replace('so the hill and the fortress are placed by judgement','so the hill is placed inside the Almohad formation and the fortress by judgement');
fs.writeFileSync(f,JSON.stringify(j,null,1)+'\n');
