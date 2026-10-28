// flashcards.js - Flashcards (/flashcards). The decks are listed in the page (build:fc-decks, written by
// scripts/build-pages.ps1 with each file's ?v=); a deck's cards ([id, front, back, picture, link, hint]) come from
// data/cards/<deck>.json when it is opened (/flashcards#<deck>). Learning follows Leitner's boxes, kept in localStorage
// epoch-cards {deck: {c: {card: [box 1-5, due UTC day]}, d: last day}}: a round deals up to 20 cards, the due ones first,
// then up to 12 new ones. "Knew it" moves a card up a box (back in 1, 2, 4, 8, 16 days); "Again" puts it in box 1 and
// once more at the end of the round (known then, it stays in box 1 and comes back tomorrow). Space or Enter turns the
// card, 1 or Left is Again, 2 or Right is Knew it; a turned card can be swiped. In Kids mode only cards with a picture
// are dealt, and none that kidsGentle (shared-nav.js) holds back.
(function () {
  'use strict';
  var KEY = 'epoch-cards', ROUND = 20, FRESH = 12, WAIT = [0, 1, 2, 4, 8, 16], LEARNED = 4;
  var app = document.getElementById('fc-app'), list = document.getElementById('fc-list');
  if (!app || !list) return;
  var decks = {}, cache = {};
  [].forEach.call(list.querySelectorAll('.fc-deck'), function (a) { decks[a.getAttribute('data-deck')] = { el: a, t: a.getAttribute('data-title') || a.querySelector('.fc-deck-t').textContent, v: a.getAttribute('data-v'), n: +a.getAttribute('data-n'), pics: +a.getAttribute('data-pics') }; });
  function today() { return Math.floor(Date.now() / 864e5); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function kids() { return document.documentElement.getAttribute('data-kids') === '1'; }
  function still() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  // the cards a reader is dealt: in Kids mode those with a picture that kidsGentle lets through
  function usable(cards) { return kids() ? cards.filter(function (c) { return c[3] && (typeof kidsGentle !== 'function' || kidsGentle(c[1], c[2])); }) : cards; }

  // ── the list of decks: learned and due counts from this browser ──
  function paintList() {
    var s = load(), t = today(), k = kids();
    Object.keys(decks).forEach(function (id) {
      var d = decks[id], st = (s[id] && s[id].c) || {}, seen = Object.keys(st), learned = 0, due = 0;
      seen.forEach(function (c) { if (st[c][0] >= LEARNED) learned++; if (st[c][1] <= t) due++; });
      d.el.querySelector('.fc-deck-s').textContent = learned || due ? (learned ? learned + ' learned' : '') + (learned && due ? ' · ' : '') + (due ? due + ' due' : '') : seen.length ? seen.length + ' seen' : '';
      d.el.parentNode.hidden = k && d.pics < 5;   // Kids mode: decks with pictures
      d.el.querySelector('.fc-deck-n').textContent = (k ? d.pics : d.n) + ' cards';
    });
    [].forEach.call(list.querySelectorAll('.fc-group'), function (g) { g.hidden = ![].some.call(g.querySelectorAll('.fc-decks > li'), function (li) { return !li.hidden; }); });
  }

  // ── a round ──
  var R = null;   // {id, deck, queue, i, turned, knew, again, seenAgain}
  function deal(id, deck, practise) {
    var s = load(), st = (s[id] && s[id].c) || {}, t = today(), cards = usable(deck.cards);
    var due = cards.filter(function (c) { return st[c[0]] && st[c[0]][1] <= t; }).sort(function (a, b) { return st[a[0]][0] - st[b[0]][0] || st[a[0]][1] - st[b[0]][1]; });
    var fresh = cards.filter(function (c) { return !st[c[0]]; });
    var q = due.slice(0, ROUND); q = q.concat(fresh.slice(0, Math.min(FRESH, ROUND - q.length)));
    if (!q.length && practise) q = cards.slice().sort(function (a, b) { return (st[a[0]] ? st[a[0]][1] : 0) - (st[b[0]] ? st[b[0]][1] : 0); }).slice(0, ROUND);
    for (var i = q.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = q[i]; q[i] = q[j]; q[j] = x; }
    return q;
  }
  function open(id) {
    var d = decks[id]; if (!d) return showList();
    list.hidden = true; app.hidden = false;
    app.innerHTML = '<p class="fc-loading">Opening the deck&hellip;</p>';
    var go = function (deck) { start(id, deck, false); };
    if (cache[id]) return go(cache[id]);
    fetch('/data/cards/' + id + '.json?v=' + d.v).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (deck) { cache[id] = deck; if (location.hash.slice(1) === id) go(deck); })
      .catch(function () { app.innerHTML = '<p class="fc-loading">The deck could not be loaded. <button type="button" class="fc-link" data-act="list">Back to the decks</button></p>'; });
  }
  function start(id, deck, practise) {
    var q = deal(id, deck, practise);
    R = { id: id, deck: deck, queue: q, i: 0, turned: false, knew: 0, again: 0, seenAgain: {} };
    if (!q.length) return rest();
    card();
    window.scrollTo({ top: app.getBoundingClientRect().top + window.pageYOffset - 90, behavior: still() ? 'auto' : 'smooth' });
  }
  function head() {
    var n = R.queue.length;
    return '<div class="fc-top"><button type="button" class="fc-link" data-act="list">&larr; All decks</button><span class="fc-title">' + esc(decks[R.id].t) + '</span>' +
      '<span class="fc-count">' + Math.min(R.i + 1, n) + ' / ' + n + '</span></div><div class="fc-bar" aria-hidden="true"><i style="width:' + (R.i / n * 100).toFixed(1) + '%"></i></div>';
  }
  function pic(src, cls) { return src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="" ' + (/\/logos\//.test(src) ? 'width="104" height="104"' : 'loading="eager"') + '>' : ''; }
  function card() {
    var c = R.queue[R.i], pf = R.deck.pf, big = pf === 1 && c[3];
    R.turned = false;
    app.innerHTML = head() +
      '<div class="fc-stage"><div class="fc-card' + (big ? ' fc-who' : '') + (c[1].length > 70 || c[1].split(' ').length > 6 ? ' fc-long' : '') + (c[2].length <= 14 ? ' fc-short' : '') + (/\/logos\//.test(c[3] || '') ? ' fc-emblem' : '') + '" id="fc-card">' +
      '<div class="fc-face fc-front">' + (pf && c[3] ? pic(c[3], 'fc-pic') : '') + '<p class="fc-ask">' + esc(R.deck.ask) + '</p>' + (pf === 1 && c[3] ? '' : '<p class="fc-f">' + esc(c[1]) + '</p>') + (c[5] ? '<p class="fc-h">' + esc(c[5]) + '</p>' : '') + '</div>' +
      '<div class="fc-face fc-back" aria-hidden="true">' + (c[3] && pf !== 2 ? pic(c[3], pf ? 'fc-pic fc-pic-sm' : 'fc-pic') : '') + (pf === 1 && c[3] ? '<p class="fc-f">' + esc(c[1]) + '</p>' : '<p class="fc-fs">' + esc(c[1]) + '</p>') +
      '<p class="fc-b">' + esc(c[2]) + '</p>' + (c[4] ? '<a class="fc-more" href="' + esc(c[4]) + '">Read more &rarr;</a>' : '') + '</div></div></div>' +
      '<p class="fc-sr" aria-live="polite"></p>' +
      '<div class="fc-actions"><button type="button" class="fc-turn" data-act="turn">Turn over <kbd>Space</kbd></button>' +
      '<button type="button" class="fc-again" data-act="again" hidden>Again <kbd>1</kbd></button><button type="button" class="fc-knew" data-act="knew" hidden>Knew it <kbd>2</kbd></button></div>';
    var cardEl = document.getElementById('fc-card');
    cardEl.addEventListener('click', function (ev) { if (!ev.target.closest('a') && !R.turned && !drag.moved) turn(); });
    swipe(cardEl);
    var b = app.querySelector('.fc-turn'); if (b) b.focus({ preventScroll: true });
  }
  function turn() {
    if (!R || R.turned) return; R.turned = true;
    var el = document.getElementById('fc-card'), c = R.queue[R.i];
    el.classList.add('is-turned'); el.querySelector('.fc-back').removeAttribute('aria-hidden'); el.querySelector('.fc-front').setAttribute('aria-hidden', 'true');
    app.querySelector('.fc-sr').textContent = c[1] + ': ' + c[2];
    app.querySelector('.fc-turn').hidden = true; app.querySelector('.fc-again').hidden = false; app.querySelector('.fc-knew').hidden = false;
    app.querySelector('.fc-knew').focus({ preventScroll: true });
  }
  function answer(knew) {
    if (!R || !R.turned) return;
    var c = R.queue[R.i], s = load(), d = s[R.id] || (s[R.id] = { c: {} }), t = today(), cur = d.c[c[0]];
    if (knew && R.seenAgain[c[0]]) { d.c[c[0]] = [1, t + WAIT[1]]; R.knew++; }   // missed earlier in this round: box 1, back tomorrow
    else if (knew) { var box = Math.min(5, (cur ? cur[0] : 0) + 1); d.c[c[0]] = [box, t + WAIT[box]]; R.knew++; }
    else { d.c[c[0]] = [1, t]; R.again++; if (!R.seenAgain[c[0]]) { R.seenAgain[c[0]] = 1; R.queue.push(c); } }
    d.d = t; save(s);
    var stage = app.querySelector('.fc-stage');
    if (stage && !still()) { stage.classList.add(knew ? 'fc-out-r' : 'fc-out-l'); setTimeout(next, 220); } else next();
  }
  function next() { R.i++; if (R.i < R.queue.length) card(); else done(); }
  function stats() {
    var st = (load()[R.id] || {}).c || {}, cards = usable(R.deck.cards), t = today(), learned = 0, due = 0, soon = Infinity, fresh = 0;
    cards.forEach(function (c) { var x = st[c[0]]; if (!x) { fresh++; return; } if (x[0] >= LEARNED) learned++; if (x[1] <= t) due++; else soon = Math.min(soon, x[1]); });
    return { n: cards.length, learned: learned, due: due, fresh: fresh, soon: soon };
  }
  function when(day) { var d = day - today(); return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'; }
  function done() {
    var S = stats(), firsts = R.queue.length - R.again;
    app.innerHTML = head() + '<div class="fc-end"><p class="fc-end-n"><span>' + R.knew + '</span> known' + (R.again ? ' · ' + R.again + ' to see again' : '') + '</p>' +
      '<p class="fc-end-p">' + S.learned + ' of ' + S.n + ' cards learned in this deck' + (S.fresh ? ', ' + S.fresh + ' not seen yet' : '') + '.' +
      (S.due ? ' ' + S.due + ' due now.' : S.soon < Infinity ? ' The next cards are due ' + when(S.soon) + '.' : '') + '</p>' +
      '<div class="fc-bar fc-bar-deck" aria-hidden="true"><i style="width:' + (S.learned / Math.max(1, S.n) * 100).toFixed(1) + '%"></i></div>' +
      '<p class="fc-end-a">' + (S.due || S.fresh ? '<button type="button" class="fc-knew" data-act="again-round">Another round</button>' : '<button type="button" class="fc-knew" data-act="practise">Practise anyway</button>') +
      '<button type="button" class="fc-link" data-act="list">All decks</button></p></div>';
    var b = app.querySelector('.fc-end-a button'); if (b) b.focus({ preventScroll: true });
    try { document.dispatchEvent(new CustomEvent('epoch:cards', { detail: { deck: R.id, knew: R.knew, again: R.again, rounds: firsts } })); } catch (e) {}
  }
  function rest() {
    var S = stats();
    app.innerHTML = head().replace(/<span class="fc-count">[^<]*<\/span>/, '') + '<div class="fc-end"><p class="fc-end-n">Nothing due in this deck</p><p class="fc-end-p">' + S.learned + ' of ' + S.n + ' cards learned.' +
      (S.soon < Infinity ? ' The next cards are due ' + when(S.soon) + '.' : '') + '</p><p class="fc-end-a"><button type="button" class="fc-knew" data-act="practise">Practise anyway</button><button type="button" class="fc-link" data-act="list">All decks</button></p></div>';
  }
  function showList() {
    R = null; app.hidden = true; app.innerHTML = ''; list.hidden = false; paintList();
  }

  // ── swipe a turned card: right knew it, left again ──
  var drag = { on: false, moved: false };
  function swipe(el) {   // the stage moves, so the card keeps its turn
    var st = el.parentNode;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' || !R.turned) return; drag = { on: true, moved: false, x: e.clientX, y: e.clientY, id: e.pointerId }; });
    el.addEventListener('pointermove', function (e) {
      if (!drag.on || e.pointerId !== drag.id) return; var dx = e.clientX - drag.x;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; st.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 30) + 'deg)'; }
    });
    function end(e) {
      if (!drag.on) return; drag.on = false; var dx = e.clientX - drag.x; st.style.transform = '';
      if (drag.moved && Math.abs(dx) > 70) answer(dx > 0);
      setTimeout(function () { drag.moved = false; }, 0);
    }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', function () { drag.on = false; st.style.transform = ''; });
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return; var a = b.getAttribute('data-act');
    if (a === 'turn') turn(); else if (a === 'knew') answer(true); else if (a === 'again') answer(false);
    else if (a === 'again-round') start(R.id, R.deck, false); else if (a === 'practise') start(R.id, R.deck, true);
    else if (a === 'list') { history.pushState(null, '', location.pathname + location.search); showList(); window.scrollTo(0, 0); }
  });
  document.addEventListener('keydown', function (e) {
    if (!R || app.hidden || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target || {}).tagName || '')) return;
    if (!R.turned && (e.key === ' ' || e.key === 'Enter') && R.i < R.queue.length && !(e.target.closest && e.target.closest('a, [data-act]:not([data-act="turn"])'))) { e.preventDefault(); turn(); }
    else if (R.turned && (e.key === '1' || e.key === 'ArrowLeft')) { e.preventDefault(); answer(false); }
    else if (R.turned && (e.key === '2' || e.key === 'ArrowRight')) { e.preventDefault(); answer(true); }
  });
  function route() { var id = decodeURIComponent(location.hash.slice(1)); if (id && decks[id]) open(id); else showList(); }
  window.addEventListener('hashchange', route);
  document.addEventListener('epoch:kids', function () { if (R) start(R.id, R.deck, false); else paintList(); });
  route();
  window.epochCards = { decks: decks, state: function () { return R; }, load: load };
})();
