// The figures of Research Series essays 09-12 (essay-numbers.js routes them here): 09 Faiths on the Move (the faith maps
// and the religion profiles), 10 Who Invented It First? (the inventions tree), 11 From Ruler to Enslaved (the social
// ladders), 12 The Written Word (the language profiles). Every figure an essay quotes comes from this output.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
module.exports = function (which, { rd, YEAR, yl, median, mean }) {
  const SD = new Function(rd('shared-data.js') + ';return {EMPIRES}')();
  const pct = (a, b) => Math.round(100 * a / b) + '%';
  const cent = y => y < 0 ? Math.floor((-y - 1) / 100) + 1 + 'th c. BCE' : Math.floor((y - 1) / 100) + 1 + 'th c.';
  if (which === '09') {
    const rel = SD.EMPIRES.filter(e => e.kind === 'religion');
    const D = path.join(R, 'data', 'faiths'), F = fs.readdirSync(D).map(f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')));
    console.log('religion profiles', rel.length, 'living', rel.filter(e => e.end == null).length, 'ended', rel.filter(e => e.end != null).map(e => e.name + ' (' + yl(e.end) + ')').join('; '));
    console.log('faith maps', F.length);
    const byReg = {}; rel.forEach(e => { byReg[e.region] = (byReg[e.region] || 0) + 1; });
    console.log('religions by region of origin:', Object.entries(byReg).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join('; '));
    console.log('oldest five:', rel.slice().sort((a, b) => a.start - b.start).slice(0, 5).map(e => e.name + ' ' + yl(e.start)).join('; '));
    console.log('youngest five:', rel.slice().sort((a, b) => b.start - a.start).slice(0, 5).map(e => e.name + ' ' + yl(e.start)).join('; '));
    const rows = F.map(f => ({ name: f.name, areas: f.areas.length, main: f.areas.filter(a => a[5] === 2).length, routes: f.routes.length, marks: f.marks.length,
      last: f.marks.filter(m => m[0] === 'last').map(m => m[4] + ' ' + yl(m[1])), span: f.span }));
    console.log('areas in all', rows.reduce((n, r) => n + r.areas, 0), '| routes', rows.reduce((n, r) => n + r.routes, 0), '| marks', rows.reduce((n, r) => n + r.marks, 0));
    console.log('most routes:', rows.slice().sort((a, b) => b.routes - a.routes).slice(0, 6).map(r => r.name + ' ' + r.routes).join('; '));
    console.log('most areas:', rows.slice().sort((a, b) => b.areas - a.areas).slice(0, 6).map(r => r.name + ' ' + r.areas).join('; '));
    for (const r of rows.filter(r => r.last.length)) console.log('  last places, ' + r.name + ':', r.last.join('; '));
    // how far each faith reached: the greatest distance (km) from its origin mark to any of its areas
    const hav = (a, b, c, d) => { const t = Math.PI / 180, x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2; return 6371 * 2 * Math.asin(Math.sqrt(x)); };
    const reach = F.map(f => { const o = f.marks.find(m => m[0] === 'origin'); if (!o) return null; const d = Math.max(0, ...f.areas.map(a => hav(o[7], o[6], a[9], a[8]))); return [f.name, Math.round(d / 100) * 100]; }).filter(Boolean);
    console.log('farthest area from the origin mark (km, rounded):', reach.sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join('; '));
    // spread by century: how many faiths had a main (level 2) area alive at the middle of each millennium
    for (const y of [-500, 1, 500, 1000, 1500, 1900]) console.log('  faiths with a main area alive in', yl(y) + ':', F.filter(f => f.areas.some(a => a[5] === 2 && a[3] <= y && (a[4] == null || a[4] >= y))).length);
  } else if (which === '10') {
    const I = JSON.parse(rd('data/inventions.json')), N = I.n, C = Object.fromEntries(I.cats);
    console.log('inventions', N.length, '| lanes', I.cats.length);
    const bl = {}; N.forEach(n => { bl[n[2]] = (bl[n[2]] || 0) + 1; }); console.log('by lane:', I.cats.map(c => c[1] + ' ' + (bl[c[0]] || 0)).join('; '));
    const per = [['before 3000 BCE', -1e9, -3001], ['3000 BCE to 1 BCE', -3000, 0], ['1 to 1499 CE', 1, 1499], ['1500 to 1799', 1500, 1799], ['1800 to 1899', 1800, 1899], ['from 1900', 1900, 3000]];
    console.log('by period:', per.map(p => p[0] + ' ' + N.filter(n => n[3] >= p[1] && n[3] <= p[2]).length).join('; '));
    const cred = N.filter(n => n[7].length), none = N.filter(n => !n[7].length);
    console.log('credited to a civilisation', cred.length, pct(cred.length, N.length), '| credited to none', none.length);
    const civ = {}; N.forEach(n => n[7].forEach(c => { civ[c[0]] = (civ[c[0]] || 0) + 1; }));
    console.log('most credited:', Object.entries(civ).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x.join(' ')).join('; '));
    const also = N.filter(n => n[9].length); console.log('with independent origins elsewhere', also.length + ':', also.map(n => n[1] + ' (' + n[9].map(a => a[0]).join(', ') + ')').join('; '));
    console.log('with a contested note', N.filter(n => n[11]).length);
    const ppl = N.filter(n => n[8].length); console.log('with named people', ppl.length, pct(ppl.length, N.length), '| before 1500 CE', ppl.filter(n => n[3] < 1500).length, 'of', N.filter(n => n[3] < 1500).length, '| from 1500', ppl.filter(n => n[3] >= 1500).length, 'of', N.filter(n => n[3] >= 1500).length);
    const parents = N.map(n => n[10].length); console.log('built on: nodes with parents', parents.filter(x => x).length, '| mean parents', mean(parents).toFixed(2), '| most:', N.map((n, i) => [n[1], n[10].length]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x.join(' ')).join('; '));
    const kids = new Array(N.length).fill(0); N.forEach(n => n[10].forEach(p => kids[p]++)); console.log('led to most:', N.map((n, i) => [n[1], kids[i]]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x.join(' ')).join('; '));
    const gaps = []; N.forEach(n => n[10].forEach(p => gaps.push(n[3] - N[p][3]))); console.log('years from a parent to its child: median', median(gaps), '| before 1500 CE children', median(N.flatMap(n => n[3] < 1500 ? n[10].map(p => n[3] - N[p][3]) : [])), '| from 1800', median(N.flatMap(n => n[3] >= 1800 ? n[10].map(p => n[3] - N[p][3]) : [])));
    const reg = {}; N.forEach(n => { const p = String(n[6] || ''); reg[p] = (reg[p] || 0) + 1; });
    console.log('places named most:', Object.entries(reg).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => x.join(' ')).join('; '));
    console.log('oldest five:', N.slice().sort((a, b) => a[3] - b[3]).slice(0, 5).map(n => n[1] + ' (' + n[5] + ')').join('; '));
  } else if (which === '11') {
    const D = path.join(R, 'data', 'societies'), L = fs.readdirSync(D).map(f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')));
    const T = L.flatMap(s => s.tiers.map(t => ({ ...t, soc: s.name })));
    console.log('ladders', L.length, '| ranks', T.length, '| ranks per ladder: median', median(L.map(s => s.tiers.length)), 'min', Math.min(...L.map(s => s.tiers.length)), 'max', Math.max(...L.map(s => s.tiers.length)));
    const byReg = {}; L.forEach(s => { byReg[s.region] = (byReg[s.region] || 0) + 1; }); console.log('by region:', Object.entries(byReg).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join('; '));
    console.log('by year: before 1 CE', L.filter(s => s.year < 1).length, '| 1-1499', L.filter(s => s.year >= 1 && s.year < 1500).length, '| 1500-1799', L.filter(s => s.year >= 1500 && s.year < 1800).length, '| from 1800', L.filter(s => s.year >= 1800).length);
    const band = {}; T.forEach(t => { band[t.band] = (band[t.band] || 0) + 1; }); console.log('ranks by band:', Object.entries(band).map(x => x.join(' ')).join('; '));
    const enslaved = L.filter(s => s.tiers.some(t => t.band === 'enslaved')); console.log('ladders with an enslaved rank', enslaved.length, 'of', L.length, '| without:', L.filter(s => !enslaved.includes(s)).map(s => s.name).join(', '));
    const es = L.map(s => [s.name, s.tiers.filter(t => t.band === 'enslaved').reduce((n, t) => n + (t.w || 0), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    console.log('enslaved share (midpoints, per cent), highest:', es.slice(0, 8).map(x => x[0] + ' ' + x[1]).join('; '), '| lowest:', es.slice(-5).map(x => x[0] + ' ' + x[1]).join('; '));
    const top = L.map(s => [s.name, s.tiers.filter(t => ['ruler', 'nobility'].includes(t.band)).reduce((n, t) => n + (t.w || 0), 0)]).sort((a, b) => b[1] - a[1]);
    console.log('ruler and nobility together (midpoints, %): median', median(top.map(x => x[1])).toFixed(2), '| highest', top.slice(0, 5).map(x => x[0] + ' ' + x[1].toFixed(2)).join('; '), '| lowest', top.slice(-5).map(x => x[0] + ' ' + x[1].toFixed(2)).join('; '));
    const est = T.filter(t => t.est), numbered = T.filter(t => t.band !== 'ruler'); console.log('ranks whose share is an estimate', est.length, 'of', numbered.length, pct(est.length, numbered.length));
    const firm = T.filter(t => t.firm); console.log('ranks whose place is agreed (firm)', firm.length, pct(firm.length, T.length));
    const rest = L.map(s => { const r = s.tiers.find(t => /the rest/.test(String(t.lbl))); return r ? [s.name, r.w] : null; }).filter(Boolean);
    console.log('the "rest" rank (commoners or peasants), midpoint: median', median(rest.map(x => x[1])), '| ladders with one', rest.length);
    console.log('estimated populations', L.filter(s => s.popEst).length, 'of', L.length);
  } else if (which === '12') {
    const lang = SD.EMPIRES.filter(e => e.kind === 'language');
    console.log('language profiles', lang.length, '| still spoken', lang.filter(e => e.end == null).length, '| no longer spoken', lang.filter(e => e.end != null).length);
    console.log('oldest six:', lang.slice().sort((a, b) => a.start - b.start).slice(0, 6).map(e => e.name + ' ' + yl(e.start) + (e.end != null ? '–' + yl(e.end) : '–')).join('; '));
    const dur = lang.map(e => [e.name, (e.end == null ? YEAR : e.end) - e.start]).sort((a, b) => b[1] - a[1]);
    console.log('longest recorded:', dur.slice(0, 6).map(x => x.join(' ')).join('; '), '| shortest:', dur.slice(-4).map(x => x.join(' ')).join('; '));
    const ended = lang.filter(e => e.end != null).map(e => e.name + ' ' + yl(e.end)); console.log('ended:', ended.join('; '));
    const byReg = {}; lang.forEach(e => { byReg[e.region] = (byReg[e.region] || 0) + 1; }); console.log('by region:', Object.entries(byReg).sort((a, b) => b[1] - a[1]).map(x => x.join(' ')).join('; '));
    const sc = fs.readdirSync(path.join(R, 'data', 'scribe')).filter(f => f !== 'hanzi.json').map(f => f.replace('.json', ''));
    console.log('languages with a Write-in-scripts keyboard', sc.length + ':', sc.join(', '));
  } else { console.error('usage: essay-numbers.js 07 | 08 | 09 | 10 | 11 | 12'); process.exit(1); }
};
