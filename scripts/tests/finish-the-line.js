// Finish the Line (/games#line): the card opens it, four lines of the same song to choose from, the English under the
// lines of a song in another language, a right and a wrong answer, the score, the record, the lobby's status, My Week.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const L = new Function(fs.readFileSync(path.join(process.argv[2], 'line-data.js'), 'utf8') + '; return LINEQ;')();
  // the data: every puzzle's lines are different lines of its song, with English where the song is not in English
  let bad = 0; const seen = new Set();
  L.p.forEach((p, i) => { const s = L.s[p[0]], ix = [p[1], p[3], p[4], p[5]], t = ix.map(k => s[5][k]); if (new Set(t).size !== 4 || t.some(x => !x) || p[2] < 1 || p[2] > 3 || p[1] - p[2] < 0 || (s[6] && ix.some(k => !s[6][k])) || seen.has(p[0] + ' ' + p[1])) bad++; seen.add(p[0] + ' ' + p[1]); if (i % 5 === 0 && new Set(L.p.slice(i, i + 5).map(q => q[0])).size !== 5) bad++; });
  ok('data: ' + L.p.length + ' puzzles, four different lines each, no line asked twice, five songs a day', bad === 0 && L.p.length % 5 === 0 && L.p.length >= 1500, bad);
  const srv = await serve(8811), b = await edge(), errs = [], base = 'http://localhost:8811';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const W = vp.width + ': ';
    const st = () => p.evaluate(() => ({ s: epochLine.state(), opts: [...document.querySelectorAll('.gm-line-o')].map(o => [+o.getAttribute('data-i'), o.querySelector('.gm-line-l > span').textContent, !!o.querySelector('i'), o.className, o.disabled]), shown: document.querySelectorAll('.gm-line-q .gm-line-l:not(.gm-line-gap)').length, en: document.querySelectorAll('.gm-line-q .gm-line-l i').length, cap: (document.querySelector('.gm-line-q figcaption') || {}).textContent, who: (document.querySelector('#line-board .gm-said-who') || {}).textContent, num: document.getElementById('line-num').textContent, wide: document.documentElement.scrollWidth - innerWidth, tab: [...document.querySelectorAll('.gm-tab[aria-selected="true"]')].map(x => x.id).join() }));
    await p.goto(base + '/games'); await p.waitForTimeout(800); await p.click('.gm-lc[href="#line"]'); await p.waitForTimeout(1500);
    let s = await st(); const q = L.p[(s.s.num - 1) * 5], song = L.s[q[0]];
    ok(W + 'the card opens the game: the lines before, four lines to choose from', s.tab === 'tab-line' && s.s.num >= 1 && s.opts.length === 4 && s.shown === q[2] && s.s.answer === q[1] && new Set(s.opts.map(o => o[0])).size === 4 && s.opts.some(o => o[0] === q[1]) && s.wide <= 0, s);
    ok(W + 'English under every line of a song in another language, none for one in English', s.opts.every(o => o[2] === !!song[6]) && s.en === (song[6] ? q[2] : 0) && !s.who, [song[1], song[4]]);
    ok(W + 'the song is not named before the answer', s.cap.indexOf(song[1]) < 0 && /which line comes next/.test(s.cap), s.cap);
    await p.screenshot({ path: path.join(out, 'line-' + vp.width + '-ask.png') });
    await p.click('.gm-line-o[data-i="' + s.s.answer + '"]'); await p.waitForTimeout(300); s = await st();
    ok(W + 'the right line: marked, set in its place, the song named', s.s.m === '1' && s.opts.every(o => o[4]) && s.opts.filter(o => /is-right/.test(o[3])).length === 1 && s.shown === q[2] + 1 && s.who.indexOf(song[1]) > 0 && /^Right/.test(s.who), s.who);
    await p.screenshot({ path: path.join(out, 'line-' + vp.width + '-right.png') });
    await p.click('#line-board [data-next]'); await p.waitForTimeout(300); s = await st();
    const wrong = s.opts.find(o => o[0] !== s.s.answer)[0]; await p.click('.gm-line-o[data-i="' + wrong + '"]'); await p.waitForTimeout(300); s = await st();
    ok(W + 'a wrong line: both marked', s.s.m === '10' && s.opts.filter(o => /is-right/.test(o[3])).length === 1 && s.opts.filter(o => /is-wrong/.test(o[3])).length === 1 && /^Not this time/.test(s.who), s.who);
    await p.reload(); await p.waitForTimeout(1500); s = await st(); ok(W + 'a reload resumes at the third song', s.s.m === '10' && s.s.i === 2 && s.opts.length === 4, s.s);
    for (let k = 2; k < 5; k++) { s = await st(); await p.click('.gm-line-o[data-i="' + s.s.answer + '"]'); await p.waitForTimeout(200); await p.click('#line-board [data-next]'); await p.waitForTimeout(300); }
    const end = await p.evaluate(() => ({ t: (document.querySelector('#line-done .gm-done-t') || {}).textContent, sq: (document.querySelector('#line-done .gm-daily-sq') || {}).textContent, rev: document.querySelectorAll('#line-board .gm-said-rev li').length, links: [...document.querySelectorAll('#line-board .gm-said-rev a')].map(a => a.getAttribute('href')), rec: JSON.parse(localStorage.getItem('epoch-games'))['line-' + epochLine.state().num], streak: JSON.parse(localStorage.getItem('epoch-games'))['line-streak'], share: !!document.querySelector('#line-done .gm-share'), wide: document.documentElement.scrollWidth - innerWidth }));
    ok(W + 'the score card: 4 of 5, the five songs linked, kept', end.t === '4 of 5 right' && end.sq === '🟩🟥🟩🟩🟩' && end.rev === 5 && end.links.every(h => /^\/songs\//.test(h)) && end.rec.m === '10111' && end.rec.done && end.streak.n === 1 && end.share && end.wide <= 0, end);
    await p.screenshot({ path: path.join(out, 'line-' + vp.width + '-done.png'), fullPage: phone });
    await p.goto(base + '/games'); await p.waitForTimeout(800);
    const card = await p.evaluate(() => { const a = document.querySelector('.gm-lc[data-g="line"]'); return [a.querySelector('.gm-lc-s').textContent, a.classList.contains('is-done')]; }); ok(W + 'the lobby card shows today’s score', card[0] === 'Today: 4/5' && card[1], card);
    await p.goto(base + '/weekly'); await p.waitForTimeout(1000);
    const wk = await p.evaluate(() => { const h = [...document.querySelectorAll('thead th')].map(x => x.textContent), i = h.indexOf('Finish the Line'), r = document.querySelector('#wk-body tr.wk-today'); return [i, r ? r.children[i].textContent : '', h.length, document.documentElement.scrollWidth - innerWidth]; });
    ok(W + 'My Week has its column', wk[0] > 0 && (Date.now() < Date.UTC(2026, 10, 15) ? wk[1] === '–' : /4\/5/.test(wk[1])), wk);   // before its first day the week shows a dash
    // Kids mode: the same songs, nothing overflows
    await p.evaluate(() => { localStorage.removeItem('epoch-games'); localStorage.setItem('epoch-kids', '1'); }); await p.goto(base + '/games#line'); await p.reload(); await p.waitForTimeout(1500);
    s = await st(); ok(W + 'Kids mode', s.opts.length === 4 && s.wide <= 0 && s.tab === 'tab-line', s.s); await p.screenshot({ path: path.join(out, 'line-' + vp.width + '-kids.png') });
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
