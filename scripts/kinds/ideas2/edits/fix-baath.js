const fs=require('fs');const f='C:/Users/OMEN 16/AppData/Local/epoch-tools/ideas2/out/baathism.json';
let s=fs.readFileSync(f,'utf8');
function r(a,b){if(!s.includes(a))throw new Error('miss '+a);s=s.replace(a,()=>b);}
r('The United States-led invasion topples Saddam Hussein, and the Iraqi Ba\'ath party is banned','The invasion of Iraq topples Saddam Hussein, and the Iraqi Ba\'ath party is banned');
// power
r(' building a \\"coup-proof\\" system on nepotism and ethnic favouritism, including what the article calls the Alawitization of the party and the military.',' building a \\"coup-proof\\" system on nepotism and ethnic favouritism, including an Alawitization of the party and the military.');
r(' The Simon Wiesenthal Center reported that the Nazi war criminal Alois Brunner died in Syria in 2010 under Bashar al-Assad\'s asylum and for over 30 years advised Hafez and Bashar al-Assad on torture and on purging Syria\'s Jewish community; the regime rejected such accusations.',' The Simon Wiesenthal Center reported that the Nazi war criminal Alois Brunner died in Syria in 2010 under Bashar al-Assad\'s asylum, having advised both Assads on torture and on purging Syria\'s Jewish community; the regime rejected such accusations.');
r(' During the Shia riots of the late 1970s Aflaq warned Saddam against concessions. By the 1990s Saddam proclaimed the party one \\"of Arabism and Islam\\".','');
r(' and justified their rule by spreading conspiratorial anti-Zionist and anti-Western sentiment',' and legitimised their rule with conspiratorial anti-Zionist and anti-Western sentiment');
// legacy
r('The article holds that the fall of the two regimes also ended the ideology\'s influence.','The fall of the two regimes also marked the end of its ideological influence.');
// ideas trim
r(' Because most Arab states were ruled by reactionary classes, he later proposed that revolution spread from one Arab country to the next, the transformed countries uniting one by one.',' Because reactionary classes ruled most Arab states, he later proposed that revolution spread from one country to the next, the transformed countries uniting one by one.');
r(' and abolished foreign concessions. Aflaq admired',' and abolished foreign concessions. Aflaq admired');
r(', opposed both atheism and fundamentalism, and supported secular government.',', opposed atheism and fundamentalism, and supported secular government.');
r(' Aflaq admired Marxist tenets but rejected dialectical materialism as the only truth, and held that in the Arab world all classes, not only the working class, struggled against foreign capitalist domination.',' Aflaq admired Marxist tenets but rejected dialectical materialism as the only truth, and held that in the Arab world all classes struggled against foreign capitalist domination.');
r(', with history another. At the centre',', and history another. At the centre');
// critiques trim
r(' Aflaq said, \\"I no longer recognise my party!\\", and Bitar in 1968 charged that the parties had become organs of regional and dictatorial governments.',' Aflaq said, \\"I no longer recognise my party!\\"');
r(', pointing to its synthesis of illiberal nationalism and non-Marxist socialism, its elitist revolutionary vision, its wish to create a \\"new man\\" and a centralised authoritarian party, and to later claims by associates that Aflaq drew on fascist and Nazi theorists.',', pointing to its mix of illiberal nationalism and non-Marxist socialism, its elitist revolutionary vision, its wish to create a \\"new man\\" and its centralised authoritarian party.');
fs.writeFileSync(f,s);
const j=JSON.parse(s);for(const k in j.sections)console.log(k,j.sections[k].length);
