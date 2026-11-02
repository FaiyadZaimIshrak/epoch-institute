// Layout audit: every page of scripts/tools/lib.js KINDS (or the paths given) at 390, 768, 1024 and 1280 px, in the
// light theme, the dark theme and Kids mode, checked for what a reader would see as broken:
//   WIDE      the page scrolls sideways (something wider than the window)
//   OVER      text that overflows its box and is cut (scrollWidth > clientWidth with overflow hidden or clip)
//   OVERLAP   two visible text blocks that overlap on screen (headings, paragraphs, list items, buttons, links)
//   IMG       a picture that failed to load
// Prints one line per finding and a count; exits 1 when any is found.
//   node scripts/tools/layout-audit.js [--widths=390,1280] [--modes=light,dark,kids] [path …]
const { serve, edge, KINDS } = require('./lib');
const argv = process.argv.slice(2), opt = (k, d) => ((argv.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d);
const WIDTHS = opt('widths', '390,768,1024,1280').split(',').map(Number), MODES = opt('modes', 'light,dark,kids').split(',');
const PATHS = argv.filter(a => !a.startsWith('--')); const pages = PATHS.length ? PATHS : KINDS;
(async () => {
  const srv = await serve(), b = await edge(), ctx = b.contexts()[0] || await b.newContext(), pg = await ctx.newPage();
  let n = 0;
  for (const mode of MODES) for (const w of WIDTHS) {
    await pg.setViewportSize({ width: w, height: 900 });
    await pg.goto('http://localhost:8765/about', { waitUntil: 'load' });
    await pg.evaluate(m => { try { localStorage.setItem('epoch-theme', m === 'dark' ? 'dark' : 'light'); if (m === 'kids') localStorage.setItem('epoch-kids', '1'); else localStorage.removeItem('epoch-kids'); } catch (e) {} }, mode);
    for (const p of pages) {
      try { await pg.goto('http://localhost:8765' + p, { waitUntil: 'load', timeout: 60000 }); } catch (e) { console.log('LOAD', mode, w, p, e.message.slice(0, 80)); n++; continue; }
      await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
      const found = await pg.evaluate(() => {
        // shown at all: not hidden, and not clipped away by an ancestor that hides its overflow (a collapsed dropdown, a fold)
        const clipped = (el, r) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a);
          if (s.overflow !== 'visible' || s.overflowY !== 'visible' || s.overflowX !== 'visible') { const ra = a.getBoundingClientRect(); if (ra.height < 2 || ra.width < 2 || r.top >= ra.bottom || r.bottom <= ra.top || r.left >= ra.right || r.right <= ra.left) return true; } } return false; };
        const out = [], vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0 && !el.closest('[hidden],[aria-hidden="true"],.sr-only,.nav-mega,details:not([open]) > :not(summary)') && !clipped(el, r); };
        const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        const wide = document.documentElement.scrollWidth - innerWidth;
        if (wide > 1) { let worst = null; for (const el of document.body.querySelectorAll('*')) { const r = el.getBoundingClientRect(); if (r.right > innerWidth + 1 && vis(el) && getComputedStyle(el).position !== 'fixed' && !el.closest('[style*="overflow"], .tl-wrap, pre, table') && (!worst || r.right > worst[1])) worst = [name(el), r.right]; }
          out.push('WIDE ' + wide + 'px' + (worst ? ' ' + worst[0] : '')); }
        for (const el of document.querySelectorAll('h1,h2,h3,h4,p,li,a,button,label,span,td,th,figcaption,dt,dd')) {
          if (!vis(el) || !el.textContent.trim()) continue; const s = getComputedStyle(el);
          if ((s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflow === 'clip') && s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !/-webkit-box/.test(s.display)) out.push('OVER ' + name(el) + ' "' + el.textContent.trim().slice(0, 40) + '"');
        }
        const floated = el => { for (let a = el; a && a !== document.body; a = a.parentElement) if (getComputedStyle(a).float !== 'none') return true; return false; };
        const blocks = [...document.querySelectorAll('main h1,main h2,main h3,main p,main li,main button,main figcaption, h1, .page-title')].filter(el => vis(el) && el.textContent.trim() && getComputedStyle(el).position !== 'absolute' && getComputedStyle(el).position !== 'fixed');
        const rs = blocks.map(el => [el, el.getBoundingClientRect()]);
        for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
          const [a, ra] = rs[i], [c, rc] = rs[j]; if (a.contains(c) || c.contains(a) || floated(a) || floated(c)) continue;   // text wraps round a float: boxes overlap, words do not
          const ox = Math.min(ra.right, rc.right) - Math.max(ra.left, rc.left), oy = Math.min(ra.bottom, rc.bottom) - Math.max(ra.top, rc.top);
          if (ox > 4 && oy > 4) { out.push('OVERLAP ' + name(a) + ' / ' + name(c) + ' "' + a.textContent.trim().slice(0, 30) + '"'); if (out.length > 40) return out; }
        }
        for (const im of document.images) if (im.complete && im.naturalWidth === 0 && im.getAttribute('src') && vis(im)) out.push('IMG ' + im.getAttribute('src').slice(0, 80));
        return out;
      });
      for (const f of [...new Set(found)]) { console.log(mode.padEnd(5), String(w).padStart(4), p.padEnd(34), f); n++; }
    }
  }
  console.log(n + ' findings');
  await b.close(); srv.close(); process.exit(n ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
