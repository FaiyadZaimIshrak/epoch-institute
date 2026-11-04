// Today in History, more events (A8, Nov 2026): candidates from Wikipedia's "On this day" feed for every day of
// data/history.json, for scripts/days/check-dates.js and the drafting agents (DAYS-GUIDE.md). Per day: the feed's
// events of a year the day does not have yet, ranked older first (BCE, before 1000, 1000-1499, 1500-1799, then later),
// outside Europe first (by the words of the line and its pages' short descriptions), with a main article (the first
// page that is not a year, a country or a city); the best <per> of each day are written.
// --leads=<dir>: also saves each candidate's article lead (the feed carries it) as <dir>/<day>_<year>.txt, the form
// scripts/kinds/fetch-articles.js uses, so check-dates.js can try the lead before any whole article is fetched.
//   node scripts/days/otd-candidates.js <out.tsv> [--per=4] [--leads=<dir>]
// out: day <TAB> year <TAB> main article title <TAB> the feed's line <TAB> other page titles (" | ")
// The feed is cached in %LOCALAPPDATA%\epoch-tools\otd-cache (one file a day), asked once a second.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const UA = { 'User-Agent': 'EpochInstitute/1.0 (the-epoch-institute.org; research@the-epoch-institute.org)' }, sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), outF = args.find(a => !a.startsWith('--')), per = +((args.find(a => a.startsWith('--per=')) || '').slice(6) || 4);
if (!outF) { console.error('usage: otd-candidates.js <out.tsv> [--per=4]'); process.exit(1); }
const leads = (args.find(a => a.startsWith('--leads=')) || '').slice(8); if (leads) fs.mkdirSync(leads, { recursive: true });
const CACHE = path.join(process.env.LOCALAPPDATA || '.', 'epoch-tools', 'otd-cache'); fs.mkdirSync(CACHE, { recursive: true });
const H = JSON.parse(fs.readFileSync(path.join(R, 'data', 'history.json'), 'utf8'));
const EUROPE = /\b(Europe|European|England|English|Britain|British|Scotland|Scottish|Ireland|Irish|Wales|Welsh|France|French|Germany|German|Prussia|Austria|Austrian|Hungary|Hungarian|Poland|Polish|Russia|Russian|Italy|Italian|Spain|Spanish|Portugal|Portuguese|Netherlands|Dutch|Belgium|Belgian|Sweden|Swedish|Norway|Norwegian|Denmark|Danish|Finland|Finnish|Switzerland|Swiss|Greece|Greek|Rome|Roman|Byzantine|Holy Roman|Pope|papal|Venice|Venetian|Florence|Milan|Naples|Sicily|Bohemia|Czech|Serbia|Serbian|Croatia|Bulgaria|Bulgarian|Romania|Lithuania|Ukraine|Ukrainian|Habsburg|Bavaria|Saxony|London|Paris|Berlin|Vienna|Moscow)\b/;
const SKIP = /\b(country|city|town|capital|sovereign state|municipality|region of|province of|island country|calendar year|year)\b/i;
const get = async u => { for (let i = 0; i < 6; i++) { try { const r = await fetch(u, { headers: UA }); if (r.status === 429) { await sleep(1000 * (+r.headers.get('retry-after') || 20)); continue; } if (r.ok) return await r.json(); } catch (e) {} await sleep(3000 * (i + 1)); } return null; };
(async () => {
  const out = [], days = Object.keys(H).sort(); let fetched = 0;
  for (const k of days) {
    const f = path.join(CACHE, k + '.json'); let j;
    if (fs.existsSync(f)) j = JSON.parse(fs.readFileSync(f, 'utf8'));
    else { const [m, d] = k.split('-'); j = await get(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${m}/${d}`); if (!j) { console.log('no feed for ' + k); continue; } fs.writeFileSync(f, JSON.stringify(j)); fetched++; await sleep(1000); }
    const have = new Set((H[k].events || H[k]).map(e => e.year));
    const cands = [];
    for (const e of j.events || []) {
      if (typeof e.year !== 'number' || have.has(e.year) || e.year > 1990) continue;
      const pages = (e.pages || []).filter(p => !/^\d+( BC)?$/.test(p.titles && p.titles.normalized || ''));
      const main = pages.find(p => !SKIP.test(p.description || '')) || pages[0]; if (!main) continue;
      const words = e.text + ' ' + pages.map(p => p.description || '').join(' ');
      const era = e.year < 0 ? 5 : e.year < 1000 ? 4 : e.year < 1500 ? 3 : e.year < 1800 ? 2 : e.year < 1900 ? 1 : 0;
      cands.push({ main, pages, y: e.year, s: era * 2 + (EUROPE.test(words) ? 0 : 3), t: main.titles.normalized, line: e.text.replace(/\s+/g, ' ').trim(), others: pages.filter(p => p !== main).map(p => p.titles.normalized).join(' | ') });
    }
    cands.sort((a, b) => b.s - a.s || a.y - b.y);
    const seen = new Set(); let n = 0;
    for (const c of cands) { if (seen.has(c.y) || seen.has(c.t)) continue; seen.add(c.y); seen.add(c.t); out.push([k, c.y, c.t, c.line, c.others].join('\t'));
      if (leads && c.main.extract) fs.writeFileSync(path.join(leads, k + '_' + c.y + '.txt'), 'Source: ' + ((c.main.content_urls || {}).desktop || {}).page + '\nTitle: ' + c.t + ' (lead only)\n\n' + c.main.extract);
      // the leads of the event's other pages too (<day>_<year>~<n>.txt): the battle or treaty page often dates the
      // event when the main page (a ruler, a city) does not
      if (leads) c.pages.filter(p => p !== c.main && p.extract && !SKIP.test(p.description || '')).forEach((p, i) => fs.writeFileSync(path.join(leads, k + '_' + c.y + '~' + (i + 1) + '.txt'), 'Source: ' + ((p.content_urls || {}).desktop || {}).page + '\nTitle: ' + p.titles.normalized + ' (lead only)\n\n' + p.extract));
      if (++n >= per) break; }
  }
  fs.writeFileSync(outF, out.join('\n') + '\n');
  console.log(`${out.length} candidates for ${days.length} days (${fetched} feeds fetched) written to ${outF}`);
})();
