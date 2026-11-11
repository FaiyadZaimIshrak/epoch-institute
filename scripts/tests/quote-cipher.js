// Quote Cipher: the squares, typing (keyboard and the letters on screen), check, reveal, solving, the record, the lobby, Kids mode
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const srv = await serve(8808), b = await edge(), errs = [], base = 'http://localhost:8808';
  const st = p => p.evaluate(() => { const K = epochCipher.state(), cells = [...document.querySelectorAll('.gm-cp-c')]; return { num: K.num, done: K.done, sel: K.sel, h: K.h, c: K.c, cells: cells.length, filled: cells.filter(x => x.querySelector('b').textContent.trim()).length, wrong: document.querySelectorAll('.gm-cp-c.is-wrong').length, given: document.querySelectorAll('.gm-cp-c.is-given').length, msg: document.getElementById('cp-msg').textContent, kb: !document.getElementById('cp-kb').hidden, doneShown: !document.getElementById('cp-done').hidden, wide: document.documentElement.scrollWidth - innerWidth, letters: K.q[0].replace(/[^A-Za-z]/g, '').length }; });
  const signs = p => p.evaluate(() => { const K = epochCipher.state(), seen = {}, o = []; K.q[0].toUpperCase().replace(/[A-Z]/g, ch => { const c = K.enc[ch]; if (!seen[c]) { seen[c] = 1; o.push([c, ch]); } return ch; }); return o; });
  for (const vp of [{ width: 1280, height: 950 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, W = vp.width + ': ';
    const ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.goto(base + '/games'); await p.waitForTimeout(800); await p.click('.gm-lc[href="#cipher"]'); await p.waitForTimeout(1500);
    let s = await st(p); ok(W + 'the card opens the cipher: a square for every letter, none filled', s.num >= 1 && s.cells === s.letters && s.filled === 0 && !s.done && s.sel && s.wide <= 0 && s.kb === phone, s);
    const nokey = await p.evaluate(() => { const K = epochCipher.state(); return Object.keys(K.enc).every(k => K.enc[k] !== k) && new Set(Object.values(K.enc)).size === 26; }); ok(W + 'the key swaps every letter for another', nokey);
    const brk = await p.$$eval('.gm-cp-w', w => w.filter(x => x.getClientRects().length > 1).length); ok(W + 'no word breaks across lines', brk === 0, brk);
    await p.screenshot({ path: path.join(out, 'cipher-' + vp.width + '-start.png') });
    const S = await signs(p), put = async (c, L) => { await p.click('.gm-cp-c[data-c="' + c + '"]'); if (phone) await p.click('#cp-kb button[data-k="' + L + '"]'); else await p.keyboard.press(L); await p.waitForTimeout(60); };
    await put(S[0][0], S[0][1]);
    const twins = await p.evaluate(c => [...document.querySelectorAll('.gm-cp-c[data-c="' + c + '"]')].map(x => x.querySelector('b').textContent).join(''), S[0][0]);
    ok(W + 'a letter fills every square of its sign', twins.length >= 1 && [...twins].every(x => x === S[0][1]), twins);
    const wrongL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(x => x !== S[1][1] && x !== S[0][1]); await put(S[1][0], wrongL); await p.click('#cp-check'); await p.waitForTimeout(150);
    s = await st(p); ok(W + 'Check marks the wrong letter', s.wrong >= 1 && s.c === 1 && /1 letter is not right/.test(s.msg), s);
    await p.click('.gm-cp-c[data-c="' + S[1][0] + '"]'); if (phone) await p.click('#cp-kb button[data-k="del"]'); else await p.keyboard.press('Backspace'); await p.waitForTimeout(100);
    await p.click('.gm-cp-c[data-c="' + S[2][0] + '"]'); await p.click('#cp-hint'); await p.waitForTimeout(150);
    s = await st(p); ok(W + 'Reveal a letter gives the chosen sign', s.h === 1 && s.given >= 1 && s.msg.includes('The sign ' + S[2][0] + ' is the letter ' + S[2][1]), s);
    await p.reload(); await p.waitForTimeout(1500); s = await st(p); ok(W + 'a reload keeps the work', s.h === 1 && s.c === 1 && s.filled > 0 && !s.done, s);
    for (const [c, L] of S) { const d = await p.evaluate(() => epochCipher.state().done); if (d) break; const have = await p.evaluate(c => epochCipher.state().g[c], c); if (have !== L) await put(c, L); }
    await p.waitForTimeout(600); s = await st(p);
    const card = await p.evaluate(() => ({ t: (document.querySelector('#cp-done .gm-done-t') || {}).textContent, q: (document.querySelector('#cp-done .gm-cp-q') || {}).textContent, who: (document.querySelector('#cp-done .gm-said-who a') || {}).getAttribute('href'), src: (document.querySelector('#cp-done .gm-said-src a') || {}).href, share: !!document.querySelector('#cp-done .gm-share'), read: [...document.querySelectorAll('.gm-cp-c b')].map(x => x.textContent).join(''), plain: epochCipher.state().q[0].toUpperCase().replace(/[^A-Z]/g, ''), rec: JSON.parse(localStorage.getItem('epoch-games'))['cipher-' + epochCipher.state().num], streak: JSON.parse(localStorage.getItem('epoch-games'))['cipher-streak'] }));
    ok(W + 'the last letter solves it: the quotation, its speaker and source', s.done && s.doneShown && card.t === 'Solved!' && card.read === card.plain && /^\/encyclopedia\//.test(card.who) && /^https:/.test(card.src) && card.share && card.rec.done && !card.rec.gave && card.streak.n === 1 && s.wide <= 0, card);
    await p.screenshot({ path: path.join(out, 'cipher-' + vp.width + '-done.png'), fullPage: phone });
    await p.reload(); await p.waitForTimeout(1500); s = await st(p); ok(W + 'solved stays solved', s.done && s.doneShown, s);
    await p.goto(base + '/games'); await p.waitForTimeout(800); const ls = await p.evaluate(() => { const a = document.querySelector('.gm-lc[data-g="cipher"]'); return [a.querySelector('.gm-lc-s').textContent, a.classList.contains('is-done')]; }); ok(W + 'the lobby card says so', ls[0] === 'Solved today' && ls[1], ls);
    // showing the answer asks twice; Kids mode starts with three letters
    await p.evaluate(() => { localStorage.removeItem('epoch-games'); localStorage.setItem('epoch-kids', '1'); }); await p.goto(base + '/games#cipher'); await p.reload(); await p.waitForTimeout(1500);
    s = await st(p); const gl = await p.evaluate(() => Object.keys(epochCipher.state().v).length); ok(W + 'Kids mode gives three letters', gl === 3 && s.given >= 3 && s.h === 0 && s.wide <= 0, [gl, s.given]);
    await p.click('#cp-give'); await p.waitForTimeout(100); s = await st(p); const asked = !s.done && /once more/.test(s.msg); await p.click('#cp-give'); await p.waitForTimeout(400); s = await st(p);
    const gv = await p.evaluate(() => ({ t: document.querySelector('#cp-done .gm-done-t').textContent, rec: JSON.parse(localStorage.getItem('epoch-games'))['cipher-' + epochCipher.state().num], streak: JSON.parse(localStorage.getItem('epoch-games'))['cipher-streak'] || null }));
    ok(W + 'Show the answer asks twice, and counts for no streak', asked && s.done && gv.t === 'Here is the answer' && gv.rec.gave && !gv.streak, gv);
    await ctx.close();
  }
  ok('no script errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); srv.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
