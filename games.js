// games.js - the games of /games: Emblem Pairs, Order the Ages, Globe Hunt, Which Came First?, Picture Puzzle,
// Word Hunt and Guess the Year. Needs shared-nav.js (initNav, escHtml), games-emblems.js and games-data.js (built by
// scripts/build-pages.ps1: curated pictures with their years, puzzle sets, Word Hunt themes). Bump games.js?v= in /games.
initNav('games');
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function store() { try { return JSON.parse(localStorage.getItem('epoch-games') || '{}') || {}; } catch (e) { return {}; } }
  function best(k) { return store()[k]; }
  function setBest(k, v) { try { var o = store(); o[k] = v; localStorage.setItem('epoch-games', JSON.stringify(o)); } catch (e) {} }
  function fmtTime(s) { return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function ease(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function countUp(el, to, ms) {
    if (reduce) { el.textContent = to.toLocaleString('en-GB'); return; }
    var t0 = performance.now();
    (function f(now) { var p = Math.min(1, (now - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-GB'); if (p < 1) requestAnimationFrame(f); })(t0);
  }
  function bump(el) { el.classList.remove('gm-bump'); void el.offsetWidth; el.classList.add('gm-bump'); }
  function stars(n) { return '<span class="gm-stars" aria-label="' + n + ' of 3 stars">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '" style="--i:' + i + '">&#9733;</i>'; }).join('') + '</span>'; }
  function confetti(host) {
    if (reduce) return;
    for (var i = 0; i < 28; i++) {
      var s = document.createElement('span'); s.className = 'gm-conf';
      s.style.setProperty('--x', ((Math.random() * 2 - 1) * 200).toFixed(0) + 'px');
      s.style.setProperty('--y', (-(70 + Math.random() * 170)).toFixed(0) + 'px');
      s.style.setProperty('--r', ((Math.random() * 2 - 1) * 540).toFixed(0) + 'deg');
      s.style.setProperty('--d', (Math.random() * 0.2).toFixed(2) + 's');
      host.appendChild(s);
      setTimeout(function (n) { return function () { if (n.parentNode) n.parentNode.removeChild(n); }; }(s), 1800);
    }
  }
  function kids() { return document.documentElement.getAttribute('data-kids') === '1'; }
  // a segmented switch (difficulty and the like), remembered per game; in Kids mode an unchosen one starts easy
  function seg(name, def, onChange, kidsDef) {
    var box = document.querySelector('.gm-seg[data-for="' + name + '"]'), saved = best('lvl-' + name);
    var val = String(saved != null ? saved : (kidsDef != null && kids() ? kidsDef : def));
    if (box.querySelectorAll('button[data-v]').length && !box.querySelector('button[data-v="' + val + '"]')) val = box.querySelector('button[data-v]').getAttribute('data-v');
    function paint() { Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === val)); }); }
    box.addEventListener('click', function (e) { var b = e.target.closest('button[data-v]'); if (!b || b.getAttribute('data-v') === val) return; val = b.getAttribute('data-v'); setBest('lvl-' + name, val); paint(); onChange(val); });
    paint();
    var get = function () { return val; };
    get.set = function (v) { if (v === val || !box.querySelector('button[data-v="' + v + '"]')) return false; val = v; setBest('lvl-' + name, val); paint(); onChange(val); return true; };   // e.g. #first-daily
    return get;
  }
  // a result to share: its line, the game's address and a score poster (scoreCard, shared-nav.js), drawn as the card
  // appears so the picture is ready when Share is tapped (phones: the share sheet; elsewhere a panel to save or send it)
  function shareBtn() { return '<button type="button" class="gm-share">Share your score</button>'; }
  function share(box, text, hash, card) {
    var b = box.querySelector('.gm-share'), h = hash || current; if (!b) return;
    card.kids = kids(); card.url = card.url || 'the-epoch-institute.org/games';
    var poster = typeof scoreCard === 'function' ? scoreCard(card) : null;
    b.addEventListener('click', function () { sharePoster({ text: text, url: 'https://the-epoch-institute.org/games#' + h, title: card.title, heading: 'Share your score', image: poster, file: 'epoch-' + h + '.jpg', alt: card.title + ': ' + card.score + ' ' + (card.unit || ''), btn: b }); });
  }
  function shortDates(c) { return c.dates && c.dates.length <= 12 ? c.dates : fmtYear(c.lo); }
  // the curated pictures (games-data.js): only pictures that show their subject, with years worked out by the builder
  var CARDS = (typeof GAME_CARDS !== 'undefined' ? GAME_CARDS : []).map(function (c) {
    return { slug: c[0], name: c[1], kind: c[2], lo: c[3], hi: c[4], dates: c[5], img: c[6], big: c[7], cap: c[8], kid: c[9], credit: c[10], src: c[11] };
  });
  var BYSLUG = {}; CARDS.forEach(function (c) { BYSLUG[c.slug] = c; });
  var DATED = CARDS.filter(function (c) { return c.lo != null && c.hi != null; });
  function fmtYear(y) { y = Math.round(y); var a = Math.abs(y) || 1, s = a >= 10000 ? a.toLocaleString('en-GB') : String(a); return s + (y < 0 ? ' BCE' : ' CE'); }
  function credit(c) {
    if (!c || (!c.credit && !c.src)) return '';
    return 'Picture: ' + escHtml(c.credit || 'Wikimedia Commons') + (c.src ? ' &middot; <a href="' + escHtml(c.src) + '" target="_blank" rel="noopener">Wikimedia Commons</a>' : '');
  }
  function entryLink(c, text) { return '<a href="/encyclopedia/' + encodeURIComponent(c.slug) + '">' + (text || escHtml(c.name)) + '</a>'; }

  // ── sounds: tiny tones made on the spot (no files); on by default only in Kids mode ──────────────────────────────
  // A page may start sound only inside a tap, and the in-app browsers of Instagram, Facebook and Messenger hold to
  // that strictly (a tone played by a timer after a flip stayed silent there): the first touch, click or key of the
  // page wakes the audio with a silent sample, and so does the next one after the phone suspended it (a call, the app
  // in the background). On iPhones Web Audio also followed the ring/silent switch: "playback" (navigator.audioSession,
  // iOS 16.4+, in-app browsers too) makes it sound like a video does.
  var Sfx = (function () {
    var AC = window.AudioContext || window.webkitAudioContext, ac = null, saved = best('sound'), on = saved != null ? !!saved : kids(), btn = $('gm-sound');
    var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    function paint() { if (!btn) return; btn.setAttribute('aria-pressed', String(on)); btn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off'; }
    function session(type) { try { if (navigator.audioSession && navigator.audioSession.type !== type) navigator.audioSession.type = type; } catch (e) {} }
    function wake() {   // call inside a user gesture: make or resume the context and play one silent sample
      if (!on || !AC) return;
      try {
        session('playback');
        if (!ac) ac = new AC();
        if (ac.state !== 'running') { var r = ac.resume(); if (r && r.catch) r.catch(function () {}); }
        var s = ac.createBufferSource(); s.buffer = ac.createBuffer(1, 1, ac.sampleRate); s.connect(ac.destination); s.start(0);
      } catch (e) {}
    }
    ['touchend', 'pointerup', 'click', 'keydown'].forEach(function (t) {
      document.addEventListener(t, function () { if (on && (!ac || ac.state !== 'running')) { wake(); if ($('gm-sound-hint')) setTimeout(hint, 400); } }, true);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && on && ac && ac.state !== 'running') { try { ac.resume().catch(function () {}); } catch (e) {} } });
    // a word under the switch when the sound cannot be heard: a browser that keeps the page quiet, an older iPhone on silent
    function hint() {
      var h = $('gm-sound-hint'), msg = '';
      var ia = window.EPOCH_INAPP, who = ia ? ia.name.charAt(0).toUpperCase() + ia.name.slice(1) : 'This browser';
      if (on && (!AC || (ac && ac.state !== 'running'))) msg = who + ' is keeping the page quiet. Tap a game once more, or open the page in ' + (IOS ? 'Safari' : 'Chrome') + ' to hear the sounds.';
      else if (on && IOS && !navigator.audioSession) msg = 'Hear nothing? Check that the iPhone’s ring/silent switch is not on silent.';
      if (!h) { if (!msg || !btn) return; h = document.createElement('p'); h.id = 'gm-sound-hint'; h.className = 'gm-sound-hint'; h.setAttribute('role', 'status'); btn.parentNode.insertBefore(h, btn.nextSibling); }
      h.textContent = msg; h.hidden = !msg;
    }
    function tone(f, at, dur, type, vol) {
      var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at;
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    }
    var SONGS = {
      tap: [[660, 0, 0.07, 'triangle', 0.07]],
      good: [[660, 0, 0.12, 'triangle'], [880, 0.09, 0.18, 'triangle']],
      bad: [[220, 0, 0.18, 'sawtooth', 0.05], [180, 0.12, 0.22, 'sawtooth', 0.05]],
      win: [[523, 0, 0.14, 'triangle'], [659, 0.12, 0.14, 'triangle'], [784, 0.24, 0.14, 'triangle'], [1047, 0.36, 0.32, 'triangle']]
    };
    function play(name) {
      if (!on || !SONGS[name] || !AC) return;
      try {
        if (!ac) { session('playback'); ac = new AC(); }
        if (ac.state !== 'running') { var r = ac.resume(); if (r && r.catch) r.catch(function () {}); }
        SONGS[name].forEach(function (n) { tone(n[0], n[1], n[2], n[3], n[4]); });
      } catch (e) {}
    }
    if (btn) btn.addEventListener('click', function () {
      on = !on; setBest('sound', on); paint();
      if (on) { wake(); play('good'); setTimeout(hint, 700); } else { session('auto'); hint(); }
    });
    paint();
    return { play: play };
  })();

  // ── tabs: a sliding marker, an animated change of game, arrow keys, #pairs ... #year (#words-egypt picks a theme) ──
  var GAMES = ['pairs', 'order', 'hunt', 'first', 'puzzle', 'words', 'year'], ink = document.querySelector('.gm-tab-ink'), current = null, MODS = {};
  function moveInk(btn) { ink.style.width = btn.offsetWidth + 'px'; ink.style.height = btn.offsetHeight + 'px'; ink.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)'; }
  function showGame(g, focus, sub) {
    if (GAMES.indexOf(g) < 0) g = 'pairs';
    if (g === current) { if (sub && MODS[g] && MODS[g].sub) MODS[g].sub(sub); return; }
    current = g;
    GAMES.forEach(function (o) {
      var t = $('tab-' + o), p = $('game-' + o), on = o === g;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      if (on) { p.hidden = false; p.classList.remove('gm-enter'); void p.offsetWidth; p.classList.add('gm-enter'); } else p.hidden = true;
    });
    moveInk($('tab-' + g));
    var tb = $('tab-' + g); if (tb.scrollIntoView && tb.parentNode.scrollWidth > tb.parentNode.clientWidth) tb.parentNode.scrollTo({ left: tb.offsetLeft - (tb.parentNode.clientWidth - tb.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    if (focus) tb.focus();
    try { history.replaceState(null, '', '#' + g + (sub ? '-' + sub : '')); localStorage.setItem('epoch-games-tab', g); } catch (e) {}
    if (g === 'hunt') { Hunt.start(); Hunt.refresh(); }
    if (MODS[g] && MODS[g].show) MODS[g].show(sub);
  }
  GAMES.forEach(function (g, i) {
    var t = $('tab-' + g);
    t.addEventListener('click', function () { showGame(g); });
    t.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (k) { e.preventDefault(); showGame(GAMES[(i + k + GAMES.length) % GAMES.length], true); }
    });
  });
  window.addEventListener('resize', function () { if (current) moveInk($('tab-' + current)); });
  window.addEventListener('hashchange', function () { var h = location.hash.slice(1).split('-'); if (GAMES.indexOf(h[0]) >= 0) showGame(h[0], false, h.slice(1).join('-')); });

  // ── Emblem Pairs ─────────────────────────────────────────────────────────────
  var EM = typeof GAME_EMBLEMS !== 'undefined' ? GAME_EMBLEMS : [];
  var CL = {};
  (typeof GAME_EMBLEM_CLASH !== 'undefined' ? GAME_EMBLEM_CLASH : []).forEach(function (p) { (CL[p[0]] = CL[p[0]] || {})[p[1]] = 1; (CL[p[1]] = CL[p[1]] || {})[p[0]] = 1; });
  function dealEmblems(n) {   // n emblems, never two that look alike
    var idx = shuffle(EM.map(function (_, i) { return i; })), pick = [];
    for (var k = 0; k < idx.length && pick.length < n; k++) { var i = idx[k]; if (pick.every(function (j) { return !(CL[i] && CL[i][j]); })) pick.push(i); }
    return pick.map(function (i) { return EM[i]; });
  }
  // P.id is the round: a timer left over from an earlier round (a new round started mid-flip) does nothing
  var P = { id: 0, flips: 0, open: [], lock: false, left: 0, t0: 0, timer: null, n: 8 };
  var pairsLevel = seg('pairs', 8, function () { newPairs(); }, 6);
  function newPairs() {
    P.id++; P.n = +pairsLevel(); P.flips = 0; P.open = []; P.lock = false; P.left = P.n; P.t0 = 0; clearInterval(P.timer); P.timer = null;
    $('pairs-flips').textContent = '0'; $('pairs-flips-l').textContent = 'flips'; $('pairs-time').textContent = '0:00'; $('pairs-done').hidden = true; $('pairs-live').textContent = '';
    var b = best('pairs' + P.n); $('pairs-best').textContent = b ? 'Best ' + b.f + ' flips · ' + fmtTime(b.t) : '';
    var names = dealEmblems(P.n), cards = shuffle(names.concat(names)), grid = $('pairs-grid');
    grid.style.setProperty('--cols', P.n === 10 ? 5 : 4);
    grid.innerHTML = cards.map(function (n, i) {
      return '<button type="button" class="gm-card" data-n="' + escHtml(n) + '" aria-label="Card ' + (i + 1) + ', face down" style="--d:' + (reduce ? 0 : i * 32) + 'ms">' +
        '<span class="gm-card-in"><span class="gm-face gm-back" aria-hidden="true"><span class="gm-back-mark">&#10022;</span></span>' +
        '<span class="gm-face gm-front"><img src="/logos/thumbs/' + encodeURIComponent(n) + '.png" alt="" draggable="false"><i>' + escHtml(n) + '</i></span></span></button>';
    }).join('');
  }
  $('pairs-grid').addEventListener('click', function (e) {
    var el = e.target.closest('.gm-card');
    if (!el || P.lock || el.classList.contains('is-up') || el.classList.contains('is-done')) return;
    if (!P.t0) { P.t0 = Date.now(); P.timer = setInterval(function () { $('pairs-time').textContent = fmtTime(Math.floor((Date.now() - P.t0) / 1000)); }, 1000); }
    el.classList.add('is-up'); el.setAttribute('aria-label', el.getAttribute('data-n')); Sfx.play('tap');
    P.open.push(el);
    if (P.open.length < 2) return;
    P.flips++; $('pairs-flips').textContent = P.flips; $('pairs-flips-l').textContent = P.flips === 1 ? 'flip' : 'flips'; bump($('pairs-flips'));
    var a = P.open[0], c = P.open[1], id = P.id; P.open = []; P.lock = true;
    if (a.getAttribute('data-n') === c.getAttribute('data-n')) {
      setTimeout(function () {
        if (id !== P.id) return;
        a.classList.add('is-done'); c.classList.add('is-done'); P.lock = false; P.left--; Sfx.play('good');
        $('pairs-live').textContent = 'Pair found: ' + a.getAttribute('data-n') + '.';
        if (!P.left) setTimeout(function () { if (id === P.id) pairsWin(); }, reduce ? 0 : 450);
      }, reduce ? 0 : 420);
    } else {
      setTimeout(function () { if (id !== P.id) return; a.classList.add('is-miss'); c.classList.add('is-miss'); }, reduce ? 0 : 560);
      setTimeout(function () { if (id !== P.id) return; [a, c].forEach(function (x) { x.classList.remove('is-up', 'is-miss'); x.setAttribute('aria-label', 'Card face down'); }); P.lock = false; }, reduce ? 350 : 1100);
    }
  });
  function pairsWin() {
    clearInterval(P.timer); Sfx.play('win');
    var t = Math.max(1, Math.floor((Date.now() - P.t0) / 1000)), s = P.flips <= Math.ceil(P.n * 1.4) ? 3 : P.flips <= P.n * 2 ? 2 : 1;
    var b = best('pairs' + P.n), isBest = !b || P.flips < b.f || (P.flips === b.f && t < b.t);
    if (isBest) { setBest('pairs' + P.n, { f: P.flips, t: t }); $('pairs-best').textContent = 'Best ' + P.flips + ' flips · ' + fmtTime(t); }
    var d = $('pairs-done');
    d.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">All ' + P.n + ' pairs found</p><p class="gm-done-s">' + P.flips + ' flips · ' + fmtTime(t) + '</p>' +
      (isBest ? '<p class="gm-newbest">New best!</p>' : '') + '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Play again</button></div></div>';
    var found = []; Array.prototype.forEach.call($('pairs-grid').querySelectorAll('.gm-card'), function (c) { var n = c.getAttribute('data-n'); if (found.indexOf(n) < 0) found.push(n); });
    share(d, 'Emblem Pairs: all ' + P.n + ' pairs in ' + P.flips + ' flips at The Epoch Institute', 'pairs', { title: 'Emblem Pairs', score: String(P.flips), unit: 'flips to match all ' + P.n + ' pairs', stars: s,
      emblems: found.map(function (n) { return '/logos/thumbs/' + encodeURIComponent(n) + '.png'; }), note: fmtTime(t) + (isBest ? ' · a new best' : '') });
    d.hidden = false; confetti(d);
    d.querySelector('.gm-done-btn').addEventListener('click', newPairs);
    d.querySelector('.gm-done-btn').focus({ preventScroll: true });
    $('pairs-live').textContent = 'All pairs found in ' + P.flips + ' flips.';
  }
  $('pairs-new').addEventListener('click', newPairs);
  newPairs();

  // ── Order the Ages ───────────────────────────────────────────────────────────
  // cards from the curated pictures, ordered by the year the builder worked out (an event's first year, a person's
  // birth); the cards of a round lie far enough apart to tell (more cards: closer together)
  function yearOf(e) { return e.lo; }
  var O = { id: 0, items: [], sel: null, checks: 0, done: false };
  var orderLevel = seg('order', 5, function () { newOrder(); }, 4);
  function newOrder() {
    var n = +orderLevel(), gap = n <= 4 ? 150 : n === 5 ? 80 : 40, pool = shuffle(DATED.filter(function (c) { return !kids() || c.kid; })), pick = [];
    for (var i = 0; i < pool.length && pick.length < n; i++) { if (pick.every(function (p) { return Math.abs(p.lo - pool[i].lo) >= gap; })) pick.push(pool[i]); }
    O.id++; O.items = shuffle(pick); O.sel = null; O.checks = 0; O.done = false; drag = null;
    $('order-checks').textContent = '0'; $('order-done').hidden = true; $('order-check').disabled = false; $('order-check').hidden = false;
    var b = best('order' + n); $('order-best').textContent = b ? 'Best ' + b + (b === 1 ? ' check' : ' checks') : '';
    renderOrder(true);
  }
  function renderOrder(deal) {
    var list = $('order-list');
    list.classList.toggle('is-solved', O.done);
    list.innerHTML = O.items.map(function (e, i) {
      return '<li class="gm-orow' + (O.done ? ' is-right' : '') + (deal && !reduce ? ' is-deal' : '') + '" data-k="' + escHtml(e.slug) + '" style="--d:' + (reduce ? 0 : i * (O.done ? 130 : 60)) + 'ms">' +
        '<button type="button" class="gm-ocard" data-i="' + i + '" aria-label="' + escHtml(e.name) + ', position ' + (i + 1) + ' of ' + O.items.length + '"' + (O.done ? ' disabled' : '') + '>' +
        (e.img ? '<img src="' + escHtml(e.img) + '" alt="" draggable="false">' : '<span class="gm-oph">' + (i + 1) + '</span>') +
        '<span class="gm-on">' + escHtml(e.name) + (O.done ? '<span class="gm-oy">' + escHtml(e.dates) + '</span>' : '') + '</span></button>' +
        (O.done ? '' : '<span class="gm-omove"><button type="button" data-mv="-1" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '>&#9650;</button><button type="button" data-mv="1" data-i="' + i + '" aria-label="Move down"' + (i === O.items.length - 1 ? ' disabled' : '') + '>&#9660;</button></span><span class="gm-grip" data-i="' + i + '" title="Drag to move" aria-hidden="true">&#10303;</span>') +
        '</li>';
    }).join('');
  }
  // re-render with every card gliding from where it was to where it now is (FLIP)
  function flipRender(mutate) {
    var list = $('order-list'), first = {};
    Array.prototype.forEach.call(list.children, function (r) { first[r.getAttribute('data-k')] = r.getBoundingClientRect().top; });
    mutate(); renderOrder(false);
    if (reduce) return;
    Array.prototype.forEach.call(list.children, function (r) {
      var f = first[r.getAttribute('data-k')]; if (f == null) return;
      var dy = f - r.getBoundingClientRect().top; if (!dy) return;
      r.style.transition = 'none'; r.style.transform = 'translateY(' + dy + 'px)';
      requestAnimationFrame(function () { requestAnimationFrame(function () { r.style.transition = ''; r.style.transform = ''; }); });
    });
  }
  function moveItem(from, to, focusMv) {
    if (O.done || to < 0 || to >= O.items.length || from === to) return;
    O.sel = null;
    flipRender(function () { var it = O.items.splice(from, 1)[0]; O.items.splice(to, 0, it); });
    if (focusMv) { var b = $('order-list').querySelector('[data-mv="' + focusMv + '"][data-i="' + to + '"]'); if (b && !b.disabled) b.focus(); else { var c = $('order-list').querySelector('.gm-ocard[data-i="' + to + '"]'); if (c) c.focus(); } }
  }
  $('order-list').addEventListener('click', function (e) {
    var mv = e.target.closest('[data-mv]');
    if (mv) { var i = +mv.getAttribute('data-i'), d = +mv.getAttribute('data-mv'); moveItem(i, i + d, d); return; }
    var card = e.target.closest('.gm-ocard'); if (!card || O.done) return;
    var j = +card.getAttribute('data-i'), rows = $('order-list').children;
    if (O.sel === null) { O.sel = j; rows[j].classList.add('is-sel'); return; }
    if (O.sel === j) { O.sel = null; rows[j].classList.remove('is-sel'); return; }
    var a = O.sel; O.sel = null;
    flipRender(function () { var t = O.items[a]; O.items[a] = O.items[j]; O.items[j] = t; });
  });
  // drag by the handle: the card follows the pointer and the others slide out of its way
  var drag = null;
  $('order-list').addEventListener('pointerdown', function (e) {
    var g = e.target.closest('.gm-grip'); if (!g || O.done) return;
    e.preventDefault();
    var rows = Array.prototype.slice.call($('order-list').children), i = +g.getAttribute('data-i');
    var rects = rows.map(function (r) { return r.getBoundingClientRect(); });
    drag = { i: i, to: i, row: rows[i], rows: rows, rects: rects, y0: e.clientY, id: e.pointerId, slot: rects.length > 1 ? rects[1].top - rects[0].top : rects[0].height };
    try { g.setPointerCapture(e.pointerId); } catch (err) {}
    drag.row.classList.add('is-drag');
  });
  $('order-list').addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y0, r0 = drag.rects[drag.i], c = r0.top + r0.height / 2 + dy, to = drag.i;
    drag.rects.forEach(function (r, k) { var mid = r.top + r.height / 2; if (k < drag.i && c < mid) to = Math.min(to, k); if (k > drag.i && c > mid) to = Math.max(to, k); });
    drag.to = to;
    drag.row.style.transform = 'translateY(' + dy + 'px)';
    drag.rows.forEach(function (r, k) {
      if (k === drag.i) return;
      var s = (drag.i < to && k > drag.i && k <= to) ? -drag.slot : (drag.i > to && k >= to && k < drag.i) ? drag.slot : 0;
      r.style.transform = s ? 'translateY(' + s + 'px)' : '';
    });
  });
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null; d.row.classList.remove('is-drag');
    if (d.to === d.i) { d.rows.forEach(function (r) { r.style.transform = ''; }); return; }
    O.sel = null;
    flipRender(function () { var it = O.items.splice(d.i, 1)[0]; O.items.splice(d.to, 0, it); });
  }
  $('order-list').addEventListener('pointerup', endDrag);
  $('order-list').addEventListener('pointercancel', endDrag);
  $('order-check').addEventListener('click', function () {
    if (O.done) return;
    O.checks++; $('order-checks').textContent = O.checks; bump($('order-checks'));
    var sorted = O.items.slice().sort(function (a, b) { return yearOf(a) - yearOf(b); }), all = true, rows = $('order-list').children, id = O.id;
    O.items.forEach(function (it, i) {
      var ok = it === sorted[i]; if (!ok) all = false;
      var r = rows[i]; r.classList.remove('is-right', 'is-wrong', 'is-sel');
      setTimeout(function () { if (id === O.id) r.classList.add(ok ? 'is-right' : 'is-wrong'); }, reduce ? 0 : i * 110);
    });
    O.sel = null; Sfx.play(all ? 'good' : 'bad');
    if (all) { $('order-check').disabled = true; setTimeout(function () { if (id === O.id) orderWin(); }, reduce ? 0 : O.items.length * 110 + 300); }
  });
  function orderWin() {
    O.done = true; renderOrder(false); $('order-check').hidden = true; Sfx.play('win');
    var n = O.items.length, s = O.checks === 1 ? 3 : O.checks === 2 ? 2 : 1, b = best('order' + n), isBest = !b || O.checks < b;
    if (isBest) { setBest('order' + n, O.checks); $('order-best').textContent = 'Best ' + O.checks + (O.checks === 1 ? ' check' : ' checks'); }
    var d = $('order-done');
    d.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">' + (O.checks === 1 ? 'Right first time!' : 'In order after ' + O.checks + ' checks') + '</p>' +
      (isBest ? '<p class="gm-newbest">New best!</p>' : '') + '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Next round</button></div></div>';
    share(d, 'Order the Ages: ' + (O.checks === 1 ? 'right first time' : 'in order after ' + O.checks + ' checks') + ' at The Epoch Institute', 'order', { title: 'Order the Ages', score: n + '/' + n,
      unit: O.checks === 1 ? 'in order, right first time' : 'in order after ' + O.checks + ' checks', stars: s, pics: O.items.map(function (e) { return { src: e.img, label: e.name, sub: shortDates(e) }; }) });
    d.hidden = false; confetti(d);
    d.querySelector('.gm-done-btn').addEventListener('click', function () { newOrder(); $('order-list').scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
  }
  $('order-new').addEventListener('click', newOrder);
  newOrder();

  // ── Globe Hunt ───────────────────────────────────────────────────────────────
  var Hunt = (function () {
    var cv = $('hunt-globe'), ctx = null, proj = null, path = null, geo = null, grat = null;
    var H = { ready: false, loading: false, round: 0, score: 0, results: [], target: null, answered: false, hint: false,
      rot: [-15, -20], k: 1, vel: [0, 0], dpr: 1, R: 100 };
    var pools = { famous: [], all: [] }, regions = [], view = null, anim = null, raf = null, ptrs = {}, drag = null, level = null, good = [-15, -20, 1], used = {};
    function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    function start() {
      if (H.ready || H.loading) return;
      H.loading = true;
      (window.d3 && d3.geoOrthographic ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js'))
        .then(function () { return window.ATLAS_GLOBE ? null : loadScript(HUNT_SRC.land); })
        .then(function () { return window.ATLAS ? null : loadScript(HUNT_SRC.data); })
        .then(init)
        .catch(function () { H.loading = false; $('hunt-q').textContent = 'The globe could not load. Check your connection and try again.'; });
    }
    function init() {
      regions = ATLAS.regions || [];
      ATLAS.rows.forEach(function (r) {
        if (r[6] & 2) return;   // only states with a known seat
        var p = { n: r[1], lng: r[9], lat: r[10], g: r[8] };
        pools.all.push(p); if (r[6] & 1) pools.famous.push(p);
      });
      geo = { type: 'MultiPolygon', coordinates: ATLAS_GLOBE.rings.map(function (fl) {
        var ring = []; for (var i = 0; i < fl.length; i += 2) ring.push([fl[i] / 100, fl[i + 1] / 100]);
        if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring.reverse();
        return [ring];
      }) };
      grat = d3.geoGraticule().step([20, 20])();
      proj = d3.geoOrthographic().clipAngle(90);
      ctx = cv.getContext('2d'); path = d3.geoPath(proj, ctx);
      level = seg('hunt', 'famous', function () { newGame(); });
      size(); window.addEventListener('resize', size);
      wire();
      new MutationObserver(function () { draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      H.ready = true; H.loading = false;
      newGame();
    }
    function size() {
      var w = cv.parentNode.clientWidth; if (!w) return;   // the tab is hidden: keep the last size (refresh() runs when it shows)
      H.dpr = Math.min(2, window.devicePixelRatio || 1);
      var h = Math.round(Math.min(w * 0.78, 540));
      cv.style.height = h + 'px'; cv.width = Math.round(w * H.dpr); cv.height = Math.round(h * H.dpr);
      H.R = Math.min(cv.width, cv.height) / 2 - 10 * H.dpr;
      draw();
    }
    function colours() {
      var cs = getComputedStyle(document.documentElement);
      return { g: (cs.getPropertyValue('--gold-rgb') || '201,168,76').trim(), gold: (cs.getPropertyValue('--gold') || '#c9a84c').trim(),
        goldL: (cs.getPropertyValue('--gold-light') || '#e8c97a').trim(), err: (cs.getPropertyValue('--error') || '#c0392b').trim(), bg: (cs.getPropertyValue('--bg') || '#0b0c10').trim() };
    }
    function onFront(ll) {
      var cl = -H.rot[0] * Math.PI / 180, cp = -H.rot[1] * Math.PI / 180, la = ll[1] * Math.PI / 180, lo = ll[0] * Math.PI / 180;
      return Math.cos(la) * Math.cos(cp) * Math.cos(lo - cl) + Math.sin(la) * Math.sin(cp) > 0.001;
    }
    function pin(ll, col, s) {
      if (!onFront(ll) || s <= 0) return;
      var p = proj(ll); if (!p) return;
      var d = H.dpr, x = ctx, h = 22 * d * s, r = 7 * d * s;
      x.save();
      x.beginPath(); x.ellipse(p[0], p[1], 6 * d * s, 2.4 * d * s, 0, 0, 6.2832); x.fillStyle = 'rgba(0,0,0,0.35)'; x.fill();
      x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] - r * 0.62, p[1] - h + r * 0.6); x.arc(p[0], p[1] - h, r, Math.PI * 0.82, Math.PI * 0.18, false); x.closePath();
      x.fillStyle = col; x.fill(); x.lineWidth = 1.2 * d; x.strokeStyle = 'rgba(0,0,0,0.45)'; x.stroke();
      x.beginPath(); x.arc(p[0], p[1] - h, r * 0.38, 0, 6.2832); x.fillStyle = 'rgba(255,255,255,0.85)'; x.fill();
      x.restore();
    }
    function draw(now) {
      if (!ctx) return;
      // a rotation or zoom that is not a number would blank the globe for good: fall back to the last good view
      if (isFinite(H.rot[0]) && isFinite(H.rot[1]) && isFinite(H.k)) good = [H.rot[0], H.rot[1], H.k];
      else { H.rot = [good[0], good[1]]; H.k = good[2]; H.vel = [0, 0]; }
      var c = colours(), d = H.dpr, x = ctx, t = now || performance.now();
      proj.scale(H.R * H.k).translate([cv.width / 2, cv.height / 2]).rotate([H.rot[0], H.rot[1], 0]);
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
      x.save(); x.shadowColor = 'rgba(' + c.g + ',0.4)'; x.shadowBlur = 18 * d;
      x.beginPath(); path({ type: 'Sphere' }); x.fillStyle = 'rgba(' + c.g + ',0.05)'; x.fill(); x.restore();
      x.beginPath(); path(grat); x.strokeStyle = 'rgba(' + c.g + ',0.14)'; x.lineWidth = 0.6 * d; x.stroke();
      x.beginPath(); path(geo); x.fillStyle = 'rgba(' + c.g + ',0.14)'; x.fill();
      x.strokeStyle = 'rgba(' + c.g + ',0.45)'; x.lineWidth = 0.7 * d; x.lineJoin = 'round'; x.stroke();
      x.beginPath(); path({ type: 'Sphere' }); x.strokeStyle = 'rgba(' + c.g + ',0.42)'; x.lineWidth = d; x.stroke();
      if (!view) return;
      if (view.arc > 0) {   // the great circle from the guess towards the answer, drawn as it grows
        var n = 64, upto = Math.max(1, Math.round(n * view.arc)), pts = [];
        for (var i = 0; i <= upto; i++) pts.push(view.interp(i / n));
        x.beginPath(); path({ type: 'LineString', coordinates: pts });
        x.strokeStyle = c.goldL; x.lineWidth = 2.2 * d; x.setLineDash([7 * d, 6 * d]); x.lineDashOffset = -t / 40; x.stroke(); x.setLineDash([]);
      }
      if (view.truthOn && onFront(view.truth)) {   // the answer: a gold dot with a slow pulse
        var q = proj(view.truth);
        if (q) {
          var ph = reduce ? 0.35 : ((t - view.truthAt) % 1400) / 1400;
          x.beginPath(); x.arc(q[0], q[1], (8 + ph * 26) * d, 0, 6.2832); x.strokeStyle = 'rgba(' + c.g + ',' + (0.85 * (1 - ph)).toFixed(3) + ')'; x.lineWidth = 2 * d; x.stroke();
          x.beginPath(); x.arc(q[0], q[1], 7 * d, 0, 6.2832); x.fillStyle = c.gold; x.fill(); x.lineWidth = 2 * d; x.strokeStyle = c.bg; x.stroke();
        }
      }
      pin(view.guess, c.err, view.pin);
    }
    function wantFrames() { return !!anim || (drag === null && (Math.abs(H.vel[0]) > 0.02 || Math.abs(H.vel[1]) > 0.02)) || (view && (view.truthOn || view.arc > 0) && !reduce); }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    function loop(now) {
      raf = null;
      if (anim) {
        var p = Math.min(1, (now - anim.t0) / anim.ms), e = ease(p);
        H.rot[0] = anim.r0[0] + anim.dl * e; H.rot[1] = anim.r0[1] + (anim.r1[1] - anim.r0[1]) * e; H.k = anim.k0 + (anim.k1 - anim.k0) * e;
        if (anim.tick) anim.tick(p, now);
        if (p >= 1) { var done = anim.done; anim = null; if (done) done(); }
      } else if (!drag && (Math.abs(H.vel[0]) > 0.02 || Math.abs(H.vel[1]) > 0.02)) {   // the globe coasts after a flick
        H.rot[0] += H.vel[0]; H.rot[1] = Math.max(-85, Math.min(85, H.rot[1] + H.vel[1]));
        H.vel[0] *= 0.93; H.vel[1] *= 0.93;
      }
      draw(now);
      if (wantFrames()) kick();
    }
    function turnTo(lng, lat, k, ms, tick, done) {
      var r0 = H.rot.slice(), r1 = [-lng, Math.max(-80, Math.min(80, -lat))], dl = r1[0] - r0[0];
      while (dl > 180) dl -= 360; while (dl < -180) dl += 360;
      H.vel = [0, 0];
      if (reduce) { H.rot = [r0[0] + dl, r1[1]]; H.k = k; if (tick) tick(1, performance.now()); if (done) done(); draw(); return; }
      anim = { t0: performance.now(), ms: ms, r0: r0, r1: r1, dl: dl, k0: H.k, k1: k, tick: tick, done: done };
      kick();
    }
    function wire() {
      function degPerPx() { return 57.296 / (H.R / H.dpr * H.k); }
      cv.addEventListener('pointerdown', function (e) {
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        try { cv.setPointerCapture(e.pointerId); } catch (err) {}
        var ids = Object.keys(ptrs);
        if (ids.length === 1) { drag = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false }; H.vel = [0, 0]; if (anim && !view) anim = null; }
        else if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: H.k, moved: true }; }
      });
      cv.addEventListener('pointermove', function (e) {
        if (ptrs[e.pointerId]) ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (!drag) return;
        var ids = Object.keys(ptrs);
        if (drag.pinch) {
          if (ids.length !== 2) return;
          var a = ptrs[ids[0]], b = ptrs[ids[1]];
          setK(drag.k * Math.hypot(a.x - b.x, a.y - b.y) / drag.pinch); return;
        }
        if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6) drag.moved = true;
        if (!drag.moved) return;
        var s = degPerPx(), dx = e.clientX - drag.lx, dy = e.clientY - drag.ly, now = performance.now(), dt = Math.max(8, now - drag.lt);
        H.rot[0] += dx * s; H.rot[1] = Math.max(-85, Math.min(85, H.rot[1] - dy * s));
        H.vel = [dx * s * 16 / dt, -dy * s * 16 / dt];
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
        draw();
      });
      // a finger left after a pinch carries on as a fresh drag (it must never be read as a tap)
      function afterPinch() {
        var ids = Object.keys(ptrs);
        if (ids.length === 1 && drag && drag.pinch) { var p = ptrs[ids[0]]; drag = { x0: p.x, y0: p.y, lx: p.x, ly: p.y, lt: performance.now(), moved: true }; H.vel = [0, 0]; }
        else if (!ids.length) drag = null;
      }
      function up(e) {
        var had = !!ptrs[e.pointerId]; delete ptrs[e.pointerId];
        if (!drag || Object.keys(ptrs).length) { afterPinch(); return; }
        var d0 = drag; drag = null;
        if (performance.now() - d0.lt > 80) H.vel = [0, 0];   // a slow release does not coast
        if (had && !d0.moved && !d0.pinch && H.target && !H.answered && !anim) {
          var b = cv.getBoundingClientRect(), ll = proj.invert([(e.clientX - b.left) * H.dpr, (e.clientY - b.top) * H.dpr]);
          if (ll && isFinite(ll[0]) && d3.geoDistance(ll, [-H.rot[0], -H.rot[1]]) < Math.PI / 2) guess(ll);
        }
        kick();
      }
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; if (Object.keys(ptrs).length) afterPinch(); else drag = null; kick(); });
      cv.addEventListener('wheel', function (e) { e.preventDefault(); setK((anim ? anim.k1 : H.k) * Math.pow(1.0015, -e.deltaY)); }, { passive: false });
      // keyboard: arrows turn the globe, + and - zoom, Enter or Space drops the pin at the centre (marked when focused)
      cv.addEventListener('keydown', function (e) {
        var s = 12 / H.k, k = e.key;
        if (k === 'ArrowLeft') H.rot[0] += s; else if (k === 'ArrowRight') H.rot[0] -= s;
        else if (k === 'ArrowUp') H.rot[1] = Math.max(-85, H.rot[1] - s); else if (k === 'ArrowDown') H.rot[1] = Math.min(85, H.rot[1] + s);
        else if (k === '+' || k === '=') zoomBy(1.5); else if (k === '-' || k === '_') zoomBy(1 / 1.5);
        else if (k === 'Enter' || k === ' ') { if (H.target && !H.answered && !anim) guess([-H.rot[0], -H.rot[1]]); }
        else return;
        e.preventDefault(); H.vel = [0, 0]; if (!anim) draw();
      });
      $('hunt-zin').addEventListener('click', function () { zoomBy(1.5); });
      $('hunt-zout').addEventListener('click', function () { zoomBy(1 / 1.5); });
      $('hunt-hint').addEventListener('click', function () {
        if (H.hint || H.answered || !H.target) return;
        H.hint = true; $('hunt-hint').disabled = true;
        var reg = regions[H.target.g];
        $('hunt-q').innerHTML = 'Round ' + H.round + ' of 5: where was the <b>' + escHtml(H.target.n) + '</b>? <span class="gm-hint-text">Hint: ' + (reg ? 'somewhere in ' + escHtml(reg) : 'no region recorded') + '</span>';
      });
      $('hunt-new').addEventListener('click', function () { if (H.ready) newGame(); });
    }
    // zooming never replaces a running animation (the swing to an answer ends by showing the result): it retargets it
    function setK(k) {
      k = Math.max(1, Math.min(6, k)); if (!isFinite(k)) return;
      if (anim) { anim.k1 = k; kick(); } else { H.k = k; draw(); }
    }
    function zoomBy(f) {
      var k1 = Math.max(1, Math.min(6, (anim ? anim.k1 : H.k) * f));
      if (anim || reduce) { setK(k1); return; }
      anim = { t0: performance.now(), ms: 260, r0: H.rot.slice(), r1: H.rot.slice(), dl: 0, k0: H.k, k1: k1 }; kick();
    }
    function kmBetween(a, b) { return Math.round(d3.geoDistance(a, b) * 6371); }
    function paintRounds() {
      Array.prototype.forEach.call($('hunt-rounds').children, function (li, i) {
        var r = H.results[i]; li.className = r ? (r.pts >= 80 ? 'r-gold' : r.pts >= 40 ? 'r-silver' : r.pts > 0 ? 'r-bronze' : 'r-miss') : (i === H.round - 1 ? 'is-now' : '');
        li.title = r ? r.n + ': ' + r.km.toLocaleString('en-GB') + ' km, ' + r.pts + ' points' : '';
      });
    }
    // a game visits five different regions of the world, in a fresh order, and never asks for a state twice
    function newGame() {
      H.round = 0; H.score = 0; H.results = []; view = null; used = {};
      var pool = pools[level()] || pools.famous, byReg = {};
      pool.forEach(function (p) { byReg[p.g] = (byReg[p.g] || 0) + 1; });
      H.plan = shuffle(Object.keys(byReg).filter(function (g) { return byReg[g] >= 3; })).slice(0, 5);
      $('hunt-score').textContent = '0'; $('hunt-done').hidden = true;
      var b = best('hunt-' + level()); $('hunt-best').textContent = b ? 'Best ' + b : '';
      nextRound();
    }
    function nextRound() {
      var pool = pools[level()] || pools.famous;
      H.round++; H.answered = false; H.hint = false; view = null;
      var g = H.plan[H.round - 1], left = pool.filter(function (p) { return !used[p.n] && (g == null || String(p.g) === g); });
      if (!left.length) left = pool.filter(function (p) { return !used[p.n]; });
      H.target = left[Math.floor(Math.random() * left.length)]; used[H.target.n] = 1;
      $('hunt-res').hidden = true; $('hunt-hint').hidden = false; $('hunt-hint').disabled = false;
      var q = $('hunt-q'); q.classList.remove('gm-enter'); void q.offsetWidth; q.classList.add('gm-enter');
      q.innerHTML = 'Round ' + H.round + ' of 5: where was the <b>' + escHtml(H.target.n) + '</b>?';
      paintRounds();
      // a fresh view that does not give the answer away
      turnTo(Math.random() * 360 - 180, Math.random() * 50 - 10, 1, 900);
    }
    function guess(ll) {
      H.answered = true; $('hunt-hint').hidden = true;
      var truth = [H.target.lng, H.target.lat], km = kmBetween(ll, truth), pts = Math.max(0, Math.round((5000 - Math.min(km, 5000)) / 50));
      if (H.hint) pts = Math.max(0, pts - 20);
      H.score += pts; H.results.push({ n: H.target.n, km: km, pts: pts });
      var interp = d3.geoInterpolate(ll, truth), mid = interp(0.5), ang = d3.geoDistance(ll, truth);
      view = { guess: ll, truth: truth, interp: interp, arc: 0, pin: 0, truthOn: false, truthAt: 0 };
      var t0 = performance.now(), k1 = Math.max(1, Math.min(3.2, 1.75 / (ang + 0.45)));
      // the pin drops, then the globe swings to show both points while the arc is drawn
      turnTo(mid[0], mid[1], k1, reduce ? 0 : 1200, function (p, now) {
        var tp = (now - t0) / 300; view.pin = tp >= 1 ? 1 : 1.25 * Math.sin(Math.min(1, tp) * Math.PI * 0.62) / Math.sin(Math.PI * 0.62);
        view.arc = Math.max(0, Math.min(1, (p - 0.15) / 0.75));
      }, function () {
        view.pin = 1; view.arc = 1; view.truthOn = true; view.truthAt = performance.now(); kick();
        reveal(km, pts);
      });
    }
    function reveal(km, pts) {
      var verdict = km <= 300 ? 'Bullseye!' : km <= 1000 ? 'Very close!' : km <= 2500 ? 'Warm.' : 'A long way off.';
      Sfx.play(pts >= 40 ? 'good' : 'bad');
      var res = $('hunt-res');
      res.innerHTML = '<p class="gm-res-v">' + verdict + '</p><p class="gm-res-d"><b>' + escHtml(H.target.n) + '</b> lay <b class="gm-res-km">0</b> km from your pin · <b class="gm-res-pts">+0</b> points' + (H.hint ? ' <span class="gm-res-hint">(hint −20)</span>' : '') + '</p>' +
        '<button type="button" class="hero-cta gm-res-next">' + (H.round < 5 ? 'Next round &rarr;' : 'See your score') + '</button>';
      res.hidden = false; res.classList.remove('gm-enter'); void res.offsetWidth; res.classList.add('gm-enter');
      countUp(res.querySelector('.gm-res-km'), km, 800);
      var ptsEl = res.querySelector('.gm-res-pts');
      if (reduce) ptsEl.textContent = '+' + pts; else { var t0 = performance.now(); (function f(now) { var p = Math.min(1, (now - t0) / 800); ptsEl.textContent = '+' + Math.round(pts * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); }
      countUp($('hunt-score'), H.score, 800); bump($('hunt-score'));
      paintRounds();
      var btn = res.querySelector('.gm-res-next');
      btn.addEventListener('click', function () { res.hidden = true; if (H.round < 5) nextRound(); else finish(); });
      btn.focus({ preventScroll: true });
    }
    function finish() {
      var lvl = level(), b = best('hunt-' + lvl), isBest = !b || H.score > b, s = H.score >= 400 ? 3 : H.score >= 250 ? 2 : 1;
      if (isBest) { setBest('hunt-' + lvl, H.score); $('hunt-best').textContent = 'Best ' + H.score; }
      $('hunt-q').innerHTML = 'Game over: <b>' + H.score + '</b> of 500 points.'; Sfx.play('win');
      var d = $('hunt-done');
      d.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">' + H.score + ' of 500 points</p>' + (isBest ? '<p class="gm-newbest">New best!</p>' : '') +
        '<ol class="gm-sum">' + H.results.map(function (r) { return '<li><span>' + escHtml(r.n) + '</span><span>' + r.km.toLocaleString('en-GB') + ' km</span><b>+' + r.pts + '</b></li>'; }).join('') + '</ol>' +
        '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Play again</button></div></div>';
      share(d, 'Globe Hunt: ' + H.score + ' of 500 points at The Epoch Institute', 'hunt', { title: 'Globe Hunt', score: String(H.score), unit: 'of 500 points', stars: s,
        rows: H.results.map(function (r) { return [r.n, r.km.toLocaleString('en-GB') + ' km', '+' + r.pts]; }), note: lvl === 'all' ? 'All states' : 'Famous states' });
      d.hidden = false; confetti(d);
      d.querySelector('.gm-done-btn').addEventListener('click', newGame);
      view = null; draw();
    }
    return { start: start, refresh: function () { if (H.ready) size(); } };
  })();

  // ── Which Came First? ────────────────────────────────────────────────────────
  // two curated pictures; tap the earlier one. The gaps narrow as the streak grows (a ladder, not a lottery), no
  // picture comes back in the same game, and the kinds of pair change from one round to the next. Three lives.
  // The Daily Ten: the same ten pairs for everyone on a given day (UTC, like the daily quiz), closer and closer, one go.
  var First = (function () {
    var F = { id: 0, lives: 3, streak: 0, used: {}, pair: null, kinds: '', busy: false, done: false, daily: null, trail: [] };
    var level = seg('first', 'daily', function () { newGame(); });   // newcomers start with the Daily Ten
    var QDAY = Math.floor(Date.now() / 864e5), DAY0 = Math.floor(Date.UTC(2026, 9, 26) / 864e5);   // Daily Ten #1: 26 October 2026
    var BANDS = [[900, 0], [600, 0], [400, 2500], [250, 1500], [180, 900], [120, 600], [80, 400], [50, 250], [30, 150], [15, 90]];
    function rng(seed) { return function () { seed = (seed + 0x6D2B79F5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    // a pair that answers itself (Hammurabi and the Code of Hammurabi) is never dealt
    function related(a, c) { var x = a.name.toLowerCase(), y = c.name.toLowerCase(); return x.indexOf(y) >= 0 || y.indexOf(x) >= 0; }
    // the day's ten pairs: a seeded shuffle of the pictures fit for every reader, then for each step of the ladder the
    // first unused pair inside its gap
    function dailyPairs(day) {
      var r = rng(day * 7919 + 17), pool = DATED.filter(function (c) { return c.kid; }), used = {}, out = [];
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      BANDS.forEach(function (b) {
        var found = null;
        for (var pass = 0; pass < 2 && !found; pass++) {
          for (var a = 0; a < pool.length && !found; a++) {
            if (used[pool[a].slug]) continue;
            for (var c = a + 1; c < pool.length; c++) {
              if (used[pool[c].slug] || pool[a].lo === pool[c].lo || related(pool[a], pool[c])) continue;
              var d = Math.abs(pool[a].lo - pool[c].lo);
              if (pass ? d >= 15 : d >= b[0] && (!b[1] || d <= b[1])) { found = [pool[a], pool[c]]; break; }
            }
          }
        }
        if (!found) return;
        used[found[0].slug] = used[found[1].slug] = 1;
        if (r() < 0.5) found.reverse();
        out.push(found);
      });
      return out;
    }
    function isDaily() { return level() === 'daily'; }
    function dailySaved() { return best('daily-' + QDAY) || { m: '' }; }
    function paintMode() {
      var d = isDaily();
      $('first-lives').hidden = d; $('first-new').hidden = d;
      $('first-unit').textContent = d ? 'of 10 right' : 'in a row';
      $('first-howto').textContent = d
        ? 'Today’s ten pairs, the same for everyone: tap the one that came first (for a person, the year they were born). The gaps close as you go. One go a day: share your score, and come back tomorrow for a new ten.'
        : 'Two moments from history: tap the one that came first (for a person, the year they were born). Every right answer grows your streak, and the gaps get closer as you go. You have three lives.';
    }
    var LADDER = [[3, 800, 0], [6, 300, 2200], [10, 120, 900], [15, 50, 400], [1e9, 15, 180]];   // [while the streak is below, nearest gap, widest gap (0: any)]
    function pool() {
      var lv = level(), k = kids();
      return DATED.filter(function (c) { return (!k || c.kid) && (lv === 'all' || (lv === 'people' ? c.kind === 'Person' : c.kind !== 'Person')); });
    }
    function band() { for (var i = 0; i < LADDER.length; i++) if (F.streak < LADDER[i][0]) return kids() ? [Math.max(300, LADDER[i][1]), 0] : [LADDER[i][1], LADDER[i][2]]; return [15, 0]; }
    function pick() {
      var all = pool(), p = all.filter(function (c) { return !F.used[c.slug]; }), b = band();
      if (p.length < 12) { F.used = {}; p = all; }
      if (p.length < 2) return null;
      for (var t = 0; t < 800; t++) {
        var a = p[Math.floor(Math.random() * p.length)], c = p[Math.floor(Math.random() * p.length)];
        if (a === c || a.lo === c.lo || related(a, c)) continue;
        var d = Math.abs(a.lo - c.lo);
        if (d < b[0] && t < 700) continue;
        if (b[1] && d > b[1] && t < 500) continue;
        var kk = [a.kind, c.kind].sort().join('|'); if (kk === F.kinds && t < 300) continue;
        F.kinds = kk; return [a, c];
      }
      return null;
    }
    function lives() {
      $('first-lives').innerHTML = [0, 1, 2].map(function (i) { return '<i class="' + (i < F.lives ? 'on' : '') + '">&#9829;</i>'; }).join('');
      $('first-lives').setAttribute('aria-label', F.lives + (F.lives === 1 ? ' life' : ' lives') + ' left');
    }
    function newGame() {
      F.id++; F.lives = 3; F.streak = 0; F.used = {}; F.kinds = ''; F.done = false; F.daily = null; F.trail = [];
      paintMode();
      $('first-streak').textContent = '0'; $('first-done').hidden = true; $('first-done').classList.remove('gm-done-inline'); lives();
      if (isDaily()) {   // today's ten, resumed where it was left (one go a day)
        F.daily = { pairs: dailyPairs(QDAY), m: String(dailySaved().m || '') };
        F.streak = (F.daily.m.match(/1/g) || []).length; $('first-streak').textContent = F.streak;
        var sk = best('daily-streak'); $('first-best').textContent = sk && sk.n > 1 && sk.last >= QDAY - 1 ? 'Played ' + sk.n + ' days in a row' : '';
        if (F.daily.m.length >= F.daily.pairs.length) { finishDaily(); return; }
        next(); return;
      }
      var b = best('first-' + level()); $('first-best').textContent = b ? 'Best ' + b + ' in a row' : '';
      next();
    }
    function next() {
      F.busy = false; F.pair = F.daily ? F.daily.pairs[F.daily.m.length] : pick();
      $('first-res').innerHTML = F.daily ? '<p class="gm-fc-count">Pair ' + (F.daily.m.length + 1) + ' of ' + F.daily.pairs.length + '</p>' : '';
      if (!F.pair) { $('first-duel').innerHTML = '<p class="gm-howto">There are not enough pictures for this choice.</p>'; return; }
      if (!F.daily) F.pair.forEach(function (c) { F.used[c.slug] = 1; });
      $('first-duel').innerHTML = F.pair.map(function (c, i) {
        return '<button type="button" class="gm-fc" data-i="' + i + '" style="--d:' + (reduce ? 0 : i * 90) + 'ms"><span class="gm-fc-img"><img src="' + escHtml(c.img) + '" alt="" draggable="false"></span>' +
          '<span class="gm-fc-b"><span class="gm-fc-k">' + escHtml(c.kind) + '</span><span class="gm-fc-n">' + escHtml(c.name) + '</span><span class="gm-fc-y"></span></span></button>';
      }).join('<span class="gm-fc-or" aria-hidden="true">or</span>');
    }
    function answer(i) {
      if (F.busy || F.done || !F.pair) return; F.busy = true;
      var pr = F.pair, first = pr[0].lo < pr[1].lo ? 0 : 1, ok = i === first, id = F.id;
      Array.prototype.forEach.call($('first-duel').querySelectorAll('.gm-fc'), function (b, k) {
        b.disabled = true; b.classList.add(k === first ? 'is-first' : 'is-second'); if (k === i) b.classList.add(ok ? 'is-right' : 'is-wrong');
        var y = b.querySelector('.gm-fc-y'); y.textContent = pr[k].dates; y.classList.add('is-on');
      });
      var d = Math.abs(pr[0].lo - pr[1].lo), a = pr[first], c = pr[1 - first];
      function born(x) { return x.kind === 'Person' ? ' (born ' + fmtYear(x.lo) + ')' : ''; }
      var why = '<p class="gm-fc-v">' + (ok ? 'Right!' : 'Not this time.') + ' <span>' + entryLink(a) + born(a) + ' came ' + d.toLocaleString('en-GB') + ' year' + (d === 1 ? '' : 's') + ' before ' + entryLink(c) + born(c) + '.</span></p>' +
        '<p class="gm-credit">' + [credit(pr[0]), credit(pr[1])].filter(function (x) { return x; }).join('<br>') + '</p>';
      if (F.daily) {   // no lives: every answer counts, saved at once
        F.daily.m += ok ? '1' : '0'; setBest('daily-' + QDAY, { m: F.daily.m });
        if (ok) { F.streak++; $('first-streak').textContent = F.streak; bump($('first-streak')); }
        Sfx.play(ok ? 'good' : 'bad');
        var last = F.daily.m.length >= F.daily.pairs.length;
        $('first-res').innerHTML = why + '<button type="button" class="hero-cta gm-fc-next">' + (last ? 'See your score' : 'Next pair') + ' &rarr;</button>';
        var db = $('first-res').querySelector('.gm-fc-next'); db.addEventListener('click', last ? finishDaily : next); db.focus({ preventScroll: true });
        return;
      }
      if (ok) { F.streak++; $('first-streak').textContent = F.streak; bump($('first-streak')); Sfx.play('good'); F.trail.push(a); }
      else { F.lives--; lives(); bump($('first-lives')); Sfx.play('bad'); }
      $('first-res').innerHTML = why + (F.lives ? '<button type="button" class="hero-cta gm-fc-next">Next pair &rarr;</button>' : '');
      if (!F.lives) { setTimeout(function () { if (id === F.id) finish(); }, reduce ? 0 : 1300); return; }
      var nb = $('first-res').querySelector('.gm-fc-next'); nb.addEventListener('click', next); nb.focus({ preventScroll: true });
    }
    $('first-duel').addEventListener('click', function (e) { var b = e.target.closest('.gm-fc'); if (b) answer(+b.getAttribute('data-i')); });
    function finish() {
      F.done = true;
      var lv = level(), b = best('first-' + lv), isBest = F.streak > 0 && (!b || F.streak > b), s = F.streak >= 12 ? 3 : F.streak >= 6 ? 2 : 1;
      if (isBest) { setBest('first-' + lv, F.streak); $('first-best').textContent = 'Best ' + F.streak + ' in a row'; }
      var dn = $('first-done');
      dn.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">' + F.streak + ' in a row</p><p class="gm-done-s">' + (F.streak >= 12 ? 'A true time traveller!' : F.streak >= 6 ? 'A fine sense of time.' : 'Every game teaches a few dates.') + '</p>' +
        (isBest ? '<p class="gm-newbest">New best!</p>' : '') + '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Play again</button></div>' +
        '<p class="gm-done-more"><a href="#first-daily" data-daily>Try today&rsquo;s Daily Ten &rarr;</a></p></div>';
      share(dn, 'Which Came First? ' + F.streak + ' in a row at The Epoch Institute', 'first', { title: 'Which Came First?', score: String(F.streak), unit: 'right in a row', stars: s,
        pics: F.trail.slice(-6).map(function (c) { return { src: c.img, label: c.name, sub: shortDates(c) }; }), note: F.trail.length ? 'The last ones I got right' : '' });
      dn.hidden = false; confetti(dn); Sfx.play('win');
      dn.querySelector('.gm-done-btn').addEventListener('click', newGame); dn.querySelector('.gm-done-btn').focus({ preventScroll: true });
      dn.querySelector('[data-daily]').addEventListener('click', function (e) { e.preventDefault(); level.set('daily'); });
    }
    // the Daily Ten's score: the day's squares to share, the streak of days played, the time to the next ten
    function finishDaily() {
      F.done = true;
      var m = F.daily.m, n = (m.match(/1/g) || []).length, tot = F.daily.pairs.length, num = Math.max(1, QDAY - DAY0 + 1);
      var sk = best('daily-streak') || { n: 0, last: 0 };
      if (sk.last !== QDAY) { sk = { n: sk.last === QDAY - 1 ? sk.n + 1 : 1, last: QDAY }; setBest('daily-streak', sk); }
      var squares = m.split('').map(function (x) { return x === '1' ? '🟩' : '🟥'; }).join('');
      var dn = $('first-done'), s = n >= 9 ? 3 : n >= 6 ? 2 : 1;
      dn.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">' + n + ' of ' + tot + ' right</p>' +
        '<p class="gm-daily-sq" aria-label="' + n + ' right, ' + (tot - n) + ' wrong">' + squares + '</p>' +
        '<p class="gm-done-s">Daily Ten #' + num + (sk.n > 1 ? ' · played ' + sk.n + ' days in a row' : '') + ' · a new ten in <span data-countdown></span></p>' +
        '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Play the endless game</button></div>' + newsletterPrompt('daily-ten') + '</div>';
      share(dn, 'Epoch Daily Ten #' + num + ': ' + n + '/' + tot + '\n' + squares, 'first-daily', { title: 'Daily Ten #' + num, score: n + '/' + tot, unit: 'right today', stars: s, squares: m,
        note: sk.n > 1 ? 'Played ' + sk.n + ' days in a row' : new Date(QDAY * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }), cta: 'Ten new pairs every day', url: 'the-epoch-institute.org/games#first-daily' });
      // the board is emptied, so the card stands in its place instead of over it (an overlay of an empty board clipped it)
      dn.classList.add('gm-done-inline'); dn.hidden = false; $('first-duel').innerHTML = ''; $('first-res').innerHTML = '';
      if (!dailyShown) { confetti(dn); Sfx.play('win'); }
      dailyShown = true;
      dn.querySelector('.gm-done-btn').addEventListener('click', function () { level.set('all'); });
      var cd = dn.querySelector('[data-countdown]');
      (function tick() { if (!cd.isConnected) return; var ms = (QDAY + 1) * 864e5 - Date.now(); if (ms <= 0) { cd.textContent = 'a moment'; return; } var h = Math.floor(ms / 36e5), mm = Math.floor(ms % 36e5 / 6e4); cd.textContent = (h ? h + ' h ' : '') + mm + ' min'; setTimeout(tick, 30000); })();
    }
    var dailyShown = false;
    $('first-new').addEventListener('click', newGame);
    var started = false;
    function show(sub) {
      if (sub === 'daily' && !isDaily()) { started = true; level.set('daily'); return; }   // #first-daily
      if (!started) { started = true; newGame(); }
    }
    return { show: show, sub: show };
  })();
  MODS.first = First;

  // ── Picture Puzzle ───────────────────────────────────────────────────────────
  // a curated picture, cropped square and cut into tiles that never start in their place; tap two tiles to swap them
  // or drag one onto another. A tile in its place glows and stays. Pictures come in sets, played in order.
  var Puzzle = (function () {
    var SETS = (typeof GAME_PUZZLES !== 'undefined' ? GAME_PUZZLES : []).map(function (s) {
      return { set: s.set, items: s.items.filter(function (k) { return BYSLUG[k] && BYSLUG[k].big; }) };
    }).filter(function (s) { return s.items.length; });
    var Z = { id: 0, n: 3, card: null, order: [], sel: null, moves: 0, t0: 0, timer: null, done: false, url: '', drag: null };
    document.querySelector('.gm-seg[data-for="pzset"]').innerHTML = SETS.map(function (s, i) { return '<button type="button" data-v="' + i + '">' + escHtml(s.set) + '</button>'; }).join('');
    var size = seg('puzzle', 3, function () { load(Z.card); }, 3);
    var setLv = seg('pzset', 0, function () { load(firstUnsolved()); });
    function solved() { var s = store()['pz-solved']; return Array.isArray(s) ? s : []; }
    function curSet() { return SETS[+setLv()] || SETS[0]; }
    function firstUnsolved() { var s = curSet(), done = solved(); if (!s) return null; for (var i = 0; i < s.items.length; i++) if (done.indexOf(s.items[i]) < 0) return BYSLUG[s.items[i]]; return BYSLUG[s.items[0]]; }
    function strip() {
      var s = curSet(), done = solved(); if (!s) return;
      $('puzzle-strip').innerHTML = s.items.map(function (k) {
        var c = BYSLUG[k], ok = done.indexOf(k) >= 0, cur = Z.card && Z.card.slug === k;
        return '<li><button type="button" data-k="' + escHtml(k) + '" class="' + (ok ? 'is-solved' : '') + (cur ? ' is-cur' : '') + '" aria-label="' + escHtml(ok ? c.name + ', solved' : 'Puzzle ' + (s.items.indexOf(k) + 1)) + '"' + (cur ? ' aria-current="true"' : '') + '>' +
          '<img src="' + escHtml(c.img) + '" alt="" loading="lazy">' + (ok ? '' : '<span aria-hidden="true">?</span>') + '</button></li>';
      }).join('');
      $('puzzle-prog').textContent = s.items.filter(function (k) { return done.indexOf(k) >= 0; }).length + ' of ' + s.items.length + ' solved';
    }
    function load(c) {
      if (!c) return;
      var id = ++Z.id; Z.card = c; Z.done = false; Z.sel = null; Z.moves = 0; Z.t0 = 0; clearInterval(Z.timer); Z.timer = null; Z.drag = null;
      Z.n = +size(); $('puzzle-moves').textContent = '0'; $('puzzle-time').textContent = '0:00'; $('puzzle-done').hidden = true;
      $('puzzle-credit').innerHTML = credit(c); strip();
      var board = $('puzzle-board'); board.className = 'gm-pz is-loading'; board.innerHTML = ''; board.setAttribute('aria-label', 'Picture puzzle');
      var im = new Image();
      im.onload = function () {
        if (id !== Z.id) return;
        var side = Math.min(im.naturalWidth, im.naturalHeight), px = Math.min(side, 800), cv = document.createElement('canvas');
        cv.width = cv.height = px;
        cv.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, px, px);
        try { Z.url = cv.toDataURL('image/jpeg', 0.88); } catch (e) { Z.url = c.big; }
        deal();
      };
      im.onerror = function () { if (id === Z.id) { board.className = 'gm-pz'; board.innerHTML = '<p class="gm-pz-err">The picture could not load. Try another one below.</p>'; } };
      im.src = c.big;
    }
    function deal() {
      var N = Z.n, T = N * N, ord;
      do { ord = shuffle(Array.apply(null, { length: T }).map(function (_, i) { return i; })); } while (ord.some(function (t, s) { return t === s; }));   // no tile starts in its place
      Z.order = ord;
      var board = $('puzzle-board'); board.className = 'gm-pz'; board.style.setProperty('--n', N); board.style.setProperty('--pic', 'url("' + Z.url + '")');
      board.innerHTML = ord.map(function (t, s) {
        return '<div class="gm-pt" data-t="' + t + '" tabindex="0" role="button" aria-label="Picture piece" style="--x:' + (s % N) + ';--y:' + Math.floor(s / N) + ';--bx:' + ((t % N) / (N - 1) * 100) + '%;--by:' + (Math.floor(t / N) / (N - 1) * 100) + '%;--d:' + (reduce ? 0 : s * 16) + 'ms"></div>';
      }).join('');
    }
    function tileAt(slot) { return $('puzzle-board').querySelector('.gm-pt[data-t="' + Z.order[slot] + '"]'); }
    function slotOf(el) { return Z.order.indexOf(+el.getAttribute('data-t')); }
    function place(el, slot) { el.style.setProperty('--x', slot % Z.n); el.style.setProperty('--y', Math.floor(slot / Z.n)); el.style.transform = ''; }
    function swap(a, b) {
      if (a === b || Z.done) return;
      var ea = tileAt(a), eb = tileAt(b), t = Z.order[a]; Z.order[a] = Z.order[b]; Z.order[b] = t;
      place(ea, b); place(eb, a); Z.moves++; $('puzzle-moves').textContent = Z.moves; bump($('puzzle-moves'));
      if (!Z.t0) { Z.t0 = Date.now(); Z.timer = setInterval(function () { $('puzzle-time').textContent = fmtTime(Math.floor((Date.now() - Z.t0) / 1000)); }, 1000); }
      var home = 0; [[ea, b], [eb, a]].forEach(function (p) { if (+p[0].getAttribute('data-t') === p[1]) { p[0].classList.add('is-home'); p[0].setAttribute('aria-label', 'Picture piece, in place'); home++; } });
      Sfx.play(home ? 'good' : 'tap');
      if (Z.order.every(function (x, s) { return x === s; })) win();
    }
    function clearSel() { if (Z.sel != null) { var s = tileAt(Z.sel); if (s) s.classList.remove('is-sel'); } Z.sel = null; }
    function tap(slot) {
      var el = tileAt(slot); if (!el || el.classList.contains('is-home') || Z.done) return;
      if (Z.sel == null) { Z.sel = slot; el.classList.add('is-sel'); Sfx.play('tap'); return; }
      if (Z.sel === slot) { clearSel(); return; }
      var a = Z.sel; clearSel(); swap(a, slot);
    }
    var board = $('puzzle-board');
    board.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.gm-pt'); if (!el || Z.done || el.classList.contains('is-home') || Z.drag) return;
      e.preventDefault();
      Z.drag = { el: el, from: slotOf(el), x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: false, r: board.getBoundingClientRect() };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    board.addEventListener('pointermove', function (e) {
      var d = Z.drag; if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      d.moved = true; d.el.classList.add('is-drag'); d.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    board.addEventListener('pointerup', function (e) {
      var d = Z.drag; if (!d || e.pointerId !== d.id) return; Z.drag = null;
      d.el.classList.remove('is-drag');
      if (!d.moved) { tap(d.from); return; }
      var cs = d.r.width / Z.n, col = Math.floor((e.clientX - d.r.left) / cs), row = Math.floor((e.clientY - d.r.top) / cs), to = row * Z.n + col;
      if (col < 0 || row < 0 || col >= Z.n || row >= Z.n || to === d.from || tileAt(to).classList.contains('is-home')) { d.el.style.transform = ''; return; }
      clearSel(); swap(d.from, to);
    });
    board.addEventListener('pointercancel', function (e) { var d = Z.drag; if (d && e.pointerId === d.id) { Z.drag = null; d.el.classList.remove('is-drag'); d.el.style.transform = ''; } });
    // keyboard: arrows move between pieces, Enter or Space picks one and then swaps it with the next one picked
    board.addEventListener('keydown', function (e) {
      var el = e.target.closest('.gm-pt'); if (!el || Z.done) return;
      var s = slotOf(el), N = Z.n, to = null;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(s); return; }
      if (e.key === 'ArrowLeft' && s % N) to = s - 1; else if (e.key === 'ArrowRight' && s % N < N - 1) to = s + 1;
      else if (e.key === 'ArrowUp' && s >= N) to = s - N; else if (e.key === 'ArrowDown' && s < N * (N - 1)) to = s + N;
      if (to != null) { e.preventDefault(); tileAt(to).focus(); }
    });
    $('puzzle-peek').addEventListener('click', function () {
      var b = $('puzzle-board'); if (!Z.url || Z.done || b.classList.contains('is-peek')) return;
      b.classList.add('is-peek'); setTimeout(function () { b.classList.remove('is-peek'); }, 1600);
    });
    function nextAfter(c) {
      var s = curSet(), i = s.items.indexOf(c.slug), done = solved();
      for (var k = 1; k <= s.items.length; k++) { var x = s.items[(i + k) % s.items.length]; if (done.indexOf(x) < 0) return BYSLUG[x]; }
      return BYSLUG[s.items[(i + 1) % s.items.length]];
    }
    function win() {
      Z.done = true; clearInterval(Z.timer);
      var id = Z.id, c = Z.card, t = Z.t0 ? Math.max(1, Math.floor((Date.now() - Z.t0) / 1000)) : 0, T = Z.n * Z.n, s = Z.moves <= T ? 3 : Z.moves <= Math.round(T * 1.5) ? 2 : 1;
      var done = solved(); if (done.indexOf(c.slug) < 0) { done.push(c.slug); setBest('pz-solved', done); }
      $('puzzle-board').classList.add('is-solved'); Sfx.play('win'); strip();
      setTimeout(function () {
        if (id !== Z.id) return;
        var nx = nextAfter(c), dn = $('puzzle-done');
        dn.innerHTML = '<div class="gm-done-card gm-pz-card">' + stars(s) + '<p class="gm-done-t">' + escHtml(c.name) + '</p><p class="gm-done-s">' + Z.moves + ' moves' + (t ? ' · ' + fmtTime(t) : '') + '</p>' +
          '<p class="gm-pz-cap">' + escHtml(c.cap) + ' ' + entryLink(c, 'Read more &rarr;') + '</p><div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">' + (nx && nx !== c ? 'Next picture &rarr;' : 'Play again') + '</button></div></div>';
        share(dn, 'Picture Puzzle: ' + c.name + ' in ' + Z.moves + ' moves at The Epoch Institute', 'puzzle', { title: 'Picture Puzzle', score: String(Z.moves), unit: 'moves on a ' + Z.n + ' × ' + Z.n + ' board' + (t ? ' · ' + fmtTime(t) : ''), stars: s, hero: { src: c.big, label: c.name } });
        dn.hidden = false; confetti(dn);
        dn.querySelector('.gm-done-btn').addEventListener('click', function () { load(nx || c); });
        dn.querySelector('.gm-done-btn').focus({ preventScroll: true });
      }, reduce ? 0 : 1000);
    }
    $('puzzle-new').addEventListener('click', function () { load(Z.card); });
    $('puzzle-strip').addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (b) load(BYSLUG[b.getAttribute('data-k')]); });
    var started = false;
    return { show: function () { if (!started) { started = true; load(firstUnsolved()); } } };
  })();
  MODS.puzzle = Puzzle;

  // ── Word Hunt ────────────────────────────────────────────────────────────────
  // themed word searches; every grid is built so that each word fits and appears exactly once, in any direction
  var Words = (function () {
    var THEMES = typeof GAME_WORDS !== 'undefined' ? GAME_WORDS : [];
    var ALL8 = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
    var LV = { easy: { n: 8, max: 8, count: 6, dirs: [[0, 1], [1, 0]] }, medium: { n: 10, max: 10, count: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] }, hard: { n: 12, max: 12, count: 10, dirs: ALL8 } };
    var W = { id: 0, theme: null, list: [], grid: [], place: {}, n: 8, found: {}, nf: 0, t0: 0, timer: null, sel: null, drag: null, done: false };
    var level = seg('words', 'easy', function () { build(); }, 'easy');
    var themeBox = $('words-themes');
    themeBox.innerHTML = THEMES.map(function (t) { return '<button type="button" class="gm-wt" data-k="' + escHtml(t.k) + '" aria-pressed="false">' + (t.img ? '<img src="' + escHtml(t.img) + '" alt="" loading="lazy">' : '') + '<span>' + escHtml(t.t) + '</span></button>'; }).join('');
    themeBox.addEventListener('click', function (e) { var b = e.target.closest('.gm-wt'); if (b) choose(b.getAttribute('data-k')); });
    function choose(k) {
      var t = THEMES.filter(function (x) { return x.k === k; })[0] || THEMES[0]; if (!t) return;
      W.theme = t; setBest('words-theme', t.k);
      Array.prototype.forEach.call(themeBox.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-k') === t.k)); });
      build();
    }
    function fits(g, n, w, r, c, d) { for (var i = 0; i < w.length; i++) { var rr = r + d[0] * i, cc = c + d[1] * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n) return false; var x = g[rr * n + cc]; if (x && x !== w[i]) return false; } return true; }
    function count(g, n, w) {   // how often w can be read in the grid, in all eight directions
      var k = 0, seen = {};
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        if (g[r * n + c] !== w[0]) continue;
        ALL8.forEach(function (d) {
          for (var i = 0; i < w.length; i++) { var rr = r + d[0] * i, cc = c + d[1] * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n || g[rr * n + cc] !== w[i]) return; }
          var a = r * n + c, b = (r + d[0] * (w.length - 1)) * n + c + d[1] * (w.length - 1), key = Math.min(a, b) + '-' + Math.max(a, b);
          if (!seen[key]) { seen[key] = 1; k++; }
        });
      }
      return k;
    }
    function generate(words, n, dirs) {
      for (var attempt = 0; attempt < 120; attempt++) {
        var g = new Array(n * n), place = {}, ok = true, order = words.slice().sort(function (a, b) { return b.length - a.length; });
        for (var wi = 0; wi < order.length; wi++) {
          var w = order[wi], opts = [];
          dirs.forEach(function (d) { for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (fits(g, n, w, r, c, d)) opts.push([r, c, d]); });
          if (!opts.length) { ok = false; break; }
          var o = opts[Math.floor(Math.random() * opts.length)], cells = [];
          for (var i = 0; i < w.length; i++) { var idx = (o[0] + o[2][0] * i) * n + (o[1] + o[2][1] * i); g[idx] = w[i]; cells.push(idx); }
          place[w] = cells;
        }
        if (!ok) continue;
        for (var fill = 0; fill < 60; fill++) {
          var gg = g.slice(); for (var k = 0; k < gg.length; k++) if (!gg[k]) gg[k] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
          if (words.every(function (x) { return count(gg, n, x) === 1; })) return { grid: gg, place: place };
        }
      }
      return null;
    }
    function build() {
      var t = W.theme; if (!t) return;
      var lvName = level(), lv = LV[lvName] || LV.easy, cand = t.words.filter(function (w) { return w[0].length <= lv.max; }), pick = shuffle(cand.slice()).slice(0, lv.count), res = null;
      while (!res && pick.length) { res = generate(pick.map(function (w) { return w[0]; }), lv.n, lv.dirs); if (!res) pick = pick.slice(0, -1); }
      if (!res) return;
      W.id++; W.n = lv.n; W.grid = res.grid; W.place = res.place; W.list = pick; W.found = {}; W.nf = 0; W.sel = null; W.drag = null; W.done = false; W.t0 = 0; clearInterval(W.timer); W.timer = null;
      var g = $('words-grid'); g.style.setProperty('--n', W.n);
      g.innerHTML = W.grid.map(function (ch, i) { return '<span class="gm-wc" data-i="' + i + '">' + ch + '</span>'; }).join('');
      g.setAttribute('aria-label', 'A ' + W.n + ' by ' + W.n + ' grid of letters with ' + pick.length + ' hidden words');
      var hard = lvName === 'hard';
      $('words-list').className = 'gm-wh-list' + (hard ? ' is-clues' : '');
      $('words-list').innerHTML = W.list.map(function (w) {
        return '<li data-w="' + w[0] + '"><span class="gm-wl-w">' + (hard ? '<span class="gm-wl-blank">' + w[0].length + ' letters</span>' : '') + '<span class="gm-wl-word">' + w[0] + '</span></span><span class="gm-wl-c">' + escHtml(w[1]) + (w[2] ? ' <a href="' + escHtml(w[2]) + '">Read more</a>' : '') + '</span></li>';
      }).join('');
      $('words-found').textContent = '0'; $('words-total').textContent = String(W.list.length); $('words-time').textContent = '0:00'; $('words-done').hidden = true;
      var b = best('words-' + t.k + '-' + lvName); $('words-best').textContent = b ? 'Best ' + fmtTime(b) : '';
      $('words-intro').textContent = t.intro;
    }
    function startClock() { if (!W.t0) { W.t0 = Date.now(); W.timer = setInterval(function () { $('words-time').textContent = fmtTime(Math.floor((Date.now() - W.t0) / 1000)); }, 1000); } }
    function cellsEl() { return $('words-grid').children; }
    function mark(path, cls, on) { var cs = cellsEl(); path.forEach(function (i) { cs[i].classList.toggle(cls, on); }); }
    // the straight line of cells from a towards b (snapped to the nearest of the eight directions)
    function snap(a, b) {
      var n = W.n, r0 = Math.floor(a / n), c0 = a % n, dr = Math.floor(b / n) - r0, dc = b % n - c0;
      if (!dr && !dc) return [a];
      var k = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)), d = [Math.round(Math.sin(k * Math.PI / 4)), Math.round(Math.cos(k * Math.PI / 4))], len = Math.max(Math.abs(dr), Math.abs(dc)), out = [];
      for (var i = 0; i <= len; i++) { var rr = r0 + d[0] * i, cc = c0 + d[1] * i; if (rr < 0 || cc < 0 || rr >= n || cc >= n) break; out.push(rr * n + cc); }
      return out;
    }
    function check(path) {
      if (path.length < 2) return false;
      for (var i = 0; i < W.list.length; i++) {
        var w = W.list[i][0], cells = W.place[w];
        if (W.found[w] != null || !cells || cells.length !== path.length) continue;
        var fw = cells.every(function (c, k) { return c === path[k]; }), bw = cells.every(function (c, k) { return c === path[path.length - 1 - k]; });
        if (fw || bw) { found(w); return true; }
      }
      mark(path, 'is-miss', true); var id = W.id; Sfx.play('bad');
      setTimeout(function () { if (id === W.id) mark(path, 'is-miss', false); }, 450);
      return false;
    }
    function found(w) {
      var hue = W.nf % 6; W.found[w] = hue; W.nf++;
      var cs = cellsEl(); W.place[w].forEach(function (i, k) { cs[i].classList.add('is-found', 'h' + hue); cs[i].style.setProperty('--k', k); });
      var li = $('words-list').querySelector('li[data-w="' + w + '"]'); if (li) li.classList.add('is-found');
      $('words-found').textContent = String(W.nf); bump($('words-found')); Sfx.play('good'); startClock();
      if (W.nf === W.list.length) win();
    }
    function win() {
      W.done = true; clearInterval(W.timer);
      var t = W.t0 ? Math.max(1, Math.floor((Date.now() - W.t0) / 1000)) : 1, per = t / W.list.length, s = per <= 15 ? 3 : per <= 35 ? 2 : 1, key = 'words-' + W.theme.k + '-' + level(), b = best(key), isBest = !b || t < b, id = W.id;
      if (isBest) { setBest(key, t); $('words-best').textContent = 'Best ' + fmtTime(t); }
      Sfx.play('win');
      setTimeout(function () {
        if (id !== W.id) return;
        var dn = $('words-done'), i = THEMES.indexOf(W.theme), nx = THEMES[(i + 1) % THEMES.length];
        dn.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">All ' + W.list.length + ' words found</p><p class="gm-done-s">' + escHtml(W.theme.t) + ' · ' + fmtTime(t) + '</p>' + (isBest ? '<p class="gm-newbest">New best!</p>' : '') +
          '<p class="gm-pz-cap"><a href="/kids#t-' + escHtml(W.theme.k) + '">Explore ' + escHtml(W.theme.t) + ' in the Kids corner &rarr;</a></p>' +
          '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Next theme: ' + escHtml(nx.t) + ' &rarr;</button></div></div>';
        share(dn, 'Word Hunt, ' + W.theme.t + ': all ' + W.list.length + ' words in ' + fmtTime(t) + ' at The Epoch Institute', 'words-' + W.theme.k, { title: 'Word Hunt · ' + W.theme.t, score: fmtTime(t), unit: 'to find all ' + W.list.length + ' words', stars: s,
          words: W.list.map(function (w) { return w[0]; }), wordPic: W.theme.img });
        dn.hidden = false; confetti(dn);
        dn.querySelector('.gm-done-btn').addEventListener('click', function () { choose(nx.k); });
        dn.querySelector('.gm-done-btn').focus({ preventScroll: true });
      }, reduce ? 0 : 600);
    }
    // pointer: drag across letters, or tap the first letter and then the last
    var grid = $('words-grid');
    function cellAt(x, y) { var el = document.elementFromPoint(x, y), c = el && el.closest ? el.closest('.gm-wc') : null; return c && grid.contains(c) ? +c.getAttribute('data-i') : null; }
    grid.addEventListener('pointerdown', function (e) {
      var c = e.target.closest('.gm-wc'); if (!c || W.done || W.drag) return;
      e.preventDefault();
      W.drag = { a: +c.getAttribute('data-i'), path: [+c.getAttribute('data-i')], id: e.pointerId, moved: false };
      try { grid.setPointerCapture(e.pointerId); } catch (err) {}
      mark(W.drag.path, 'is-sel', true);
    });
    grid.addEventListener('pointermove', function (e) {
      var d = W.drag; if (!d || e.pointerId !== d.id) return;
      var b = cellAt(e.clientX, e.clientY); if (b == null) return;
      var p = snap(d.a, b); if (p.join() === d.path.join()) return;
      mark(d.path, 'is-sel', false); d.path = p; mark(p, 'is-sel', true); if (p.length > 1) d.moved = true;
    });
    function endPointer(e) {
      var d = W.drag; if (!d || e.pointerId !== d.id) return; W.drag = null;
      mark(d.path, 'is-sel', false);
      if (d.moved) { clearAnchor(); startClock(); check(d.path); return; }
      // a tap: the first tap marks a letter, the second checks the line between the two
      if (W.sel == null) { W.sel = d.a; cellsEl()[d.a].classList.add('is-anchor'); Sfx.play('tap'); return; }
      if (W.sel === d.a) { clearAnchor(); return; }
      var a = W.sel, p = snap(a, d.a); clearAnchor();
      if (p[p.length - 1] === d.a) { startClock(); check(p); } else { W.sel = d.a; cellsEl()[d.a].classList.add('is-anchor'); }
    }
    function clearAnchor() { if (W.sel != null) cellsEl()[W.sel].classList.remove('is-anchor'); W.sel = null; }
    grid.addEventListener('pointerup', endPointer);
    grid.addEventListener('pointercancel', function (e) { var d = W.drag; if (d && e.pointerId === d.id) { W.drag = null; mark(d.path, 'is-sel', false); } });
    // keyboard (and anyone who prefers typing): type a word you have spotted
    $('words-type').addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = $('words-input'), v = inp.value.toUpperCase().replace(/[^A-Z]/g, ''), hit = W.list.some(function (w) { return w[0] === v; });
      if (hit && W.found[v] == null && !W.done) { found(v); inp.value = ''; }
      else { inp.classList.remove('is-miss'); void inp.offsetWidth; inp.classList.add('is-miss'); Sfx.play('bad'); $('words-say').textContent = hit ? 'Already found.' : 'That word is not hidden here.'; }
    });
    $('words-new').addEventListener('click', build);
    var started = false;
    function show(sub) {
      if (sub && THEMES.some(function (t) { return t.k === sub; })) { started = true; choose(sub); return; }
      if (!started) { started = true; var k = best('words-theme'); choose(THEMES.some(function (t) { return t.k === k; }) ? k : THEMES.length ? THEMES[0].k : null); }
    }
    return { show: show, sub: show };
  })();
  MODS.words = Words;

  // ── Guess the Year ───────────────────────────────────────────────────────────
  // five rounds, one picture from each age, in a fresh order. The slider gives more room to recent centuries. Points
  // fall with the distance from the true date, and the allowance grows with age (a quarter of the years since then).
  var Year = (function () {
    var ERAS = [[-5000, 499], [500, 1449], [1450, 1799], [1800, 1899], [1900, 2100]], MIN = -3000, MAX = 2025, K = 2.2;
    var Y = { id: 0, round: 0, score: 0, results: [], plan: [], card: null, answered: false, cur: 1000 };
    function pool() { var k = kids(); return DATED.filter(function (c) { return c.big && c.kind !== 'Person' && c.hi - c.lo <= 25 && (!k || c.kid); }); }
    function toYear(p) { return Math.round(MAX - (MAX - MIN) * Math.pow(1 - p / 1000, K)); }
    function toPos(y) { y = Math.max(MIN, Math.min(MAX, y)); return 1000 * (1 - Math.pow((MAX - y) / (MAX - MIN), 1 / K)); }
    var range = $('year-range'), out = $('year-out');
    function setYear(y, fromRange) {
      y = Math.max(MIN, Math.min(MAX, Math.round(y))); if (y === 0) y = 1;
      Y.cur = y; out.textContent = fmtYear(y); range.setAttribute('aria-valuetext', fmtYear(y));
      if (!fromRange) range.value = String(Math.round(toPos(y)));
    }
    range.addEventListener('input', function () { setYear(toYear(+range.value), true); });
    range.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); guess(); } });
    $('year-fine').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-d]'); if (!b || Y.answered) return;
      var d = +b.getAttribute('data-d'), y = Y.cur + d; if (y === 0 || (Y.cur > 0) !== (y > 0) && Math.abs(d) === 1) y = d < 0 ? -1 : 1;
      setYear(y);
    });
    // the scale under the slider
    $('year-scale').innerHTML = [-3000, -1000, 1, 500, 1000, 1500, 1800, 1900, 2000].map(function (y) {
      return '<span style="left:' + (toPos(y) / 10).toFixed(2) + '%">' + (y < 0 ? (-y) + ' BCE' : y === 1 ? '1 CE' : y) + '</span>';
    }).join('');
    function rounds() {
      Array.prototype.forEach.call($('year-rounds').children, function (li, i) {
        var r = Y.results[i]; li.className = r ? (r.pts >= 80 ? 'r-gold' : r.pts >= 40 ? 'r-silver' : r.pts > 0 ? 'r-bronze' : 'r-miss') : (i === Y.round - 1 ? 'is-now' : '');
      });
    }
    function newGame() {
      Y.id++; Y.round = 0; Y.score = 0; Y.results = [];
      var p = pool(), used = [];
      Y.plan = shuffle(ERAS.slice()).map(function (e) { var c = shuffle(p.filter(function (x) { return x.lo >= e[0] && x.lo <= e[1] && used.indexOf(x) < 0; }))[0]; if (c) used.push(c); return c || null; });
      Y.plan = Y.plan.map(function (c) { if (c) return c; var spare = shuffle(p.filter(function (x) { return used.indexOf(x) < 0; }))[0]; if (spare) used.push(spare); return spare; }).filter(function (c) { return c; });
      $('year-score').textContent = '0'; $('year-done').hidden = true;
      var b = best('year'); $('year-best').textContent = b ? 'Best ' + b : '';
      next();
    }
    function next() {
      Y.round++; Y.answered = false; var c = Y.card = Y.plan[Y.round - 1];
      if (!c) return;
      rounds();
      var img = $('year-img'); img.classList.remove('is-in'); img.onload = function () { img.classList.add('is-in'); }; img.src = c.big; img.alt = c.name;
      $('year-q').innerHTML = 'Round ' + Y.round + ' of ' + Y.plan.length + ': ' + (c.kind === 'Event' ? 'when did this happen?' : 'when was this made?') + ' <b>' + escHtml(c.name) + '</b>';
      $('year-credit').innerHTML = credit(c);
      $('year-res').hidden = true; $('year-pick').hidden = false; $('year-go').disabled = false; setYear(1000);
    }
    function guess() {
      if (Y.answered || !Y.card) return; Y.answered = true; $('year-go').disabled = true;
      var c = Y.card, y = Y.cur, d = y < c.lo ? c.lo - y : y > c.hi ? y - c.hi : 0, tol = Math.max(20, 0.25 * (2030 - c.lo)), pts = Math.round(100 * Math.max(0, 1 - d / (2 * tol)));
      Y.score += pts; Y.results.push({ n: c.name, d: d, pts: pts });
      Sfx.play(pts >= 50 ? 'good' : 'bad');
      var verdict = d === 0 ? 'Spot on!' : pts >= 80 ? 'Very close!' : pts >= 50 ? 'Close.' : pts > 0 ? 'Warm.' : 'A long way off.';
      var res = $('year-res'), you = toPos(y) / 10, a = toPos(c.lo) / 10, b = toPos(c.hi) / 10;
      res.innerHTML = '<div class="gm-yr-line" aria-hidden="true"><span class="gm-yr-true" style="--a:' + a.toFixed(2) + '%;--b:' + Math.max(b, a + 0.6).toFixed(2) + '%"></span><span class="gm-yr-you" style="--a:' + you.toFixed(2) + '%"></span></div>' +
        '<p class="gm-res-v">' + verdict + '</p><p class="gm-res-d"><b>' + escHtml(c.name) + '</b>: ' + escHtml(c.dates) + '. You said ' + fmtYear(y) + (d ? ', ' + d.toLocaleString('en-GB') + ' year' + (d === 1 ? '' : 's') + ' away' : '') + ' · <b class="gm-res-pts">+' + pts + '</b> points</p>' +
        '<p class="gm-yr-cap">' + escHtml(c.cap) + ' ' + entryLink(c, 'Read more &rarr;') + '</p>' +
        '<button type="button" class="hero-cta gm-res-next">' + (Y.round < Y.plan.length ? 'Next round &rarr;' : 'See your score') + '</button>';
      res.hidden = false; $('year-pick').hidden = true; res.classList.remove('gm-enter'); void res.offsetWidth; res.classList.add('gm-enter');
      countUp($('year-score'), Y.score, 700); bump($('year-score')); rounds();
      var nb = res.querySelector('.gm-res-next'); nb.addEventListener('click', function () { if (Y.round < Y.plan.length) next(); else finish(); }); nb.focus({ preventScroll: true });
    }
    $('year-go').addEventListener('click', guess);
    function finish() {
      var b = best('year'), isBest = !b || Y.score > b, s = Y.score >= 400 ? 3 : Y.score >= 250 ? 2 : 1;
      if (isBest) { setBest('year', Y.score); $('year-best').textContent = 'Best ' + Y.score; }
      $('year-res').hidden = true; $('year-q').innerHTML = 'Game over: <b>' + Y.score + '</b> of ' + (Y.plan.length * 100) + ' points.';
      var dn = $('year-done');
      dn.innerHTML = '<div class="gm-done-card">' + stars(s) + '<p class="gm-done-t">' + Y.score + ' of ' + (Y.plan.length * 100) + ' points</p>' + (isBest ? '<p class="gm-newbest">New best!</p>' : '') +
        '<ol class="gm-sum">' + Y.results.map(function (r) { return '<li><span>' + escHtml(r.n) + '</span><span>' + (r.d ? r.d.toLocaleString('en-GB') + ' yrs off' : 'spot on') + '</span><b>+' + r.pts + '</b></li>'; }).join('') + '</ol>' +
        '<div class="gm-done-row">' + shareBtn() + '<button type="button" class="hero-cta gm-done-btn">Play again</button></div></div>';
      share(dn, 'Guess the Year: ' + Y.score + ' of ' + (Y.plan.length * 100) + ' points at The Epoch Institute', 'year', { title: 'Guess the Year', score: String(Y.score), unit: 'of ' + (Y.plan.length * 100) + ' points', stars: s,
        pics: Y.plan.map(function (c, i) { var r = Y.results[i] || { pts: 0 }; return { src: c.img, label: c.name, sub: '+' + r.pts }; }) });
      dn.hidden = false; confetti(dn); Sfx.play('win');
      dn.querySelector('.gm-done-btn').addEventListener('click', newGame); dn.querySelector('.gm-done-btn').focus({ preventScroll: true });
    }
    $('year-new').addEventListener('click', newGame);
    var started = false;
    return { show: function () { if (!started) { started = true; newGame(); } } };
  })();
  MODS.year = Year;

  // open the game from the address (#words-egypt opens Word Hunt on Ancient Egypt), else the last one played
  var hp = location.hash.slice(1).split('-'), startGame = hp[0], startSub = hp.slice(1).join('-');
  if (GAMES.indexOf(startGame) < 0) { startSub = ''; try { startGame = localStorage.getItem('epoch-games-tab'); } catch (e) {} }
  showGame(GAMES.indexOf(startGame) >= 0 ? startGame : 'pairs', false, startSub);
})();
