// American spellings and "-ize" forms in the drafts' public texts (not notes, not references), outside quotation marks: a list to fix by hand.
const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'out');
const RE=/\b(\w+(?:iz(?:e|es|ed|ing|ation|ations))|colou?r(?!\w)|color\w*|center\w*|defense\w*|honor\w*|labor\w*|favor\w*|harbor\w*|neighbor\w*|theater\w*|fiber\w*|mold\w*|plow\w*|gray|traveler\w*|traveled|jewelry|skillful|program(?!m)\w*|catalog(?!u)\w*|analyz\w+|artifact\w*|story(?=\s+(?:keep|building|tower|pagoda))|stories(?=\s+high)|\w+-story)\b/g;
const OK=/^(size|sizes|sized|seize|seized|seizes|seizing|prize|prizes|prized|colour|capsize\w*|citizen\w*|maize|horizon\w*|bizarre|frieze)$/i;
for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json')).sort()){const j=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));const tx=[];
 const add=s=>{if(typeof s==='string')tx.push(s);};add(j.info);add(j.summary);add(j.dyk);for(const k in j.facts)add(j.facts[k]);(j.t||[]).forEach(add);(j.ev||[]).forEach(e=>{add(e[0]);add(e[1]);});for(const k in j.sections)add(j.sections[k]);
 const hits=new Set();for(const s of tx){const t=s.replace(/"[^"]*"|“[^”]*”/g,' ');let m;RE.lastIndex=0;while((m=RE.exec(t)))if(!OK.test(m[1]))hits.add(m[1]);}
 if(hits.size)console.log(f.replace('.json','')+': '+[...hits].join(', '));}
