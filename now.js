// now.js - History Now (/now and the home page's Now card; Nov 2026). Fills every [data-now] list on the page:
//   news  the headlines of /feeds/news.json (written twice a day by .github/workflows/news.yml: headline, link,
//         source, day and the Institute's page on the subject; never in Kids mode; none when the file is over ten
//         days old), ann the round anniversaries of the next thirty days and new the latest release notes, both from
//         NOW_SRC (data/now.json, scripts/tools/make-now.js). data-max is how many a list shows.
// The home card's tabs ([data-now-tab]) show one list at a time; its lists keep a fixed height (shared.css .now-card),
// so nothing moves when they fill. Needs shared-nav.js (escHtml, kidsGentle). window.epochNow for tests.
(function () {
  'use strict';
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var esc = window.escHtml || function (s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); };
  var kids = function () { return document.documentElement.getAttribute('data-kids') === '1'; };
  var gentle = function (t) { return typeof kidsGentle !== 'function' || kidsGentle(t, ''); };
  var today = function () { var q = /[?&]nowday=(\d{4}-\d\d-\d\d)/.exec(location.search); return q ? q[1] : new Date().toISOString().slice(0, 10); };   // ?nowday= previews another day
  var day = function (iso, short) { var p = iso.split('-'); return +p[2] + ' ' + (short ? MON[+p[1] - 1].slice(0, 3) : MON[+p[1] - 1]); };
  var get = function (u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); };
  var S = { news: null, data: null, ready: false };

  function news(max) {
    var d = S.news, t = Date.parse(today()), out = [];
    if (!d || !d.items || !(Date.parse(d.t) > t - 10 * 864e5)) return out;
    d.items.forEach(function (r) {
      if (out.length >= max || !r || !/^https:\/\/[^\s"<>]+$/.test(r[1]) || !/^\/[a-z]/.test(r[4]) || !(Date.parse(r[3]) > t - 22 * 864e5)) return;
      out.push('<li class="now-it"><a class="now-h" href="' + esc(r[1]) + '" rel="noopener external">' + esc(r[0]) + '</a><span class="now-m">' + esc(r[2]) + ' &middot; ' + day(r[3], true) + '</span>' +
        '<span class="now-m now-bg">Background: <a href="' + esc(r[4]) + '">' + esc(r[5]) + '</a></span></li>');
    });
    return out;
  }
  function anniversaries(max) {
    var t = today(), end = new Date(Date.parse(t) + 30 * 864e5).toISOString().slice(0, 10), k = kids();
    var a = ((S.data && S.data.a) || []).filter(function (r) { return r[0] >= t && r[0] <= end && (!k || (r[5] !== 'd' && gentle(r[3]))); });
    if (a.length > max) {   // the roundest first, then in date order again
      a = a.map(function (r, i) { return [r, i]; }).sort(function (x, y) { return y[0][6] - x[0][6] || x[1] - y[1]; }).slice(0, max).sort(function (x, y) { return x[1] - y[1]; }).map(function (x) { return x[0]; });
    }
    return a.map(function (r) {
      var what = r[5] === 'b' ? 'Born ' + esc(r[2]) : r[5] === 'd' ? 'Died ' + esc(r[2]) : esc(r[2]);
      return '<li class="now-it now-an"><span class="now-n"><b>' + r[1].toLocaleString('en-GB') + '</b> years</span><span class="now-b"><a class="now-h" href="' + esc(r[4]) + '">' + esc(r[3]) + '</a>' +
        '<span class="now-m">' + (r[0] === t ? 'Today' : day(r[0])) + ' &middot; ' + what + '</span></span></li>';
    });
  }
  function fresh(max) {
    return ((S.data && S.data.n) || []).slice(0, max).map(function (r) {
      return '<li class="now-it"><a class="now-h" href="' + esc(r[2]) + '">' + esc(r[1]) + '</a><span class="now-m">' + day(r[0]) + ' ' + r[0].slice(0, 4) + '</span></li>';
    });
  }
  var EMPTY = { news: 'No headlines just now. The <a href="/now#anniversaries">coming anniversaries</a> are always there.', ann: 'No round anniversaries in the next thirty days. <a href="/today-in-history/">Today in History</a> has every day.', 'new': 'See <a href="/new">what is new</a>.' };
  function draw() {
    [].forEach.call(document.querySelectorAll('[data-now]'), function (el) {
      var kind = el.getAttribute('data-now'), max = +el.getAttribute('data-max') || 6;
      var rows = kind === 'news' ? (kids() ? [] : news(max)) : kind === 'ann' ? anniversaries(max) : fresh(max);
      el.innerHTML = rows.length ? rows.join('') : '<li class="now-wait">' + EMPTY[kind] + '</li>';
      el.setAttribute('data-n', rows.length);
    });
    // the card: without headlines (or in Kids mode) it opens on the anniversaries
    var card = document.querySelector('.now-card');
    if (card && !card.getAttribute('data-chosen')) { var n = card.querySelector('[data-now="news"]'); show(card, n && +n.getAttribute('data-n') && !kids() ? 'news' : 'ann'); }
  }
  function show(card, kind) {
    [].forEach.call(card.querySelectorAll('[data-now-tab]'), function (b) { var on = b.getAttribute('data-now-tab') === kind; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    [].forEach.call(card.querySelectorAll('[data-now]'), function (l) { (l.parentNode.getAttribute('role') === 'tabpanel' ? l.parentNode : l).hidden = l.getAttribute('data-now') !== kind; });
  }
  function start() {
    var card = document.querySelector('.now-card');
    if (card) {
      card.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-now-tab]'); if (b) { card.setAttribute('data-chosen', '1'); show(card, b.getAttribute('data-now-tab')); } });
      card.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; var b = e.target.closest && e.target.closest('[data-now-tab]'); if (!b) return;
        var tabs = [].filter.call(card.querySelectorAll('[data-now-tab]'), function (x) { return x.offsetParent !== null; }), i = tabs.indexOf(b), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        if (n) { e.preventDefault(); card.setAttribute('data-chosen', '1'); show(card, n.getAttribute('data-now-tab')); n.focus(); }
      });
    }
    var src = window.NOW_SRC || '/data/now.json';
    Promise.all([kids() ? null : get('/feeds/news.json'), get(src)]).then(function (r) { S.news = r[0]; S.data = r[1]; S.ready = true; draw(); });
    document.addEventListener('epoch:kids', function () {   // Kids mode switched on this page
      var c = document.querySelector('.now-card'); if (c) c.removeAttribute('data-chosen');
      if (!kids() && !S.news) get('/feeds/news.json').then(function (d) { S.news = d; draw(); }); else draw();
    });
  }
  window.epochNow = { state: S, news: news, anniversaries: anniversaries, fresh: fresh, draw: draw, today: today };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
