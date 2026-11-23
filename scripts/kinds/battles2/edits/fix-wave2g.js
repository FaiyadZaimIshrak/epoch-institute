// The editor's changes to the plans of the last batch of wave 2.
const fs=require('fs');const ed=(s,fn)=>{const f='scen2/'+s+'.json',j=JSON.parse(fs.readFileSync(f,'utf8'));fn(j);fs.writeFileSync(f,JSON.stringify(j,null,1)+'\n');};
// Oriskany: the accounts name the two chiefs who chose the place, not which side of the ravine each led
ed('battle-of-oriskany',j=>{for(const u of j.units)if(u.id==='north'||u.id==='south')delete u.leader;});
// Uhud: the archers who left their post are not called deserters
ed('battle-of-uhud',j=>{const u=j.units.find(u=>u.id==='desert');u.short='Left hill';});
