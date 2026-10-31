// Social ladders (/societies/<slug> and /societies/): the "To scale" switch, Born into history (a rank drawn at random,
// weighted by the shares of the population each rank held), Compare (two ladders side by side, ranks lined up by
// band) and the Kids-mode "Read the whole story". The ladders' data: the page's own #soc-data, or
// data/societies/<slug>.json (written by scripts/build-pages.ps1, its version in #soc-index).
(function () {
  'use strict';
  var BANDS = [['ruler', 'Ruler'], ['nobility', 'Nobility and officials'], ['religious', 'Religious and learned'], ['specialists', 'Soldiers, merchants and craftsmen'],
    ['commoners', 'Free commoners'], ['dependent', 'Serfs and dependants'], ['outcast', 'Outcast groups'], ['enslaved', 'Enslaved']];
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function kids() { return document.documentElement.getAttribute('data-kids') === '1'; }
  function get(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var INDEX = [], CACHE = {};
  function vOf(slug) { for (var i = 0; i < INDEX.length; i++) if (INDEX[i][0] === slug) return INDEX[i][3]; return ''; }
  function load(slug) {
    if (CACHE[slug]) return Promise.resolve(CACHE[slug]);
    return fetch('/data/societies/' + encodeURIComponent(slug) + '.json?v=' + vOf(slug)).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { CACHE[slug] = d; return d; });
  }
  // "about 85 in every 100 people", "about 1 in 670 people"; an estimated share says so
  function odds(w, est) {
    var s;
    if (w >= 1) s = 'about ' + Math.round(w) + ' in every 100 people';
    else { var n = 100 / w, p = Math.pow(10, Math.max(0, Math.floor(Math.log10(n)) - 1)); s = 'about 1 in ' + (Math.round(n / p) * p).toLocaleString('en-GB') + ' people'; }
    return est ? s + ' (an estimate)' : s;
  }
  // a rank's name: its own word first, the English name in brackets (t.loc; t.one when they are the same word)
  function title(t) { return t.loc ? (t.one ? t.loc : t.loc + ' (' + t.name + ')') : t.name; }
  // a hyphenated word stays on one line ("al-dhimma", "governor-general"), as on the ladder pages
  function nw(h) { return h.replace(/[^\s<>()]*\w-\w[^\s<>()]*/g, '<span class="soc-nw">$&</span>'); }
  function titleHtml(t) { return t.loc && !t.one ? '<span class="soc-loc">' + nw(esc(t.loc)) + '</span> <span class="soc-en">(' + nw(esc(t.name)) + ')</span>' : '<span class="soc-loc">' + nw(esc(t.loc || t.name)) + '</span>'; }
  function lowerFirst(s) { s = String(s).replace(/^The\s+/, ''); return /^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function inline(t) { return t.loc && !t.one ? t.loc + ' (' + lowerFirst(t.name) + ')' : lowerFirst(t.name); }   // "the pipiltin (nobles)"
  function bigNum(n) {
    if (n >= 1e6) return (Math.round(n / 1e5) / 10).toLocaleString('en-GB') + ' million';
    if (n >= 1e3) return Math.round(n).toLocaleString('en-GB');
    return String(Math.round(n));
  }

  // ── the ladder: by rank (a pyramid) or to scale (bars as wide as each rank's share) ──
  $$('.soc-scale').forEach(function (g) {
    var pyr = $('.soc-pyr');
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.soc-scale-btn'); if (!b || !pyr) return;
      pyr.setAttribute('data-scale', b.getAttribute('data-scale'));
      $$('.soc-scale-btn', g).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    });
  });
  // Kids mode: the short lines first, the whole story when asked
  $$('.soc-kd-open').forEach(function (b) { b.addEventListener('click', function () { document.documentElement.classList.add('kd-open'); }); });

  // ── Born into history ──
  function draw(d) {
    var pool = d.tiers.filter(function (t) { return t.w != null && t.w > 0; }), total = 0;
    pool.forEach(function (t) { total += t.w; });
    var r = Math.random() * total;
    for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  // a ladder whose only counted rank is "the rest" always gives the same life: then the next draw is in another society
  // (on the ladder's own page, which has no index of the others, a link to the index's draw)
  function againHtml(d, here) {
    if (d.tiers.filter(function (x) { return x.w > 0; }).length > 1) return '<button type="button" class="soc-again">Draw again</button>';
    return here ? '<a class="soc-again soc-again-go" href="/societies/?born=1#born">Be born somewhere else</a>' : '<button type="button" class="soc-again" data-other="1">Be born somewhere else</button>';
  }
  function lifeHtml(d, t, here) {
    var ruler = d.tiers.filter(function (x) { return x.band === 'ruler' && x.w === 0 && x.lbl === 'One ruler'; })[0];
    var pop = d.pop ? (d.pop[0] + d.pop[1]) / 2 : 0, rank = (here ? '' : '/societies/' + d.slug) + '#rank-' + t.n;
    var est = d.tiers.filter(function (x) { return x.est; }).length;
    var ppl = (t.people || []).slice(0, 3).map(function (p) { return '<a class="tih-tag enc-link" href="/encyclopedia/' + esc(p[0]) + '">' + esc(p[1]) + '</a>'; }).join('');
    return '<div class="soc-life">' + (t.pic ? '<img class="soc-life-pic" src="' + esc(t.pic) + '" alt="" width="88" height="88">' : '') +
      '<div class="soc-life-b"><p class="soc-life-k">You were born in ' + esc(d['in']) + ', around ' + esc(d.yl) + '</p>' +
      '<h3 class="soc-life-t">' + titleHtml(t) + '</h3>' + (t.term ? '<p class="soc-term">' + esc(t.term) + '</p>' : '') +
      '<p class="soc-life-odds">Like ' + esc(odds(t.w, t.est)) + '.</p>' +
      '<p class="soc-life-you">' + esc(kids() ? t.kid : t.you) + '</p>' +
      (kids() ? '' : '<p class="soc-life-rise"><b>Could you rise?</b> ' + esc(t.rise) + '</p>') +
      (ppl ? '<div class="tih-tags"><span class="soc-life-ppl">Born to this rank, or reaching it:</span>' + ppl + '</div>' : '') +
      '<div class="soc-life-btns">' + againHtml(d, here) + '<a class="soc-life-more" href="' + esc(rank) + '">About this rank &rarr;</a><button type="button" class="soc-life-share">Share</button></div>' +
      (ruler && pop ? '<p class="soc-life-note">Your odds of being ' + esc(ruler.loc && !ruler.one ? ruler.loc + ' (' + ruler.name.toLowerCase() + ')' : ruler.name.toLowerCase()) + ' were about one in ' + esc(bigNum(pop)) + '.</p>' : '') +
      '<p class="soc-life-note">Drawn at random, weighted by each rank&#8217;s share of the people, from the sources named on the ladder' +
      (est ? '; shares marked est. (' + est + ' here) are estimates where no count survives' : '') + '.</p></div></div>';
  }
  function bornBox(box) {
    var btn = $('.soc-born-btn', box), out = $('.soc-born-out', box), pick = $('#soc-born-pick'), here = $('#soc-data');
    var mine = here ? JSON.parse(here.textContent) : null;
    if (mine) CACHE[mine.slug] = mine;
    function go(not) {   // not: a society to leave out (the one whose only counted rank was just drawn)
      var slug = typeof not === 'string' ? '' : btn.getAttribute('data-born') || (pick && pick.value) || '';
      var from = INDEX.filter(function (r) { return r[0] !== not; });
      if (!slug && from.length) slug = from[Math.floor(Math.random() * from.length)][0];
      if (!slug) return;
      btn.disabled = true; out.setAttribute('aria-busy', 'true');
      load(slug).then(function (d) {
        var t = draw(d); if (!t) { out.innerHTML = '<p class="soc-life-note">This ladder has too few counted ranks to draw a life from.</p>'; return; }
        out.innerHTML = lifeHtml(d, t, !!mine && mine.slug === d.slug);
        var lives = get('epoch-lives', []); if (!Array.isArray(lives)) lives = [];
        lives.unshift({ s: d.slug, n: t.n, d: Math.floor(Date.now() / 864e5) }); put('epoch-lives', lives.slice(0, 50));
        var again = $('button.soc-again', out);
        if (again) again.addEventListener('click', function () { go(again.hasAttribute('data-other') ? d.slug : null); });
        // the score poster (share-card.js rows): the whole ladder, your rank marked; drawn now, ready when Share is tapped
        var poster = typeof scoreCard === 'function' ? scoreCard({ title: 'Born into history', score: title(t), unit: d['in'] + ', around ' + d.yl, kids: kids(),
          rows: d.tiers.map(function (x) { return [title(x), x.lbl, x.n === t.n ? '◀ you' : '']; }), note: 'Like ' + odds(t.w, t.est), cta: 'Where would you have stood?', url: 'the-epoch-institute.org/societies' }) : null;
        $('.soc-life-share', out).addEventListener('click', function (e) {
          var text = 'I was born among the ' + inline(t) + ' of ' + d['in'] + ', like ' + odds(t.w, t.est) + '. Where would you have stood?';
          var url = 'https://the-epoch-institute.org/societies/' + d.slug + '#born';
          if (window.sharePoster) window.sharePoster({ text: text, url: url, title: 'Born into history', heading: 'Share your life', image: poster, file: 'epoch-born-' + d.slug + '.jpg', alt: 'Born into history: ' + title(t) + ', ' + d['in'] });
          else if (window.shareThis) window.shareThis(text, url, e.currentTarget);
        });
      }).catch(function () { out.innerHTML = '<p class="soc-life-note">The ladder could not be loaded. Please try again.</p>'; })
        .then(function () { btn.disabled = false; out.removeAttribute('aria-busy'); });
    }
    btn.addEventListener('click', function () { go(null); });
    return go;
  }

  // ── Compare: ranks lined up by band ──
  function cmpCol(d, band) {
    var ts = d.tiers.filter(function (t) { return t.band === band; });
    if (!ts.length) return '<div class="soc-cmp-cell soc-cmp-none">No such rank</div>';
    return '<div class="soc-cmp-cell">' + ts.map(function (t) {
      return '<a class="soc-cmp-rank" href="/societies/' + esc(d.slug) + '#rank-' + t.n + '"><span class="soc-cmp-n">' + titleHtml(t) + '</span>' + (t.term ? '<span class="soc-term">' + esc(t.term) + '</span>' : '') +
        '<span class="soc-cmp-bar' + (t.est ? ' soc-est' : '') + '"><i style="width:' + (t.w == null ? 0 : Math.max(0.6, Math.min(100, t.w))) + '%"></i></span><span class="soc-cmp-s">' + esc(t.lbl) + '</span></a>';
    }).join('') + '</div>';
  }
  function compare(a, b, out) {
    out.setAttribute('aria-busy', 'true');
    Promise.all([load(a), load(b)]).then(function (ds) {
      var A = ds[0], B = ds[1];
      var rows = BANDS.filter(function (bd) { return A.tiers.some(function (t) { return t.band === bd[0]; }) || B.tiers.some(function (t) { return t.band === bd[0]; }); });
      out.innerHTML = '<div class="soc-cmp-grid"><div class="soc-cmp-h"></div><div class="soc-cmp-h"><a href="/societies/' + esc(A.slug) + '">' + esc(A.of) + '</a><span>' + esc(A.period) + '</span></div><div class="soc-cmp-h"><a href="/societies/' + esc(B.slug) + '">' + esc(B.of) + '</a><span>' + esc(B.period) + '</span></div>' +
        rows.map(function (bd) { return '<div class="soc-cmp-band">' + esc(bd[1]) + '</div>' + cmpCol(A, bd[0]) + cmpCol(B, bd[0]); }).join('') + '</div>' +
        '<p class="soc-life-note">Bars show each rank&#8217;s share of its own society&#8217;s people, on one scale; dashed bars are estimates where no count survives.</p>';
    }).catch(function () { out.innerHTML = '<p class="soc-life-note">The ladders could not be loaded. Please try again.</p>'; })
      .then(function () { out.removeAttribute('aria-busy'); });
  }

  function init() {
    var ix = $('#soc-index'); if (ix) { try { INDEX = JSON.parse(ix.textContent); } catch (e) { INDEX = []; } }
    var q = new URLSearchParams(location.search), born = $$('.soc-born').map(bornBox);
    // /societies/?born=1 (a ladder's "Be born somewhere else"): a life anywhere, drawn at once
    if (q.get('born') && born.length && !$('.soc-born-btn').getAttribute('data-born')) born[0](null);
    var cf = $('.soc-cmp .soc-cmp-form'), out = $('.soc-cmp-out');
    if (cf && out) {
      var a = q.get('a'), b = q.get('b');
      var ok = function (s) { return INDEX.some(function (r) { return r[0] === s; }); };
      if (a && b && ok(a) && ok(b)) {
        cf.elements.a.value = a; cf.elements.b.value = b; compare(a, b, out);
        // go to the comparison once the page and its fonts are in, unless the reader has scrolled meanwhile: scrolled
        // there before, the text above it still rewraps when the fonts arrive and moves it (CLS 0.22, Kids mode, phone)
        var sec = $('#compare'), go = function () { if (scrollY < 4) requestAnimationFrame(function () { sec.scrollIntoView(); }); },
          fonts = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go, go); };
        if (sec) { if (document.readyState === 'complete') fonts(); else addEventListener('load', fonts); }
      }
      cf.addEventListener('submit', function (e) {
        e.preventDefault(); var x = cf.elements.a.value, y = cf.elements.b.value;
        history.replaceState(null, '', '/societies/?a=' + encodeURIComponent(x) + '&b=' + encodeURIComponent(y));
        compare(x, y, out);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.epochSocieties = { draw: draw, odds: odds, load: load };   // for tests (scratchpad pw)
})();
