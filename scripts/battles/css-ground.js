// One-off (24 Nov 2026): replaces the battle field's ground rules in shared.css with those of the redrawn ground
// (shaded relief, tree crowns, rivers with banks, roads, walls with towers, houses).   node scripts/battles/css-ground.js
const fs = require('fs'), f = 'shared.css'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; let L = t.split(nl);
const at = s => { const i = L.findIndex(l => l.startsWith(s)); if (i < 0) throw new Error('no line ' + s); return i; };
// the palette: more tones for each theme
L[at('.battle-field { --bf-a:')] = '.battle-field { --bf-a: #3f8ae6; --bf-b: #e2604e; --bf-c: #c98500; --bf-d: #2f9e44; --bf-ground: #1a1e17; --bf-tuft: #3a4430; --bf-water: #24507a; --bf-bank: #122a40; --bf-glint: #6fa3cf; --bf-hill: #2c2b20; --bf-hill-hi: #4a4732; --bf-shade: #000; --bf-wood: #16281b; --bf-crown: #2b5236; --bf-crown-hi: #3f7350; --bf-crown-edge: #142418; --bf-marsh: #1f302c; --bf-sand: #6b6549; --bf-roof: #9a5f47; --bf-road: #57523f; --bf-line: #6d6a5c; --bf-ink: #0b0c10; }';
L[at('[data-theme="light"] .battle-field { --bf-a:')] = '[data-theme="light"] .battle-field { --bf-a: #2466c2; --bf-b: #c23b2a; --bf-c: #8a5a00; --bf-d: #1f7a34; --bf-ground: #e9e2c9; --bf-tuft: #b9b48a; --bf-water: #8fbadb; --bf-bank: #5f8fb5; --bf-glint: #eaf4fb; --bf-hill: #cdbf99; --bf-hill-hi: #f1e8cc; --bf-shade: #5b4a25; --bf-wood: #a9c392; --bf-crown: #86ad6f; --bf-crown-hi: #add090; --bf-crown-edge: #55794a; --bf-marsh: #c3d3bd; --bf-sand: #f3e9c4; --bf-roof: #b9674b; --bf-road: #f7f0dc; --bf-line: #8d8266; --bf-ink: #fffaf0; }';
const a = at('.bf-t path, .bf-t rect, .bf-t circle {'), b = at('.bf-tl, .bf-edge, .bf-n text {');
L.splice(a, b - a,
  '.bf-ground-tex { pointer-events: none; } .bf-tuft { stroke: var(--bf-tuft); stroke-width: 1.3; stroke-linecap: round; opacity: .8; } .bf-wave { stroke: var(--bf-glint); stroke-width: 1.3; stroke-linecap: round; opacity: .35; }',
  '.bf-g-hi { stop-color: var(--bf-hill-hi); } .bf-g-lo { stop-color: var(--bf-hill); } .bf-g-v0 { stop-color: #000; stop-opacity: 0; } .bf-g-v1 { stop-color: #000; stop-opacity: .16; } .bf-vig { pointer-events: none; }',
  '/* relief: a cast shadow, the lit slope, hachures down it, each level a little lighter */',
  '.bf-t-sh { fill: var(--bf-shade); opacity: .22; } .bf-t-base { stroke: var(--bf-line); stroke-width: 1; }',
  '.bf-t-hach { stroke: var(--bf-line); stroke-width: 1.1; stroke-linecap: round; opacity: .75; } .bf-t-in { fill: var(--bf-hill-hi); fill-opacity: .3; stroke: var(--bf-line); stroke-width: .8; stroke-opacity: .55; }',
  '.bf-t-mountain .bf-t-in { fill-opacity: .24; stroke-opacity: .7; }',
  '/* a wood seen from above: its floor, then the crowns; a marsh: reeds and standing water */',
  '.bf-t-wood .bf-t-floor { fill: var(--bf-wood); } .bf-crown { fill: var(--bf-crown); stroke: var(--bf-crown-edge); stroke-width: .9; } .bf-crown-hi { fill: var(--bf-crown-hi); opacity: .8; }',
  '.bf-t-marsh .bf-t-floor { fill: var(--bf-marsh); } .bf-reed { stroke: var(--bf-crown-edge); stroke-width: 1.3; stroke-linecap: round; opacity: .85; } .bf-pool { stroke: var(--bf-water); stroke-width: 2.6; stroke-linecap: round; opacity: .9; }',
  '/* water: banks and a glint on rivers, a shore and ripples on seas and lakes, surf round land in a sea */',
  '.bf-t-sea .bf-t-floor, .bf-t-lake .bf-t-floor { fill: var(--bf-water); } .bf-shore { stroke: var(--bf-sand); stroke-width: 9; stroke-linejoin: round; opacity: .75; } .bf-wavel { stroke: var(--bf-glint); stroke-width: 1.1; stroke-dasharray: 16 12; opacity: .4; }',
  '.bf-t-land .bf-t-floor { fill: var(--bf-ground); } .bf-surf { stroke: var(--bf-sand); stroke-width: 10; stroke-linejoin: round; opacity: .8; } .bf-t-grain { pointer-events: none; }',
  '.bf-bank, .bf-water, .bf-glint, .bf-road-c, .bf-road-f, .bf-wall, .bf-wall-t, .bf-ditch, .bf-ditch-h { fill: none; stroke-linecap: round; stroke-linejoin: round; }',
  '.bf-t-river .bf-bank { stroke: var(--bf-bank); stroke-width: 15; } .bf-t-river .bf-water { stroke: var(--bf-water); stroke-width: 11; } .bf-glint { stroke: var(--bf-glint); stroke-width: 1.3; stroke-dasharray: 18 26; opacity: .6; }',
  '.bf-t-stream .bf-bank { stroke: var(--bf-bank); stroke-width: 7.5; } .bf-t-stream .bf-water { stroke: var(--bf-water); stroke-width: 4.5; }',
  '/* what people built: a road as a track, a wall with its towers, a ditch, roofs, a fort with bastions, a bridge across its river */',
  '.bf-road-c { stroke: var(--bf-line); stroke-width: 5.5; } .bf-road-f { stroke: var(--bf-road); stroke-width: 3.2; }',
  '.bf-wall { stroke: var(--text); stroke-width: 5; stroke-linecap: butt; } .bf-wall-t { stroke: var(--text); stroke-width: 12; stroke-linecap: butt; stroke-dasharray: 8 26; }',
  '.bf-ditch { stroke: var(--bf-shade); stroke-width: 7; opacity: .3; } .bf-ditch-h { stroke: var(--bf-line); stroke-width: 7; stroke-linecap: butt; stroke-dasharray: 1.5 4; }',
  '.bf-house { fill: var(--bf-roof); stroke: var(--bf-ink); stroke-width: .9; } .bf-ridge { stroke: var(--bf-ink); stroke-width: .9; opacity: .6; fill: none; }',
  '.bf-fort { fill: var(--muted); stroke: var(--bf-ink); stroke-width: 1; } .bf-fort-in { fill: var(--bf-ground); stroke: none; }',
  '.bf-deck { fill: var(--bf-road); stroke: var(--text); stroke-width: 1.4; } .bf-rail { stroke: var(--text); stroke-width: 1.8; stroke-linecap: round; } .bf-ford-l { stroke: var(--bf-sand); stroke-width: 2.2; stroke-dasharray: 2 4; stroke-linecap: round; }',
  '.bf-pool-f { fill: var(--bf-water); stroke: var(--bf-bank); stroke-width: 1.2; } .bf-ripple { stroke: var(--bf-water); stroke-width: 1.4; opacity: .7; } .bf-t-point circle { fill: var(--text); stroke: none; }');
// the blocks stand a little off the ground
const k = at('.bf-blk { fill: var(--c);');
L[k] = L[k].replace('.bf-blk { fill: var(--c); stroke: var(--bf-ink); stroke-width: 1.6; }', '.bf-blk { fill: var(--c); stroke: var(--bf-ink); stroke-width: 1.6; } .bf-u { filter: drop-shadow(0 2px 1.5px rgba(0, 0, 0, .4)); } .bf-u.is-hidden, .bf-u.is-routed, .bf-u.is-destroyed { filter: none; }');
if (!L[k].includes('drop-shadow')) throw new Error('block rule');
// the old texture rule
const o = L.findIndex(l => l.startsWith('.bf-tree { fill: var(--bf-line)')); if (o < 0) throw new Error('old texture rule'); L.splice(o, 1);
fs.writeFileSync(f, L.join(nl)); console.log('ground rules written (' + (nl === '\n' ? 'lf' : 'crlf') + ')');
