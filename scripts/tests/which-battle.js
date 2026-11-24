// Which Battle Is This? (/games#battle): the dealing; the card opens the game on a field with no names on it and eight
// battles to choose among; each wrong answer puts a kind of name back (ground, century and region, sides, commanders)
// and strikes that battle out; the right one ends the day with the battle named, linked and its field told in full; a
// reload resumes; the lobby, My Week, Today and the archive know it; Kids mode leaves it off the lobby.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const Q = new Function(fs.readFileSync(path.join(R, 'battleq-data.js'), 'utf8') + '; return BATTLEQ;')();
  let bad = 0; const last = {}, nofield = [];
  Q.b.forEach(b => { const f = path.join(R, 'data', 'battles', b[1] + '.json'); if (!fs.existsSync(f) || JSON.parse(fs.readFileSync(f, 'utf8')).phases.length < 3 || !fs.existsSync(path.join(R, 'battle', b[1])) || !b[2] || !b[3] || !/century/.test(b[4])) nofield.push(b[0]); });
  ok('data: ' + Q.b.length + ' battles, each with a field of three phases or more, a page, its date, region and century', Q.b.length >= 100 && !nofield.length, nofield.slice(0, 4));
  Q.p.forEach((p, k) => { if (p[1].length !== 7 || new Set(p[1]).size !== 7 || p[1].indexOf(p[0]) >= 0 || !Q.b[p[0]]) bad++; if (last[p[0]] !== undefined && k - last[p[0]] <= 60) bad++; last[p[0]] = k; });
  ok('data: ' + Q.p.length + ' days, seven other battles each, no battle again within sixty days', bad === 0 && Q.p.length >= 300, bad);
  const tsv = fs.readFileSync(path.join(R, 'scripts', 'battle-game.tsv'), 'utf8').split(/\r?\n/).filter(l => l && l[0] !== '#');
  ok('the order kept in scripts/battle-game.tsv is the order dealt', tsv.length === Q.p.length && tsv.every((n, k) => Q.b[Q.p[k][0]][0] === n));
  const srv = await serve(8823), b = await edge(), errs = [], base = 'http://localhost:8823';
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const V = vp.width + ': ';
    const st = () => p.evaluate(() => ({ s: epochBattleQ.state(), clues: [...document.querySelectorAll('#battle-board .gm-whose-clues li')].map(li => li.textContent), opts: [...document.querySelectorAll('#battle-board .gm-whose-o')].map(o => [+o.getAttribute('data-i'), o.textContent, o.className, o.disabled]),
      tab: (document.querySelector('.gm-tab[aria-selected="true"]') || {}).id, ask: (document.querySelector('#battle-board .gm-whose-ask') || {}).textContent || '', wide: document.documentElement.scrollWidth - innerWidth,
      imgs: [...document.querySelectorAll('#battle-board .gm-whose-o img')].filter(i => i.complete && !i.naturalWidth).length,
      // what the plan shows in words: names of the ground, of the formations, of commanders, the key's sides, the phase's words
      ground: [...document.querySelectorAll('#battle-field .bf-tl, #battle-field .bf-edge')].map(t => t.textContent).filter(Boolean).length,
      units: [...document.querySelectorAll('#battle-field .bf-ul:not(.bf-ld)')].map(t => t.textContent).filter(Boolean).length,
      leaders: document.querySelectorAll('#battle-field .bf-ld, #battle-field .bf-pic').length,
      sides: [...document.querySelectorAll('#battle-field .bf-key-s')].map(t => t.textContent), blocks: document.querySelectorAll('#battle-field .bf-u').length,
      words: ((document.querySelector('#battle-field .bf-cap-x') || {}).textContent || '') + ((document.querySelector('#battle-field .bf-cap-t') || {}).textContent || ''), label: (document.querySelector('#battle-field svg.bf-svg') || { getAttribute() { return ''; } }).getAttribute('aria-label') }));
    await p.goto(base + '/games'); await p.waitForTimeout(800); await p.click('.gm-lc[href="#battle"]'); await p.waitForTimeout(2500);
    let s = await st(); const name = s.s.name, F = JSON.parse(fs.readFileSync(path.join(R, 'data', 'battles', Q.b[s.s.answer][1] + '.json'), 'utf8'));
    ok(V + 'the card opens the game: one clue, eight battles in order of name, the field drawn', s.tab === 'tab-battle' && s.s.num >= 1 && s.clues.length === 1 && s.opts.length === 8 && s.opts.some(o => o[0] === s.s.answer) && s.opts.map(o => o[1]).join('|') === s.opts.map(o => o[1]).sort().join('|') && s.s.field && s.s.phases === F.phases.length && s.blocks === F.units.length && s.wide <= 0, [s.s.num, s.opts.length, s.blocks, s.wide]);
    ok(V + 'the bare field names nothing: no ground, formation, commander, side or words', s.s.level === 0 && s.ground === 0 && s.units === 0 && s.leaders === 0 && s.sides.join('|') === 'One side|The other side' && s.words === '' && s.label.indexOf(name) < 0, [s.ground, s.units, s.leaders, s.sides, s.words.slice(0, 40)]);
    await p.waitForTimeout(600); s = await st(); ok(V + 'every battle has its emblem', s.imgs === 0, s.imgs);
    await p.click('#battle-field .bf-play'); await p.waitForTimeout(1500); await p.click('#battle-field .bf-play');
    await p.screenshot({ path: path.join(out, 'battle-' + vp.width + '-ask.png'), fullPage: phone });
    const wrong = s.opts.filter(o => o[0] !== s.s.answer).map(o => o[0]), named = (F.terrain || []).filter(t => t.name).length + ((F.field && F.field.edges) || []).length;
    await p.click('#battle-board .gm-whose-o[data-i="' + wrong[0] + '"]'); await p.waitForTimeout(400); s = await st();
    ok(V + 'a wrong answer brings the second clue, strikes that battle out and names the ground', s.clues.length === 2 && s.s.guesses.length === 1 && !s.s.done && s.s.level === 1 && s.ground === named && s.units === 0 && s.opts.filter(o => /is-wrong/.test(o[2]) && o[3]).length === 1 && /^Not the /.test(s.ask), [s.ask, s.ground, named]);
    await p.click('#battle-board .gm-whose-o[data-i="' + wrong[1] + '"]'); await p.waitForTimeout(400); s = await st();
    ok(V + 'the third clue gives the century and the region, the plan as before', s.clues.length === 3 && s.clues[2].indexOf(Q.b[s.s.answer][4]) > 0 && s.clues[2].indexOf(Q.b[s.s.answer][3]) > 0 && s.units === 0, s.clues[2]);
    await p.reload(); await p.waitForTimeout(2500); s = await st();
    ok(V + 'a reload resumes on the third clue', s.clues.length === 3 && s.s.guesses.length === 2 && !s.s.done && s.s.level === 2 && s.opts.filter(o => o[3]).length === 2 && s.s.field, s.s);
    await p.click('#battle-board .gm-whose-o[data-i="' + wrong[2] + '"]'); await p.waitForTimeout(400); s = await st();
    ok(V + 'the fourth clue names the two sides and their formations, not the commanders', s.s.level === 3 && s.units > 0 && s.leaders === 0 && s.sides.join('|') === F.sides.map(x => x.name).join('|') && s.words === '', [s.units, s.leaders, s.sides]);
    await p.screenshot({ path: path.join(out, 'battle-' + vp.width + '-sides.png'), fullPage: phone });
    await p.click('#battle-board .gm-whose-o[data-i="' + s.s.answer + '"]'); await p.waitForTimeout(600); s = await st();
    const end = await p.evaluate(() => ({ t: (document.querySelector('#battle-done .gm-done-t') || {}).textContent, sq: (document.querySelector('#battle-done .gm-daily-sq') || {}).textContent, who: (document.querySelector('#battle-done .gm-whose-ans b') || {}).textContent,
      href: (document.querySelector('#battle-done .gm-whose-ans a') || {}).getAttribute('href'), rec: JSON.parse(localStorage.getItem('epoch-games'))['battleq-' + epochBattleQ.state().num], streak: JSON.parse(localStorage.getItem('epoch-games'))['battleq-streak'] }));
    ok(V + 'the right battle ends the day: named and linked, kept, and its field told in full', s.s.done && s.s.won && s.clues.length === 5 && end.t === 'Found on clue 4 of 5' && end.sq === '🟥🟥🟥🟩' && end.who === name && /^\/battle\//.test(end.href) && fs.existsSync(path.join(R, end.href)) && end.rec.done && end.rec.w === 1 && end.rec.g.length === 4 && end.streak.n === 1 && s.s.level === 5 && s.words.length > 40 && s.label.indexOf(name) > 0, [end, s.words.slice(0, 40)]);
    await p.screenshot({ path: path.join(out, 'battle-' + vp.width + '-done.png'), fullPage: phone });
    await p.goto(base + '/games'); await p.waitForTimeout(800);
    const card = await p.evaluate(() => { const a = document.querySelector('.gm-lc[data-g="battle"]'); return [a.querySelector('.gm-lc-s').textContent, a.classList.contains('is-done')]; });
    ok(V + 'the lobby card shows today’s result', card[0] === 'Found today on clue 4' && card[1], card);
    await p.goto(base + '/weekly'); await p.waitForTimeout(1000);
    const wk = await p.evaluate(() => { const h = [...document.querySelectorAll('thead th')].map(x => x.textContent), i = h.indexOf('Which Battle?'), r = document.querySelector('#wk-body tr.wk-today'); return [i, r ? r.children[i].textContent : '', document.documentElement.scrollWidth - innerWidth]; });
    ok(V + 'My Week has its column', wk[0] > 0 && (Date.now() < Date.UTC(2026, 10, 27) ? wk[1] === '–' : /clue 4/.test(wk[1])), wk);   // before its first day the week shows a dash
    await p.goto(base + '/today'); await p.waitForTimeout(1200);
    const td = await p.evaluate(() => [...document.querySelectorAll('a[href="/games#battle"]')].length);
    await p.goto(base + '/past-games#battle'); await p.waitForTimeout(800);
    const pg = await p.evaluate(() => [document.querySelectorAll('.pg-game[data-k="battle"]').length, document.querySelectorAll('a[href^="/games#battle"]').length]);
    ok(V + 'Today and the archive of past games list it', td >= 1 && pg[0] === 1 && (Date.now() < Date.UTC(2026, 10, 27) || pg[1] >= 1), [td, pg]);   // before its first day the archive has no day to open
    // losing: five wrong answers; by then the commanders are named
    await p.evaluate(() => localStorage.removeItem('epoch-games')); await p.goto(base + '/games#battle'); await p.reload(); await p.waitForTimeout(2500); s = await st();
    const ws = s.opts.filter(o => o[0] !== s.s.answer).slice(0, 5).map(o => o[0]); let lv4 = null;
    for (let k = 0; k < 5; k++) { await p.click('#battle-board .gm-whose-o[data-i="' + ws[k] + '"]'); await p.waitForTimeout(350); if (k === 3) lv4 = await st(); }
    ok(V + 'the last clue names the commanders the plan has', lv4.s.level === 4 && lv4.clues.length === 5 && lv4.leaders >= (F.units.some(u => u.leader) ? 1 : 0) && lv4.words === '', [lv4.leaders]);
    s = await st(); const lost = await p.evaluate(() => [(document.querySelector('#battle-done .gm-done-t') || {}).textContent, (document.querySelector('#battle-done .gm-whose-ans b') || {}).textContent, (document.querySelector('#battle-done .gm-daily-sq') || {}).textContent]);
    ok(V + 'five wrong answers end it, and the battle is told', s.s.done && !s.s.won && lost[0] === 'Not this time' && lost[1] === name && lost[2] === '🟥🟥🟥🟥🟥' && s.opts.filter(o => /is-right/.test(o[2])).length === 1 && s.s.level === 5, lost);
    // an earlier battle by its number
    if (Date.now() >= Date.UTC(2026, 10, 28)) { await p.goto(base + '/games#battle-1'); await p.reload(); await p.waitForTimeout(2500); s = await st(); ok(V + 'an earlier battle opens by its number', s.s.num === 1 && s.s.field, s.s.num); }
    // Kids mode: off the lobby and the tabs (battles are kept from the youngest), nothing overflows
    await p.evaluate(() => { localStorage.removeItem('epoch-games'); localStorage.setItem('epoch-kids', '1'); }); await p.goto(base + '/games'); await p.reload(); await p.waitForTimeout(1200);
    const kd = await p.evaluate(() => { const li = document.querySelector('.gm-lc[data-g="battle"]').parentNode, t = document.getElementById('tab-battle'); return [getComputedStyle(li).display, getComputedStyle(t).display, document.documentElement.scrollWidth - innerWidth]; });
    ok(V + 'Kids mode leaves it off the lobby and the tabs', kd[0] === 'none' && kd[1] === 'none' && kd[2] <= 0, kd);
    await ctx.close();
  }
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
