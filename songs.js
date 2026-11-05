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
  // the lyrics from Genius (songs whose words are not printed here): Genius's official embed, loaded only when asked, in a
  // frame of the page's own origin so that its script may write as it loads; the frame grows to the lyrics. The frame
  // wears the site's own colours and fonts (read from the page's tokens, so both themes and Kids mode), restyled again
  // when the reader switches theme or Kids mode; Genius's name and its link to the song stay as they are.
  var gFrames = [];
  function gTheme() {
    var cs = getComputedStyle(document.documentElement), v = function (k) { return cs.getPropertyValue(k).trim(); };
    var face = function (fam, file, w, style) { return '@font-face{font-family:"' + fam + '";font-style:' + (style || 'normal') + ';font-weight:' + w + ';font-display:swap;src:url(/fonts/' + file + '.woff2) format("woff2")}'; };
    return face('Crimson Pro', 'crimson-pro-normal-latin', '200 900') + face('Crimson Pro', 'crimson-pro-italic-latin', '200 900', 'italic') + face('Cinzel', 'cinzel-normal-latin', '400 900') +
      face('Nunito', 'nunito-normal-latin', '200 1000') + face('Baloo 2', 'baloo-2-latin', '400 800') +
      'html,body{margin:0;padding:0;background:' + v('--surface') + ';color:' + v('--text') + ';font-family:' + v('--font-text') + ';font-size:18px;line-height:1.65}' +
      'body{padding:18px 22px}' +
      // every element of the embed: no backgrounds, borders or colours of its own (the :not(#ep) lifts these over the embed's own rules)
      'body *:not(#ep){background:transparent!important;background-image:none!important;color:inherit!important;border-color:' + v('--border') + '!important;box-shadow:none!important;text-shadow:none!important;font-family:inherit!important}' +
      'body a:not(#ep),body a:not(#ep) *{color:' + v('--gold-light') + '!important;text-decoration-color:' + v('--gold') + '!important}' +
      'body h1:not(#ep),body h2:not(#ep),body h3:not(#ep),body [class*="title"]:not(#ep),body [class*="header"]:not(#ep) a{font-family:' + v('--font-display') + '!important;color:' + v('--gold') + '!important;letter-spacing:.02em}' +
      'body [class*="header"]:not(#ep),body [class*="footer"]:not(#ep){border-color:' + v('--border') + '!important;font-family:' + v('--font-ui') + '!important;font-size:14px!important;color:' + v('--muted') + '!important}' +
      'body img:not(#ep){max-width:72px!important;height:auto!important;border-radius:6px}' +
      'body hr:not(#ep){border:0!important;border-top:1px solid ' + v('--border') + '!important}';
  }
  function gPaint(f) { try { var d = f.contentDocument; if (!d || !d.head) return; var s = d.getElementById('ep-theme'); if (!s) { s = d.createElement('style'); s.id = 'ep-theme'; } s.textContent = gTheme(); d.head.appendChild(s);
    // the loading line goes once the embed has drawn beside it (kept if the embed writes into it instead)
    var l = d.querySelector('.rg_embed_link'); if (l && l.getAttribute('data-ep-wait') && l.textContent === l.getAttribute('data-ep-wait') && [].some.call(d.body.children, function (c) { return c !== l && !/^(SCRIPT|STYLE|LINK)$/.test(c.tagName); })) l.hidden = true;
    f.style.background = getComputedStyle(document.documentElement).getPropertyValue('--surface'); } catch (e) {} }
  new MutationObserver(function () { gFrames.forEach(gPaint); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-kids'] });
  $$('.sg-genius').forEach(function (box) {
    var b = box.querySelector('.sg-genius-btn'); if (!b) return;
    b.addEventListener('click', function () {
      var id = parseInt(box.getAttribute('data-genius'), 10); if (!id) return;
      var f = document.createElement('iframe'); f.className = 'sg-genius-frame'; f.title = 'Lyrics from Genius';
      f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style id="ep-theme">' + gTheme() + '</style></head><body>' +
        '<div id="rg_embed_link_' + id + '" class="rg_embed_link" data-song-id="' + id + '" data-ep-wait="Loading the lyrics from Genius…">Loading the lyrics from Genius&hellip;</div>' +
        '<script crossorigin src="https://genius.com/songs/' + id + '/embed.js"></script></body></html>';
      b.replaceWith(f); gFrames.push(f);
      // the embed adds its own styles as it loads: the site's are put back after them, and the frame grows to the lyrics
      var n = 0, fit = function () { gPaint(f); try { var h = f.contentDocument && f.contentDocument.body.scrollHeight; if (h) f.style.height = (h + 2) + 'px'; } catch (e) {} if (++n < 40) setTimeout(fit, 500); };
      f.addEventListener('load', fit);
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
  // ── find a line (Nov 2026): the words of every song that carries them, data/song-lines.json, fetched on first use ──
  var lf = document.getElementById('sg-line'), lr = document.getElementById('sg-line-res'), LINES = null, lt = 0;
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function loadLines() {
    if (!LINES) LINES = fetch(lf.getAttribute('data-src')).then(function (r) { return r.json(); }).then(function (rows) {
      return rows.map(function (r) { return { slug: r[0], title: r[1], lines: r[2], f: r[2].map(function (l) { return ' ' + fold(l) + ' '; }) }; });
    });
    return LINES;
  }
  function findLine() {
    var words = fold(lf.value).split(' ').filter(Boolean);
    if (!words.length || fold(lf.value).length < 3) { lr.innerHTML = ''; return; }
    loadLines().then(function (rows) {
      var out = [];
      rows.forEach(function (s) {
        for (var i = 0; i < s.f.length; i++) if (words.every(function (x) { return s.f[i].indexOf(' ' + x) >= 0; })) { out.push([s, i]); break; }
      });
      lr.innerHTML = out.length ? out.slice(0, 30).map(function (m) {
        var line = esc(m[0].lines[m[1]]);
        words.forEach(function (x) { if (x.length > 1) line = line.replace(new RegExp('(^|[^\\p{L}])(' + x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'giu'), '$1<mark>$2</mark>'); });
        return '<li><a href="/songs/' + encodeURIComponent(m[0].slug) + '#words"><span class="sg-lr-t">' + esc(m[0].title) + '</span><span class="sg-lr-l">' + line + '</span></a></li>';
      }).join('') + (out.length > 30 ? '<li class="sg-lr-more">and ' + (out.length - 30) + ' more: add a word</li>' : '') : '<li class="sg-lr-more">No line has all those words.</li>';
    }).catch(function () { lr.innerHTML = '<li class="sg-lr-more">The words could not be loaded. Please try again.</li>'; LINES = null; });
  }
  if (lf && lr) {
    ['focus', 'pointerdown'].forEach(function (k) { lf.addEventListener(k, function () { loadLines(); }, { once: true }); });
    lf.addEventListener('input', function () { clearTimeout(lt); lt = setTimeout(findLine, 150); });
  }
  window.epochSongs = { run: run, setType: setType, shown: function () { return cards.filter(function (c) { return !c.hidden; }).map(function (c) { return c.getAttribute('href'); }); } };
})();
