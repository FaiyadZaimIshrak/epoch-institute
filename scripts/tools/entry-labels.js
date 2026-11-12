// What an entry is, for its page title, where the builder's own rule (EntryLabel) and Wikidata's description (WdLabel)
// give nothing: "Deeg: Town in eastern Rajasthan, India", "Wendish Crusade: Campaign of Saxon, Danish and Polish
// princes". Written 12 Nov 2026 after the Search Console export showed 236 of the 576 entries Google lists had a
// title that said only "Name — Encyclopedia". Every label is words of the entry's own first sentence, in their order,
// cut only where the phrase is still whole; nothing is added but a conflict's kind ("Battle in south-western Ethiopia"
// for "was fought in south-western Ethiopia").
//   node scripts/tools/entry-labels.js [--report] [--sample=N]     writes scripts/entry-labels.tsv (slug TAB label)
// build-pages.ps1 runs it before the entry pages and uses a label only where it has none of its own.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')();
const WD = {}; for (const l of fs.readFileSync(path.join(R, 'scripts', 'entry-wddesc.tsv'), 'utf8').split(/\r?\n/)) { const c = l.split('\t'); if (c[1]) WD[c[0]] = c[1]; }
const argv = process.argv.slice(2), MAX = 70;
const fits = (e, l) => !!l && (e.name + ': ' + l).length <= MAX;

// the builder's rule, ported (keep in step with EntryLabel in build-pages.ps1): an entry it labels is left to it
const ELB = [',', ';', ' who ', ' which ', ' that ', ' where ', ' whose ', ' but ', ' from about ', ' between ', ' during ', ' under ', ' (', ' c. ', ' known as ', ' called ', ' founded ', ' built ', ' made ', ' used ', ' led by ', ' ruled '];
const NOUNY = /(?:er|or|ist|ian|ess|man|men|ite|ism|ty|ion|ate|ry|ure|ce|ship|dom|hood|ment|ness|al|ary|ery|ic)$/;
const firstSentence = d => d.split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/)[0].replace(/\.$/, '');
function builderLabel(d) {
  const m = firstSentence(d).match(/^[^,]{0,90}?\b(?:was|is|were|are) (?:an? |the )(.+)$/); if (!m) return null;
  const rest = m[1]; let cut = rest.length; for (const b of ELB) { const i = rest.indexOf(b); if (i >= 0 && i < cut) cut = i; }
  let l = rest.slice(0, cut).trim(); const after = rest.slice(cut);
  if (/^,\s*[A-Z]/.test(after)) return null;
  const last = l.split(' ').pop();
  if (/^,\s*[a-z-]+\s/.test(after) && !/^, (?:a|an|the|one|which|who|where|whose|founded|built|and)\b/.test(after) && /^[a-z-]+$/.test(last) && !NOUNY.test(last)) return null;
  l = l.replace(/\s+(?:of|in|on|at|for|from|to|by|with|and|or)$/, '').replace(/\.$/, '').trim();
  const w = l.split(' ').length; if (w < 2 || w > 6) return null;
  return l[0].toUpperCase() + l.slice(1);
}

