// Accessibility audit (WCAG 2.2 AA, Nov 2026): axe-core over every page of lib.js KINDS (or the paths given) in the light
// theme, the dark theme and Kids mode, at 1280 px (and --phone: 390 px). Prints each rule that fails with its WCAG
// criteria, how many pages and nodes, and a few example selectors; --json=<file> writes everything. axe-core comes from
// EPOCH_AXE (a folder whose node_modules has it) or scripts/node_modules.
//   node scripts/tools/a11y-audit.js [--modes=light,dark,kids] [--skin=winter|illuminated|marble|contrast] [--phone] [--json=out.json] [path …]
// --skin: the look (html[data-skin], localStorage epoch-skin; "classic" when not given, so the season never decides)
const fs = require('fs'), path = require('path');
const { serve, edge, ROOT, KINDS } = require('./lib');
const AXE = require.resolve('axe-core/axe.min.js', { paths: [process.env.EPOCH_AXE || '', process.env.EPOCH_PW || '', path.join(ROOT, 'scripts')].filter(Boolean) });
const args = process.argv.slice(2), opt = k => (args.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3);
const modes = (opt('modes') || 'light,dark,kids').split(','), paths = args.filter(a => !a.startsWith('--'));
const pages = paths.length ? paths : KINDS, phone = args.includes('--phone'), skin = opt('skin') || 'classic';
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
(async () => {
  const srv = await serve(); const b = await edge(), ctx = b.contexts()[0] || await b.newContext(), pg = await ctx.newPage();
  await pg.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  const src = fs.readFileSync(AXE, 'utf8'), rules = {}, all = [];
  for (const mode of modes) {
    // the theme and Kids mode are read by each page's head snippet from localStorage
    await pg.goto('http://localhost:8765/about', { waitUntil: 'load' });
    await pg.evaluate(([m, sk]) => { try { localStorage.setItem('epoch-skin', sk); localStorage.setItem('epoch-snow', 'off'); localStorage.setItem('epoch-theme', m === 'dark' ? 'dark' : 'light'); if (m === 'kids') localStorage.setItem('epoch-kids', '1'); else localStorage.removeItem('epoch-kids'); } catch (e) {} }, [mode, skin]);
    for (const p of pages) {
      try {
        await pg.goto('http://localhost:8765' + p, { waitUntil: 'load', timeout: 60000 }); await pg.waitForTimeout(700);
        await pg.addScriptTag({ content: src });
        const res = await pg.evaluate(async t => { const r = await axe.run(document, { runOnly: { type: 'tag', values: t }, resultTypes: ['violations'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter(x => /^wcag\d/.test(x)), nodes: v.nodes.map(n => ({ t: n.target.join(' '), s: (n.failureSummary || '').split('\n').slice(1, 2).join('') })) })); }, TAGS);
        for (const v of res) {
          const r = rules[v.id] || (rules[v.id] = { id: v.id, impact: v.impact, help: v.help, tags: v.tags, pages: new Set(), nodes: 0, ex: [] });
          r.pages.add(mode + ' ' + p); r.nodes += v.nodes.length;
          for (const n of v.nodes) if (r.ex.length < 6 && !r.ex.some(e => e.t === n.t)) r.ex.push({ p: mode + ' ' + p, t: n.t, s: n.s });
          all.push({ mode, page: p, ...v });
        }
      } catch (e) { console.log('LOAD', mode, p, e.message.split('\n')[0]); }
    }
  }
  const list = Object.values(rules).sort((a, b) => b.pages.size - a.pages.size);
  for (const r of list) {
    console.log(`\n${r.id} [${r.impact}] ${r.help} (${r.tags.join(', ')}): ${r.pages.size} page views, ${r.nodes} nodes`);
    for (const e of r.ex) console.log('   ' + e.p + ' | ' + e.t.slice(0, 110) + (e.s ? ' | ' + e.s.slice(0, 120) : ''));
  }
  console.log('\n' + list.length + ' rules failing on ' + pages.length + ' pages x ' + modes.length + ' modes');
  if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(all, null, 1));
  await b.close(); process.exit(list.length ? 1 : 0);
})();
