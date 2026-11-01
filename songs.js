// songs.js - Songs in History (/songs/ and /songs/<slug>, written by scripts/build-pages.ps1).
// A song's page: the performance loads YouTube's player (youtube-nocookie.com) only when the reader presses play; the
// words' columns (original, romanized, English) can be shown or hidden (kept in localStorage epoch-song-cols); Kids
// mode's "Read about this song" opens the folded story. The index: filters by words, type, era, region, with the words
// and with a performance, kept in the address (?q=&t=&e=&r=&w=1&v=1). window.epochSongs for tests.
(function () {
  'use strict';
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var html = document.documentElement;
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'ʻʼ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }

  // ── a song's page ──
  $$('.sg-video').forEach(function (box) {
    var b = box.querySelector('.sg-play'); if (!b) return;
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(box.getAttribute('data-yt')) + '?autoplay=1&rel=0';
      f.title = box.getAttribute('data-title') || 'Performance';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', ''); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      box.classList.add('is-playing'); box.replaceChildren(f);
      try { f.focus(); } catch (e) {}
    });
  });
  var shows = $$('.sg-show button');
  if (shows.length) {
    var hidden = get('epoch-song-cols', {}) || {};
    var apply = function () {
      // at least one column stays: hiding the last one shown shows them all again
      if (shows.every(function (b) { return hidden[b.getAttribute('data-col')]; })) hidden = {};
      shows.forEach(function (b) { var c = b.getAttribute('data-col'); b.setAttribute('aria-pressed', hidden[c] ? 'false' : 'true'); });
      $$('.sg-lyrics').forEach(function (l) { ['orig', 'rom', 'en'].forEach(function (c) { l.classList.toggle('sg-no-' + c, !!hidden[c] && !!l.querySelector('.sg-colhead .sg-' + c.charAt(0))); }); });
    };
    shows.forEach(function (b) { b.addEventListener('click', function () { var c = b.getAttribute('data-col'); hidden[c] = !hidden[c]; apply(); put('epoch-song-cols', hidden); }); });
    apply();
  }
  $$('.sg-kd-open').forEach(function (b) { b.addEventListener('click', function () { html.classList.add('kd-open'); }); });

  // ── the index ──
  var cards = $$('.sg-index .sg-card');
  if (!cards.length) { window.epochSongs = {}; return; }
  var q = document.getElementById('sg-q'), era = document.getElementById('sg-era'), reg = document.getElementById('sg-region');
  var w = document.getElementById('sg-w'), v = document.getElementById('sg-v'), count = document.getElementById('sg-count'), none = document.getElementById('sg-none');
  var types = $$('.sg-f-type'), type = '';
  var text = cards.map(function (c) { return ' ' + fold(c.getAttribute('data-q')) + ' '; });
  function setType(t) { type = t; types.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === t ? 'true' : 'false'); }); }
  function run(keep) {
    var words = fold(q.value).split(' ').filter(Boolean), kids = html.getAttribute('data-kids') === '1', n = 0;
    cards.forEach(function (c, i) {
      var ok = (!kids || c.getAttribute('data-k') === '1') && (!type || (' ' + c.getAttribute('data-t') + ' ').indexOf(' ' + type + ' ') >= 0) &&
        (!era.value || c.getAttribute('data-e') === era.value) && (!reg.value || c.getAttribute('data-r') === reg.value) &&
        (!w.checked || c.getAttribute('data-w') === '1') && (!v.checked || c.getAttribute('data-v') === '1') &&
        words.every(function (x) { return text[i].indexOf(' ' + x) >= 0; });
      c.hidden = !ok; if (ok) n++;
    });
    $$('.sg-era').forEach(function (s) { s.hidden = !s.querySelector('.sg-card:not([hidden])'); });
    var total = kids ? cards.filter(function (c) { return c.getAttribute('data-k') === '1'; }).length : cards.length;
    count.textContent = n === total ? total + ' songs' : 'Showing ' + n + ' of ' + total + ' songs';
    none.hidden = n > 0;
    if (keep) return;
    var p = new URLSearchParams();
    if (q.value.trim()) p.set('q', q.value.trim()); if (type) p.set('t', type); if (era.value) p.set('e', era.value); if (reg.value) p.set('r', reg.value);
    if (w.checked) p.set('w', '1'); if (v.checked) p.set('v', '1');
    var s = p.toString(); try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {}
  }
  var a = new URLSearchParams(location.search);
  q.value = a.get('q') || ''; setType(types.some(function (b) { return b.getAttribute('data-t') === a.get('t'); }) ? a.get('t') : '');
  if (a.get('e')) era.value = a.get('e'); if (a.get('r')) reg.value = a.get('r'); w.checked = a.get('w') === '1'; v.checked = a.get('v') === '1';
  var timer = 0;
  q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { run(); }, 120); });
  types.forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-t') === type ? '' : b.getAttribute('data-t')); run(); }); });
  [era, reg, w, v].forEach(function (el) { el.addEventListener('change', function () { run(); }); });
  document.getElementById('sg-reset').addEventListener('click', function () { q.value = ''; setType(''); era.value = ''; reg.value = ''; w.checked = false; v.checked = false; run(); });
  document.addEventListener('epoch:kids', function () { run(true); });
  run(true);
  window.epochSongs = { run: run, setType: setType, shown: function () { return cards.filter(function (c) { return !c.hidden; }).map(function (c) { return c.getAttribute('href'); }); } };
})();
