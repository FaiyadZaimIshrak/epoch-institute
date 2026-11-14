// The growth plan's C2 and C3 (14 Nov 2026): two hand pages that show the method.
//   /method       How the Institute works: what it publishes, from which sources, how a page is drafted and checked,
//                 what it leaves out, how to challenge a page. The text is below; change it here, never in the page.
//   /corrections  The corrections made so far, from the records the repository already keeps:
//                 profile-changes.md (the FACT lines of the October 2026 fact-check of the 94 empire profiles),
//                 scripts/added-entries.json "fixes" (descriptions corrected; the plain-wording edits of
//                 scripts/style/lines are left out: they change no fact) and "nopicture" (pictures of a namesake).
// Both take their head and foot from /privacy (as make-now.js takes /weekly's), so the snippets are the site's own.
//   node scripts/tools/make-method.js        (re-run after a correction is recorded or the text below changes)
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const P = read('privacy'), head0 = P.slice(0, P.indexOf('</head>')), foot = P.slice(P.indexOf('</main>'));
function page(slug, title, name, desc, type, main) {
  const url = 'https://the-epoch-institute.org/' + slug;
  const h = head0
    .replace(/<title>[^<]*<\/title>/, () => '<title>' + esc(title) + ' — The Epoch Institute</title>')
    .replace(/<meta name="description" content="[^"]*">/, () => '<meta name="description" content="' + esc(desc) + '">')
    .replace(/<link rel="canonical" href="[^"]*">/, () => '<link rel="canonical" href="' + url + '">')
    .replace(/<meta property="og:title" content="[^"]*">/, () => '<meta property="og:title" content="' + esc(name) + ' — The Epoch Institute">')
    .replace(/<meta property="og:description" content="[^"]*">/, () => '<meta property="og:description" content="' + esc(desc) + '">')
    .replace(/<meta property="og:url" content="[^"]*">/, () => '<meta property="og:url" content="' + url + '">')
    .replace(/<meta name="twitter:title" content="[^"]*">/, () => '<meta name="twitter:title" content="' + esc(name) + ' — The Epoch Institute">')
    .replace(/<meta name="twitter:description" content="[^"]*">/, () => '<meta name="twitter:description" content="' + esc(desc) + '">')
    .replace('href="/css/privacy.css"', 'href="/css/' + slug + '.css"')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://the-epoch-institute.org/' }, { '@type': 'ListItem', position: 2, name }] },
      { '@type': type, name, url, description: desc, publisher: { '@type': 'Organization', name: 'The Epoch Institute', url: 'https://the-epoch-institute.org/' } }] }) + '</script>');
  for (const [what, rx] of [['title', new RegExp('<title>' + esc(title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))], ['canonical', new RegExp('canonical" href="' + url + '"')], ['css', new RegExp('/css/' + slug + '\\.css')], ['description', /<meta name="description" content="[^"]{70,160}">/]])
    if (!rx.test(h)) throw new Error('/privacy\'s head has changed: make-method.js no longer fits it (' + what + ' of /' + slug + ')');
  const out = h + '</head>\n<body data-nav="about">\n' + main + '\n' + foot;
  fs.writeFileSync(path.join(R, slug), out); console.log('/' + slug + ': ' + Math.round(out.length / 1024) + ' KB');
}
const wrap = (crumb, h1, lede, secs) => '<main id="main" class="ws-page ref-page legal-page">\n<div class="ws-wrap ws-guide">\n<nav class="ref-crumbs" aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><a href="/about">About</a></li><li aria-current="page">' + crumb + '</li></ol></nav>\n' +
  '<header class="ref-head"><span class="hero-ornament"></span><h1 class="research-title">' + h1 + '</h1><p class="ref-lede">' + lede + '</p></header>\n' + secs.join('\n') + '\n</div>';
const sec = (id, h2, html) => '<section class="ws-guide-sec" id="' + id + '"><h2 class="ref-sec-title">' + h2 + '</h2>' + html + '</section>';

// ── the corrections ────────────────────────────────────────────────────────────────────────────────────────────
const E = new Function(read('encyclopedia-data.js').replace(/^\s*const /gm, 'var ') + '\n;return ENCYCLOPEDIA')(), NAME = {}; for (const e of E) NAME[e.slug] = e.name;
const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, toSlug}')();
const profUrl = {}; for (const e of SD.EMPIRES) if (!e.kind) profUrl[e.name] = '/empire/' + SD.toSlug(e.name);
const facts = []; { let cur = ''; for (const l of read('profile-changes.md').split(/\r?\n/)) { const m = l.match(/^## (.+)$/); if (m) { cur = m[1].trim(); continue; } const f = l.match(/^- FACT: (.+)$/); if (f && cur) { let g = facts[facts.length - 1]; if (!g || g.name !== cur) facts.push(g = { name: cur, rows: [] }); g.rows.push(f[1].trim()); } } }
const A = JSON.parse(read('scripts/added-entries.json'));
const styleOld = {}; { const d = path.join(R, 'scripts', 'style', 'lines'); if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (/^in-\d+\.json$/.test(f)) for (const it of JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))) if (it.id.startsWith('entry:')) styleOld[it.id.slice(6)] = it.text; }
const fixes = A.fixes.filter(x => x && NAME[x[0]] && !(styleOld[x[0]] && styleOld[x[0]].includes(x[1])));
const nopic = (A.nopicture || []).filter(x => x && NAME[x[0]]);
const nFacts = facts.reduce((n, g) => n + g.rows.length, 0);
const arrow = s => esc(s).replace(/ -&gt; /g, ' <span aria-hidden="true">→</span><span class="sr-only"> became </span> ');
const corrMain = wrap('Corrections', 'Corrections', 'Every correction of fact the Institute has made to its pages, with what was wrong and what replaced it. ' + (nFacts + fixes.length + nopic.length).toLocaleString('en-GB') + ' so far. When a page is corrected, the change is recorded here.', [
  sec('report', 'Found a mistake?', '<p>Every page ends with <b>Suggest a correction</b>, which opens the <a href="/contact?topic=correction">contact form</a> with the page filled in. Say what is wrong and, if you can, where the right version can be read. A correction that is made is listed on this page; one that is not made is answered with the reason. <a href="/method">How the Institute works</a> explains how pages are written and checked.</p>'),
  sec('entries', 'Encyclopedia entries: descriptions corrected (' + fixes.length + ')', '<p>Found while checking the entries against their sources, October and November 2026.</p><ul class="corr-list">' + fixes.map(x => '<li><a href="/encyclopedia/' + x[0] + '">' + esc(NAME[x[0]]) + '</a><span class="corr-was"><b>Was:</b> ' + esc(x[1]) + '</span><span class="corr-now"><b>Now:</b> ' + esc(x[2]) + '</span></li>').join('') + '</ul>'),
  sec('pictures', 'Pictures that showed something else (' + nopic.length + ')', '<p>An audit in November 2026 compared every entry\'s picture, dates and map point with its source and found pictures taken from a namesake\'s article. Each was removed; some entries have since been given the right picture.</p><ul class="corr-list corr-short">' + nopic.map(x => '<li><a href="/encyclopedia/' + x[0] + '">' + esc(NAME[x[0]]) + '</a><span class="corr-was">The picture showed ' + esc(String(x[1]).replace(/\.$/, '')) + '.</span></li>').join('') + '</ul>'),
  sec('profiles', 'Empire profiles: the fact-check of October 2026 (' + nFacts.toLocaleString('en-GB') + ' corrections in ' + facts.length + ' profiles)', '<p>All 94 empire profiles were read against standard histories in October 2026. Each line gives the earlier wording, what replaced it and why. Open a profile to see its corrections.</p>' + facts.map(g => '<details class="corr-prof"><summary>' + (profUrl[g.name] ? esc(g.name) : esc(g.name)) + ' <span class="corr-n">' + g.rows.length + '</span></summary>' + (profUrl[g.name] ? '<p><a href="' + profUrl[g.name] + '">Read the profile of ' + esc(g.name) + ' →</a></p>' : '') + '<ul class="corr-list corr-short">' + g.rows.map(r => '<li><span class="corr-was">' + arrow(r) + '</span></li>').join('') + '</ul></details>').join('\n')),
]);
page('corrections', 'Corrections: What the Institute Has Set Right', 'Corrections', 'Every correction of fact made to the Institute\'s profiles and encyclopedia: what was wrong, what replaced it and why, and how to report a mistake.', 'WebPage', corrMain);

// ── the method ─────────────────────────────────────────────────────────────────────────────────────────────────
const n = v => v.toLocaleString('en-GB');
const methodMain = wrap('How we work', 'How the Institute works', 'What the Institute publishes, where each kind of page comes from, how it is written and checked, and what to do when you think a page is wrong. Last updated 14 November 2026.', [
  sec('what', 'What this is', '<p>The Epoch Institute is an independent reference work on the history of states, peoples and ideas, free to read and run by its editor. It is not a university or a learned society, and it does not publish original research in the scholarly sense: it compiles, orders and explains what published sources say, and adds its own maps, charts and data tables. Where a page gives the Institute\'s own reading or estimate, it says so.</p>'),
  sec('sources', 'Where each kind of page comes from', '<ul>' +
    '<li><b>Profiles</b> of states, empires, religions, languages, cultures, movements, forms of government, ideologies, works and lives are written from the works listed in each profile\'s references and, for the newer kinds, from the Wikipedia article on the subject and the books that article cites.</li>' +
    '<li><b>Encyclopedia entries</b> (' + n(E.length) + ') are short accounts written from the Wikipedia article each entry links under “Read further”. An entry links an article only where something besides the name agrees: its picture, its dates or its text. Where no article could be confirmed the entry links none.</li>' +
    '<li><b>The states register</b> and the short state histories are compiled from regional reference works and the articles on each state. Places on the maps come from Wikidata (CC0) and are drawn on Natural Earth outlines (public domain). A state whose seat is not known is drawn as approximate.</li>' +
    '<li><b>Speeches, quotations and song texts</b> are never typed or paraphrased from memory. They are imported from a named public-domain edition, which is credited and linked beside the words. Where words reach us through another writer (Thucydides, Plutarch, a later reporter), the page says so. Texts still in copyright are not printed.</li>' +
    '<li><b>Translations</b> made by the Institute are marked as its own and, where a line is uncertain, as tentative.</li>' +
    '<li><b>Pictures</b> come from Wikimedia Commons under free licences and are credited under each one. They are chosen by eye: a period object, portrait or view of the subject itself, not a modern imagined portrait or a namesake.</li>' +
    '<li><b>Power curves and scores</b> are the Institute\'s interpretive judgements of a state\'s strength over time, based on the works in its profile. They are not measurements. Each curve is scaled to its own peak.</li>' +
    '<li><b>Figures nobody counted</b> (the shares of ranks on the social ladders, some populations) are given as ranges, marked as estimates, with a note saying what the estimate rests on.</li></ul>'),
  sec('how', 'How a page is written and checked', '<ol>' +
    '<li><b>A source is fixed first.</b> The article or works a page will rest on are saved before anything is written.</li>' +
    '<li><b>A draft is written with the help of AI tools,</b> from that saved source only, to a written brief for its kind of page. The brief forbids facts, numbers, causes and judgements the source does not give.</li>' +
    '<li><b>A program checks the draft against the source.</b> It lists every number and every proper name in the draft that does not appear in the source, every quotation that differs, and wording that claims more than the source does.</li>' +
    '<li><b>The editor reads the draft against the source</b> and decides each flagged point: corrected, cut, or kept with the reason recorded. Nothing is published unread.</li>' +
    '<li><b>Links between pages are audited.</b> A name that also belongs to someone or something else is kept from linking to the wrong page.</li>' +
    '<li><b>Every release is checked as a whole</b> before it goes live: links, pictures, dates and the structure of every page.</li></ol>' +
    '<p>The Institute states the use of AI tools plainly because readers are entitled to know it. The safeguard is the method above, not the tool: a sentence stays only if the named source supports it.</p>'),
  sec('rules', 'Rules the texts follow', '<ul>' +
    '<li><b>Dates.</b> A firm date is given only where the source gives one. Otherwise the date is marked “c.”, given as a reign (“r.”), a period of activity (“fl.”) or a century, or left out. People known only from legend are described as legendary and carry no dates.</li>' +
    '<li><b>Disagreement.</b> Where sources disagree, the page says that they do and gives the versions, attributed. It does not pick one silently.</li>' +
    '<li><b>Judgements.</b> Praise and blame are attributed to those who made them. Violence, conquest, slavery and persecution are named plainly, in the measure the sources give.</li>' +
    '<li><b>Beliefs.</b> A religion is described as its followers hold it and as historians describe it, without ranking faiths.</li>' +
    '<li><b>Living peoples</b> are written about in the present tense.</li>' +
    '<li><b>Children.</b> Kids mode shows shorter texts and folds accounts of war and killing behind a choice. It changes what is shown first, not what is true.</li></ul>'),
  sec('limits', 'What the Institute does not claim', '<p>The encyclopedia depends heavily on Wikipedia, which is uneven: fuller for Europe and for recent centuries than for much of Africa, Oceania and the early Americas, and so is this site. A short entry is a summary of one article, not a survey of the scholarship. The register of states is a working list, not a complete census of every polity that existed. Lists of rulers show the people the encyclopedia holds, not every ruler. Where coverage is thin the Institute would rather say less than fill the gap with guesses.</p>'),
  sec('wrong', 'If you think a page is wrong', '<p>Use <b>Suggest a correction</b> at the foot of any page, or the <a href="/contact?topic=correction">contact form</a>. Corrections are checked against a source, made, and listed on the <a href="/corrections">Corrections</a> page with what changed. Scholars and teachers who would like to review pages in their field are welcome to <a href="/contributors">write to the Institute</a>.</p>'),
  sec('reuse', 'Citing and reusing', '<p>Each entry, essay and profile carries a ready citation. The Institute\'s texts are licensed CC BY-SA 4.0 and its data CC BY 4.0; pictures keep the licence in their credit. The data tables can be downloaded from <a href="/dataset">Open Data</a>. Details are on <a href="/terms">Terms and licences</a>.</p>'),
]);
page('method', 'How the Institute Works: Sources and Method', 'How the Institute works', 'Where each kind of page comes from, how drafts are written with AI help and checked against their sources, and how to challenge a page.', 'AboutPage', methodMain);