// the wider rule
const PREP = /\s(?:in|at|on|near|along|around|about|during|after|before|against|from|between|with|by|for|to|through|across|over|under|within|until|since|into|off|beside|above|below|north|south|east|west|c\.)\s/g;
const TITLES = 'ruler|king|queen|emperor|empress|sultan|caliph|pharaoh|governor|duke|duchess|count|countess|prince|princess|bishop|archbishop|pope|chief|regent|khan|shah|emir|president|prime minister|head|lord|founder|leader|commander|one of|part of|son|daughter|wife|brother|sister|capital|home';
const BADEND = /\s(?:of|in|on|at|for|from|to|by|with|and|or|the|a|an|its|his|her|their|which|that|who|as|was|is|were|are|had|has|most|more|first|last|early|late|about|some|each|both)$/;
const KIND = { battle: 'Battle', siege: 'Siege', war: 'War', campaign: 'Campaign', treaty: 'Treaty', peace: 'Peace', revolt: 'Revolt', revolution: 'Revolution', crisis: 'Crisis' };
const cap = s => s[0].toUpperCase() + s.slice(1);
// a cut may leave a participle or the start of a date range hanging: "a people of the middle Volga region mentioned
// [by …]", "king of Sparta from around 515 [to 491 BCE]"
const HANG = /\s(?:[a-z]+(?:ed|wn)|held|sent(?: west| east| north| south)?|set up|built|fought|made|found|kept|led|sung|born|given|taken|written|drawn|spoken|brewed|based)$/;
const DATEHANG = /\s(?:from|until|since|after|before)(?: around| about| c\.)? \d{1,4}(?: BCE| CE)?$/;
const tidy = l => { let p; do { p = l; l = l.replace(DATEHANG, '').replace(HANG, '').replace(/\s+(?:of|in|on|at|for|from|to|by|with|and|or|the)$/, '').trim(); } while (l !== p); return l; };
const words = s => s.split(' ').length;
const balanced = s => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length && (s.match(/[“"]/g) || []).length % 2 === 0 || !/[“”"()]/.test(s);
// a phrase too long is cut before a preposition, at the longest cut of 2-7 words that does not end on a small word
function shorten(l, e) {
  if (words(l) <= 7 && fits(e, l)) return l;
  let best = null, m; PREP.lastIndex = 0;
  while ((m = PREP.exec(l))) { const c = l.slice(0, m.index).trim().replace(/,$/, ''); PREP.lastIndex = m.index + 1; if (words(c) >= 2 && words(c) <= 7 && fits(e, c) && !BADEND.test(' ' + c) && balanced(c)) best = c; }
  return best;
}
function wide(e) {
  const first = firstSentence(e.desc);
  // the subject may carry one aside: "Abbas I of Persia, known as Shah Abbas the Great, was the most celebrated ruler"
  let m = first.match(/^[^,]{0,90}?(?:, [^,]{0,90},)? (?:was|is|were|are) (?:an? |the )(.+)$/), art = true;
  if (!m) { m = first.match(new RegExp('^[^,]{0,90}?(?:, [^,]{0,90},)? (?:was|is) ((?:' + TITLES + ')\\b.+)$')) || first.match(/^[^,]{0,90}?(?:, [^,]{0,90},)? (?:were|are) ((?!(?:[a-z]+ed|[a-z]+en|fought|held|built|made|known|found|said|thought|among|not|now|also|still|often|usually)\b)[a-z].+)$/); art = false; }
  if (m) {
    const rest = m[1]; let cut = rest.length; for (const b of ELB) { const i = rest.indexOf(b); if (i >= 0 && i < cut) cut = i; }
    let l = rest.slice(0, cut).trim(), after = rest.slice(cut);
    // one word and a clause: "a dynasty that ruled north-eastern China from 550 to 577"
    if (words(l) === 1 && /^ (?:that|which) /.test(after)) { const c = after.slice(1).split(/,|;| \(/)[0]; let s = shorten(l + ' ' + c, e); if (s) s = tidy(s); return s && words(s) >= 4 && !BADEND.test(' ' + s) ? cap(s) : null; }
    // a place goes on with one more name: "a town in eastern Rajasthan, India, north of Bharatpur"
    if (/^,\s*[A-Z]/.test(after)) {
      const p = after.match(/^, ((?:[A-Z][\w'’-]+)(?: [A-Z][\w'’-]+){0,2})(?=$|, (?![A-Z])| (?:north|south|east|west|near|on|in|at|about|some)\b)/);
      if (p && / (?:in|of|on|near) [^,]*$/.test(l) && !/ and | or /.test(after.slice(0, p[0].length + 6))) { l += ', ' + p[1]; after = after.slice(p[0].length); }
      else {
        // a list of three: "a campaign of Saxon, Danish and Polish princes against the pagan Slavs"
        const q = after.match(/^((?:, [A-Z][\w'’-]+(?: [A-Z][\w'’-]+)?){1,2},? and [A-Z][\w'’-]+(?: [A-Z][\w'’-]+)?(?: [a-z]+)?)/);
        if (!q) return null; l += q[1]; after = after.slice(q[1].length);
      }
    } else if (/^,\s*[a-z-]+\s/.test(after) && !/^, (?:a|an|the|one|which|who|where|whose|founded|built|and)\b/.test(after)) {
      const last = l.split(' ').pop();
      // "a catastrophic earthquake, followed by …": what follows the comma is a participle or an adverb, not a second adjective
      if (/^[a-z-]+$/.test(last) && !NOUNY.test(last) && !/^, (?:[a-z]+(?:ed|ing|ly|wn|en)|spoken|held|fought|born|sent|set|kept|led|run|sung|told|seen|then|now|later|first|also|still|often|usually|some|about|north|south|east|west|near|in|on|at|from|with|between|during|after|before|whose|when|as|by|for|to)\b/.test(after)) return null;
    }
    l = l.replace(/\s+(?:of|in|on|at|for|from|to|by|with|and|or)$/, '').replace(/\.$/, '').trim();
    if (!art && words(l) < 2) return null;
    let s = shorten(l, e); if (s) s = tidy(s); if (!s || words(s) < 2 || BADEND.test(' ' + s) || !balanced(s)) return null;
    return cap(s);
  }
  // a conflict told with a verb: "was fought in south-western Ethiopia in June and July 1941", "was signed … between A and B"
  const kind = (e.tags || []).map(t => KIND[t]).find(Boolean) || (/^Battle\b/.test(e.name) ? 'Battle' : /^Siege\b/.test(e.name) ? 'Siege' : /^Treaty\b/.test(e.name) ? 'Treaty' : / War$/.test(e.name) ? 'War' : null);
  const v = kind && first.match(/ (?:was|were) (?:fought|signed|concluded|waged|agreed|made)\b(.*)$/);
  if (v) {
    const bt = v[1].match(/ between ((?:the )?[A-Z][^,;]*? and (?:the )?[A-Z][^,;]*?)(?=$|,|;| in | on | at | from | to | during | after | near | over | that | which | who | ending| establishing| \()/);
    if (bt) { const l = kind + ' between ' + bt[1].trim(); if (fits(e, l) && words(l) <= 9 && !BADEND.test(' ' + l)) return l; }
    const pl = v[1].match(/^ (?:in|at|on|near|off) ((?:the )?(?:[a-z-]+ )?[A-Z][^,;]*?)(?=$|,|;| in | on | at | from | to | between | during | after | by | as | when | that | which | \()/);
    if (pl && !/\d/.test(pl[1])) { const prep = v[1].match(/^ (in|at|on|near|off) /)[1], l = kind + ' ' + prep + ' ' + pl[1].trim(); if (fits(e, l) && words(l) <= 7 && !BADEND.test(' ' + l)) return l; }
  }
  return null;
}

const out = [], why = { builder: 0, wikidata: 0, wide: 0, none: 0 }, gained = [];
for (const e of E) {
  if (fits(e, builderLabel(e.desc))) { why.builder++; continue; }
  if (fits(e, WD['e:' + e.slug])) { why.wikidata++; continue; }
  let l = null; try { l = wide(e); } catch (x) { l = null; }
  if (fits(e, l)) { why.wide++; out.push(e.slug + '\t' + l); gained.push(e.name + ': ' + l + '   <=   ' + firstSentence(e.desc).slice(0, 110)); } else why.none++;
}
fs.writeFileSync(path.join(R, 'scripts', 'entry-labels.tsv'), '# slug TAB label: what the entry is, in words of its own first sentence (scripts/tools/entry-labels.js)\n' + out.join('\n') + '\n');
console.log('entry labels: the builder\'s rule ' + why.builder + ', Wikidata ' + why.wikidata + ', the wider rule ' + why.wide + ', none ' + why.none);
const sm = +(argv.find(a => a.startsWith('--sample=')) || '').slice(9); if (sm) { let s = 11; for (let i = 0; i < sm; i++) { s = (s * 1103515245 + 12345) % 2147483648; console.log('  ' + gained[s % gained.length]); } }
if (argv.includes('--report')) fs.writeFileSync(path.join(R, 'scripts', 'entry-labels-report.txt'), gained.join('\n') + '\n');
