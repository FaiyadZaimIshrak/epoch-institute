// /encyclopedia/quotations (the built page, no browser): it counts its quotations and speakers, lists every speaker of
// data/quotes.json and data/quotes-words.json that has an entry, and each listed entry carries "In their words".
// (From 14 Nov 2026: the page had said "0 quotations from 1 people" since it shipped, a loop variable $qbY having
// overwritten $QBY, and nothing checked it.)
const fs = require('fs'), path = require('path'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const page = fs.readFileSync(path.join(R, 'encyclopedia', 'quotations'), 'utf8');
const speakers = new Set(); let total = 0;
for (const f of ['quotes.json', 'quotes-words.json']) { const p = path.join(R, 'data', f); if (!fs.existsSync(p)) continue; for (const q of JSON.parse(fs.readFileSync(p, 'utf8'))) if (fs.existsSync(path.join(R, 'encyclopedia', q.speaker))) { speakers.add(q.speaker); total++; } }
const lede = (page.match(/<p class="ref-lede">([\d,]+) quotations from ([\d,]+) people/) || []).slice(1).map(x => +x.replace(/,/g, ''));
ok('the page counts its quotations and speakers', lede[0] === total && lede[1] === speakers.size && total > 1500 && speakers.size > 300, [lede, total, speakers.size]);
const listed = [...page.matchAll(/href="\/encyclopedia\/([a-z0-9-]+)#in-their-words"/g)].map(m => m[1]);
ok('every speaker is listed once', listed.length === speakers.size && new Set(listed).size === listed.length && listed.every(s => speakers.has(s)), [listed.length, speakers.size]);
const missing = listed.filter(s => !/id="in-their-words"/.test(fs.readFileSync(path.join(R, 'encyclopedia', s), 'utf8')));
ok('each speaker’s entry has In their words', !missing.length, missing.slice(0, 5));
const want = ['jesus', 'muhammad', 'gautama-buddha', 'laozi', 'moses', 'confucius'];
ok('the founders of faiths are among them', want.every(s => listed.includes(s)), want.filter(s => !listed.includes(s)));
const sum = [...page.matchAll(/<span class="tp">[^<]*?(\d+) quotations?<\/span>/g)].reduce((a, m) => a + +m[1], 0);
ok('the speakers’ counts add up to the total', sum === total, [sum, total]);
console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
