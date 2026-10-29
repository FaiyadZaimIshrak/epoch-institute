// home-globe.js - the home page's hero globe: the world of 1000 CE turning slowly, its states as dots. Runs in a worker
// on an OffscreenCanvas where the browser can, so its drawing never holds up the page (on the page a slowed phone spent
// 80-115 ms on each frame); else index loads it on the page. Needs d3-geo (/d3-geo.js) and maps/globe-land.js
// (ATLAS_GLOBE): the worker imports both itself. HomeGlobe(canvas, {pts: [[lng, lat, profile 0/1]], dpr, coarse})
// returns {size(w, h, dpr), colours({g, gold, text}), run(on)}.
(function (root) {
  'use strict';
  var D2R = Math.PI / 180;
  function mk(w, h) {   // a canvas for the parts that never turn
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
    var c = root.document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  function HomeGlobe(cv, o) {
    var d3 = root.d3;
    // coastlines thinned to about a third of a degree: at this size the rest is under a pixel and only costs time
    var polys = root.ATLAS_GLOBE.rings.map(function (fl) {
      var ring = [], px = 1e9, py = 1e9;
      for (var i = 0; i < fl.length; i += 2) {
        var x = fl[i] / 100, y = fl[i + 1] / 100;
        if (Math.abs(x - px) + Math.abs(y - py) >= 0.3 || i >= fl.length - 2) { ring.push([x, y]); px = x; py = y; }
      }
      if (ring.length < 4) return null;
      if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring.reverse();
      return [ring];
    }).filter(Boolean);
    var geo = { type: 'MultiPolygon', coordinates: polys }, grat = d3.geoGraticule().step([20, 20])();
    var ctx = cv.getContext('2d'), proj = d3.geoOrthographic().clipAngle(90), path = d3.geoPath(proj, ctx), pts = o.pts;
    // a phone: 15 frames a second (the turn is slow enough to look the same)
    var dpr = o.dpr, step = o.coarse ? 66 : 33, lng = 20, running = false, looping = false, last = null, lastDraw = 0;
    var g = '201,168,76', gold = '#c9a84c', text = '#e8e0d0', bg = mk(1, 1), rim = mk(1, 1);   // the sphere's glow and rim: drawn once
    var later = root.requestAnimationFrame ? root.requestAnimationFrame.bind(root) : function (f) { setTimeout(function () { f(performance.now()); }, 16); };
    function fit() { proj.scale(Math.min(cv.width, cv.height) / 2 - 6 * dpr).translate([cv.width / 2, cv.height / 2]); }
    function still() {
      if (!cv.width) return;
      fit(); bg.width = rim.width = cv.width; bg.height = rim.height = cv.height;
      var b = bg.getContext('2d'), r = rim.getContext('2d'), pb = d3.geoPath(proj, b), pr = d3.geoPath(proj, r);
      b.save(); b.shadowColor = 'rgba(' + g + ',0.35)'; b.shadowBlur = 14 * dpr;
      b.beginPath(); pb({ type: 'Sphere' }); b.fillStyle = 'rgba(' + g + ',0.05)'; b.fill(); b.restore();
      r.beginPath(); pr({ type: 'Sphere' }); r.strokeStyle = 'rgba(' + g + ',0.4)'; r.lineWidth = dpr; r.stroke();
      lastDraw = 0; if (!looping) draw(performance.now());   // a still frame at once (a hidden or paused globe keeps its face)
    }
    function draw(now) {
      if (last !== null && running) lng = (lng + (now - last) * 0.004) % 360;   // a turn in about 90 seconds
      last = now;
      fit(); proj.rotate([-lng, -16, 0]);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(bg, 0, 0);
      ctx.beginPath(); path(grat); ctx.strokeStyle = 'rgba(' + g + ',0.13)'; ctx.lineWidth = 0.6 * dpr; ctx.stroke();
      ctx.beginPath(); path(geo); ctx.fillStyle = 'rgba(' + g + ',0.14)'; ctx.fill();
      ctx.strokeStyle = 'rgba(' + g + ',0.5)'; ctx.lineWidth = 0.7 * dpr; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.drawImage(rim, 0, 0);
      var cl = lng * D2R, cp = -16 * D2R, ax = Math.cos(cp) * Math.cos(cl), ay = Math.cos(cp) * Math.sin(cl), az = Math.sin(cp);
      [[0, text, 0.7, 1.6], [1, gold, 1, 2.6]].forEach(function (k) {   // the states, then those with a profile on top
        ctx.fillStyle = k[1]; ctx.globalAlpha = k[2]; ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
          var p = pts[i]; if ((p[2] ? 1 : 0) !== k[0]) continue;
          var la = p[1] * D2R, lo = p[0] * D2R, c = Math.cos(la);
          if (c * Math.cos(lo) * ax + c * Math.sin(lo) * ay + Math.sin(la) * az < 0.001) continue;
          var q = proj([p[0], p[1]]); if (!q) continue;
          ctx.moveTo(q[0] + k[3] * dpr, q[1]); ctx.arc(q[0], q[1], k[3] * dpr, 0, 6.2832);
        }
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    function frame(now) {
      if (!running) { looping = false; return; }
      later(frame);
      if (lastDraw && now - lastDraw < step) return;
      lastDraw = now; draw(now);
    }
    function kick() { if (running && !looping) { looping = true; last = null; later(frame); } }
    return {
      size: function (w, h, d) { if (d) dpr = d; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); still(); },
      colours: function (c) { if (c) { g = c.g; gold = c.gold; text = c.text; } still(); },
      run: function (on) { running = !!on; if (running) kick(); else last = null; }
    };
  }
  root.HomeGlobe = HomeGlobe;
  // in a worker: the page hands over its canvas, then posts sizes, colours and whether the globe is on screen
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    var hg = null;
    root.onmessage = function (e) {
      var m = e.data;
      if (m.t === 'init') {
        root.importScripts(m.d3, m.land);
        hg = HomeGlobe(m.canvas, { pts: m.pts, dpr: m.dpr, coarse: m.coarse });
        hg.colours(m.colours); hg.size(m.w, m.h, m.dpr); hg.run(m.run);
        root.postMessage({ t: 'ready' });
      } else if (hg && m.t === 'size') hg.size(m.w, m.h, m.dpr);
      else if (hg && m.t === 'colours') hg.colours(m.colours);
      else if (hg && m.t === 'run') hg.run(m.on);
    };
  }
})(typeof self !== 'undefined' ? self : this);
