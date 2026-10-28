// race.js - the Rise and Fall Race (/race): up to four states and empires race through the years. A state's standing
// in a year is its power curve there (EMPIRES points: 0-10, each curve scaled to its own peak, as in the explorer) times
// its weight, the mean of its military, territorial, economic and historical-influence scores in the Institute's
// analysis (epoch-stats.js), over ten: so a great empire at its peak outscores a small state at its peak, the same
// weight the century pages give their great powers. Bars sorted by standing glide to their places; the curves below
// carry the year's line and a readout on hover; play at three speeds, a year slider, presets; ?p=<slugs>&y=<year>.
// Colours follow the state, never its rank: four slots validated for both themes and Kids mode (every bar and line is
// also labelled by name). Needs shared-data.js (EMPIRES, profileUrl, toSlug) and epoch-stats.js.
(function () {
  'use strict';
  var MAX = 4, SPEEDS = { slow: 20, normal: 50, fast: 120 };   // years a second
  var POL = EMPIRES.filter(function (e) { return e.points && e.points.length > 1; });
  var BYSLUG = {}; POL.forEach(function (e) { BYSLUG[toSlug(e.name)] = e; });
  var STATS = typeof EMPIRE_STATS_BY_NAME !== 'undefined' ? EMPIRE_STATS_BY_NAME : {};
  function might(e) {
    var s = STATS[e.name] && STATS[e.name].stats; if (!s) return 4;
    return (s.militaryPower + s.territorialReach + s.economicStrength + s.historicalInfluence) / 4;
  }
  function curveAt(e, y) {   // the curve between its points, 0 outside its years
    var p = e.points; if (y < p[0][0] || y > p[p.length - 1][0]) return 0;
    for (var i = 1; i < p.length; i++) if (y <= p[i][0]) { var x0 = p[i - 1][0], x1 = p[i][0]; return x1 === x0 ? p[i][1] : p[i - 1][1] + (p[i][1] - p[i - 1][1]) * (y - x0) / (x1 - x0); }
    return p[p.length - 1][1];
  }
  function standing(s, y) { return s.might * curveAt(s.e, y) / 10; }
  function yearLabel(y) { y = Math.round(y); return y < 0 ? -y + ' BCE' : y < 1000 ? y + ' CE' : String(y); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var PRESETS = [
    ['Four empires of the 2nd century', ['Roman Empire', 'Han Dynasty', 'Parthian Empire', 'Kushan Empire']],
    ['Lords of the steppe', ['Xiongnu Empire', 'Gokturk Empire', 'Mongol Empire', 'Golden Horde']],
    ['Empires of the oceans', ['Spanish Empire', 'Portuguese Empire', 'Dutch Empire', 'British Empire']],
    ['West Africa', ['Ghana Empire', 'Mali Empire', 'Songhai Empire', 'Kanem-Bornu Empire']],
    ['The caliphates', ['Rashidun Caliphate', 'Umayyad Caliphate', 'Abbasid Caliphate', 'Fatimid Caliphate']],
    ['China', ['Han Dynasty', 'Tang Dynasty', 'Song Dynasty', 'Ming Empire']],
    ['The Andes', ['Tiwanaku', 'Wari Empire', 'Kingdom of Chimor', 'Inca Empire']],
    ['Persia', ['Achaemenid Empire', 'Parthian Empire', 'Sasanian Empire', 'Safavid Empire']],
    ['India', ['Maurya Empire', 'Gupta Empire', 'Delhi Sultanate', 'Mughal Empire']],
    ['Rome and its heirs', ['Roman Republic', 'Roman Empire', 'Byzantine Empire', 'Holy Roman Empire']]
  ].map(function (p) { return [p[0], p[1].filter(function (n) { return BYSLUG[toSlug(n)]; })]; }).filter(function (p) { return p[1].length >= 2; });
  // a lone state (a profile's "Race it"): three rivals join it. Contemporaries that shared at least a quarter of its
  // years, of comparable weight (within 3) from its own region first, then from anywhere, then any: the strongest
  // first (weight squared times the share of its years they shared). Never one with a name word of a state already in
  // the race, so Rome does not race Roman Egypt, nor Germany two Britains.
  var STOP = /^(empire|kingdom|kingdoms|dynasty|republic|state|states|sultanate|caliphate|khanate|khaganate|confederation|confederacy|principality|duchy|grand|great|united|free|city|the|and|first|second|third|new|holy|people|peoples|socialist|federal|democratic|emirate|union|county)$/;
  function cores(n) { return n.toLowerCase().replace(/united kingdom/, 'britain').replace(/\(.*?\)/g, '').split(/[^a-zà-ɏ]+/).filter(function (w) { return w.length > 2 && !STOP.test(w); }).map(function (w) { return w.slice(0, 4); }); }
  function rivals(e) {
    var a = e.points[0][0], b = e.points[e.points.length - 1][0], span = Math.max(1, b - a), me = might(e), out = [], used = cores(e.name);
    var sc = POL.filter(function (c) { return c !== e; }).map(function (c) {
      var o = Math.min(b, c.points[c.points.length - 1][0]) - Math.max(a, c.points[0][0]), m = might(c);
      return { c: c, m: m, s: o > span / 4 ? m * m * Math.min(1, o / span) : 0 };
    }).filter(function (r) { return r.s > 0; }).sort(function (x, y) { return y.s - x.s || (x.c.name < y.c.name ? -1 : 1); });
    var near = sc.filter(function (r) { return Math.abs(r.m - me) <= 3; });
    [near.filter(function (r) { return r.c.region === e.region; }), near, sc].forEach(function (g) {
      g.forEach(function (r) {
        var w = cores(r.c.name);
        if (out.length >= 3 || out.indexOf(r.c) >= 0 || w.some(function (x) { return used.indexOf(x) >= 0; })) return;
        out.push(r.c); used = used.concat(w);
      });
    });
    return out;
  }

  var $ = function (id) { return document.getElementById(id); };
  var host = $('race'); if (!host) return;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var R = { sel: [], year: 0, from: 0, to: 0, playing: false, speed: 'normal', last: 0, raf: 0 };   // sel: [{e, slot, might}]

  // ── the stage ──
  host.innerHTML =
    '<div class="rc-pick"><label class="rc-add"><span>Add a state or empire</span><input id="rc-input" type="text" list="rc-names" autocomplete="off" placeholder="Rome, Mali, Ming&hellip;"></label>' +
    '<datalist id="rc-names">' + POL.map(function (e) { return '<option value="' + esc(e.name) + '">'; }).join('') + '</datalist>' +
    '<ul class="rc-chips" id="rc-chips" aria-label="In the race"></ul></div>' +
    '<p class="rc-presets" id="rc-presets"><span>Or race:</span> ' + PRESETS.map(function (p, i) { return '<button type="button" data-preset="' + i + '">' + esc(p[0]) + '</button>'; }).join('') + '</p>' +
    '<div class="rc-stage"><p class="rc-year" id="rc-year" aria-live="off"></p>' +
    '<ol class="rc-bars" id="rc-bars" aria-label="Standing in the year shown"></ol>' +
    '<div class="rc-ctl"><button type="button" class="rc-play" id="rc-play" aria-label="Play">&#9654;</button>' +
    '<div class="gm-seg rc-speed" role="group" aria-label="Speed"><button type="button" data-v="slow">Slow</button><button type="button" data-v="normal">Normal</button><button type="button" data-v="fast">Fast</button></div>' +
    '<label class="rc-slide"><span class="rc-sr">Year</span><input type="range" id="rc-range" step="1"></label></div>' +
    '<figure class="rc-chart"><svg id="rc-svg" viewBox="0 0 1000 300" role="img" aria-label="The standings through the years"></svg>' +
    '<div class="rc-tip" id="rc-tip" hidden></div><figcaption id="rc-cap"></figcaption></figure>' +
    '<details class="rc-table"><summary>Show the numbers</summary><div id="rc-tbl"></div></details>' +
    '<p class="rc-acts"><button type="button" class="rc-share" id="rc-share">Share this race</button> <a id="rc-explorer" href="/explorer">Open the Empire Explorer &rarr;</a></p></div>';

  function slotFree() { for (var k = 0; k < MAX; k++) if (!R.sel.some(function (s) { return s.slot === k; })) return k; return -1; }
  function add(e, quiet) {
    if (!e || R.sel.some(function (s) { return s.e === e; })) return false;
    if (R.sel.length >= MAX) { note('Four at a time: remove one first.'); return false; }
    R.sel.push({ e: e, slot: slotFree(), might: might(e) });
    if (!quiet) refresh(true);
    return true;
  }
  function remove(e) { R.sel = R.sel.filter(function (s) { return s.e !== e; }); refresh(true); }
  var noteT = 0, noteOn = false;
  function note(t, ms) { noteOn = true; var n = $('rc-cap'); n.textContent = t; n.classList.add('rc-warn'); clearTimeout(noteT); noteT = setTimeout(function () { noteOn = false; n.classList.remove('rc-warn'); caption(); }, ms || 2600); }
  function domain() {
    var a = Infinity, b = -Infinity;
    R.sel.forEach(function (s) { a = Math.min(a, s.e.points[0][0]); b = Math.max(b, s.e.points[s.e.points.length - 1][0]); });
    return [Math.floor(a), Math.ceil(b)];
  }
  // everything after the selection changes; keep: keep the year if it is still inside
  function refresh(keep) {
    stop();
    var d = R.sel.length ? domain() : [0, 1]; R.from = d[0]; R.to = d[1];
    if (!keep || R.year < R.from || R.year > R.to) R.year = R.from;
    var rg = $('rc-range'); rg.min = R.from; rg.max = R.to; rg.value = Math.round(R.year);
    $('rc-chips').innerHTML = R.sel.map(function (s) {
      return '<li><i class="rc-sw rc-s' + s.slot + '" aria-hidden="true"></i><a href="' + profileUrl(s.e) + '">' + esc(s.e.name) + '</a><button type="button" data-remove="' + toSlug(s.e.name) + '" aria-label="Remove ' + esc(s.e.name) + '">&times;</button></li>';
    }).join('');
    $('rc-bars').innerHTML = R.sel.map(function (s) {
      var logo = '/logos/thumbs/' + encodeURIComponent(s.e.name) + '.png';
      return '<li class="rc-row" data-slot="' + s.slot + '"><img class="rc-logo" src="' + logo + '" alt="" width="36" height="36" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
        '<a class="rc-name" href="' + profileUrl(s.e) + '">' + esc(s.e.name) + '</a><span class="rc-track"><i class="rc-bar rc-s' + s.slot + '"></i></span><b class="rc-val">0.0</b></li>';
    }).join('');
    $('rc-bars').style.height = (R.sel.length * 54) + 'px';
    $('rc-share').disabled = !R.sel.length;
    var first = R.sel[0]; $('rc-explorer').href = first ? '/explorer#All/all/' + encodeURIComponent(first.e.name) : '/explorer';
    chart(); paint(); table(); address();
  }

  // ── the bars and the year ──
  function paint() {
    var y = R.year, rows = R.sel.map(function (s) { return { s: s, v: standing(s, y) }; });
    var order = rows.slice().sort(function (a, b) { return b.v - a.v || a.s.slot - b.s.slot; });
    var bars = $('rc-bars').children;
    rows.forEach(function (r, i) {
      var li = bars[i]; if (!li) return;
      li.style.transform = 'translateY(' + (order.indexOf(r) * 54) + 'px)';
      li.querySelector('.rc-bar').style.width = (r.v / 10 * 100).toFixed(2) + '%';
      li.querySelector('.rc-val').textContent = r.v > 0 ? r.v.toFixed(1) : (y < r.s.e.points[0][0] ? 'not yet' : 'gone');
      li.classList.toggle('rc-out', r.v <= 0);
    });
    $('rc-year').textContent = yearLabel(y);
    $('rc-range').value = Math.round(y);
    cursor();
  }
  function caption() {
    if (noteOn) return;   // a note showing keeps its place
    $('rc-cap').textContent = R.sel.length ? 'Standing on a scale of 0 to 10: each state’s power curve times its weight in the Institute’s analysis. Tap or drag on the chart to choose a year.' : 'Add up to four states and empires, or pick a race above.';
  }

  // ── the chart: one curve per state over the years in the race ──
  var CW = 1000, CH = 300, PL = 34, PR = 14, PT = 16, PB = 34;   // drawn at the width it has (labels keep their size on a phone)
  function X(y) { return PL + (y - R.from) / Math.max(1, R.to - R.from) * (CW - PL - PR); }
  function Y(v) { return PT + (1 - v / 10) * (CH - PT - PB); }
  function ticks() {
    var span = R.to - R.from, step = [10, 20, 25, 50, 100, 200, 250, 500, 1000][0], c = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (var i = 0; i < c.length; i++) { step = c[i]; if (span / step <= 7) break; }
    var out = [], t = Math.ceil(R.from / step) * step; for (; t <= R.to; t += step) out.push(t === 0 ? 1 : t);
    return out;
  }
  function chart() {
    var svg = $('rc-svg'), h = '';
    CW = Math.max(300, Math.round(svg.getBoundingClientRect().width) || 1000); CH = CW < 600 ? 230 : 300; svg.setAttribute('viewBox', '0 0 ' + CW + ' ' + CH); svg.style.height = CH + 'px';
    caption();
    if (!R.sel.length) { svg.innerHTML = ''; return; }
    [0, 5, 10].forEach(function (v) { h += '<line class="rc-grid" x1="' + PL + '" x2="' + (CW - PR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text class="rc-ax" x="' + (PL - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
    ticks().forEach(function (t) { h += '<text class="rc-ax" x="' + X(t) + '" y="' + (CH - 10) + '" text-anchor="middle">' + esc(yearLabel(t)) + '</text>'; });
    var labels = [];
    R.sel.forEach(function (s) {
      var pts = s.e.points, d = '';
      pts.forEach(function (p, k) { d += (k ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(s.might * p[1] / 10).toFixed(1); });
      h += '<path class="rc-line rc-st' + s.slot + '" d="' + d + '"/>';
      var pk = pts.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, pts[0]);
      labels.push({ x: X(pk[0]), y: Y(s.might * pk[1] / 10), t: s.e.name });
    });
    h += '<line class="rc-now" id="rc-now" y1="' + PT + '" y2="' + (CH - PB) + '"/>' + R.sel.map(function (s) { return '<circle class="rc-dot rc-df' + s.slot + '" r="5" data-slot="' + s.slot + '"/>'; }).join('');
    svg.innerHTML = h;
    // a name at each curve's peak, highest first, measured: above the peak, else below it, else higher still; one that
    // fits nowhere is left out (on a phone), since the bars above and the readout name every line
    var boxes = [], now = $('rc-now');
    labels.sort(function (a, b) { return a.y - b.y; }).forEach(function (l) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('class', 'rc-lab'); t.textContent = l.t; svg.insertBefore(t, now);
      var w = t.getComputedTextLength() || l.t.length * 7, x = Math.max(PL + 2, Math.min(CW - PR - w - 2, l.x - w / 2));
      var y = [l.y - 9, l.y + 21, l.y - 27].filter(function (b) {
        return b >= 13 && b <= CH - PB - 4 && !boxes.some(function (o) { return x < o[2] + 8 && x + w + 8 > o[0] && b - 12 < o[3] && b + 3 > o[1]; });
      })[0];
      if (y === undefined) { svg.removeChild(t); return; }
      t.setAttribute('x', x.toFixed(1)); t.setAttribute('y', y.toFixed(1)); boxes.push([x, y - 12, x + w, y + 3]);
    });
  }
  function cursor() {
    var n = $('rc-now'); if (!n) return; var x = X(R.year); n.setAttribute('x1', x); n.setAttribute('x2', x);
    R.sel.forEach(function (s) { var c = $('rc-svg').querySelector('.rc-dot[data-slot="' + s.slot + '"]'); if (!c) return; var v = standing(s, R.year); c.setAttribute('cx', x); c.setAttribute('cy', Y(v)); c.style.display = v > 0 ? '' : 'none'; });
  }
  function yearAt(ev) {
    var svg = $('rc-svg'), r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * CW;
    var y = R.from + (x - PL) / (CW - PL - PR) * (R.to - R.from); return Math.max(R.from, Math.min(R.to, Math.round(y)));
  }
  function tip(ev) {
    var t = $('rc-tip'); if (!R.sel.length) return;
    var y = yearAt(ev), rows = R.sel.map(function (s) { return [s, standing(s, y)]; }).sort(function (a, b) { return b[1] - a[1]; });
    t.textContent = ''; var hd = document.createElement('b'); hd.textContent = yearLabel(y); t.appendChild(hd);
    rows.forEach(function (r) { var p = document.createElement('span'); var i = document.createElement('i'); i.className = 'rc-sw rc-s' + r[0].slot; var v = document.createElement('strong'); v.textContent = r[1] > 0 ? r[1].toFixed(1) : '–'; p.appendChild(i); p.appendChild(v); p.appendChild(document.createTextNode(' ' + r[0].e.name)); t.appendChild(p); });
    var box = $('rc-svg').getBoundingClientRect(), fx = ev.clientX - box.left;
    t.hidden = false; t.style.left = Math.min(box.width - t.offsetWidth - 4, Math.max(4, fx + 12)) + 'px'; t.style.top = '8px';
  }
  var svgEl = $('rc-svg'), dragging = false;
  svgEl.addEventListener('pointermove', function (ev) { if (dragging) { R.year = yearAt(ev); paint(); } tip(ev); });
  svgEl.addEventListener('pointerleave', function () { $('rc-tip').hidden = true; });
  svgEl.addEventListener('pointerdown', function (ev) { if (!R.sel.length) return; stop(); dragging = true; R.year = yearAt(ev); paint(); address(); try { svgEl.setPointerCapture(ev.pointerId); } catch (e) {} });
  svgEl.addEventListener('pointerup', function () { if (dragging) { dragging = false; address(); } });

  var rsz = 0; function redraw() { clearTimeout(rsz); rsz = setTimeout(function () { chart(); cursor(); }, 150); }
  window.addEventListener('resize', redraw);
  document.addEventListener('epoch:kids', redraw);   // other fonts: the names are measured again
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);

  // ── the numbers ──
  function table() {
    var rows = R.sel.map(function (s) {
      var pk = s.e.points.reduce(function (a, p) { return p[1] > a[1] ? p : a; }, s.e.points[0]);
      return '<tr><th scope="row"><i class="rc-sw rc-s' + s.slot + '" aria-hidden="true"></i>' + esc(s.e.name) + '</th><td>' + esc(yearLabel(s.e.points[0][0])) + '–' + esc(yearLabel(s.e.points[s.e.points.length - 1][0])) + '</td><td>' + s.might.toFixed(2) + '</td><td>' + (s.might * pk[1] / 10).toFixed(1) + ' in ' + esc(yearLabel(pk[0])) + '</td></tr>';
    }).join('');
    $('rc-tbl').innerHTML = R.sel.length ? '<table><thead><tr><th scope="col">State</th><th scope="col">Years of its curve</th><th scope="col">Weight</th><th scope="col">Highest standing</th></tr></thead><tbody>' + rows + '</tbody></table>' : '';
  }

  // ── playing ──
  function frame(t) {
    if (!R.playing) return;
    var dt = R.last ? Math.min(0.1, (t - R.last) / 1000) : 0; R.last = t;
    var ny = R.year + SPEEDS[R.speed] * dt;
    if (R.year < 0 && ny >= 0) ny += 1;   // there is no year 0
    R.year = Math.min(R.to, ny); paint();
    if (R.year >= R.to) { stop(); address(); return; }
    R.raf = requestAnimationFrame(frame);
  }
  function play() {
    if (!R.sel.length) return;
    if (R.year >= R.to) R.year = R.from;
    R.playing = true; R.last = 0; $('rc-play').innerHTML = '&#10074;&#10074;'; $('rc-play').setAttribute('aria-label', 'Pause');
    host.classList.add('rc-on'); R.raf = requestAnimationFrame(frame);
  }
  function stop() {
    R.playing = false; cancelAnimationFrame(R.raf); var b = $('rc-play'); if (b) { b.innerHTML = '&#9654;'; b.setAttribute('aria-label', 'Play'); }
    host.classList.remove('rc-on');
  }
  $('rc-play').addEventListener('click', function () { if (R.playing) { stop(); address(); } else play(); });
  $('rc-range').addEventListener('input', function () { stop(); R.year = +this.value; paint(); });
  $('rc-range').addEventListener('change', address);
  var segs = host.querySelectorAll('.rc-speed button');
  function paintSpeed() { [].forEach.call(segs, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === R.speed)); }); }
  [].forEach.call(segs, function (b) { b.addEventListener('click', function () { R.speed = b.getAttribute('data-v'); paintSpeed(); try { localStorage.setItem('epoch-race-speed', R.speed); } catch (e) {} }); });
  try { var sp = localStorage.getItem('epoch-race-speed'); if (SPEEDS[sp]) R.speed = sp; } catch (e) {}
  paintSpeed();

  // ── choosing ──
  var inp = $('rc-input');
  function tryAdd() {
    var v = inp.value.trim().toLowerCase(); if (!v) return;
    var e = POL.filter(function (x) { return x.name.toLowerCase() === v; })[0] || POL.filter(function (x) { return x.name.toLowerCase().indexOf(v) === 0; })[0];
    if (e && add(e)) inp.value = '';
  }
  inp.addEventListener('change', tryAdd);
  inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); tryAdd(); } });
  $('rc-chips').addEventListener('click', function (ev) { var b = ev.target.closest('[data-remove]'); if (b) remove(BYSLUG[b.getAttribute('data-remove')]); });
  $('rc-presets').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-preset]'); if (!b) return;
    R.sel = []; PRESETS[+b.getAttribute('data-preset')][1].forEach(function (n) { add(BYSLUG[toSlug(n)], true); });
    refresh(false); play();
  });

  // ── the address and sharing ──
  function address() {
    var q = R.sel.length ? '?p=' + R.sel.map(function (s) { return toSlug(s.e.name); }).join(',') + '&y=' + Math.round(R.year) : '';
    try { history.replaceState(null, '', location.pathname + q); } catch (e) {}
  }
  $('rc-share').addEventListener('click', function () {
    var y = Math.round(R.year), rows = R.sel.map(function (s) { return [s, standing(s, y)]; }).sort(function (a, b) { return b[1] - a[1]; });
    var url = location.origin + location.pathname + '?p=' + R.sel.map(function (s) { return toSlug(s.e.name); }).join(',') + '&y=' + y;
    var text = 'The Rise and Fall Race in ' + yearLabel(y) + ': ' + rows.map(function (r) { return r[0].e.name + ' ' + (r[1] > 0 ? r[1].toFixed(1) : '–'); }).join(', ') + '.';
    var card = typeof scoreCard === 'function' ? scoreCard({ title: 'The Rise and Fall Race', score: yearLabel(y), unit: 'the standing that year', kids: document.documentElement.getAttribute('data-kids') === '1',
      bars: rows.map(function (r) { return { label: r[0].e.name, value: r[1], slot: r[0].slot, icon: '/logos/thumbs/' + encodeURIComponent(r[0].e.name) + '.png' }; }),
      cta: 'Race any four states', url: 'the-epoch-institute.org/race' }) : null;
    if (typeof sharePoster === 'function') sharePoster({ text: text, url: url, title: 'The Rise and Fall Race', heading: 'Share this race', image: card, file: 'epoch-race.jpg', alt: text, btn: this });
  });

  // ── start: the address, else the first race ──
  var m = /[?&]p=([^&]+)/.exec(location.search), ym = /[?&]y=(-?\d+)/.exec(location.search);
  if (m) decodeURIComponent(m[1]).split(',').forEach(function (s) { add(BYSLUG[s], true); });
  var lone = R.sel.length === 1 && R.sel[0].e;
  if (lone) rivals(lone).forEach(function (c) { add(c, true); });
  if (!R.sel.length && PRESETS[0]) PRESETS[0][1].forEach(function (n) { add(BYSLUG[toSlug(n)], true); });
  if (ym) R.year = +ym[1]; else if (lone) R.year = lone.points[0][0];   // a race from a profile opens in its own first year
  refresh(!!ym || !!lone);
  if (lone && R.sel.length > 1) note(lone.name + ' against three rivals of its time: remove any, or add your own.', 7000);
  window.epochRace = { state: function () { return R; }, standing: standing, presets: PRESETS, rivals: rivals };
})();
