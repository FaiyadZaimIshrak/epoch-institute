// Cities and battles (two kinds of profile) and the sources under profile sections: every city and battle of EMPIRES
// has its page with six sections, its emblem and its own entry linking it; a battle shows its date in words; /profiles
// lists each kind; a battle's page carries the gentle note in Kids mode; "Sources for this section" opens under a
// section and is not shown in Kids mode.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
const read = f => fs.readFileSync(path.join(R, f), 'utf8');
(async () => {
  const SD = new Function(read('shared-data.js').replace(/^\s*const /gm, 'var ').replace(/\nif \(typeof module[\s\S]*$/, '') + '\n;return {EMPIRES, PROFILE_KINDS, profileUrl, profileSpanText, toSlug}')();
  const cities = SD.EMPIRES.filter(e => e.kind === 'city'), battles = SD.EMPIRES.filter(e => e.kind === 'battle');
  ok('the kinds exist with six sections and four facts each', ['city', 'battle'].every(k => SD.PROFILE_KINDS[k] && SD.PROFILE_KINDS[k].sections.length === 6 && SD.PROFILE_KINDS[k].facts.length === 4) && cities.length >= 20 && battles.length >= 18, [cities.length, battles.length]);
  const bad = [];
  for (const e of cities.concat(battles)) { const u = SD.profileUrl(e), f = path.join(R, u);
    if (!fs.existsSync(f)) { bad.push('no page ' + u); continue; } const h = fs.readFileSync(f, 'utf8');
    for (const s of SD.PROFILE_KINDS[e.kind].sections) if (!h.includes('class="profile-section-block" id="' + s[0] + '"')) bad.push(u + ' lacks ' + s[0]);
    if (!fs.existsSync(path.join(R, 'logos', 'thumbs', e.name + '.png'))) bad.push('no emblem ' + e.name);
    if (!/<title>[^<]{20,}<\/title>/.test(h) || !/rel="canonical"/.test(h)) bad.push(u + ' head'); }
  ok('every city and battle has its page, six sections and an emblem', !bad.length, bad.slice(0, 6));
  const hast = read('battle/battle-of-hastings'), ent = read('encyclopedia/battle-of-hastings');
  ok('a battle shows its date in words, never a span of one year', hast.includes('14 October 1066') && !/1066\s*(CE)?\s*[–-]\s*1066/.test(hast));
  ok('the battle’s own entry links its profile, and the profile does not link its own name', /href="\/battle\/battle-of-hastings"/.test(ent) && !/href="\/encyclopedia\/battle-of-hastings"[^>]*class="enc-link"|class="enc-link"[^>]*href="\/encyclopedia\/battle-of-hastings"/.test(hast));
  ok('served, deployed and in the menu', /work\|life\|city\|battle\)/.test(read('.htaccess')) && fs.existsSync(path.join(R, 'city', '.htaccess')) && fs.existsSync(path.join(R, 'battle', '.htaccess')) && /life city battle logos/.test(read('scripts/deploy.sh')) && read('shared-nav.js').includes("'/city/', 'Cities'") && fs.existsSync(path.join(R, 'city', 'index')) && read('shared-nav.js').includes("'/battle/', 'Battles'") && fs.existsSync(path.join(R, 'battle', 'index')));
  const SS = new Function(read('scripts/profile-section-sources.js') + ';return SECTION_SOURCES')(), withSrc = Object.keys(SS);
  const rome = read('empire/roman-empire');
  ok('sources: ' + withSrc.length + ' profiles; a section’s works are folded under it', withSrc.length > 400 && /<details class="sec-src"><summary>Sources for this section<\/summary>/.test(rome) && Object.values(SS).every(v => Object.values(v.s).every(x => x.w.length >= 1 && x.w.length <= 4 && x.h.length)), withSrc.length);
  const srv = await serve(8843), b = await edge(), errs = [], base = 'http://localhost:8843';
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 800 }]) {
    const phone = vp.width < 500, ctx = await b.newContext({ viewport: vp, isMobile: phone, hasTouch: phone }); await ctx.addInitScript("try{localStorage.setItem('epoch-consent','no');localStorage.setItem('epoch-skin','classic')}catch(e){}");
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e))); const V = vp.width + ': ';
    for (const k of ['city', 'battle']) { await p.goto(base + '/profiles?kind=' + k, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
      const n = await p.evaluate(() => ({ cards: document.querySelectorAll('a.empire-thumb').length, wide: document.documentElement.scrollWidth - innerWidth, txt: document.body.innerText.length }));
      ok(V + '/profiles?kind=' + k + ' lists the profiles', n.cards >= (k === 'battle' ? battles.length : 20) && n.wide <= 0, n); }
    await p.goto(base + '/city/baghdad', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
    const c = await p.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent, secs: document.querySelectorAll('.profile-section-block').length, wide: document.documentElement.scrollWidth - innerWidth, facts: document.querySelectorAll('.key-facts dt, .facts-box dt, .info-facts dt').length }));
    ok(V + 'a city page: title, six sections, nothing wider than the screen', /Baghdad/.test(c.h1) && c.secs === 6 && c.wide <= 0, c);
    await p.screenshot({ path: path.join(out, 'kinds-' + vp.width + '-city.png') });
    await p.goto(base + '/empire/roman-empire', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1000);
    const s = await p.evaluate(() => { const d = document.querySelector('details.sec-src'); if (!d) return null; d.scrollIntoView({ block: 'center' }); const before = d.open ? 1 : 0; d.querySelector('summary').click(); return { before, after: d.open ? d.querySelector('ul').getBoundingClientRect().height : 0, n: d.querySelectorAll('li').length, wide: document.documentElement.scrollWidth - innerWidth }; });
    ok(V + 'Sources for this section opens under the section', s && s.before === 0 && s.after > 0 && s.n >= 1 && s.wide <= 0, s);
    await (await p.$('details.sec-src')).screenshot({ path: path.join(out, 'kinds-' + vp.width + '-sources.png') });
    await p.evaluate(() => localStorage.setItem('epoch-kids', '1')); await p.goto(base + '/battle/battle-of-hastings', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200);
    const k = await p.evaluate(() => ({ note: (document.querySelector('.kd-note') || {}).textContent || '', src: [...document.querySelectorAll('details.sec-src')].filter(d => d.offsetParent).length, wide: document.documentElement.scrollWidth - innerWidth }));
    ok(V + 'Kids mode: a battle carries the gentle note and shows no sources', /about a battle/.test(k.note) && k.src === 0 && k.wide <= 0, k);
    await ctx.close();
  }
  ok('no script errors', !errs.length, errs.slice(0, 3));
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL the test itself: ' + e.message); process.exit(1); });
