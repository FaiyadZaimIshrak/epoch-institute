// "Meanwhile in the world" (Nov 2026): the strip at the foot of an entry or song page, <section class="meanwhile"
// data-y="1453">: what else stood in the world that year. Loaded by enc-page.js when the section nears the screen, with
// the versions of this file and data/meanwhile.json it is given (MW.v). The data: every profile [name, address, region,
// first year, last year, weight, has an emblem] and the years that have a page. Picks, for each region of the world,
// the profile alive that year with the greatest weight (the radar stats' overall mark), six regions at most, the
// heaviest first, then links the year's page (or the nearest within 25 years) and the century.
(function () {
  'use strict';
  var sec = document.querySelector('section.meanwhile[data-y]'); if (!sec || sec.getAttribute('data-done')) return;
  sec.setAttribute('data-done', '1');
  var y = parseInt(sec.getAttribute('data-y'), 10); if (!isFinite(y)) return;
  var esc = window.escHtml || function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var yl = function (v) { return v < 0 ? (-v) + ' BCE' : String(v); };
  // the site's centuries: 1453 is the 15th century, 480 BCE (-480) the 5th century BCE
  function century(v) {
    var n = Math.floor((Math.abs(v) - 1) / 100) + 1, t = n % 100;
    var s = t > 10 && t < 14 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
    return { label: n + s + ' century' + (v < 0 ? ' BCE' : ''), slug: n + s + '-century' + (v < 0 ? '-bce' : '') };
  }
  var src = '/data/meanwhile.json?v=' + ((window.MW && window.MW.v) || '1');
  fetch(src).then(function (r) { return r.json(); }).then(function (d) {
    var best = {};
    d.p.forEach(function (p) {
      if (y < p[3] || y > p[4]) return;
      var cur = best[p[2]]; if (!cur || p[5] > cur[5]) best[p[2]] = p;
    });
    var pick = Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b[5] - a[5]; }).slice(0, 6);
    if (pick.length < 2) { sec.remove(); return; }
    var yp = null, dist = 26; d.y.forEach(function (v) { var dd = Math.abs(v - y); if (dd < dist) { dist = dd; yp = v; } });
    var c = century(y);
    var h = '<h2 class="enc-section-title">Meanwhile in the world, ' + esc(yl(y)) + '</h2>' +
      '<p class="mw-lede">The greatest powers of each region in that year, from the profiles.</p><ul class="mw-list">' +
      pick.map(function (p) {
        var em = p[6] ? '<img src="/logos/thumbs/' + encodeURIComponent(p[0]) + '.png" alt="" width="40" height="40" loading="lazy" decoding="async">' : '<span class="mw-dot" aria-hidden="true"></span>';
        return '<li><a href="' + esc(p[1]) + '">' + em + '<span class="mw-t"><span class="mw-n">' + esc(p[0]) + '</span><span class="mw-r">' + esc(p[2]) +
          ' · ' + esc(yl(p[3])) + '–' + (p[4] >= new Date().getFullYear() - 1 ? 'today' : esc(yl(p[4]))) + '</span></span></a></li>';
      }).join('') + '</ul><p class="mw-more">' +
      (yp !== null ? '<a href="/years/' + (yp < 0 ? (-yp) + '-bce' : yp) + '">' + (yp === y ? 'Everything that happened in ' : 'The nearest year with a page: ') + esc(yl(yp)) + ' &rarr;</a>' : '') +
      '<a href="/centuries/' + c.slug + '">The ' + esc(c.label) + ' &rarr;</a><a href="/atlas?year=' + y + '">The atlas in ' + esc(yl(y)) + ' &rarr;</a></p>';
    sec.innerHTML = h;
  }).catch(function () { sec.remove(); });
})();
