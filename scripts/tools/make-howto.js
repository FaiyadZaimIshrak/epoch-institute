// "How to use it" on the tool pages (21 Nov 2026; the owner: a new visitor would not know how to operate most of the
// tools). Three plain steps under each tool's title, shown until the reader presses "Got it" (localStorage epoch-howto
// {page: 1}), then a small "How to use it" button brings them back. Written into each hand page as static markup with
// an inline script right after it, so the strip is there at the first paint and nothing moves (CLS). The steps follow
// each page's own words and buttons: read the page before changing a line.
//   node scripts/tools/make-howto.js [--check]      re-run after editing a step; --check only reports pages out of date
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..');
const HOWTO = {
  atlas: ['Drag the year slider, or press ▶, to move through five thousand years: each dot is a state at its capital or seat, and gold dots have a full profile.',
    'Drag the globe to turn it, or switch to the flat map; the region buttons jump to a part of the world.',
    'Press What was here? and tap any place to list the states, people and songs found near it.'],
  timeline: ['Each bar is one state, from its founding to its end; gold bars have a full profile.',
    'Drag sideways to travel through time; pinch, or hold Ctrl and scroll, to zoom; the era buttons jump to an age.',
    'Search for a state, or tap a bar twice to open its page.'],
  explorer: ['Pick a region or an era, or search for a state.',
    'Each line is a state’s strength over time, scaled to its own peak: click a line to follow it.',
    'Press ▶ to watch the centuries pass.'],
  connections: ['Type a state, kingdom or empire in the State box.',
    'The states linked to it light up around it; the key under the map says what each kind of line means.',
    'Choose a year to see only the links that held then; the timeline below lists every link with its dates.'],
  race: ['Choose up to four states and empires, or start from one of the ready-made races.',
    'Press play, or drag the year slider, and watch the bars change places.',
    'Hover over or tap the chart for any year’s standings; Share sends a picture of the race.'],
  inventions: ['Each card is an invention, placed in its lane by its first date; hover over or tap one to light up what it built on and what it led to.',
    'Drag to move along the tree; hold Ctrl and scroll, or use + and −, to zoom; the strip above jumps to an age.',
    'Use Trace the road to… to follow one invention back, or switch to By civilisation or List.'],
  faiths: ['Choose a faith.',
    'Press Play, or move the century slider, to watch where it spread; drag the globe to turn it.',
    'Compare with lays a second faith over the first; tap a glow, a route or a mark to read its note.'],
  write: ['Choose a language and its script.',
    'Type in ordinary letters, or press the keys: each key shows a sign, its value and how it sounds.',
    'Make a picture of your writing to save, copy or share.'],
  compare: ['Type two profiles into First and Second (a state, a culture, a religion…), or press Surprise me.',
    'See when each lived and whether they met in time.',
    'Read their facts and their key events side by side, on one line of time.'],
  flashcards: ['Choose a deck.',
    'Read the front, then turn the card: tap it, or press Space.',
    'Say whether you knew it: the cards you miss come back today, the ones you know later.'],
  quiz: ['Read the first clue and type a guess, picking a name from the suggestions.',
    'Each wrong guess shows another clue: four in all.',
    'A new puzzle comes every day; the practice rounds below have more.']
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const block = k => '<!-- build:howto -->\n' +
  '<div class="howto" id="howto" hidden><p class="howto-h">How to use it</p><ol class="howto-steps">' +
  HOWTO[k].map(s => '<li>' + esc(s) + '</li>').join('') + '</ol><button type="button" class="howto-x">Got it</button></div>' +
  '<button type="button" class="howto-open" id="howto-open" hidden aria-controls="howto">How to use it</button>\n' +
  '<script>(function(){var k=' + JSON.stringify(k) + ',d={};try{d=JSON.parse(localStorage.getItem(\'epoch-howto\')||\'{}\')||{}}catch(e){}' +
  'var h=document.getElementById(\'howto\'),o=document.getElementById(\'howto-open\');if(d[k])o.hidden=false;else h.hidden=false;' +
  'function save(){try{localStorage.setItem(\'epoch-howto\',JSON.stringify(d))}catch(e){}}' +
  'h.querySelector(\'.howto-x\').onclick=function(){h.hidden=true;o.hidden=false;d[k]=1;save();o.focus()};' +
  'o.onclick=function(){h.hidden=false;o.hidden=true;delete d[k];save()}})();</script>\n' +
  '<!-- /build:howto -->';
const check = process.argv.includes('--check'); let stale = 0, n = 0;
for (const k of Object.keys(HOWTO)) {
  const f = path.join(R, k), t = fs.readFileSync(f, 'utf8'), b = block(k);
  let out;
  if (t.includes('<!-- build:howto -->')) out = t.replace(/<!-- build:howto -->[\s\S]*?<!-- \/build:howto -->/, () => b);
  else {   // first time: right after the lede that follows the page's h1
    const h = t.indexOf('<h1'); if (h < 0) throw new Error(k + ': no h1');
    const p = t.indexOf('</p>', h); if (p < 0) throw new Error(k + ': no lede after the h1');
    out = t.slice(0, p + 4) + '\n' + b + t.slice(p + 4);
  }
  if (out !== t) { stale++; if (!check) fs.writeFileSync(f, out); }
  n++;
}
console.log(n + ' tool pages, ' + stale + (check ? ' out of date' : ' written'));
if (check && stale) process.exit(1);
