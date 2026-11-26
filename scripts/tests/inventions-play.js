// The inventions tree's play features (/inventions): the roads row and the walk through a road step by step (what has
// been reached is lit, Next, Back, Play, leaving it), the mark and count of what this browser has opened, Surprise me,
// Today's invention, and the quiz "What did it take?", whose every answer is a line of the tree and whose wrong
// options are never in the card's line; the phone's bar at the foot; Kids mode without weapons.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const page = fs.readFileSync(path.join(R, 'inventions'), 'utf8');
  ok('the page has the roads row, the walk bar, Surprise me and the play section', ['id="inv-roads"', 'id="inv-walk"', 'id="inv-lucky"', 'id="inv-today"', 'id="inv-quiz"', 'id="inv-seen"'].every(s => page.includes(s)));
  const srv = await serve(8841), b = await edge(), errs = [], base = 'http://localhost:8841';
  const open = async (vp, url, init) => { const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone });
    await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic');" + (init || '') + "}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + url, { waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.documentElement.classList.contains('inv-ready'), null, { timeout: 20000 }); await p.waitForTimeout(400); return p; };
  const st = p => p.evaluate(() => { const I = epochInventions, S = I.state, w = S.walk, N = I.nodes(), phone = S.phone, sel = phone ? '.inv-vc' : '.inv-card';
    return { walk: w ? { to: N[w.to].slug, at: w.at, len: w.list.length, years: w.list.map(i => N[i].y) } : null, sel: S.sel >= 0 ? N[S.sel].slug : '', lit: document.querySelectorAll(sel + '.on').length,
      bar: !document.getElementById('inv-walk').hidden, n: (document.querySelector('.inv-walk-n') || {}).textContent || '', t: (document.querySelector('.inv-walk-t strong') || {}).textContent || '',
      why: (document.querySelector('.inv-walk-s') || {}).textContent || '', url: location.search, seen: Object.keys(I.seen()).length, seenDots: document.querySelectorAll(sel + '.seen').length,
      seenLine: document.getElementById('inv-seen').textContent, wide: document.documentElement.scrollWidth - innerWidth, panel: !document.getElementById('inv-panel').hidden }; });
  // ── wide screen ──
  let p = await open({ width: 1366, height: 900 }, '/inventions?invday=2026-11-26'), s;
  const roads = await p.evaluate(() => [...document.querySelectorAll('#inv-roads [data-road]')].map(x => [x.getAttribute('data-road'), x.textContent]));
  ok('no walk bar shows before a road is chosen', await p.evaluate(() => getComputedStyle(document.getElementById('inv-walk')).display === 'none'));
  ok('the roads row offers roads of four steps or more, none of them a weapon', roads.length >= 5 && roads.every(r => /\d+ steps$/.test(r[1])), roads.slice(0, 3));
  await p.click('#inv-roads [data-road]'); await p.waitForTimeout(300); s = await st(p);
  ok('a road opens on its first step: the bar shows, one card is lit, the oldest ancestor', s.walk && s.walk.to === roads[0][0] && s.walk.at === 0 && s.bar && /^Step 1 of \d+$/.test(s.n) && s.lit === 1 && s.walk.years.every((y, i, a) => !i || a[i - 1] <= y) && new RegExp('road=' + roads[0][0]).test(s.url), [s.n, s.lit, s.url]);
  await p.click('#inv-walk [data-w="next"]'); await p.click('#inv-walk [data-w="next"]'); await p.waitForTimeout(200); s = await st(p);
  ok('Next reaches the third step, three cards lit, and says what it built on or that the road begins there', s.walk.at === 2 && s.lit === 3 && /^Step 3 of/.test(s.n) && /^(Built on |One of the places)/.test(s.why) && s.panel, [s.n, s.lit, s.why]);
  await p.click('#inv-walk [data-w="back"]'); await p.waitForTimeout(150); s = await st(p);
  ok('Back returns a step', s.walk.at === 1 && s.lit === 2);
  await p.click('#inv-walk [data-w="play"]'); await p.waitForTimeout(3600); s = await st(p);
  const playing = await p.evaluate(() => document.querySelector('#inv-walk [data-w="play"]').textContent);
  ok('Play walks on by itself and can be paused', s.walk.at >= 2 && playing === 'Pause', [s.walk.at, playing]);
  await p.click('#inv-walk [data-w="play"]'); const len = s.walk.len;
  await p.evaluate(n => epochInventions.step(n - 1), len); await p.waitForTimeout(200); s = await st(p);
  ok('the last step is the invention itself, with every step lit and the entry linked', s.walk.at === len - 1 && s.lit === len && /^The end of the road/.test(s.why) && await p.evaluate(() => !!document.querySelector('#inv-walk .inv-walk-c a[href^="/encyclopedia/"]')), [s.lit, len, s.why]);
  await p.click('#inv-walk [data-w="x"]'); await p.waitForTimeout(300); s = await st(p);
  ok('leaving the road keeps the invention chosen with its road lit', !s.walk && !s.bar && s.sel === roads[0][0] && s.lit === len && /focus=/.test(s.url) && !/road=/.test(s.url), [s.sel, s.lit, s.url]);
  ok('what was opened is marked on its cards, counted and kept', s.seen >= 4 && s.seenDots === s.seen &&/^You have opened \d+ of \d+\.$/.test(s.seenLine), [s.seen, s.seenDots, s.seenLine]);
  const before = s.seen; await p.click('#inv-lucky'); await p.waitForTimeout(300); s = await st(p);
  ok('Surprise me opens an invention not yet opened', s.seen === before + 1 && s.sel && s.panel, [before, s.seen, s.sel]);
  const walkB = await p.evaluate(() => { const I = epochInventions, n = I.nodes().find(x => Object.keys(I.ancestors(x.i)).length >= 3); I.select(n.slug); const b = document.querySelector('#inv-panel .inv-walk-b'); if (b) b.click(); return { slug: n.slug, had: !!b, w: I.state.walk && I.nodes()[I.state.walk.to].slug }; });
  ok('the panel of an invention with a road offers to walk it', walkB.had && walkB.w === walkB.slug, walkB);
  // today's invention and the quiz
  const today = await p.evaluate(() => { const n = epochInventions.todays(), el = document.getElementById('inv-today'); return { slug: n && n.slug, cat: n && n.cat, name: (el.querySelector('.inv-today-n') || {}).textContent, label: n && n.label, img: !!el.querySelector('img'), go: !!el.querySelector('[data-go]') }; });
  ok('Today’s invention shows a pictured invention that is no weapon', today.slug && today.name === today.label && today.img && today.go && today.cat !== 'weapons', today);
  const quizData = await p.evaluate(() => { const I = epochInventions, N = I.nodes(), bad = []; let n = 0;
    for (let seed = 1; seed <= 40; seed++) for (const q of I.quizMake(seed * 7919)) { n++; const x = N[q.n], line = q.type === 'built' ? I.ancestors(x.i) : I.descendants(x.i);
      if (!x[q.type === 'built' ? 'built' : 'led'].includes(q.right) || q.opts.length !== 4 || new Set(q.opts).size !== 4 || !q.opts.includes(q.right) || q.opts.some(o => o !== q.right && (line[o] || o === x.i || (q.type === 'built' ? N[o].y >= x.y : N[o].y <= x.y)))) bad.push([x.slug, q.type]); }
    return { n, bad }; });
  ok('every quiz answer is a line of the tree, and no wrong option is in the card’s line or on the wrong side of its date', quizData.n === 200 && !quizData.bad.length, [quizData.n, quizData.bad.slice(0, 3)]);
  let q0 = await p.evaluate(() => ({ k: (document.querySelector('.inv-quiz-k') || {}).textContent, daily: epochInventions.quiz().daily, n: epochInventions.quiz().qs.length, opts: document.querySelectorAll('.inv-quiz-b').length }));
  ok('the quiz opens on today’s five, four options a question', q0.daily && q0.n === 5 && q0.opts === 4 && /^Question 1 of 5/.test(q0.k), q0);
  for (let i = 0; i < 5; i++) { const right = await p.evaluate(() => { const q = epochInventions.quiz(); return q.qs[q.at].right; });
    await p.click('.inv-quiz-b[data-quiz-o="' + (i === 2 ? await p.evaluate(r => { const q = epochInventions.quiz(); return q.qs[q.at].opts.find(o => o !== r); }, right) : right) + '"]');
    const why = await p.evaluate(() => (document.querySelector('.inv-quiz-why') || {}).textContent || ''); if (i === 0) ok('a right answer is confirmed with the line it stands for', /^Yes\. .+ built on .+\.$/.test(why), why); if (i === 2) ok('a wrong answer is told the right line', /^Not that one\. .+ built on /.test(why), why);
    await p.click('#inv-quiz [data-quiz="next"]'); }
  const end = await p.evaluate(() => ({ t: (document.querySelector('.inv-quiz-end') || {}).textContent || '', st: JSON.parse(localStorage.getItem('epoch-inv-quiz') || '{}'), share: (document.querySelector('#inv-quiz [data-share-text]') || { getAttribute() {} }).getAttribute('data-share-text') || '' }));
  ok('the score is shown, kept as today’s and as the best, and can be shared without the answers', /^4 of 5/.test(end.t) && end.st.s === 4 && end.st.b === 4 && /4\/5/.test(end.share) && !/built on/.test(end.share), end);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.documentElement.classList.contains('inv-ready')); await p.waitForTimeout(300);
  const again = await p.evaluate(() => (document.querySelector('.inv-quiz-end') || {}).textContent || '');
  ok('today’s round is not dealt twice: the result stands and a practice round is offered', /^4 of 5 today/.test(again) && await p.evaluate(() => !!document.querySelector('#inv-quiz [data-quiz="again"]')), again);
  await p.context().close();
  // ── an address with a road ──
  p = await open({ width: 1366, height: 900 }, '/inventions?road=' + roads[0][0]); s = await st(p);
  ok('?road= opens the walk on its first step', s.walk && s.walk.to === roads[0][0] && s.walk.at === 0 && s.bar, [s.walk && s.walk.to]); await p.context().close();
  // ── phone ──
  p = await open({ width: 390, height: 800 }, '/inventions');
  await p.evaluate(sl => epochInventions.walk(sl), roads[0][0]); await p.waitForTimeout(300); await p.click('#inv-walk [data-w="next"]'); await p.waitForTimeout(400); s = await st(p);
  const ph = await p.evaluate(() => { const w = document.getElementById('inv-walk').getBoundingClientRect(), shown = [...document.querySelectorAll('.inv-vc')].filter(c => c.offsetParent).length, cur = document.querySelector('.inv-vc.sel').getBoundingClientRect(); return { fixed: getComputedStyle(document.getElementById('inv-walk')).position, bottom: Math.round(innerHeight - w.bottom), shown, curTop: Math.round(cur.top), wTop: Math.round(w.top) }; });
  ok('phone: the walk’s bar stands at the foot, only the steps reached are listed and the present one is in view', s.walk.at === 1 && ph.fixed === 'fixed' && ph.bottom === 0 && ph.shown === 2 && ph.curTop > 60 && ph.curTop < ph.wTop && !s.panel && s.wide <= 0, [ph, s.wide]);
  await p.click('#inv-walk [data-w="x"]'); await p.waitForTimeout(300); s = await st(p);
  ok('phone: leaving the road shows every invention again', !s.walk && await p.evaluate(() => [...document.querySelectorAll('.inv-vc')].filter(c => c.offsetParent).length > 100)); await p.context().close();
  // ── Kids mode ──
  p = await open({ width: 1366, height: 900 }, '/inventions', "localStorage.setItem('epoch-kids','1');");
  const kid = await p.evaluate(() => { const I = epochInventions, N = I.nodes(); return { roads: [...document.querySelectorAll('#inv-roads [data-road]')].map(x => N.find(n => n.slug === x.getAttribute('data-road')).cat), quiz: [].concat(...[1, 2, 3, 4, 5, 6].map(s => I.quizMake(s * 31))).some(q => N[q.n].cat === 'weapons' || q.opts.some(o => N[o].cat === 'weapons')), today: I.todays().cat }; });
  ok('Kids mode: no road, question or invention of the day is a weapon', kid.roads.length >= 4 && !kid.roads.includes('weapons') && !kid.quiz && kid.today !== 'weapons', kid); await p.context().close();
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
