// Link-colour audit: opens pages of every kind in the light and the dark theme (and Kids mode) and flags each link in
// running text (p, li, dd, td, figcaption inside main) whose colour is the browser's default blue or purple, or the same as
// the text around it (a link nobody can see is a link), so no in-text link is left without a colour rule.
//   node scripts/tools/link-colour-audit.js [--kids] [path …]      (default: a sample of every kind of page)
// Needs Playwright (EPOCH_PW, see scripts/tools/lib.js); serves the repository on localhost.
const { serve, edge, KINDS } = require('./lib.js');
const args = process.argv.slice(2), KIDS = args.includes('--kids');
const PAGES = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : [
  '/', '/about', '/research', '/research-series', '/essays/the-collapse-problem', '/encyclopedia/', '/encyclopedia/wheelbarrow',
  '/encyclopedia/battle-of-hastings', '/state/eridu', '/state/', '/empire/roman-empire', '/culture/minoan-civilisation',
  '/religion/buddhism', '/government/chiefdom', '/ideology/liberalism', '/countries/france', '/centuries/15th-century',
  '/years/1453', '/people/15th-century', '/today-in-history/march-13', '/speeches/wu-speech-at-mu', '/songs/', '/songs/la-marseillaise',
  '/paths/the-silk-roads', '/societies/joseon', '/inventions', '/governance', '/teachers/', '/contact', '/contributors', '/dataset',
  '/new', '/kids', '/games', '/quiz', '/start', '/faiths', '/compare', '/flashcards', '/race', '/passport'];
(async () => {
  const srv = await serve(8733), b = await edge(), ctx = b.contexts()[0] || await b.newContext(), pg = await ctx.newPage();
  await pg.setViewportSize({ width: 1280, height: 900 });
  let bad = 0, seen = 0;
  for (const theme of ['light', 'dark']) {
    await pg.goto('http://localhost:8733/about');
    await pg.evaluate(([t, k]) => { localStorage.setItem('epoch-theme', t); if (k) localStorage.setItem('epoch-kids', '1'); else localStorage.removeItem('epoch-kids'); }, [theme, KIDS]);
    for (const p of PAGES) {
      try { await pg.goto('http://localhost:8733' + p, { waitUntil: 'load', timeout: 60000 }); } catch (e) { console.log(theme, p, 'did not load'); continue; }
      await pg.waitForTimeout(600);
      const res = await pg.evaluate(() => {
        const out = [], links = [...document.querySelectorAll('main p a, main li a, main dd a, main td a, main figcaption a, article p a, article li a')];
        const DEF = ['rgb(0, 0, 238)', 'rgb(85, 26, 139)', 'rgb(0, 0, 255)', 'rgb(128, 0, 128)'];
        for (const a of links) {
          const r = a.getBoundingClientRect(); if (!r.width || !r.height) continue;
          // only links inside running text: inline, not a card or a breadcrumb, and with words of the sentence around them
          if (a.closest('nav, .crumbs, .breadcrumbs, [class*="crumb"], header')) continue;
          if (getComputedStyle(a).display !== 'inline') continue;
          const own = a.textContent.trim().length, all = (a.parentElement.textContent || '').trim().length;
          if (all - own < 15 && !DEF.includes(getComputedStyle(a).color)) continue;
          const c = getComputedStyle(a).color, pc = getComputedStyle(a.parentElement).color, deco = getComputedStyle(a).textDecorationLine;
          const why = DEF.includes(c) ? 'browser default colour' : (c === pc && deco === 'none' && !a.querySelector('img') && a.textContent.trim().length > 1) ? 'same colour as its text, no underline' : null;
          if (why) out.push({ why, text: a.textContent.trim().slice(0, 40), cls: a.className || '(no class)', parent: a.parentElement.tagName.toLowerCase() + (a.parentElement.className ? '.' + String(a.parentElement.className).split(' ')[0] : ''), c });
        }
        return { n: links.length, out };
      });
      seen += res.n;
      const groups = {}; for (const o of res.out) { const k = o.why + ' | ' + o.parent + ' a.' + o.cls; (groups[k] = groups[k] || []).push(o.text); }
      for (const [k, v] of Object.entries(groups)) { bad += v.length; console.log(theme + '\t' + p + '\t' + k + '\t' + v.length + '\t' + v.slice(0, 3).join(' / ')); }
    }
  }
  console.log(`${seen} links seen, ${bad} flagged`);
  await b.close(); srv.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
