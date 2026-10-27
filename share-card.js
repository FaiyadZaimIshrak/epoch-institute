// share-card.js - score posters: a game's or the daily quiz's result drawn as a 1080x1350 picture (4:5, the shape
// Instagram, Facebook and WhatsApp show whole), handed to sharePoster() in shared-nav.js. Loaded by /games, /quiz
// and the home page (bump share-card.js?v= there). EpochCard.make(spec) starts drawing at once and returns
// { p: promise of a JPEG Blob, b: the Blob once drawn }, so the picture is ready by the time Share is tapped.
// spec: { title, score, unit, stars (0-3), squares ('1101…'), cw (['010…' a row]), grid ([[level 1-4 x4] per guess]), stamps ([name]), dots (['bad','good','none']), pics ([{src, label, sub}]),
// hero ({src, label}), emblems ([src]), rows ([[name, middle, right]]), words ([text]), note, cta, url, kids }
var EpochCard = (function () {
  'use strict';
  var W = 1080, H = 1350;
  var DARK = { bg: '#0b0c10', glow: 'rgba(201,168,76,0.16)', frame: 'rgba(201,168,76,0.42)', gold: '#c9a84c', gl: '#e8c97a', text: '#ece4d4', muted: '#a1957f', tile: '#14161d',
    disp: "'Cinzel', Georgia, serif", ui: "'Source Sans 3', 'Segoe UI', system-ui, sans-serif", read: "'Crimson Pro', Georgia, serif", good: '#5a9e6f', bad: '#b8473a', none: '#2a2d3a' };
  var KIDS = { bg: '#17123a', glow: 'rgba(255,126,182,0.22)', frame: 'rgba(255,194,71,0.55)', gold: '#ffc247', gl: '#ffd97a', text: '#f6f1ff', muted: '#b9addf', tile: '#221b4f',
    disp: "'Baloo 2', 'Nunito', sans-serif", ui: "'Nunito', 'Segoe UI', sans-serif", read: "'Nunito', 'Segoe UI', sans-serif", good: '#4cd38a', bad: '#ff6b6b', none: '#3d3480' };

  function load(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null);
      var im = new Image(); im.decoding = 'async';
      im.onload = function () { ok(im); }; im.onerror = function () { ok(null); };
      im.src = src;
    });
  }
  function fonts(T) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['600 60px ' + T.disp, '800 60px ' + T.disp, '600 30px ' + T.ui, 'italic 400 40px ' + T.read].map(function (f) { return document.fonts.load(f).catch(function () {}); }));
  }
  // letter-spaced capitals, drawn a letter at a time (canvas letterSpacing is not everywhere yet)
  function spaced(c, text, x, y, px, align) {
    var w = 0, ch = text.split(''); ch.forEach(function (k) { w += c.measureText(k).width + px; }); w -= px;
    var s = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x; c.textAlign = 'left';
    ch.forEach(function (k) { c.fillText(k, s, y); s += c.measureText(k).width + px; });
  }
  function lines(c, text, max, n) {   // words to at most n lines of max width (the last one ends in …)
    var words = String(text || '').split(/\s+/), out = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (c.measureText(t).width <= max || !cur) cur = t; else { out.push(cur); cur = w; } });
    if (cur) out.push(cur);
    if (out.length > n) { out = out.slice(0, n); var l = out[n - 1]; while (l && c.measureText(l + '…').width > max) l = l.replace(/\s*\S+$/, ''); out[n - 1] = l + '…'; }
    return out;
  }
  function round(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function cover(c, im, x, y, w, h, top) {   // draw a picture filling the box, cropped (top: where to cut, 0-1)
    var s = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / s, sh = h / s;
    c.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) * (top == null ? 0.3 : top), sw, sh, x, y, w, h);
  }
  function contain(c, im, x, y, w, h) {
    var s = Math.min(w / im.naturalWidth, h / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    c.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  function star(c, cx, cy, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    c.closePath();
  }

  function draw(s, ims) {
    var T = s.kids ? KIDS : DARK, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), mid = W / 2;
    // ground, glow, frame
    c.fillStyle = T.bg; c.fillRect(0, 0, W, H);
    var g = c.createRadialGradient(mid, 420, 40, mid, 420, 760); g.addColorStop(0, T.glow); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (s.kids) { c.fillStyle = 'rgba(255,255,255,0.08)'; for (var dy = 20; dy < H; dy += 40) for (var dx = 20 + (dy / 40 % 2) * 20; dx < W; dx += 40) { c.beginPath(); c.arc(dx, dy, 1.6, 0, 6.3); c.fill(); } }
    c.strokeStyle = T.frame; c.lineWidth = 2; if (s.kids) { round(c, 28, 28, W - 56, H - 56, 30); c.stroke(); } else c.strokeRect(28, 28, W - 56, H - 56);
    c.textBaseline = 'alphabetic';
    // the Institute, the game
    c.fillStyle = T.gold; c.font = '600 28px ' + T.disp; spaced(c, 'THE EPOCH INSTITUTE', mid, 104, 8, 'center');
    c.fillStyle = T.gl; c.font = '600 34px ' + T.ui; spaced(c, String(s.title || '').toUpperCase(), mid, 176, 4, 'center');
    // the score
    var y = 360;
    c.fillStyle = T.gl; c.textAlign = 'center';
    var big = String(s.score == null ? '' : s.score), px = big.length > 6 ? 150 : big.length > 4 ? 180 : 210;
    c.font = (s.kids ? '800 ' : '600 ') + px + 'px ' + T.disp; while (c.measureText(big).width > W - 180 && px > 80) { px -= 6; c.font = (s.kids ? '800 ' : '600 ') + px + 'px ' + T.disp; }
    c.fillText(big, mid, y);
    if (s.unit) { c.fillStyle = T.text; c.font = '600 40px ' + T.ui; c.fillText(lines(c, s.unit, W - 180, 1)[0], mid, y + 62); y += 62; }
    if (s.stars != null) {
      y += 64;
      for (var i = 0; i < 3; i++) { star(c, mid + (i - 1) * 84, y, 32); c.fillStyle = i < s.stars ? T.gold : (s.kids ? 'rgba(255,255,255,0.14)' : 'rgba(201,168,76,0.18)'); c.fill(); }
      y += 30;
    }
    y += 40;
    // the picture of the result
    var top = y, bottom = H - 250, room = bottom - top;
    if (s.squares) {   // the Daily Ten: a square for every pair
      var sq = s.squares.split(''), n = sq.length, per = n > 5 ? Math.ceil(n / 2) : n, size = Math.min(132, (W - 220 - (per - 1) * 18) / per), rows = Math.ceil(n / per);
      var sy = top + (room - rows * size - (rows - 1) * 18) / 2;
      sq.forEach(function (v, k) {
        var r = Math.floor(k / per), col = k % per, cnt = Math.min(per, n - r * per), sx = mid - (cnt * size + (cnt - 1) * 18) / 2 + col * (size + 18);
        round(c, sx, sy + r * (size + 18), size, size, s.kids ? 26 : 16); c.fillStyle = v === '1' ? T.good : T.bad; c.fill();
        c.fillStyle = 'rgba(255,255,255,0.92)'; c.font = '700 ' + Math.round(size * 0.46) + 'px ' + T.ui; c.textAlign = 'center';
        c.fillText(v === '1' ? '✓' : '✗', sx + size / 2, sy + r * (size + 18) + size * 0.64);
      });
    } else if (s.cw) {   // History Crossword: the shape of the day's grid, without its letters
      var cn = s.cw.length, cg = 5, cs = Math.min(54, (Math.min(W - 260, room) - (cn - 1) * cg) / cn), cx0 = mid - (cn * cs + (cn - 1) * cg) / 2, cy0 = top + (room - cn * cs - (cn - 1) * cg) / 2;
      s.cw.forEach(function (row, r) {
        row.split('').forEach(function (v, k) {
          round(c, cx0 + k * (cs + cg), cy0 + r * (cs + cg), cs, cs, s.kids ? 10 : 4);
          if (v === '1') { c.fillStyle = T.gold; c.fill(); } else { c.fillStyle = T.tile; c.fill(); }
        });
      });
    } else if (s.grid) {   // History Connections: a row of four squares for every guess, in the colours of the groups
      var GC = ['', '#e6c85f', '#9cc47f', '#8fb4dc', '#bb96d6'], gr = s.grid, nr = gr.length, gg = 14;
      var gs = Math.min(100, (room - (nr - 1) * gg) / nr), gx0 = mid - (4 * gs + 3 * gg) / 2, gy0 = top + (room - nr * gs - (nr - 1) * gg) / 2;
      gr.forEach(function (row, r) { row.forEach(function (lv, k) { round(c, gx0 + k * (gs + gg), gy0 + r * (gs + gg), gs, gs, s.kids ? 22 : 12); c.fillStyle = GC[lv] || T.none; c.fill(); }); });
    } else if (s.stamps) {   // My Passport: its stamps, round and a little askew, up to twelve
      var stl = s.stamps.slice(0, 12), ns = stl.length, scol = ns > 9 ? 4 : 3, srow = Math.ceil(ns / scol), sg = 28;
      var sd = Math.min(200, (W - 200 - (scol - 1) * sg) / scol, (room - (srow - 1) * sg) / Math.max(1, srow)), sy0 = top + (room - srow * sd - (srow - 1) * sg) / 2;
      stl.forEach(function (name, k) {
        var r = Math.floor(k / scol), col = k % scol, cnt = Math.min(scol, ns - r * scol);
        var cx = mid - (cnt * sd + (cnt - 1) * sg) / 2 + col * (sd + sg) + sd / 2, cy = sy0 + r * (sd + sg) + sd / 2;
        c.save(); c.translate(cx, cy); c.rotate(((k * 37) % 21 - 10) * Math.PI / 180);
        c.strokeStyle = T.gold; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, sd / 2 - 4, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.arc(0, 0, sd / 2 - 15, 0, Math.PI * 2); c.stroke();
        c.fillStyle = T.gl; c.textAlign = 'center'; c.font = '700 ' + Math.round(sd * 0.12) + 'px ' + T.ui;
        var ls = lines(c, String(name).toUpperCase(), sd - 46, 3); ls.forEach(function (l, li) { c.fillText(l, 0, (li - (ls.length - 1) / 2) * sd * 0.14 + sd * 0.04); });
        c.restore();
      });
    } else if (s.dots) {   // the daily quiz: a box for every clue
      var nd = s.dots.length, ds = Math.min(170, (W - 200 - (nd - 1) * 26) / nd), gap = 26, dx0 = mid - (nd * ds + (nd - 1) * gap) / 2, dyy = top + (room - ds) / 2 - 30;
      s.dots.forEach(function (v, k) {
        round(c, dx0 + k * (ds + gap), dyy, ds, ds, 22); c.fillStyle = v === 'good' ? T.good : v === 'bad' ? T.bad : T.none; c.fill();
        c.fillStyle = v === 'none' ? T.muted : 'rgba(255,255,255,0.92)'; c.font = '700 64px ' + T.ui; c.textAlign = 'center';
        c.fillText(v === 'good' ? '✓' : v === 'bad' ? '✗' : '·', dx0 + k * (ds + gap) + ds / 2, dyy + ds * 0.66);
        c.fillStyle = T.muted; c.font = '600 26px ' + T.ui; c.fillText('Clue ' + (k + 1), dx0 + k * (ds + gap) + ds / 2, dyy + ds + 44);
      });
    } else if (s.hero && ims.hero) {   // one big picture (the solved puzzle)
      var hs = Math.min(room - 70, 560), hx = mid - hs / 2, hy = top + (room - hs - 70) / 2;
      c.save(); round(c, hx, hy, hs, hs, s.kids ? 30 : 10); c.clip(); cover(c, ims.hero, hx, hy, hs, hs, 0.5); c.restore();
      c.strokeStyle = T.gold; c.lineWidth = 3; round(c, hx, hy, hs, hs, s.kids ? 30 : 10); c.stroke();
      if (s.hero.label) { c.fillStyle = T.text; c.font = '600 36px ' + T.ui; c.textAlign = 'center'; c.fillText(lines(c, s.hero.label, W - 200, 1)[0], mid, hy + hs + 56); }
    } else if (s.pics && ims.pics.length) {   // a row of pictures with their years
      var np = ims.pics.length, cols = np <= 3 ? np : np === 4 ? 2 : 3, prow = Math.ceil(np / cols), gp = 22, lab = 84;
      var pw = Math.min(np <= 3 ? 290 : 260, (W - 160 - (cols - 1) * gp) / cols), ph = Math.min(pw * 1.15, (room - (prow - 1) * 24) / prow - lab);
      var py0 = top + (room - prow * (ph + lab) - (prow - 1) * 24) / 2;
      ims.pics.forEach(function (im, k) {
        var r2 = Math.floor(k / cols), cl = k % cols, cnt2 = Math.min(cols, np - r2 * cols), px2 = mid - (cnt2 * pw + (cnt2 - 1) * gp) / 2 + cl * (pw + gp), py = py0 + r2 * (ph + lab + 24);
        c.fillStyle = T.tile; round(c, px2, py, pw, ph, s.kids ? 22 : 8); c.fill();
        if (im) { c.save(); round(c, px2, py, pw, ph, s.kids ? 22 : 8); c.clip(); cover(c, im, px2, py, pw, ph, 0.25); c.restore(); }
        c.strokeStyle = s.kids ? T.gold : 'rgba(201,168,76,0.55)'; c.lineWidth = 2; round(c, px2, py, pw, ph, s.kids ? 22 : 8); c.stroke();
        var p = s.pics[k] || {};
        c.textAlign = 'center'; c.fillStyle = T.gl; c.font = '600 28px ' + T.disp; if (p.sub) c.fillText(lines(c, p.sub, pw, 1)[0], px2 + pw / 2, py + ph + 36);
        c.fillStyle = T.text; c.font = '600 21px ' + T.ui; lines(c, p.label, pw + gp - 6, 2).forEach(function (l, li) { c.fillText(l, px2 + pw / 2, py + ph + (p.sub ? 64 : 34) + li * 24); });
      });
    } else if (s.emblems && ims.emblems.length) {   // the emblems of the pairs found
      var ne = ims.emblems.length, ec = ne > 8 ? 5 : 4, er = Math.ceil(ne / ec), es = Math.min(150, (W - 200 - (ec - 1) * 20) / ec), eh = es * 0.72;
      var ey = top + (room - er * eh - (er - 1) * 24) / 2;
      ims.emblems.forEach(function (im, k) {
        var r3 = Math.floor(k / ec), c3 = k % ec, cnt3 = Math.min(ec, ne - r3 * ec), ex = mid - (cnt3 * es + (cnt3 - 1) * 20) / 2 + c3 * (es + 20), eyy = ey + r3 * (eh + 24);
        c.fillStyle = T.tile; round(c, ex - 6, eyy - 6, es + 12, eh + 12, 10); c.fill();
        if (im) contain(c, im, ex, eyy, es, eh);
      });
    } else if (s.rows) {   // a line per round (Globe Hunt)
      var rh = Math.min(84, room / s.rows.length), ry = top + (room - rh * s.rows.length) / 2;
      s.rows.forEach(function (r, k) {
        var yy = ry + k * rh + rh * 0.62;
        c.strokeStyle = 'rgba(201,168,76,0.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(110, ry + (k + 1) * rh); c.lineTo(W - 110, ry + (k + 1) * rh); c.stroke();
        c.textAlign = 'left'; c.fillStyle = T.text; c.font = '600 32px ' + T.ui; c.fillText(lines(c, r[0], 520, 1)[0], 120, yy);
        c.textAlign = 'right'; c.fillStyle = T.muted; c.font = '600 28px ' + T.ui; c.fillText(r[1], W - 260, yy);
        c.fillStyle = T.gl; c.font = '600 34px ' + T.disp; c.fillText(r[2], W - 120, yy);
      });
    } else if (s.words) {   // the words found (Word Hunt), with the theme's picture
      var wy = top, wx = 110, ww = W - 220;
      if (ims.wordPic) { var wh = Math.min(260, room - 220); c.save(); round(c, wx, wy, ww, wh, s.kids ? 26 : 10); c.clip(); cover(c, ims.wordPic, wx, wy, ww, wh, 0.4); c.restore(); c.strokeStyle = T.gold; c.lineWidth = 2; round(c, wx, wy, ww, wh, s.kids ? 26 : 10); c.stroke(); wy += wh + 36; }
      c.font = '700 30px ' + T.ui; var cx = 0, rowsW = [[]];
      s.words.forEach(function (w) { var tw = c.measureText(w).width + 44; if (cx + tw > ww && rowsW[rowsW.length - 1].length) { rowsW.push([]); cx = 0; } rowsW[rowsW.length - 1].push([w, tw]); cx += tw + 14; });
      rowsW.slice(0, 4).forEach(function (row, k) {
        var tot = row.reduce(function (a, b) { return a + b[1]; }, 0) + (row.length - 1) * 14, xx = mid - tot / 2;
        row.forEach(function (it, j) {
          var hue = ['#c9a84c', '#5a9e6f', '#6fa8dc', '#c27ba0', '#e69138', '#8e7cc3'][(k * 3 + j) % 6];
          round(c, xx, wy + k * 64, it[1], 50, 25); c.fillStyle = hue; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
          c.fillStyle = '#0b0c10'; c.textAlign = 'center'; c.fillText(it[0], xx + it[1] / 2, wy + k * 64 + 35); xx += it[1] + 14;
        });
      });
    }
    // a line of context, the invitation and the address
    if (s.note) { c.fillStyle = T.muted; c.font = '600 30px ' + T.ui; c.textAlign = 'center'; c.fillText(lines(c, s.note, W - 200, 1)[0], mid, H - 206); }
    c.fillStyle = T.text; c.font = (s.kids ? '700 46px ' : 'italic 400 50px ') + T.read; c.textAlign = 'center'; c.fillText(s.cta || 'Can you beat it?', mid, H - 136);
    c.fillStyle = T.gold; c.font = '600 32px ' + T.ui; c.fillText(s.url || 'the-epoch-institute.org/games', mid, H - 84);
    return cv;
  }

  function make(spec) {
    var job = { b: null };
    var T = spec.kids ? KIDS : DARK;
    job.p = fonts(T).then(function () {
      return Promise.all([load(spec.hero && spec.hero.src), Promise.all((spec.pics || []).map(function (p) { return load(p.src); })), Promise.all((spec.emblems || []).map(load)), load(spec.wordPic)]);
    }).then(function (r) {
      var cv = draw(spec, { hero: r[0], pics: r[1], emblems: r[2], wordPic: r[3] });
      return new Promise(function (ok, no) { cv.toBlob(function (b) { if (b) { job.b = b; ok(b); } else no(new Error('no picture')); }, 'image/jpeg', 0.9); });
    });
    job.p.catch(function () {});
    return job;
  }
  return { make: make };
})();
