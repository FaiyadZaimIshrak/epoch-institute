// Test yourself: the questions a page carries (script.ty-data, written by generator.html for the profiles and by
// scripts/build-pages.ps1 for the century and path pages), one at a time, each answer explained. A page's results are
// kept in localStorage epoch-tests {path: {b: best right, t: questions, n: tries, d: last UTC day}}; a test counts as
// passed at 80% (My Passport counts them). Loaded when the section nears the screen: TestYourself.mount(el).
(function () {
  'use strict';
  function load() { try { return JSON.parse(localStorage.getItem('epoch-tests') || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem('epoch-tests', JSON.stringify(s)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(q) {   // a fresh order of the options for another try; the right answer's index moves with them
    var idx = q.o.map(function (x, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    return { p: q.p, q: q.q, w: q.w, l: q.l, o: idx.map(function (i) { return q.o[i]; }), a: idx.indexOf(q.a) };
  }
  var MSG = [[1, 'Perfect: you know this page well.'], [0.8, 'Very good.'], [0.6, 'Good: a second read would make it perfect.'], [0, 'Read the page again, then try once more.']];
  function mount(el) {
    if (!el || el.getAttribute('data-ty-on')) return; el.setAttribute('data-ty-on', '1');
    var src = el.parentNode.querySelector('script.ty-data'), base;
    try { base = JSON.parse(src.textContent); } catch (e) { return; }
    if (!base || !base.length) return;
    var key = location.pathname.replace(/\/$/, '') || '/', qs = base, i = 0, right = 0, done = false;
    function dots() {
      return '<ol class="ty-dots" aria-hidden="true">' + qs.map(function (q, k) { return '<li class="' + (k < i ? (q.ok ? 'ok' : 'no') : k === i && !done ? 'now' : '') + '"></li>'; }).join('') + '</ol>';
    }
    function ask() {
      var q = qs[i];
      el.innerHTML = dots() + '<div class="ty-card"><p class="ty-count">Question ' + (i + 1) + ' of ' + qs.length + '</p>' +
        '<p class="ty-prompt">' + esc(q.p) + '</p>' + (q.q ? '<p class="ty-q">' + esc(q.q) + '</p>' : '') +
        '<div class="ty-opts' + (q.o.some(function (o) { return o.length > 40; }) ? ' ty-long' : '') + '" role="group" aria-label="Answers">' +
        q.o.map(function (o, k) { return '<button type="button" class="ty-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div>' +
        '<p class="ty-why" aria-live="polite"></p>' +
        '<button type="button" class="ty-next" hidden>' + (i + 1 < qs.length ? 'Next question &rarr;' : 'See your score &rarr;') + '</button></div>';
    }
    function answer(k) {
      var q = qs[i]; if (q.done) return; q.done = true; q.ok = k === q.a; if (q.ok) right++;
      [].forEach.call(el.querySelectorAll('.ty-opt'), function (b, n) {
        b.disabled = true; if (n === q.a) b.classList.add('ty-right'); else if (n === k) b.classList.add('ty-wrong');
        b.setAttribute('aria-pressed', n === k ? 'true' : 'false');
      });
      var why = el.querySelector('.ty-why');
      why.innerHTML = '<strong>' + (q.ok ? 'Right.' : 'Not quite.') + '</strong> ' + esc(q.w) + (q.l ? ' <a href="' + esc(q.l) + '">Read more &rarr;</a>' : '');
      var nx = el.querySelector('.ty-next'); nx.hidden = false; nx.focus({ preventScroll: true });
      el.querySelector('.ty-dots').outerHTML = dots();
    }
    function finish() {
      done = true;
      var s = load(), r = s[key] || { b: 0, t: qs.length, n: 0 }, day = new Date().toISOString().slice(0, 10);
      r.n = (r.n || 0) + 1; r.t = qs.length; r.b = Math.max(r.b || 0, right); r.d = day; s[key] = r; save(s);
      var share = right / qs.length, msg = '';
      for (var m = 0; m < MSG.length; m++) if (share >= MSG[m][0]) { msg = MSG[m][1]; break; }
      el.innerHTML = dots() + '<div class="ty-card ty-end"><p class="ty-score"><span>' + right + '</span> of ' + qs.length + '</p>' +
        '<p class="ty-msg">' + msg + '</p>' + (r.n > 1 ? '<p class="ty-best">Your best here: ' + r.b + ' of ' + r.t + ' (' + r.n + ' tries)</p>' : '') +
        '<p class="ty-actions"><button type="button" class="ty-again">Try again</button> <a href="/passport">My Passport &rarr;</a></p></div>';
      try { document.dispatchEvent(new CustomEvent('epoch:test', { detail: { path: key, right: right, total: qs.length } })); } catch (e) {}
    }
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || !el.contains(b)) return;
      if (b.classList.contains('ty-opt')) answer(+b.getAttribute('data-k'));
      else if (b.classList.contains('ty-next')) { i++; if (i < qs.length) { ask(); var f = el.querySelector('.ty-opt'); if (f) f.focus({ preventScroll: true }); } else finish(); }
      else if (b.classList.contains('ty-again')) { qs = base.map(shuffle); i = 0; right = 0; done = false; ask(); }
    });
    ask();
    // Print as a worksheet (8 Nov 2026): every question with its options lettered, a line for the name, and the answer key
    // with the reasons on a page of its own. The sheet is built on the press and printed alone (html.ty-printing hides
    // the rest of the page); the options keep the order the data gives them.
    el.insertAdjacentHTML('afterend', '<p class="ty-print-row"><button type="button" class="ty-print">Print as a worksheet</button></p>');
    el.parentNode.querySelector('.ty-print').addEventListener('click', function () { printSheet(base); });
  }
  var L = 'ABCDEFGH';
  function printSheet(qs) {
    var old = document.querySelector('body > .ty-sheet'); if (old) old.remove();
    var h1 = document.querySelector('h1'), title = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : document.title;
    var url = location.origin + location.pathname;
    var sh = document.createElement('div'); sh.className = 'ty-sheet'; sh.setAttribute('aria-hidden', 'true');
    sh.innerHTML = '<p class="ty-sheet-kicker">The Epoch Institute &middot; Test yourself</p><h1 class="ty-sheet-title">' + esc(title) + '</h1>' +
      '<p class="ty-sheet-who"><span>Name</span><span>Date</span></p>' +
      '<p class="ty-sheet-how">Circle the letter of the right answer. The answers are on the last page.</p>' +
      '<ol class="ty-sheet-qs">' + qs.map(function (q) {
        return '<li><p class="ty-sheet-p">' + esc(q.p) + (q.q ? ' <span>' + esc(q.q) + '</span>' : '') + '</p><ol class="ty-sheet-opts">' +
          q.o.map(function (o, k) { return '<li><b>' + L[k] + '</b> ' + esc(o) + '</li>'; }).join('') + '</ol></li>';
      }).join('') + '</ol>' +
      '<section class="ty-sheet-key"><h2>Answers</h2><ol>' + qs.map(function (q) { return '<li><b>' + L[q.a] + '</b> ' + esc(q.w) + '</li>'; }).join('') + '</ol>' +
      '<p class="ty-sheet-src">From ' + esc(url) + ', where every answer is explained on the page.</p></section>';
    document.body.appendChild(sh);
    var root = document.documentElement; root.classList.add('ty-printing');
    var done = function () { root.classList.remove('ty-printing'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }
  window.TestYourself = { mount: mount, sheet: printSheet };
})();
