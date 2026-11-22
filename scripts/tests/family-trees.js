// Family (scripts/entry-family.tsv, scripts/family-trees.tsv): the relations are between person entries, nobody is their
// own ancestor or has two fathers; a house's tree links only pages that exist and draws nobody twice; a person's page
// lists parents, spouses and children; a Great Life shows its family; on a phone the tree scrolls inside its box.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const tsv = f => fs.readFileSync(path.join(R, f), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#').map(l => l.split('\t'));
(async () => {
  const E = new Function(fs.readFileSync(path.join(R, 'encyclopedia-data.js'), 'utf8') + ';return ENCYCLOPEDIA')(), by = {}; for (const e of E) by[e.slug] = e;
  const fam = tsv('scripts/entry-family.tsv'), par = fam.filter(r => r[0] === 'p'), sp = fam.filter(r => r[0] === 's');
  const bad = fam.filter(r => !by[r[1]] || !by[r[2]] || by[r[1]].type !== 'person' || by[r[2]].type !== 'person' || r[1] === r[2]);
  ok('relations: ' + par.length + ' parents and children, ' + sp.length + ' marriages, all between person entries', par.length > 2000 && sp.length > 250 && !bad.length, bad.slice(0, 3));
  const kids = {}, fathers = {}; let two = [];
  for (const r of par) { (kids[r[1]] = kids[r[1]] || []).push(r[2]); if (r[3] === 'f' || r[3] === 'm') { const k = r[2] + '|' + r[3]; if (fathers[k]) two.push(k); fathers[k] = 1; } }
  const state = {}; let cyc = 0; const walk = n => { if (state[n] === 2) return; if (state[n] === 1) { cyc++; return; } state[n] = 1; (kids[n] || []).forEach(walk); state[n] = 2; }; Object.keys(kids).forEach(walk);
  ok('nobody is their own ancestor, nobody has two fathers or two mothers', !cyc && !two.length, [cyc, two.slice(0, 3)]);
  const trees = tsv('scripts/family-trees.tsv'); let gone = [], twice = [], count = [];
  for (const [h, n, svg] of trees) { const hs = [...svg.matchAll(/href="\/encyclopedia\/([a-z0-9-]+)"/g)].map(m => m[1]);
    if (!by[h]) gone.push(h); for (const s of hs) if (!fs.existsSync(path.join(R, 'encyclopedia', s))) gone.push(s);
    if (new Set(hs).size !== hs.length) twice.push(h); if (hs.length !== +n || hs.length < 4) count.push(h); }
  ok('trees: ' + trees.length + ' houses; every person linked has a page, is drawn once, and the count is the tree’s', trees.length >= 60 && !gone.length && !twice.length && !count.length, [gone.slice(0, 3), twice.slice(0, 3), count.slice(0, 3)]);
  const tudor = fs.readFileSync(path.join(R, 'encyclopedia', 'house-of-tudor'), 'utf8'), h8 = fs.readFileSync(path.join(R, 'encyclopedia', 'henry-viii-of-england'), 'utf8'), e1 = fs.readFileSync(path.join(R, 'life', 'elizabeth-i'), 'utf8');
  ok('the House of Tudor has its tree under Rulers and members', /id="family-tree"/.test(tudor) && /<div class="ft-wrap" tabindex="0"><svg class="ft-svg"/.test(tudor) && tudor.indexOf('Rulers and members') < tudor.indexOf('ft-wrap') && /href="\/encyclopedia\/elizabeth-i" class="ft-p ft-m"/.test(tudor));
  const famSec = (h8.match(/<section class="enc-family">[\s\S]*?<\/section>/) || [''])[0];
  ok('Henry VIII’s page lists his father and children', /Father &#183; 1457/.test(famSec) && /href="\/encyclopedia\/elizabeth-i"/.test(famSec) && /Child &#183; 1533/.test(famSec) && /as Wikidata records them/.test(famSec), famSec.slice(0, 200));
  ok('the life of Elizabeth I shows her family', /Family in the encyclopedia/.test(e1) && /href="\/encyclopedia\/henry-viii-of-england">Henry VIII of England<span>Father<\/span>/.test(e1));
  const srv = await serve(8829), b = await edge(), errs = [], base = 'http://localhost:8829';
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const V = vp.width + ': ';
    for (const house of ['house-of-tudor', 'carolingian-dynasty']) {
      await p.goto(base + '/encyclopedia/' + house, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(900);
      const m = await p.evaluate(() => { const w = document.querySelector('.ft-wrap'), s = w.querySelector('svg'), r = s.querySelector('.ft-p rect'), t = s.querySelector('.ft-n'); w.scrollIntoView({ block: 'center' });
        return { wide: document.documentElement.scrollWidth - innerWidth, box: w.clientWidth, svg: s.getBoundingClientRect().width, scroll: w.scrollWidth > w.clientWidth, fill: getComputedStyle(r).fill, stroke: getComputedStyle(r).stroke, font: getComputedStyle(t).fontSize }; });
      ok(V + house + ': the page is no wider than the screen, the tree keeps its size and scrolls in its box', m.wide <= 0 && m.svg >= 600 && (m.svg <= m.box || m.scroll) && m.font === '13px' && m.fill !== 'rgb(0, 0, 0)', m);
      if (house === 'house-of-tudor') await (await p.$('.enc-house')).screenshot({ path: path.join(out, 'family-' + vp.width + '-tudor.png') });
    }
    await p.goto(base + '/encyclopedia/henry-viii-of-england', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(700);
    const f = await p.evaluate(() => { const s = document.querySelector('.enc-family'); s.scrollIntoView({ block: 'center' }); return { n: s.querySelectorAll('li').length, wide: document.documentElement.scrollWidth - innerWidth, tt: getComputedStyle(s.querySelector('.tp')).textTransform }; });
    ok(V + 'a person’s family tiles', f.n >= 3 && f.wide <= 0 && f.tt === 'none', f); await (await p.$('.enc-family')).screenshot({ path: path.join(out, 'family-' + vp.width + '-person.png') });
    await ctx.close();
  }
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
