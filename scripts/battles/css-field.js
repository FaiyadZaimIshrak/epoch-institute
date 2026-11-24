// Rewrites the "How it was fought" block of shared.css for the player of 24 Nov 2026 (topographic ground, formations as
// ranks of marks with framed symbols, the film's time bar). It replaces everything from the block's opening comment to
// the blank line before the "Looks" block; re-running it writes the same text.   node scripts/battles/css-field.js
const fs = require('fs'), f = 'shared.css'; let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n'; const L = t.split(nl);
const a = L.findIndex(l => l.startsWith('/* ── How it was fought')), b = L.findIndex((l, i) => i > a && l.startsWith('/* ── Looks (html[data-skin]'));
if (a < 0 || b < 0 || b - a > 120) throw new Error('block not found: ' + a + ' ' + b);
const css = `/* ── How it was fought (battle profiles and the game Which Battle Is This?, battle-map.js): the field as a topographic
   plan, the formations as ranks of marks that march and fight, played as a film with a time bar. Sides: --bf-a blue,
   --bf-b red (then gold and green for a third and fourth). The ground follows map conventions: brown contours over a
   height tint, green for woodland, blue for water, black for what people built; each theme has its own map sheet.
   Before the script arrives, and in print, the phases are a list. (Written by scripts/battles/css-field.js.) ── */
.battle-field { --bf-a: #5aa0f2; --bf-b: #ef6f5c; --bf-c: #d99a1c; --bf-d: #46b35c; --bf-ground: #20241d; --bf-tint: #2e2c1f; --bf-contour: #8a7650; --bf-water: #2c5f8f; --bf-bank: #6fa8dc; --bf-wood: #24382a; --bf-tree: #6fae7c; --bf-marsh: #223a3a; --bf-reed: #63b0b8; --bf-built: #d8d2c0; --bf-road: #20241d; --bf-line: #8f8a78; --bf-ink: #0b0c10; --bf-smoke: #d8d8d0; }
[data-theme="light"] .battle-field { --bf-a: #1f5fbd; --bf-b: #c0392b; --bf-c: #8a5a00; --bf-d: #1f7a34; --bf-ground: #f3eedd; --bf-tint: #ebdfbd; --bf-contour: #a8763c; --bf-water: #a8cdec; --bf-bank: #3f7fb8; --bf-wood: #d3e6c2; --bf-tree: #3f8a45; --bf-marsh: #dcecec; --bf-reed: #2f7f8c; --bf-built: #2a2620; --bf-road: #fffdf5; --bf-line: #6f6650; --bf-ink: #fffaf0; --bf-smoke: #6f6a60; }
.battle-field { margin: 0 0 36px; }
.bf-lede { color: var(--muted); margin: 0 0 14px; }
.bf-box { border: 1px solid var(--border); border-radius: var(--radius, 10px); background: var(--surface); overflow: hidden; }
.bf-fig { aspect-ratio: 1000 / 620; background: var(--bf-ground); }
.bf-svg { display: block; width: 100%; height: 100%; font-family: var(--font-ui, 'Source Sans 3', Arial, sans-serif); }
.bf-ground { fill: var(--bf-ground); } .bf-ground.bf-sea { fill: var(--bf-water); } .bf-ground-tex { pointer-events: none; } .bf-wave { stroke: var(--bf-bank); stroke-width: 1.2; stroke-linecap: round; opacity: .45; }
.bf-frame { stroke: var(--bf-line); stroke-width: 2; opacity: .55; pointer-events: none; }
/* relief: contour lines, every third a little heavier, over a height tint */
.bf-t-tint { fill: var(--bf-tint); stroke: none; } .bf-t-ct { stroke: var(--bf-contour); stroke-width: .9; opacity: .8; } .bf-t-ci { stroke-width: 1.7; opacity: 1; }
/* woodland and marsh by their signs */
.bf-t-wood .bf-t-floor { fill: var(--bf-wood); stroke: var(--bf-tree); stroke-width: 1; stroke-dasharray: 1 4; stroke-linecap: round; } .bf-tree { stroke: var(--bf-tree); stroke-width: 1.25; stroke-linecap: round; }
.bf-t-marsh .bf-t-floor { fill: var(--bf-marsh); stroke: none; } .bf-reed { stroke: var(--bf-reed); stroke-width: 1.25; stroke-linecap: round; }
/* water in blue, its bank a darker line */
.bf-t-sea .bf-t-floor, .bf-t-lake .bf-t-floor { fill: var(--bf-water); stroke: none; } .bf-t-land .bf-t-floor { fill: var(--bf-ground); stroke: none; } .bf-shore { stroke: var(--bf-bank); stroke-width: 1.6; stroke-linejoin: round; } .bf-wavel { stroke: var(--bf-bank); stroke-width: 1; stroke-dasharray: 14 10; opacity: .6; }
.bf-bank, .bf-water, .bf-road-c, .bf-road-f, .bf-wall, .bf-wall-t, .bf-ditch, .bf-ditch-h { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.bf-t-river .bf-bank { stroke: var(--bf-bank); stroke-width: 11; } .bf-t-river .bf-water { stroke: var(--bf-water); stroke-width: 8; }
.bf-t-stream .bf-bank { stroke: var(--bf-bank); stroke-width: 3.2; } .bf-t-stream .bf-water { stroke: var(--bf-water); stroke-width: 1.2; }
/* what people built, in the map's black: a cased road, a wall with towers, a ditch, buildings, a fort, a bridge, a ford */
.bf-road-c { stroke: var(--bf-built); stroke-width: 5; } .bf-road-f { stroke: var(--bf-road); stroke-width: 2.6; }
.bf-wall { stroke: var(--bf-built); stroke-width: 4.5; stroke-linecap: butt; } .bf-wall-t { stroke: var(--bf-built); stroke-width: 11; stroke-linecap: butt; stroke-dasharray: 7 26; }
.bf-ditch { stroke: var(--bf-built); stroke-width: 1.4; } .bf-ditch-h { stroke: var(--bf-built); stroke-width: 7; stroke-linecap: butt; stroke-dasharray: 1.4 5; opacity: .8; }
.bf-bld { fill: var(--bf-built); stroke: none; } .bf-fort { fill: var(--bf-ground); stroke: var(--bf-built); stroke-width: 2; stroke-linejoin: miter; }
.bf-deck { fill: var(--bf-road); stroke: var(--bf-built); stroke-width: 1.3; } .bf-rail { stroke: var(--bf-built); stroke-width: 1.8; stroke-linecap: round; } .bf-ford-l { stroke: var(--bf-built); stroke-width: 1.8; stroke-dasharray: 3 3; }
.bf-pool-f { fill: var(--bf-water); stroke: var(--bf-bank); stroke-width: 1.4; } .bf-spring-t { stroke: var(--bf-bank); stroke-width: 1.6; stroke-linecap: round; } .bf-t-point circle { fill: var(--bf-built); stroke: none; }
.bf-tl, .bf-edge, .bf-n text { font-size: calc(var(--bf-fs, 15px) * .92); font-style: italic; fill: var(--muted); paint-order: stroke; stroke: var(--bf-ground); stroke-width: calc(4px * var(--bf-z, 1)); stroke-linejoin: round; }
.bf-edge { font-style: normal; letter-spacing: .04em; } .bf-n path { stroke: var(--muted); stroke-width: 2; } .bf-n text { font-style: normal; font-weight: 700; }
/* a formation: ranks of marks in its side's colour, no box; the dashed outline is the ground a hidden one holds */
.bf-s0 { --c: var(--bf-a); } .bf-s1 { --c: var(--bf-b); } .bf-s2 { --c: var(--bf-c); } .bf-s3 { --c: var(--bf-d); } .bf-s9 { --c: var(--muted); }
.bf-m { fill: var(--c); stroke: var(--bf-ink); stroke-width: .8; } .bf-m-l { fill: none; stroke: var(--c); stroke-width: 2.1; stroke-linecap: round; stroke-linejoin: round; } .bf-m-o { fill: var(--bf-ground); stroke: var(--c); stroke-width: 1.8; stroke-linejoin: round; }
.bf-hold { display: none; fill: var(--c); fill-opacity: .1; stroke: var(--c); stroke-width: 1.4; stroke-dasharray: 5 4; }
.bf-u.is-hidden .bf-hold { display: block; } .bf-u.is-hidden .bf-m { fill-opacity: .35; stroke-opacity: .3; } .bf-u.is-hidden .bf-m-l, .bf-u.is-hidden .bf-m-o { stroke-opacity: .45; }
.bf-u.is-routed .bf-m { stroke: none; } .bf-u.is-destroyed .bf-m { fill: var(--muted); stroke: none; fill-opacity: .75; } .bf-u.is-destroyed .bf-m-l, .bf-u.is-destroyed .bf-m-o { stroke: var(--muted); }
/* its name, and the framed symbol of its kind */
.bf-ul { font-size: var(--bf-fs, 15px); font-weight: 650; fill: var(--text); paint-order: stroke; stroke: var(--bf-ground); stroke-width: calc(4.5px * var(--bf-z, 1)); stroke-linejoin: round; }
.bf-ul.bf-ld { font-weight: 400; font-style: italic; font-size: calc(var(--bf-fs, 15px) * .9); fill: var(--c); }
.bf-tag-f { fill: var(--bf-ground); stroke: var(--c); stroke-width: 2; } .bf-tag-l { stroke-dasharray: 4 2.5; } .bf-tag-g { stroke: var(--c); stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; } .bf-tag-d { fill: var(--c); }
.bf-ring { stroke: var(--c); stroke-width: calc(3px * var(--bf-z, 1)); } .bf-lg.is-hidden { opacity: .75; } .bf-lg.is-destroyed { opacity: .7; } .bf-tie { stroke: var(--muted); stroke-width: 1.2; stroke-dasharray: 2 3; }
/* the march's track, a strike, a meeting of lines, shots and smoke */
.bf-ar { stroke: var(--c); stroke-linecap: round; } .bf-ah { fill: var(--c); }
.bf-ar-hit { stroke-width: 4.2; } .bf-ar-move { stroke-width: 2.2; stroke-dasharray: 1 6; } .bf-ar-back { stroke-width: 2.2; stroke-dasharray: 5 6; } .bf-ar-feint { stroke-width: 2.2; stroke-dasharray: 1.5 4; }
.bf-clash { fill: var(--c); stroke: var(--bf-ground); stroke-width: 1.5; } .bf-shot { fill: var(--c); stroke: var(--bf-ink); stroke-width: .6; } .bf-smoke { fill: var(--bf-smoke); }
/* the controls: steps, the time bar, the camera */
.bf-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); }
.bf-btn, .bf-dot { font: inherit; font-family: var(--font-ui, inherit); font-size: .92rem; color: var(--text); background: transparent; border: 1px solid var(--field-border, var(--border)); border-radius: 999px; padding: 6px 14px; min-height: 36px; cursor: pointer; }
.bf-btn:disabled { opacity: .4; cursor: default; } .bf-play { background: var(--gold); border-color: var(--gold); color: var(--bg); font-weight: 700; min-width: 84px; }
.bf-cam[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }
.bf-scrub { flex: 1 1 160px; min-width: 120px; height: 36px; margin: 0; accent-color: var(--gold); cursor: pointer; }
.bf-dots { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; } .bf-dot { width: 36px; padding: 0; text-align: center; }
.bf-dot.is-done { border-color: var(--gold); } .bf-dot.is-on { background: var(--text); color: var(--bg); border-color: var(--text); font-weight: 700; }
.bf-cap { padding: 4px 16px 12px; min-height: 8.2em; }
.bf-cap-k { margin: 0; font-family: var(--font-ui, inherit); font-size: .8rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.bf-cap-t { margin: 2px 0 4px; font-size: 1.25rem; } .bf-cap-x { margin: 0; }
/* the legend: the sides, the formations' symbols, the ground's signs */
.bf-key { list-style: none; display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 0; padding: 10px 16px; border-top: 1px solid var(--border); font-family: var(--font-ui, inherit); font-size: .88rem; color: var(--muted); }
.bf-key li { display: flex; align-items: center; gap: 7px; } .bf-key-s { color: var(--text); font-weight: 600; }
.bf-sw { width: 22px; height: 12px; border-radius: 3px; background: var(--c); } .bf-sw-hid { background: transparent; border: 1.5px dashed var(--muted); box-sizing: border-box; }
.bf-key-g { width: 38px; height: 21px; border-radius: 3px; background: var(--bf-ground); } .bf-key-t { width: 30px; height: 26px; background: none; }
.bf-note { margin: 0; padding: 0 16px 12px; font-size: .85rem; color: var(--muted); }
.bf-on .bf-phases { display: none; }
.bf-phases { padding-left: 1.3em; } .bf-phases li { margin: 0 0 10px; } .bf-phases b { display: block; }
@media (max-width: 600px) { .bf-cap { min-height: 11.5em; } .bf-btn { padding: 6px 12px; } .bf-scrub { flex-basis: 100%; order: 5; } }
@media print { .bf-box { display: none; } .bf-on .bf-phases { display: block; } }
`.split('\n');
L.splice(a, b - a, ...css);
fs.writeFileSync(f, L.join(nl)); console.log('field block written: ' + css.length + ' lines (' + (nl === '\n' ? 'lf' : 'crlf') + ')');
