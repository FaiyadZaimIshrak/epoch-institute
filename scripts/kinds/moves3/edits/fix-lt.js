const fs=require('fs');
const p='C:/Users/OMEN 16/AppData/Local/epoch-tools/moves3/out/liberation-theology.json';
let s=fs.readFileSync(p,'utf8');
const a='  ["1971", "The Peruvian priest Gustavo Gutiérrez coins the term and writes A Theology of Liberation"],\n';
const b='  ["1970s", "Protestant advocates including C. René Padilla call for integral mission, emphasising evangelism and social responsibility"],\n';
if(!s.includes(a+b))throw 'order';
s=s.replace(a+b,()=>b+a);
const R=[["which the United Nations Economic Commission for Latin America and the Caribbean, known as CEPAL, deemed","which CEPAL deemed"],
["Óscar Romero, Archbishop of San Salvador;","Óscar Romero;"],
["and the Brazilian Frei Betto helped","and Frei Betto helped"],
["related theologies in the United States, South Africa, Palestine,","related theologies in the United States, South Africa, among Palestinians,"],
["the Protestants Rubem","Protestant advocates Rubem"],
["Archbishop Óscar Romero of El Salvador and Archbishop Hélder Câmara of Brazil became figures of resistance or of engagement","Archbishop Óscar Romero became a symbol of resistance in El Salvador, and the archbishop Hélder Câmara a voice for engagement"],
["In Palestine, the Anglican","In Palestinian liberation theology, the Anglican"],
["obligation of Christians first of all","obligation of those who call themselves Christian first of all"],
[" CHECK and remove 'Brazilian' if flagged",""],
["Betto's nationality is not stated by the article, so people section calls him Brazilian only because the article names no country:","Betto's country is not stated by the article, so none is given."],
["  \"'Which CEPAL' expanded to its full name, which the article does not give; editor may wish to cut the expansion.\",\n",""]];
for(const [x,y] of R){ if(!s.includes(x))console.log('miss',x.slice(0,40)); s=s.split(x).join(y);}
fs.writeFileSync(p,s);
JSON.parse(s);
