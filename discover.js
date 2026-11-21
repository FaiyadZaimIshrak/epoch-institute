// discover.js - /discover, history in pictures (21 Nov 2026). The cards come from data/discover.json
// (scripts/tools/make-discover.js): [cat, title, picture, line, address, era, region, years, credit]. They are shown
// in an order of the day (the same for everyone on a UTC day), 48 at a time, filtered by kind, age and region (kept in
// the address: ?k=&era=&r=). A tap opens a quick look (bigger picture, one line, years, credit) with Previous and Next,
// so a reader can browse before going to a page; a click with a modifier key, or the quick look's link, opens the page.
// Kids mode shows only the cards kidsGentle (shared-nav.js) lets through. window.epochDiscover for tests.
(function () {
  'use strict';
  var STEP = 48, CATS = { people: 'Person', places: 'Place', events: 'Event', states: 'State or empire', ideas: 'Culture or idea', works: 'Work', speeches: 'Speech' };
  var wall = document.getElementById('dc-wall'), more = document.getElementById('dc-more'), count = document.getElementById('dc-count');
  var selEra = document.getElementById('dc-era'), selReg = document.getElementById('dc-region'), kinds = document.getElementById('dc-kinds');
  var ql = document.getElementById('dc-ql'), qlImg = document.getElementById('dc-ql-img');
  var all = [], list = [], shown = 0, cur = -1, opener = null, st = { k: '', era: '', r: '' };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var kids = function () { return document.documentElement.getAttribute('data-kids') === '1'; };
  // a seeded shuffle: the order of the day
  function shuffle(a, seed) {
    var s = seed >>> 0; function rnd() { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a;
  }
  function read() {
    var p = new URLSearchParams(location.search);
    st.k = CATS[p.get('k')] ? p.get('k') : ''; st.era = /^[0-3]$/.test(p.get('era') || '') ? p.get('era') : ''; st.r = /^\d$/.test(p.get('r') || '') ? p.get('r') : '';
  }
  function write() {
    var p = new URLSearchParams(); if (st.k) p.set('k', st.k); if (st.era) p.set('era', st.era); if (st.r) p.set('r', st.r);
    var q = p.toString(); history.replaceState(history.state, '', location.pathname + (q ? '?' + q : ''));
  }
  function controls() {
    [].forEach.call(kinds.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === st.k)); });
    selEra.value = st.era; selReg.value = st.r;
  }
  function filter() {
    var gentle = kids() && typeof window.kidsGentle === 'function';
    list = all.filter(function (c) {
      return (!st.k || c[0] === st.k) && (st.era === '' || String(c[5]) === st.era) && (st.r === '' || String(c[6]) === st.r) && (!gentle || window.kidsGentle(c[1], c[3]));
    });
    shown = 0; wall.innerHTML = '';
    count.textContent = list.length ? list.length.toLocaleString('en-GB') + ' to look through' : 'Nothing matches: try another age or region.';
    page();
  }
  function card(c, i) {
    return '<a class="dc-card dc-c-' + c[0] + '" href="' + esc(c[4]) + '" data-i="' + i + '"><span class="dc-pic"><img src="' + esc(c[2]) + '" alt="" loading="lazy" decoding="async"></span>' +
      '<span class="dc-cap"><b>' + esc(c[1]) + '</b>' + (c[7] ? '<i>' + esc(c[7]) + '</i>' : '') + '</span></a>';
  }
  function page() {
    var h = '', end = Math.min(list.length, shown + STEP);
    for (var i = shown; i < end; i++) h += card(list[i], i);
    wall.insertAdjacentHTML('beforeend', h); shown = end; more.hidden = shown >= list.length;
  }
  // the quick look
  function open(i, push) {
    var c = list[i]; if (!c) return; cur = i;
    qlImg.src = c[2]; qlImg.alt = c[1];
    document.getElementById('dc-ql-cr').textContent = c[8] ? 'Picture: ' + c[8] : '';
    document.getElementById('dc-ql-k').textContent = CATS[c[0]] || '';
    document.getElementById('dc-ql-t').textContent = c[1];
    document.getElementById('dc-ql-y').textContent = c[7] || '';
    document.getElementById('dc-ql-line').textContent = c[3] || '';
    document.getElementById('dc-ql-go').href = c[4];
    document.getElementById('dc-ql-prev').disabled = i <= 0; document.getElementById('dc-ql-next').disabled = i >= list.length - 1;
    if (ql.hidden) { ql.hidden = false; document.documentElement.classList.add('dc-ql-on'); if (push) history.pushState({ dcql: 1 }, ''); document.getElementById('dc-ql-x').focus(); }
  }
  function close(fromPop) {
    if (ql.hidden) return; ql.hidden = true; document.documentElement.classList.remove('dc-ql-on'); qlImg.removeAttribute('src');
    if (!fromPop && history.state && history.state.dcql) history.back();
    var el = wall.querySelector('[data-i="' + cur + '"]'); if (el) el.focus(); else if (opener) opener.focus();
  }
  function step(d) {
    var n = cur + d; if (n < 0 || n >= list.length) return;
    while (n >= shown) page();   // the wall keeps up with the quick look
    open(n, false);
  }
  wall.addEventListener('click', function (e) {
    var a = e.target.closest('.dc-card'); if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault(); opener = a; open(+a.getAttribute('data-i'), true);
  });
  document.getElementById('dc-ql-x').addEventListener('click', function () { close(false); });
  document.getElementById('dc-ql-prev').addEventListener('click', function () { step(-1); });
  document.getElementById('dc-ql-next').addEventListener('click', function () { step(1); });
  ql.addEventListener('click', function (e) { if (e.target === ql) close(false); });
  document.addEventListener('keydown', function (e) {
    if (ql.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(false); }
    else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Tab') {   // keep the focus inside the quick look
      var f = [].filter.call(ql.querySelectorAll('button, a[href]'), function (x) { return !x.disabled; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });
  window.addEventListener('popstate', function () { if (!ql.hidden) close(true); });
  more.addEventListener('click', page);
  kinds.addEventListener('click', function (e) { var b = e.target.closest('.dc-chip'); if (!b) return; st.k = b.getAttribute('data-k'); controls(); write(); filter(); });
  selEra.addEventListener('change', function () { st.era = selEra.value; write(); filter(); });
  selReg.addEventListener('change', function () { st.r = selReg.value; write(); filter(); });
  document.getElementById('dc-surprise').addEventListener('click', function () { if (list.length) { var i = Math.floor(Math.random() * list.length); while (i >= shown) page(); opener = this; open(i, true); } });
  window.addEventListener('epoch:kids', filter);
  read(); controls();
  fetch(window.DISCOVER_SRC || '/data/discover.json').then(function (r) { return r.json(); }).then(function (d) {
    all = shuffle(d.items.slice(), Math.floor(Date.now() / 864e5) * 7919);
    // the first screens are for looking around: wars, killings and disasters (kidsGentle's grim words) come later
    if (typeof window.kidsGentle === 'function') {
      var soft = all.filter(function (c) { return window.kidsGentle(c[1], c[3]); }), hard = all.filter(function (c) { return !window.kidsGentle(c[1], c[3]); });
      all = soft.slice(0, 96).concat(hard, soft.slice(96));
      all = all.slice(0, 96).concat(shuffle(all.slice(96), Math.floor(Date.now() / 864e5) * 104729));
    }
    filter();
  }).catch(function () { count.textContent = 'The pictures could not be loaded. Please try again in a moment.'; });
  window.epochDiscover = { state: st, list: function () { return list; }, shown: function () { return shown; }, open: open, close: close };
})();
