// enc-page.js - shared script of the generated reference pages (encyclopedia entries and index pages, state pages,
// days of Today in History; built by scripts/build-pages.ps1). Loaded without ?v= (cached for an hour), after
// shared-data.js and shared-nav.js. IDX_V is set by the builder: the version of /encyclopedia/index-data.js; MW_V and
// MWJS_V likewise, of data/meanwhile.json and /meanwhile.js.
(function () {
  var IDX_V = 'e60ffa9da8';
  var MW_V = '0b8ee4a0', MWJS_V = 'b31422fb';
  if (typeof initNav === 'function') initNav(document.body.getAttribute('data-nav') || '');

  // today's date in citations ("Accessed 23 October 2026")
  var today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  [].forEach.call(document.querySelectorAll('[data-today]'), function (el) { el.textContent = today; });

  // a century bar that scrolls sideways (phones) starts at the current century (measured in the next frame: measuring
  // at once forced a layout while the page was still being built)
  requestAnimationFrame(function () {
    [].forEach.call(document.querySelectorAll('.ref-centuries'), function (bar) {
      var cur = bar.querySelector('[aria-current]');
      if (cur && bar.scrollWidth > bar.clientWidth) bar.scrollLeft = cur.offsetLeft - bar.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2;
    });
  });

  // copy a citation
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-copy]'); if (!b) return;
    var text = b.parentNode.querySelector('span').textContent.replace(/\s+/g, ' ').trim();
    function done() { var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
  });

  // speeches: "Read the full speech" unfolds the text it leads to (also when the page opens at #full-text)
  function openFull() { var d = document.querySelector('#full-text details'); if (d) d.open = true; }
  document.addEventListener('click', function (ev) { if (ev.target.closest('a[href="#full-text"]')) openFull(); });
  if (location.hash === '#full-text') openFull();

  // worksheets (Teachers' Corner): print the sheet alone, or with its answer key (which prints on a page of its own)
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('.ws-print'); if (!b) return;
    var key = document.querySelector('.ws-key'); if (key) key.open = b.getAttribute('data-key') === '1';
    window.print();
  });
  if (location.hash === '#answers') { var wk = document.querySelector('.ws-key'); if (wk) wk.open = true; }

  // country pages: a tap or click on the map opens the atlas's "What was here?" at that spot (/atlas?at=lat,lng). The map
  // is drawn in the atlas's own plane (Equal Earth, tenths of a unit), so its inverse gives the place (atlas.js EE.inv)
  (function () {
    var maps = document.querySelectorAll('svg.map-cty'); if (!maps.length) return;
    var D2R = Math.PI / 180, A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2, PW = 1000;
    function raw(lat) { var l = Math.asin(M * Math.sin(lat * D2R)), l2 = l * l, l6 = l2 * l2 * l2; return l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)); }
    var XMAX = Math.PI / (M * A1), S = PW / (2 * XMAX), PH = 2 * raw(90) * S;
    function inv(x10, y10) {
      var x = (x10 / 10 - PW / 2) / S, y = (PH / 2 - y10 / 10) / S, l = y;
      for (var i = 0; i < 12; i++) { var l2 = l * l, l6 = l2 * l2 * l2, f = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)) - y; l -= f / (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2)); if (Math.abs(f) < 1e-12) break; }
      var k2 = l * l, k6 = k2 * k2 * k2;
      return [M * x * (A1 + 3 * A2 * k2 + k6 * (7 * A3 + 9 * A4 * k2)) / Math.cos(l) / D2R, Math.asin(Math.max(-1, Math.min(1, Math.sin(l) / M))) / D2R];
    }
    Array.prototype.forEach.call(maps, function (svg) {
      svg.classList.add('map-here');
      svg.addEventListener('click', function (ev) {
        var m = svg.getScreenCTM(); if (!m || !svg.createSVGPoint) return;
        var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; var p = pt.matrixTransform(m.inverse()), ll = inv(p.x, p.y);
        if (!isFinite(ll[0]) || !isFinite(ll[1]) || Math.abs(ll[0]) > 180) return;
        location.href = '/atlas?at=' + ll[1].toFixed(2) + ',' + ll[0].toFixed(2);
      });
    });
  })();

  // country histories: a timeline of many screens (France's ran to twenty on a phone) is cut at a screen and a half
  // until asked for; not when the address points into it. Below the first screen, so nothing in view moves.
  [].forEach.call(document.querySelectorAll('.cty-page section'), function (sec) {
    if (!sec.querySelector('.cty-scale') || sec.scrollHeight < window.innerHeight * 2.5) return;
    if (location.hash.length > 1) { try { var t = document.querySelector(location.hash); if (t && sec.contains(t)) return; } catch (e) {} }
    var n = sec.querySelectorAll('.cty-tl li').length, row = document.createElement('p'); row.className = 'profile-more-row';
    row.innerHTML = '<button type="button" class="profile-more">Show the whole timeline' + (n ? ' (' + n + ' states)' : '') + ' <span aria-hidden="true">&darr;</span></button>';
    sec.classList.add('fold-long'); sec.parentNode.insertBefore(row, sec.nextSibling);
    row.firstChild.addEventListener('click', function () { sec.classList.remove('fold-long'); row.parentNode.removeChild(row); });
  });

  // random entry / random state
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-random]'); if (!a) return;
    ev.preventDefault();
    if (a.getAttribute('data-random') === 'state') {
      fetch('/data/polities.json?v=11').then(function (r) { return r.json(); }).then(function (d) {
        var pool = d.nodes.filter(function (n) { return !n.p; });
        location.href = '/state/' + pool[Math.floor(Math.random() * pool.length)].id;
      }).catch(function () { location.href = a.href; });
    } else {
      (typeof ENC_INDEX !== 'undefined' ? Promise.resolve() : loadScript('/encyclopedia/index-data.js?v=' + IDX_V)).then(function () {
        var rows = ENC_INDEX.rows; location.href = '/encyclopedia/' + rows[Math.floor(Math.random() * rows.length)][0];
      }).catch(function () { location.href = a.href; });
    }
  });

  // state pages: the connections mini map, loaded when it comes near the screen
  var map = document.getElementById('st-map'), sec = document.getElementById('connections');
  if (map && sec && 'IntersectionObserver' in window) {
    sec.hidden = false;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; io.disconnect();
      loadScript('/connections-map.js?v=14').then(function () { return ConnectionsMap.load(); }).then(function () {
        var id = map.getAttribute('data-id');
        if (!ConnectionsMap.degree(id)) { sec.hidden = true; return; }
        ConnectionsMap.render(map, id, { compact: true, onSelect: function (o) { var n = ConnectionsMap.get(o); location.href = n && n.p ? n.p : '/state/' + o; } });
      }).catch(function () { sec.hidden = true; });
    }, { rootMargin: '600px' });
    io.observe(sec);
  }

  // "Meanwhile in the world" (entry and song pages): meanwhile.js and its data, fetched when the strip nears the screen
  var mw = document.querySelector('section.meanwhile[data-y]');
  if (mw && 'IntersectionObserver' in window && window.fetch) {
    var mio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return; mio.disconnect();
      window.MW = { v: MW_V }; loadScript('/meanwhile.js?v=' + MWJS_V).catch(function () {});
    }, { rootMargin: '400px' });
    mio.observe(mw);
  }
})();
