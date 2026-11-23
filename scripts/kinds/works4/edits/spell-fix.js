// British spelling in the drafts' public texts (lower-case words only, never inside quotation marks):  node spell-fix.js
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'out');
const MAP={characterization:'characterisation',evangelizing:'evangelising',laborers:'labourers',labor:'labour',center:'centre',traveled:'travelled','three-story':'three-storey','single-story':'single-storey',molded:'moulded',molds:'moulds',artifacts:'artefacts',artifact:'artefact',memorized:'memorised',legitimize:'legitimise',memorize:'memorise',summarizing:'summarising',reorganize:'reorganise',finalized:'finalised',recognized:'recognised',civilizations:'civilisations',civilization:'civilisation',criticized:'criticised',organization:'organisation',theorized:'theorised'};
const RE=new RegExp('(?<![\w-])('+Object.keys(MAP).sort((a,b)=>b.length-a.length).join('|')+')(?![\w-])','g');
let n=0;const fix=s=>s.split(/("[^"]*"|“[^”]*”)/).map((p,i)=>i%2?p:p.replace(RE,m=>{n++;return MAP[m];})).join('');
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))){const p=path.join(dir,f),j=JSON.parse(fs.readFileSync(p,'utf8'));const b=n;
 for(const k of ['info','summary','dyk'])if(typeof j[k]==='string')j[k]=fix(j[k]);for(const k in j.facts)j.facts[k]=fix(j.facts[k]);j.t=(j.t||[]).map(fix);j.ev=(j.ev||[]).map(e=>[e[0],fix(e[1])]);for(const k in j.sections)j.sections[k]=fix(j.sections[k]);
 if(n>b){fs.writeFileSync(p,JSON.stringify(j,null,1)+'\n');console.log(f+': '+(n-b));}}
console.log(n+' words changed');
