// Whose Life? (/games#whose): the data never names the person in a clue; the card opens the game on its first clue
// with ten lives to choose among; a wrong answer brings the next clue and strikes that life out; the right one ends
// the day with the life named and linked; a reload resumes; the lobby, My Week, Today and the archive know it.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const W = new Function(fs.readFileSync(path.join(process.argv[2], 'whose-data.js'), 'utf8') + '; return WHOSE;')();
  // the data: five clues a life, none naming it; nine different others each day; no life again within sixty days
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), STOP = new Set('the of and ibn abi i ii great mother shi huang khan mansa guru'.split(' '));
  let leak = [], thin = 0;
  W.l.forEach(l => { const words = fold(l[0]).split(/\s+of\s+/)[0].split(/[^a-z']+/).filter(w => w.length >= 4 && !STOP.has(w)); const clues = [l[4]].concat(l[5], l[6], [l[7], l[8]]);
    if (!l[4] || !l[5].length || !l[6].length || !l[7] || !l[8]) thin++;
    for (const c of clues) for (const w of words) if (new RegExp('(^|[^a-z])' + w + '([^a-z]|$)').test(fold(c))) leak.push(l[0] + ': ' + c.slice(0, 60)); });
  ok('data: ' + W.l.length + ' lives with five kinds of clue, the name in none of them', W.l.length >= 90 && !thin && !leak.length, leak.slice(0, 4));
  let bad = 0; const last = {};
  W.p.forEach((p, k) => { if (p[2].length !== 9 || new Set(p[2]).size !== 9 || p[2].indexOf(p[0]) >= 0 || !W.l[p[0]]) bad++; if (last[p[0]] !== undefined && k - last[p[0]] <= 60) bad++; last[p[0]] = k; });
  ok('data: ' + W.p.length + ' days, nine other lives each, no life again within sixty days', bad === 0 && W.p.length >= 300, bad);
  ok('the lives added last are dealt too', ['Jesus', 'Muhammad', 'The Buddha'].every(n => W.p.some(p => W.l[p[0]][0] === n)));
  const srv = await serve(8817), b = await edge(), errs = [], base = 'http://localhost:8817';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const V = vp.width + ': ';
    const st = () => p.evaluate(() => ({ s: epochWhose.state(), clues: [...document.querySelectorAll('.gm-whose-clues li')].map(li => li.textContent), opts: [...document.querySelectorAll('.gm-whose-o')].map(o => [+o.getAttribute('data-i'), o.textContent, o.className, o.disabled]),
      tab: (document.querySelector('.gm-tab[aria-selected="true"]') || {}).id, ask: (document.querySelector('.gm-whose-ask') || {}).textContent || '', wide: document.documentElement.scrollWidth - innerWidth,
      imgs: [...document.querySelectorAll('.gm-whose-o img')].filter(i => i.complete && !i.naturalWidth).length }));
    await p.goto(base + '/games'); await p.waitForTimeout(800); await p.click('.gm-lc[href="#whose"]'); await p.waitForTimeout(1500);
    let s = await st(); const name = s.s.name;
    ok(V + 'the card opens the game: one clue, ten lives in order of name', s.tab === 'tab-whose' && s.s.num >= 1 && s.clues.length === 1 && s.opts.length === 10 && s.opts.some(o => o[0] === s.s.answer) && s.opts.map(o => o[1]).join('|') === s.opts.map(o => o[1]).sort().join('|') && s.wide <= 0, [s.s.num, s.opts.length, s.wide]);
    ok(V + 'the first clue does not name the life', fold(s.clues[0]).indexOf(fold(name).split(/[ ,]/)[0]) < 0 && /^Clue 1/.test(s.clues[0]), s.clues[0].slice(0, 80));
    await p.waitForTimeout(600); s = await st(); ok(V + 'every life has its emblem', s.imgs === 0, s.imgs);
    await p.screenshot({ path: path.join(out, 'whose-' + vp.width + '-ask.png'), fullPage: phone });
    const wrong = s.opts.filter(o => o[0] !== s.s.answer).map(o => o[0]);
    await p.click('.gm-whose-o[data-i="' + wrong[0] + '"]'); await p.waitForTimeout(300); s = await st();
    ok(V + 'a wrong answer brings the second clue and strikes that life out', s.clues.length === 2 && s.s.guesses.length === 1 && !s.s.done && s.opts.filter(o => /is-wrong/.test(o[2]) && o[3]).length === 1 && /^Not /.test(s.ask), s.ask);
    await p.click('.gm-whose-o[data-i="' + wrong[1] + '"]'); await p.waitForTimeout(300);
    await p.reload(); await p.waitForTimeout(1500); s = await st();
    ok(V + 'a reload resumes on the third clue', s.clues.length === 3 && s.s.guesses.length === 2 && !s.s.done && s.opts.filter(o => o[3]).length === 2, s.s);
    await p.click('.gm-whose-o[data-i="' + s.s.answer + '"]'); await p.waitForTimeout(400); s = await st();
    const end = await p.evaluate(() => ({ t: (document.querySelector('#whose-done .gm-done-t') || {}).textContent, sq: (document.querySelector('#whose-done .gm-daily-sq') || {}).textContent, who: (document.querySelector('.gm-whose-ans b') || {}).textContent,
      href: (document.querySelector('.gm-whose-ans a') || {}).getAttribute('href'), rec: JSON.parse(localStorage.getItem('epoch-games'))['whose-' + epochWhose.state().num], streak: JSON.parse(localStorage.getItem('epoch-games'))['whose-streak'] }));
    ok(V + 'the right life ends the day: all five clues, the life named and linked, kept', s.s.done && s.s.won && s.clues.length === 5 && end.t === 'Found on clue 3 of 5' && end.sq === '🟥🟥🟩' && end.who === name && /^\/life\//.test(end.href) && fs.existsSync(path.join(process.argv[2], end.href)) && end.rec.done && end.rec.w === 1 && end.rec.g.length === 3 && end.streak.n === 1, end);
    await p.screenshot({ path: path.join(out, 'whose-' + vp.width + '-done.png'), fullPage: phone });
    await p.goto(base + '/games'); await p.waitForTimeout(800);
    const card = await p.evaluate(() => { const a = document.querySelector('.gm-lc[data-g="whose"]'); return [a.querySelector('.gm-lc-s').textContent, a.classList.contains('is-done')]; });
    ok(V + 'the lobby card shows today’s result', card[0] === 'Found today on clue 3' && card[1], card);
    await p.goto(base + '/weekly'); await p.waitForTimeout(1000);
    const wk = await p.evaluate(() => { const h = [...document.querySelectorAll('thead th')].map(x => x.textContent), i = h.indexOf('Whose Life?'), r = document.querySelector('#wk-body tr.wk-today'); return [i, r ? r.children[i].textContent : '']; });
    ok(V + 'My Week has its column', wk[0] > 0 && (Date.now() < Date.UTC(2026, 10, 24) ? wk[1] === '–' : /clue 3/.test(wk[1])), wk);   // before its first day the week shows a dash
    // losing: five wrong answers
    await p.evaluate(() => localStorage.removeItem('epoch-games')); await p.goto(base + '/games#whose'); await p.reload(); await p.waitForTimeout(1500); s = await st();
    for (const i of s.opts.filter(o => o[0] !== s.s.answer).slice(0, 5).map(o => o[0])) { await p.click('.gm-whose-o[data-i="' + i + '"]'); await p.waitForTimeout(200); }
    s = await st(); const lost = await p.evaluate(() => [(document.querySelector('#whose-done .gm-done-t') || {}).textContent, (document.querySelector('.gm-whose-ans b') || {}).textContent, (document.querySelector('#whose-done .gm-daily-sq') || {}).textContent]);
    ok(V + 'five wrong answers end it, and the life is told', s.s.done && !s.s.won && lost[0] === 'Not this time' && lost[1] === name && lost[2] === '🟥🟥🟥🟥🟥' && s.opts.filter(o => /is-right/.test(o[2])).length === 1, lost);
    // Kids mode: nothing overflows
    await p.evaluate(() => { localStorage.removeItem('epoch-games'); localStorage.setItem('epoch-kids', '1'); }); await p.goto(base + '/games#whose'); await p.reload(); await p.waitForTimeout(1500);
    s = await st(); ok(V + 'Kids mode', s.opts.length === 10 && s.wide <= 0 && s.tab === 'tab-whose', [s.opts.length, s.wide]); await p.screenshot({ path: path.join(out, 'whose-' + vp.width + '-kids.png') });
    await ctx.close();
  }
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
