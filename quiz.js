// quiz.js - the history quiz: today's puzzle (home page and /quiz) and practice rounds (/quiz).
// Uses shared-data.js (EMPIRES, PROFILE_KINDS, profileKind, profileUrl), shared-nav.js (escHtml, searchFold,
// SEARCH_INDEX_SRC) and home-data.js (HOME_QUIZ, HOME_PICS). Four clues; each wrong guess reveals the next one.
// Today's puzzle rotates profile, person, event, place, profile, idea, work; ?quizday=N previews another day.
var EpochQuiz = (function () {
  'use strict';
  var DAY = Math.floor(Date.now() / 86400000);
  var ROTA = ['profile', 'person', 'event', 'place', 'profile', 'idea', 'work'];
  var CATS = [['profile', 'Profiles'], ['person', 'People'], ['event', 'Events'], ['place', 'Places'], ['idea', 'Ideas'], ['work', 'Works']];
  var TITLES = { person: 'Who am I?', event: 'Which event is this?', place: 'Which place is this?', idea: 'Which idea is this?', work: 'Which work is this?' };
  function ready() { return typeof HOME_QUIZ !== 'undefined' && HOME_QUIZ.entries && typeof EMPIRES !== 'undefined'; }
  function fmtYear(y) { y = Math.round(y); return y < 0 ? Math.abs(y) + ' BCE' : y + ' CE'; }
  function span(e) { return [e.points[0][0], e.points[e.points.length - 1][0]]; }
  function pool(cat) { return cat === 'profile' ? EMPIRES.filter(function (e) { return HOME_QUIZ.profiles[e.name]; }) : (HOME_QUIZ.entries[cat] || []); }
  function make(cat, n) {
    var list = pool(cat); if (!list.length) return null;
    var i = ((n % list.length) + list.length) % list.length;
    if (cat === 'profile') {
      var ans = list[i], q = HOME_QUIZ.profiles[ans.name], s = span(ans);
      var kindSingle = PROFILE_KINDS[profileKind(ans)].single.toLowerCase();
      return { cat: cat, key: 'p:' + ans.name, name: ans.name, aka: [], href: profileUrl(ans), noun: 'profile', title: 'Guess the ' + kindSingle,
        img: (typeof HOME_PICS !== 'undefined' && HOME_PICS[ans.name]) ? HOME_PICS[ans.name].img : '', names: EMPIRES.map(function (e) { return e.name; }),
        imgTop: (typeof HOME_PICS !== 'undefined' && HOME_PICS[ans.name]) ? HOME_PICS[ans.name].top : null,
        clues: [
          'Region: ' + ans.region + '. It lasted about ' + Math.abs(Math.round(s[1] - s[0])) + ' years, from ' + fmtYear(s[0]) + ' to ' + fmtYear(s[1]) + '.',
          q[2] ? 'Did you know? ' + q[2] : null,
          q[1] ? 'Its founder: ' + q[1] + '.' : null,
          q[0] ? 'Its capital: ' + q[0] + '.' : null
        ].filter(Boolean) };
    }
    var en = list[i];
    return { cat: cat, key: 'e:' + en.slug, name: en.name, aka: en.aka || [], href: '/encyclopedia/' + en.slug, img: en.img, title: TITLES[cat], noun: cat, names: null, clues: en.clues };
  }
  function daily(qday) {
    if (!ready()) return null;
    var cat = ROTA[qday % ROTA.length]; if (!pool(cat).length) cat = 'profile';
    var p = make(cat, qday * 7919 + 13); p.day = qday; p.num = qday - 20740; return p;
  }
  function random(cat, seen) {
    if (!ready() || !pool(cat).length) return null;
    var n = pool(cat).length, p = null;
    for (var t = 0; t < 50; t++) { p = make(cat, Math.floor(Math.random() * n)); if (!seen || !seen[p.key]) break; }
    return p;
  }
  function streak() { try { return JSON.parse(localStorage.getItem('epoch-quiz-streak') || '{"n":0,"last":0}'); } catch (e) { return { n: 0, last: 0 }; } }
  // opts: daily (keep progress and streak in this browser), titleEl, titlePrefix, streakEl, moreHref, onDone(won), onNext(), focus
  var uid = 0;
  function mount(root, puzzle, opts) {
    opts = opts || {}; if (!root || !puzzle) return;
    var id = 'quiz-n' + (++uid);
    root.innerHTML = '<ol class="quiz-clues"></ol><form class="quiz-form" autocomplete="off"><input list="' + id + '" aria-label="Your guess"><datalist id="' + id + '"></datalist><button type="submit">Guess</button></form>' +
      '<p class="quiz-status" aria-live="polite"></p><div class="quiz-result" hidden></div>';
    var cluesEl = root.querySelector('.quiz-clues'), form = root.querySelector('.quiz-form'), input = form.querySelector('input'), datalist = form.querySelector('datalist');
    var status = root.querySelector('.quiz-status'), res = root.querySelector('.quiz-result'), clues = puzzle.clues;
    if (opts.titleEl) opts.titleEl.textContent = (opts.titlePrefix || '') + puzzle.title;
    input.placeholder = puzzle.cat === 'profile' ? 'Type a profile, e.g. Roman Empire' : 'Type the name of the ' + puzzle.noun;
    function fillNames(names) { puzzle.names = names; datalist.innerHTML = names.map(function (n) { return '<option value="' + escHtml(n) + '">'; }).join(''); }
    var loading = false;
    function loadNames() {   // encyclopedia answers: names of that type from the site search index, loaded on demand
      if (puzzle.names || loading) return;
      var go = function () { if (typeof SEARCH_INDEX !== 'undefined') fillNames(SEARCH_INDEX.filter(function (r) { return r[2] === puzzle.cat; }).map(function (r) { return r[1]; })); };
      if (typeof SEARCH_INDEX !== 'undefined') return go();
      loading = true; var sc = document.createElement('script'); sc.src = SEARCH_INDEX_SRC; sc.onload = go; document.head.appendChild(sc);
    }
    // the answer list (from the 800 KB search index) loads when a guess begins (a tap or a key in the field, not the
    // page's own focus), not on every visit to the page
    if (puzzle.names) fillNames(puzzle.names); else { input.addEventListener('pointerdown', loadNames); input.addEventListener('keydown', loadNames); }
    var st = { day: puzzle.day, guesses: [], done: false, won: false };
    if (opts.daily) { try { var saved = JSON.parse(localStorage.getItem('epoch-quiz') || 'null'); if (saved && saved.day === puzzle.day) st = saved; } catch (e) {} }
    function save() { if (opts.daily) { try { localStorage.setItem('epoch-quiz', JSON.stringify(st)); } catch (e) {} } }
    function isAnswer(g) { var f = searchFold(g).trim(); return [puzzle.name].concat(puzzle.aka).some(function (n) { return searchFold(n).trim() === f; }); }
    function render() {
      var shown = Math.min(clues.length, st.done ? clues.length : st.guesses.length + 1);
      cluesEl.innerHTML = clues.slice(0, shown).map(function (c, i) { return '<li><span class="quiz-n">Clue ' + (i + 1) + '</span>' + escHtml(c) + '</li>'; }).join('');
      var left = clues.length - st.guesses.length;
      status.textContent = st.done ? '' : (st.guesses.length ? 'Not ' + st.guesses[st.guesses.length - 1] + '. ' : '') + left + (left === 1 ? ' guess' : ' guesses') + ' left.';
      form.hidden = st.done;
      if (opts.streakEl && opts.daily) { var sk = streak(); opts.streakEl.textContent = sk.n > 1 ? 'Streak: ' + sk.n + ' days' : ''; }
      if (!st.done) { res.hidden = true; return; }
      res.hidden = false;
      var actions = opts.daily
        ? '<button type="button" class="quiz-share">Share result</button>' + (opts.moreHref ? '<a class="quiz-more" href="' + opts.moreHref + '">More puzzles &rarr;</a>' : '<span class="quiz-next">A new puzzle tomorrow: profiles, people, events, places, ideas and works in turn.</span>')
        : '<button type="button" class="quiz-share quiz-again">Next puzzle &rarr;</button>';
      res.innerHTML = (puzzle.img ? '<img class="quiz-img" src="' + escHtml(puzzle.img) + '" alt=""' + (puzzle.imgTop != null ? ' style="object-position:center ' + puzzle.imgTop + '%"' : '') + '>' : '') +
        '<div class="quiz-result-body"><p class="quiz-verdict">' + (st.won ? 'Correct — solved with ' + st.guesses.length + ' of ' + clues.length + ' clues.' : 'The answer was:') + '</p>' +
        '<a class="quiz-answer" href="' + escHtml(puzzle.href) + '">' + escHtml(puzzle.name) + ' &rarr;</a><div class="quiz-result-actions">' + actions + '</div>' +
        (opts.daily && typeof newsletterPrompt === 'function' ? newsletterPrompt('daily-quiz') : '') + '</div>';
      var btn = res.querySelector('.quiz-share');
      if (opts.daily) {
        // the share sheet on phones, else a panel (sharePoster, shared-nav.js), with a poster of the clues used: never
        // the answer, so it spoils no one's puzzle
        var t = 'The Epoch Institute daily quiz #' + puzzle.num + ' (' + puzzle.noun + '): ' + (st.won ? 'solved with ' + st.guesses.length + '/' + clues.length + ' clues' : 'stumped today') + '.';
        // (drawn when the button is first pointed at or touched: a returning reader's result shows on every visit)
        var poster = null, make = function () {
          if (!poster && typeof scoreCard === 'function') poster = scoreCard({ title: 'Daily quiz #' + puzzle.num + ' · ' + puzzle.title, score: (st.won ? st.guesses.length : 'X') + '/' + clues.length,
            unit: st.won ? (st.guesses.length === 1 ? 'solved with the first clue' : 'clues to solve today’s puzzle') : 'stumped today',
            dots: clues.map(function (c, k) { return k < st.guesses.length ? (st.won && k === st.guesses.length - 1 ? 'good' : 'bad') : 'none'; }),
            note: new Date(puzzle.day * 864e5).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
            cta: 'Can you solve it?', url: 'the-epoch-institute.org/quiz', kids: document.documentElement.getAttribute('data-kids') === '1' });
        };
        btn.addEventListener('pointerdown', make); btn.addEventListener('mouseenter', make); btn.addEventListener('focus', make);
        btn.onclick = function () {
          make();
          if (typeof sharePoster === 'function') sharePoster({ text: t, url: 'https://the-epoch-institute.org/quiz', title: 'The Epoch Institute daily quiz #' + puzzle.num, heading: 'Share your result', image: poster, file: 'epoch-quiz-' + puzzle.num + '.jpg', btn: this });
          else shareThis(t, 'https://the-epoch-institute.org/quiz', this);
        };
      }
      else btn.onclick = function () { if (opts.onNext) opts.onNext(); };
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var g = input.value.trim(); if (!g || st.done) return;
      var right = isAnswer(g);
      if (!right && !puzzle.names) { status.textContent = 'Loading suggestions… try again in a moment.'; loadNames(); return; }
      if (!right && !puzzle.names.some(function (n) { return searchFold(n) === searchFold(g); })) { status.textContent = 'Pick a name from the suggestions.'; return; }
      st.guesses.push(right ? puzzle.name : g); input.value = '';
      if (right) { st.done = true; st.won = true; } else if (st.guesses.length >= clues.length) st.done = true;
      if (st.done && opts.daily) {
        var sk = streak(); sk.n = st.won ? (sk.last === puzzle.day - 1 ? sk.n + 1 : 1) : 0; sk.last = puzzle.day; sk.b = Math.max(sk.b || 0, sk.n);   // b: the best run (the passport's stamps)
        try { localStorage.setItem('epoch-quiz-streak', JSON.stringify(sk)); } catch (e2) {}
      }
      save(); render();
      if (st.done && opts.onDone) opts.onDone(st.won);
      if (st.done) { var nb = res.querySelector('.quiz-again'); if (nb) nb.focus(); } else input.focus();
    });
    render();
    if (opts.focus && !st.done) input.focus({ preventScroll: true });
  }
  function today() { var qd = parseInt(new URLSearchParams(location.search).get('quizday'), 10); return isNaN(qd) ? DAY : qd; }
  return { today: today, daily: daily, random: random, mount: mount, cats: CATS, has: function (cat) { return ready() && pool(cat).length > 0; } };
})();
