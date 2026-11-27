// enc-page.js - shared script of the generated reference pages (encyclopedia entries and index pages, state pages,
// days of Today in History; built by scripts/build-pages.ps1). Loaded without ?v= (cached for an hour), after
// shared-data.js and shared-nav.js. IDX_V is set by the builder: the version of /encyclopedia/index-data.js; MW_V and
// MWJS_V likewise, of data/meanwhile.json and /meanwhile.js.
(function () {
  var IDX_V = '5747184fc4';
  var MW_V = 'f609889f', MWJS_V = 'b31422fb';
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
  // is a globe turned to the country (data-globe: the middle's longitude and latitude, the sphere's radius; the middle
  // of the globe is at 5000, 5000), so the orthographic inverse gives the place
  (function () {
    var maps = document.querySelectorAll('svg.map-cty[data-globe]'); if (!maps.length) return;
    var D2R = Math.PI / 180;
    Array.prototype.forEach.call(maps, function (svg) {
      var g = svg.getAttribute('data-globe').split(',').map(Number), l0 = g[0] * D2R, p0 = g[1] * D2R, R = g[2];
      if (!(R > 0)) return;
      svg.classList.add('map-here');
      svg.addEventListener('click', function (ev) {
        var m = svg.getScreenCTM(); if (!m || !svg.createSVGPoint) return;
        var pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; var p = pt.matrixTransform(m.inverse());
        var x = (p.x - 5000) / R, y = (5000 - p.y) / R, rho = Math.sqrt(x * x + y * y); if (rho > 1) return;   // off the globe
        var c = Math.asin(rho), sc = Math.sin(c), cc = Math.cos(c);
        var lat = rho < 1e-9 ? p0 : Math.asin(cc * Math.sin(p0) + y * sc * Math.cos(p0) / rho);
        var lng = l0 + (rho < 1e-9 ? 0 : Math.atan2(x * sc, rho * Math.cos(p0) * cc - y * Math.sin(p0) * sc));
        lat /= D2R; lng /= D2R; while (lng > 180) lng -= 360; while (lng < -180) lng += 360;
        if (!isFinite(lat) || !isFinite(lng)) return;
        location.href = '/atlas?at=' + lat.toFixed(2) + ',' + lng.toFixed(2);
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
      loadScript('/connections-map.js?v=15').then(function () { return ConnectionsMap.load(); }).then(function () {
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
