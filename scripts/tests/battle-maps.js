// "How it was fought" on the battle profiles (battle-map.js): every plan of scripts/battles passes its checker against
// its article; every battle profile either has a plan or a recorded reason for none; the page holds the phases as a
// list and the player takes its place; Play, Next, Back and the numbered steps work; no block leaves the field; the
// plan fits a phone; with reduced motion a step is made at once.
const { serve, edge } = require(process.argv[2] + '/scripts/tools/lib.js'); const path = require('path'), fs = require('fs'), { spawnSync } = require('child_process'), R = process.argv[2], out = process.argv[3];
let fails = 0; const ok = (n, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + JSON.stringify(x).slice(0, 300) : '')); if (!c) fails++; };
(async () => {
  const dir = path.join(R, 'scripts', 'battles'), files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const plans = files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))), drawn = plans.filter(p => !p.skip && !p.hold), held = new Set(plans.filter(p => p.hold).map(p => p.slug));
  const chk = spawnSync(process.execPath, [path.join(dir, 'check-battle-maps.js'), dir, path.join(R, 'scripts', 'kinds')], { encoding: 'utf8' });
  ok('every plan passes the checker against its article', chk.status === 0 && drawn.length >= 3, (chk.stdout || '').split(/\r?\n/).filter(l => /faults|not JSON|no article/.test(l)).slice(0, 4));
  const E = new Function(fs.readFileSync(path.join(R, 'shared-data.js'), 'utf8') + ';return {EMPIRES, profileUrl}')(), battles = E.EMPIRES.filter(e => e.kind === 'battle');
  const byName = new Map(drawn.map(p => [p.name, p])), noPlan = battles.filter(b => !byName.has(b.name) && !held.has(E.profileUrl(b).split('/').pop())).map(b => b.name);
  ok('every battle profile has a plan, or waits for a fuller source (' + battles.length + ' battles, ' + drawn.length + ' plans)', !noPlan.length && drawn.every(p => battles.some(b => b.name === p.name)), noPlan.slice(0, 6));
  const pageOf = p => fs.readFileSync(path.join(R, 'battle', p.slug), 'utf8');
  const noList = drawn.filter(p => { const h = pageOf(p); return !h.includes('id="how-it-was-fought"') || (h.match(/<ol class="bf-phases">(.*?)<\/ol>/s) || ['', ''])[1].split('<li>').length - 1 !== p.phases.length || !fs.existsSync(path.join(R, 'data', 'battles', p.slug + '.json')); }).map(p => p.slug);
  ok('each battle page holds its phases as a list, and its data file exists', !noList.length, noList.slice(0, 5));
  const data = drawn.map(p => JSON.parse(fs.readFileSync(path.join(R, 'data', 'battles', p.slug + '.json'), 'utf8')));
  ok('the data files carry no quotations, and no portrait of a person never depicted', data.every(d => !JSON.stringify(d).includes('"quote"')) && data.every(d => d.units.every(u => !u.pic || !/\/(muhammad|ali|ali-ibn-abi-talib)\.jpg$/.test(u.pic))));
  ok('wired: the cache rule, the deploy list and the stylesheet know the player', /battle-map\\\.js/.test(fs.readFileSync(path.join(R, '.htaccess'), 'utf8')) && /data\/battles/.test(fs.readFileSync(path.join(R, 'scripts', 'deploy.sh'), 'utf8')) && fs.readFileSync(path.join(R, 'css', 'pages.css'), 'utf8').includes('.bf-m ') && fs.readFileSync(path.join(R, 'css', 'pages.css'), 'utf8').includes('.bf-t-ct'));

  const srv = await serve(8793), b = await edge(), base = 'http://localhost:8793';
  try {
    const first = drawn.find(p => p.slug === 'battle-of-ain-jalut') || drawn[0];
    const open = async (ctx, slug) => { const pg = await ctx.newPage(); pg._errs = []; pg.on('pageerror', e => pg._errs.push(String(e))); await pg.goto(base + '/battle/' + slug + '#how-it-was-fought', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => { const e = document.getElementById('how-it-was-fought'); return e && e._bf; }, null, { timeout: 20000 }); return pg; };
    const mk = async o => { const c = await b.newContext(o); await c.addInitScript(() => { try { localStorage.setItem('epoch-consent', 'no'); } catch (e) {} }); return c; };
    const ctx = await mk({ viewport: { width: 1280, height: 900 } }), pg = await open(ctx, first.slug);
    const st = () => pg.evaluate(() => { const e = document.getElementById('how-it-was-fought'), m = e._bf; return { phase: m.phase(), n: m.phases, title: e.querySelector('.bf-cap-t').textContent, listShown: getComputedStyle(e.querySelector('.bf-phases')).display !== 'none', dots: e.querySelectorAll('.bf-dot').length, back: e.querySelector('.bf-btn').disabled, toc: !!document.querySelector('a[href="#how-it-was-fought"]') }; });
    let s = await st();
    ok('the player opens on the first phase and hides the list', s.phase === 0 && s.n === first.phases.length && s.dots === s.n && !s.listShown && s.back && s.title === first.phases[0].title && s.toc, s);
    await pg.click('#how-it-was-fought .bf-btn:nth-of-type(3)'); await pg.waitForTimeout(1900); s = await st();
    ok('Next goes to the second phase and shows its words', s.phase === 1 && s.title === first.phases[1].title && !s.back, s);
    await pg.click('#how-it-was-fought .bf-dot:last-child'); await pg.waitForTimeout(1900); s = await st();
    ok('a numbered step goes to its phase', s.phase === s.n - 1, s);
    await pg.click('#how-it-was-fought .bf-btn:nth-of-type(1)'); await pg.waitForTimeout(1900); s = await st();
    ok('Back goes one phase back', s.phase === s.n - 2, s);
    await pg.evaluate(() => document.getElementById('how-it-was-fought')._bf.go(0)); await pg.click('#how-it-was-fought .bf-play'); await pg.waitForTimeout(3200); s = await st();
    const playing = await pg.evaluate(() => document.querySelector('#how-it-was-fought .bf-play').textContent);
    ok('Play moves on by itself and can be paused', s.phase >= 1 && playing === 'Pause', [s.phase, playing]);
    await pg.click('#how-it-was-fought .bf-play'); await pg.screenshot({ path: path.join(out, 'battle-field-desktop.png') });
    // the film: Pause holds the moment; the time bar goes to any moment; the end is the last phase; the legend lists what the field has
    const film = await pg.evaluate(async () => { const e = document.getElementById('how-it-was-fought'), m = e._bf, wait = ms => new Promise(r => setTimeout(r, ms)), t1 = m.time(); await wait(500); const t2 = m.time(), held = !m.playing();
      const sc = e.querySelector('.bf-scrub'); sc.value = 500; sc.dispatchEvent(new Event('input')); const mid = m.time(), midPhase = m.phase(), want = m.starts.filter(x => x <= mid + 1).length - 1, moving = m.starts.findIndex(x => x > mid);
      m.seek(m.total); const end = m.phase(); m.camera(true); m.seek(m.starts[1] - 300); const zoomed = m.view()[2]; e.querySelector('.bf-cam').click(); const whole = m.view()[2];
      return { held, same: Math.abs(t2 - t1) < 1, mid: Math.abs(mid - m.total / 2) < m.total * 0.01, midOk: midPhase === want || midPhase === moving, end, n: m.phases, zoomed, whole, pressed: e.querySelector('.bf-cam').getAttribute('aria-pressed') }; });
    ok('Pause holds the film, the time bar goes to any moment, and the film ends on the last phase', film.held && film.same && film.mid && film.midOk && film.end === film.n - 1, film);
    ok('the camera moves in on the fighting, and "Whole field" shows all of it', film.zoomed <= 1000 && film.whole === 1000 && film.pressed === 'true', [film.zoomed, film.whole]);
    const leg = await pg.evaluate(() => { const e = document.getElementById('how-it-was-fought'); return { ground: [...e.querySelectorAll('.bf-key-gr')].map(l => l.textContent), units: [...e.querySelectorAll('.bf-key-u')].map(l => l.textContent), marks: e.querySelectorAll('.bf-u .bf-m').length, tags: e.querySelectorAll('.bf-lg .bf-tag').length, blocks: e.querySelectorAll('.bf-u').length }; });
    const GR = { hill: 'High ground (contours)', ridge: 'High ground (contours)', mountain: 'High ground (contours)', wood: 'Woodland', marsh: 'Marsh', river: 'River', stream: 'Stream', sea: 'Sea', lake: 'Lake', road: 'Road', wall: 'Wall', ditch: 'Ditch', town: 'Town', village: 'Village', fort: 'Fort', bridge: 'Bridge', ford: 'Ford', spring: 'Spring' };
    const wantG = [...new Set((first.terrain || []).map(x => GR[x.k]).filter(Boolean))].sort(), wantU = new Set(first.units.map(u => u.k)).size;
    ok('the legend lists the ground this field has and its kinds of formation, each formation is ranks of marks with its symbol', leg.ground.slice().sort().join('|') === wantG.join('|') && leg.units.length === wantU && leg.tags === leg.blocks && leg.marks >= leg.blocks * 3, leg);
    ok('no script error on the page', !pg._errs.length, pg._errs.slice(0, 2)); await ctx.close();

    // every plan: mounts, and no block or name leaves the field in any phase
    const all = await mk({ viewport: { width: 1280, height: 900 } }), bad = [];
    for (const p of drawn) {
      const q = await open(all, p.slug);
      const r = await q.evaluate(() => { const e = document.getElementById('how-it-was-fought'), m = e._bf, svg = e.querySelector('.bf-svg'), box = svg.getBoundingClientRect(), outs = []; m.camera(false);   // the whole field: with the camera in, what is out of view is rightly out of the picture
        for (let i = 0; i < m.phases; i++) { m.go(i); for (const g of svg.querySelectorAll('.bf-u, .bf-lg')) { if (g.style.display === 'none' || +g.style.opacity === 0) continue; const r = g.getBoundingClientRect(), tol = g.classList.contains('bf-u') ? 30 : 2;   // the scattered marks of a broken formation may pass the edge by a little (the plan is clipped there); a name may not
          if (r.width && (r.left < box.left - tol || r.right > box.right + tol || r.top < box.top - tol || r.bottom > box.bottom + tol)) outs.push(i + 1); } }
        return [...new Set(outs)]; });
      if (r.length || q._errs.length) bad.push(p.slug + ': phases ' + r.join(',') + (q._errs.length ? ' ' + q._errs[0] : '')); await q.close();
    }
    ok('every plan opens and keeps its blocks and names inside the field in every phase (' + drawn.length + ')', !bad.length, bad.slice(0, 5)); await all.close();

    const ph = await mk({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }), pp = await open(ph, first.slug);
    const m = await pp.evaluate(() => { const e = document.getElementById('how-it-was-fought'), u = e.querySelector('.bf-ul'); return { wide: document.documentElement.scrollWidth > innerWidth + 1, fs: parseFloat(getComputedStyle(u).fontSize) * e.querySelector('.bf-svg').getBoundingClientRect().width / 1000, short: u.textContent, btn: e.querySelector('.bf-play').getBoundingClientRect().height }; });
    ok('on a phone the plan fits the screen, names are short and readable, buttons are large enough', !m.wide && m.fs >= 9 && m.short.length <= 10 && m.btn >= 36, m);
    await pp.screenshot({ path: path.join(out, 'battle-field-phone.png') }); await ph.close();

    const rm = await mk({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' }), pr = await open(rm, first.slug);
    const moved = await pr.evaluate(() => { const e = document.getElementById('how-it-was-fought'), m = e._bf; e.querySelector('.bf-btn:nth-of-type(3)').click(); const s = m.state[1]; return Object.keys(s).every(id => Math.abs(m.node[id].x - s[id].x) < 0.01 && Math.abs(m.node[id].y - s[id].y) < 0.01); });
    ok('with reduced motion a step is made at once', moved); await rm.close();

    const kc = await b.newContext({ viewport: { width: 1280, height: 900 } }); await kc.addInitScript(() => { try { localStorage.setItem('epoch-kids', '1'); localStorage.setItem('epoch-consent', 'no'); } catch (e) {} });
    const pk = await open(kc, first.slug); const kid = await pk.evaluate(() => { const e = document.getElementById('how-it-was-fought'); return e.getBoundingClientRect().height > 200 && document.documentElement.getAttribute('data-kids') === '1'; });
    ok('Kids mode shows the plan too', kid); await kc.close();
  } catch (e) { ok('the browser run', false, String(e).slice(0, 300)); }
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
