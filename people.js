// people.js - the "who lived when" chart on /people/: the best-known people of a region and an age as lifespan bars on
// one scale. Data: people-data.js (PEOPLE, PEOPLE_REGIONS, written by scripts/build-pages.ps1). The choices are kept in
// the address (?r=<region index>&from=<century slug>&to=<century slug>&pic=1), so a chart can be shared.
(function () {
  var form = document.getElementById('pp-form'), out = document.getElementById('pp-out'), status = document.getElementById('pp-status');
  if (!form || !out || !status) return;
  var selR = document.getElementById('pp-r'), selF = document.getElementById('pp-from'), selT = document.getElementById('pp-to'), chk = document.getElementById('pp-pic');
  var MAX = 60;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function label(y) { return y < 0 ? (-y) + ' BCE' : y < 1000 ? y + ' CE' : String(y); }
  function bounds(sel) { var o = sel.options[sel.selectedIndex]; return o ? [+o.getAttribute('data-a'), +o.getAttribute('data-b')] : [0, 0]; }
  function pick(sel, value) { for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === value) { sel.selectedIndex = i; return true; } return false; }

  // the address first; else the fifteenth to the seventeenth century, all regions
  var q = new URLSearchParams(location.search);
  if (!pick(selF, q.get('from') || '')) pick(selF, '15th-century');
  if (!pick(selT, q.get('to') || '')) pick(selT, '17th-century');
  if (q.has('r')) pick(selR, q.get('r'));
  chk.checked = q.get('pic') === '1';

  function draw() {
    if (typeof PEOPLE === 'undefined') { status.textContent = 'Loading the people…'; return; }
    var f = bounds(selF), t = bounds(selT), a = Math.min(f[0], t[0]), b = Math.max(f[1], t[1]);
    var r = +selR.value, pic = chk.checked;
    // people with a span of years (a lifespan, a reign or years of activity) that touches the chosen centuries
    var rows = PEOPLE.filter(function (p) { return p[5] <= 2 && p[4] > p[3] && p[3] <= b && p[4] >= a && (r < 0 || p[6] === r) && (!pic || p[7]); });
    var total = rows.length;
    rows.sort(function (x, y) { return y[8] - x[8] || x[3] - y[3]; });
    rows = rows.slice(0, MAX).sort(function (x, y) { return x[3] - y[3] || (x[1] < y[1] ? -1 : 1); });
    var fT = selF.options[selF.selectedIndex].text, tT = selT.options[selT.selectedIndex].text;
    if (f[0] > t[0]) { var sw = fT; fT = tT; tT = sw; }
    var rn = r < 0 ? '' : PEOPLE_REGIONS[r], the = /^(Americas|Ancient Near East|Islamic Caliphates)/.test(rn) ? 'the ' : '';
    var where = (r < 0 ? '' : ' of ' + the + rn) + (fT === tT ? ' in the ' + fT : ' from the ' + fT + ' to the ' + tT);
    if (!rows.length) { out.innerHTML = ''; status.textContent = 'Nobody with known years matches these choices.'; return; }
    var t0 = Infinity, t1 = -Infinity;
    rows.forEach(function (p) { if (p[3] < t0) t0 = p[3]; if (p[4] > t1) t1 = p[4]; });
    t0 = Math.floor(t0 / 25) * 25; t1 = Math.ceil(t1 / 25) * 25; if (t1 <= t0) t1 = t0 + 25;
    if ((t1 - t0) % 50) t1 += 25;   // the middle mark falls on a round year
    var tw = t1 - t0, h = '<figure class="pp-chart"><p class="cty-scale" aria-hidden="true"><span>' + label(t0) + '</span><span>' + label(Math.round((t0 + t1) / 2)) + '</span><span>' + label(t1) + '</span></p><ol class="cty-tl pp-tl">';
    rows.forEach(function (p) {
      var left = (p[3] - t0) / tw * 100, width = Math.max(0.8, (p[4] - p[3]) / tw * 100);
      h += '<li><a href="/encyclopedia/' + esc(p[0]) + '">' + (p[7] ? '<img class="pp-av" src="/images/encyclopedia/thumbs/' + esc(p[0]) + '.jpg" alt="" loading="lazy" width="28" height="28" onerror="this.onerror=null;this.src=this.src.replace(\'/thumbs/\',\'/\')">' : '<span class="pp-av"></span>') +
        '<span class="pp-nm"><span class="cty-n">' + esc(p[1]) + '</span><span class="cty-y">' + esc(p[2]) + '</span></span></a><span class="cty-track" aria-hidden="true"><span class="cty-bar ' + (p[5] ? 'pp-dim' : 'pp-life') +
        '" style="left:' + left.toFixed(1) + '%;width:' + width.toFixed(1) + '%"></span></span></li>';
    });
    out.innerHTML = h + '</ol><figcaption>Bright bars: lifespans; pale bars: reigns or years of activity. Dates marked c. are approximate.</figcaption></figure>';
    status.textContent = (total > MAX ? 'The ' + MAX + ' best known of ' + total.toLocaleString('en-GB') + ' people' : total.toLocaleString('en-GB') + (total === 1 ? ' person' : ' people')) + where + ', in order of their first year.';
    var u = new URLSearchParams();
    if (r >= 0) u.set('r', String(r));
    u.set('from', selF.value); u.set('to', selT.value);
    if (pic) u.set('pic', '1');
    try { history.replaceState(null, '', location.pathname + '?' + u.toString()); } catch (e) {}
  }

  form.addEventListener('change', draw);
  form.addEventListener('submit', function (e) { e.preventDefault(); draw(); });
  // people-data.js loads deferred, before this file: draw at once (or as soon as it is there)
  if (typeof PEOPLE !== 'undefined') draw();
  else { status.textContent = 'Loading the people…'; window.addEventListener('load', draw); }
})();
