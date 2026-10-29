// enc-page.js - shared script of the generated reference pages (encyclopedia entries and index pages, state pages,
// days of Today in History; built by scripts/build-pages.ps1). Loaded without ?v= (cached for an hour), after
// shared-data.js and shared-nav.js. IDX_V is set by the builder: the version of /encyclopedia/index-data.js.
(function () {
  var IDX_V = 'ac84247ceb';
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
      loadScript('/connections-map.js?v=12').then(function () { return ConnectionsMap.load(); }).then(function () {
        var id = map.getAttribute('data-id');
        if (!ConnectionsMap.degree(id)) { sec.hidden = true; return; }
        ConnectionsMap.render(map, id, { compact: true, onSelect: function (o) { var n = ConnectionsMap.get(o); location.href = n && n.p ? n.p : '/state/' + o; } });
      }).catch(function () { sec.hidden = true; });
    }, { rootMargin: '600px' });
    io.observe(sec);
  }
})();
