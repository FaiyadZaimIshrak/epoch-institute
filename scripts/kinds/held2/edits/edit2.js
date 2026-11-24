// The editor's cuts to Juche (24 Nov 2026): the power and critiques sections shortened by deletion only, three takeaways,
// a summary within 500 characters.   node edit2.js
const fs = require('fs'), f = 'out/juche.json', j = JSON.parse(fs.readFileSync(f, 'utf8'));
const cut = (k, parts) => { let t = j.sections[k]; for (const p of parts) { if (t.split(p).length !== 2) throw new Error(k + ': ' + p.slice(0, 50)); t = t.replace(p, () => ''); } j.sections[k] = t.replace(/<p>\s*<\/p>/g, '').replace(/ +<\/p>/g, '</p>').replace(/  +/g, ' '); };
const rep = (k, a, b) => { if (j.sections[k].split(a).length !== 2) throw new Error(k + ': ' + a.slice(0, 50)); j.sections[k] = j.sections[k].replace(a, () => b); };
cut('power', [
  ' It received aid and technical assistance from the Soviet Union and China but did not join Comecon.',
  ' In the 1990s it had one of the lowest rates of dependence on petroleum, using hydroelectric power and coal, and its textile industry used vinylon, called the “Juche fiber”, made from local coal and limestone.',
  ' In politics, North Korea opposed what it saw as Soviet and Chinese attempts to interfere in its postwar affairs, and a failed challenge to Kim Il Sung\'s leadership in 1956 led to a purge of pro-Soviet and pro-Chinese elements from the party.',
  ' Independent groups of researchers in 2001 and 2007 estimated 600,000 to 1 million deaths, and a 2011 U.S. Census Bureau report estimated 500,000 to 600,000 excess deaths from 1993 to 2000. Andrei Lankov considers both the highest and the lowest estimates inaccurate.',
  ', and Stephan Haggard and Marcus Noland argued that with other policies, such as seeking multilateral assistance, the government could have avoided it',
  ' Words such as “famine” and “hunger” were banned as implying government failure, and citizens who said deaths were due to famine could be in serious trouble with the authorities; in 1997 the agriculture minister So Kwan-hui was accused of sabotaging agriculture on purpose and was executed by firing squad.',
  'Groups such as Human Rights Watch, the United Nations and Freedom House have condemned North Korea\'s human rights record as one of the worst in the world. ',
  ' North Korean human-rights theory, which draws on the Juche idea, Marxist theory and Confucian tradition, regards rights as conditional and gives collective rights priority over individual ones; Kim Il Sung rejected civil rights for those who opposed the regime.',
  ', and Amnesty International and the U.S. Committee for Human Rights in North Korea estimated that by 2017 about 200,000 prisoners were held in camps for political crimes',
  ', and one estimate holds that 40% of prisoners die of malnutrition',
  ' In October 2014 a foreign ministry spokesperson acknowledged “reform through labor detention” facilities for the first time. Reports also tell of executions by firing squad, among them a factory chief shot in 2007 before 150,000 people for making international phone calls, and of the execution of Jang Song-thaek, the uncle of Kim Jong Un, in December 2013. Estimates of the total victims of repression, such as Pierre Rigoulot\'s 100,000 executions and 1.5 million deaths in camps, differ widely and rest on testimony.',
  ' All media are state-run, radios and televisions are sold preset to government frequencies, and consuming foreign media is reported to be punishable, in some cases by execution. A report by the UN human rights office found an extensive system of forced labour that begins with schoolchildren.',
  ' In 2016 Hazel Smith reported that health and nutrition had improved greatly and were comparable to other developing countries, and she disputed that government policies were creating a human rights crisis unique to North Korea.',
]);
cut('critiques', [
  ' Suh Dae-sook argues that Kim Il Sung did not explain the difference between socialist patriotism, which he supported, and nationalism, which he opposed.',
  ' Felix Abt, who lived in North Korea, calls Myers\'s arguments “shaky”, and Bruce Cumings and Christoph Hartmut Bluth argue that it is an ideal of self-reliance that North Korea has tried to implement.',
  'Several experts argued that the aim of food self-sufficiency was unrealistic in a country with so little arable land, and the pursuit of autarky has been blamed for contributing to the crisis of the 1990s through inefficiency and the neglect of export opportunities. ',
  '; the famine has also been described as the result of economic policy or as deliberate “terror-starvation”',
  ' The delegations of China, Sudan, Venezuela and Cuba at the UN have called the allegations politically motivated or not credible.',
]);
if (j.t.length !== 4 || !j.t[1].startsWith('Kim Il Sung\'s 1955 speech')) throw new Error('takeaways'); j.t.splice(1, 1);
const s0 = ' Under it North Korea went through a famine in 1994 to 1999 in which estimates of the dead range from 240,000 to 3,500,000, and a UN commission of inquiry reported prison camps, executions and tight controls on movement and speech, which the government rejects.';
if (j.summary.split(s0).length !== 2) throw new Error('summary');
j.summary = j.summary.replace(s0, () => ' A famine struck North Korea in 1994 to 1999, and a UN commission of inquiry reported prison camps and executions, which the government rejects.');
fs.writeFileSync(f, JSON.stringify(j, null, 1) + '\n');
for (const k of ['power', 'critiques']) console.log(k, j.sections[k].replace(/<[^>]+>/g, '').length); console.log('summary', j.summary.length);
