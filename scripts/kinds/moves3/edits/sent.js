// The exact sentences of a draft that hold a word, with the field they stand in:  node sent.js <slug> <word> [<slug> <word> …]
const fs=require('fs'),path=require('path');const a=process.argv.slice(2);
for(let i=0;i<a.length;i+=2){const j=JSON.parse(fs.readFileSync(path.join(__dirname,'out',a[i]+'.json'),'utf8'));const out=[];
 const add=(k,s)=>{if(typeof s!=='string')return;for(const p of s.split(/(?<=[.!?])\s+(?=[A-Z“"‘<])|(?<=<\/p>)/))if(p.includes(a[i+1]))out.push('['+k+'] '+p);};
 add('info',j.info);add('summary',j.summary);add('dyk',j.dyk);for(const k in j.facts)add('facts.'+k,j.facts[k]);(j.t||[]).forEach((t,n)=>add('t'+n,t));(j.ev||[]).forEach((e,n)=>add('ev'+n,e[0]+' :: '+e[1]));for(const k in j.sections)add(k,j.sections[k]);
 console.log('== '+a[i]+' / '+a[i+1]);out.forEach(o=>console.log(o));}
