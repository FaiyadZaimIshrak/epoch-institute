// scribe.js - "Write in ..." on the language profiles (#write) and /write: type in the scripts of the past on a keyboard
// whose keys show every letter, syllable or word sign with its value and its sound, then turn what was written into a
// picture to save, copy or share. Each language is data/scribe/<slug>.json (scripts/make-scribe.ps1, from
// scripts/scribe/*.tsv: every glyph named by its Unicode name), loaded on first use; Classical Chinese also loads
// data/scribe/hanzi.json.
// Needs shared-nav.js (escHtml, copyText, sharePoster, EPOCH_INAPP). The generated profile pages load this file without
// ?v= (a 10-minute cache, .htaccess); LANGS_V is written by make-scribe.ps1. Scribe.convert() is pure, for tests.
var Scribe = (function () {
  'use strict';
  var LANGS_V = '50fe80d797', HANZI_V = 'd781466582';
  var cp = String.fromCodePoint;
  function nfc(s) { return s.normalize ? s.normalize('NFC') : s; }
  function nfd(s) { return s.normalize ? s.normalize('NFD') : s; }
  // patterns built from code points (combining marks are invisible in source): combining marks, Greek breathings, an
  // acute or grave on a Latin vowel (an index 2 or 3 in Assyriology), and Chinese characters (with the 'u' flag)
  var COMB = '[' + cp(0x300) + '-' + cp(0x36f) + ']', RX_COMB = new RegExp(COMB), RX_COMB_G = new RegExp(COMB, 'g');
  var RX_BREATH = new RegExp('[' + cp(0x313) + cp(0x314) + ']'), RX_ACUTE = new RegExp('([aeiu])' + cp(0x301), 'g'), RX_GRAVE = new RegExp('([aeiu])' + cp(0x300), 'g');
  var RX_HAN = new RegExp('[' + cp(0x3400) + '-' + cp(0x9fff) + cp(0xf900) + '-' + cp(0xfaff) + cp(0x20000) + '-' + cp(0x3ffff) + ']', 'u');

  // ── a table of typed forms, matched longest first ────────────────────────────────────────────────────────────────
  function Table() { this.m = Object.create(null); this.lens = []; }
  Table.prototype.add = function (form, item) {
    if (!form || this.m[form]) return;
    this.m[form] = item; if (this.lens.indexOf(form.length) < 0) { this.lens.push(form.length); this.lens.sort(function (a, b) { return b - a; }); }
  };
  Table.prototype.at = function (s, i) {
    for (var k = 0; k < this.lens.length; k++) { var f = s.substr(i, this.lens[k]); if (f.length === this.lens[k] && this.m[f]) return { f: f, x: this.m[f] }; }
    return null;
  };

  // the glyph of each value (signs, words, punctuation), and finals and marks by name
  function index(sc) {
    if (sc._ix) return sc._ix;
    var ix = { g: Object.create(null), fin: Object.create(null), mark: Object.create(null), word: Object.create(null), det: Object.create(null), punct: Object.create(null) };
    sc.signs.forEach(function (s) { ix.g[s[0]] = s[1]; });
    (sc.finals || []).forEach(function (f) { ix.fin[f[0]] = f[1]; });
    (sc.marks || []).forEach(function (m) { ix.mark[m[0]] = m[1]; });
    (sc.words || []).forEach(function (w) { ix.word[w[0]] = w; (w[3] || []).forEach(function (a) { ix.word[a] = w; }); });
    (sc.dets || []).forEach(function (d) { ix.det[d[0]] = d; });
    (sc.punct || []).forEach(function (p) { ix.punct[p[0]] = p[1]; });
    return (sc._ix = ix);
  }
  function seg(g, r, k) { return { g: g, r: r == null ? '' : r, k: k || 'l' }; }
  var SP = { g: ' ', r: ' ', k: 'sp' }, NL = { g: '\n', r: '\n', k: 'nl' };

  // ── letters: alphabets, abjads and runes ─────────────────────────────────────────────────────────────────────────
  // vowels as typed (for the abjads, where the rules decide what a vowel becomes): a short vowel, or its long form
  var VOWELS = [['a', 'a'], ['e', 'e'], ['i', 'i'], ['o', 'o'], ['u', 'u'], ['aa', 'ā'], ['ee', 'ē'], ['ii', 'ī'], ['oo', 'ō'], ['uu', 'ū']];
  [[0x101, 'ā'], [0xE1, 'ā'], [0xE2, 'ā'], [0x113, 'ē'], [0xE9, 'ē'], [0xEA, 'ē'], [0x12B, 'ī'], [0xED, 'ī'], [0xEE, 'ī'], [0x14D, 'ō'], [0xF3, 'ō'], [0xF4, 'ō'], [0x16B, 'ū'], [0xFA, 'ū'], [0xFB, 'ū'], [0x259, 'ə']]
    .forEach(function (v) { VOWELS.push([cp(v[0]), v[1] === 'ə' ? 'ə' : cp(v[0] === 0xE1 || v[0] === 0xE2 ? 0x101 : v[0] === 0xE9 || v[0] === 0xEA ? 0x113 : v[0] === 0xED || v[0] === 0xEE ? 0x12B : v[0] === 0xF3 || v[0] === 0xF4 ? 0x14D : v[0] === 0xFA || v[0] === 0xFB ? 0x16B : v[0])]); });
  function longOf(v) { return v === 'a' ? cp(0x101) : v === 'e' ? cp(0x113) : v === 'i' ? cp(0x12B) : v === 'o' ? cp(0x14D) : v === 'u' ? cp(0x16B) : v; }
  function shortOf(v) { var i = [cp(0x101), cp(0x113), cp(0x12B), cp(0x14D), cp(0x16B)].indexOf(v); return i < 0 ? v : 'aeiou'.charAt(i); }
  var ABJAD = { hebrew: 1, abjad: 1, aramaic: 1, arabic: 1, persian: 1 };
  function letterTable(sc) {
    if (sc._T) return sc._T;
    var T = new Table();
    // in the abjads a typed vowel is a vowel first (the rules decide its letter), even where a key has its value (ā)
    if (ABJAD[sc.rules]) VOWELS.forEach(function (v) { T.add(v[0], { k: 'V', v: v[1] }); });
    sc.signs.forEach(function (s) { T.add(s[0], { k: 'L', v: s[0] }); (s[2] || []).forEach(function (a) { T.add(a, { k: 'L', v: s[0] }); }); });
    (sc.punct || []).forEach(function (p) { T.add(p[0], { k: 'P', v: p[0] }); });
    return (sc._T = T);
  }
  // the typed text as tokens: letters (L), vowels (V), punctuation (P), spaces, new lines, and anything else as it is
  function tokens(T, text) {
    var out = [], i = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (c === '\n') { out.push({ k: 'nl' }); i++; continue; }
      if (/\s/.test(c)) { if (!out.length || out[out.length - 1].k !== 'sp') out.push({ k: 'sp' }); i++; continue; }
      if (c === '-' && !T.m['-']) { out.push({ k: 'J', f: '-', p: i }); i++; continue; }   // a hyphen joins (al-kitāb) unless it is a letter
      var t = T.at(text, i);
      if (t) { out.push({ k: t.x.k, v: t.x.v, f: t.f, p: i }); i += t.f.length; continue; }
      var ch = String.fromCodePoint(text.codePointAt(i));
      out.push({ k: 'X', v: ch, f: ch, p: i }); i += ch.length;
    }
    return out;
  }
  function words(toks) {   // runs of letters and vowels, with the spaces, new lines and punctuation between them kept
    var out = [], cur = null;
    toks.forEach(function (t) {
      if (t.k === 'L' || t.k === 'V' || t.k === 'F' || t.k === 'J' && cur) { if (!cur) { cur = []; out.push({ w: cur }); } cur.push(t); }
      else { cur = null; out.push({ t: t }); }
    });
    return out;
  }
  // what a vowel becomes in an abjad, by its place in the word: [letter value, the sound it writes] pairs
  var VPLAN = {
    hebrew: function (v, pos) {
      var s = shortOf(v);
      if (s === 'i') return pos === 'init' ? [['ʾ', ''], ['y', v]] : [['y', v]];
      if (s === 'o' || s === 'u') return pos === 'init' ? [['ʾ', ''], ['w', v]] : [['w', v]];
      if (pos === 'init') return [['ʾ', v]];
      if (pos === 'fin' && v !== 'ə') return [['h', v]];
      return [];
    },
    aramaic: function (v, pos) {
      var s = shortOf(v);
      if (s === 'i' || s === 'e' && v !== 'e') return pos === 'init' ? [['ʾ', ''], ['y', v]] : [['y', v]];
      if (s === 'o' || s === 'u') return pos === 'init' ? [['ʾ', ''], ['w', v]] : [['w', v]];
      if (pos === 'init') return [['ʾ', v]];
      if (pos === 'fin' && v !== 'ə') return [['ʾ', v]];
      return [];
    },
    arabic: function (v, pos) {
      var s = shortOf(v), long = v !== s;
      if (s === 'e') s = 'i'; if (s === 'o') s = 'u';
      var carrier = pos === 'init' ? [[cp(0x101), s]] : [];
      if (!long) return carrier;
      if (s === 'a') return pos === 'init' ? [[cp(0x101), v]] : [[cp(0x101), v]];
      if (s === 'i') return carrier.concat([['y', v]]);
      return carrier.concat([['w', v]]);
    },
    persian: function (v, pos) {
      var s = shortOf(v), long = v !== s;
      if (pos === 'init') {
        if (s === 'a' && long) return [['ʾā', v]];          // alef madda
        if (s === 'i') return [[cp(0x101), ''], ['y', v]];
        if (s === 'u') return [[cp(0x101), ''], ['w', v]];
        return [[cp(0x101), v]];
      }
      if (s === 'a' && long) return [[cp(0x101), v]];
      if (s === 'i') return [['y', v]];
      if (s === 'u') return [['w', v]];
      if (s === 'o' && pos === 'fin') return [['w', v]];
      if ((s === 'e' || s === 'a') && pos === 'fin') return [['h', v]];
      return [];
    }
  };
  VPLAN.abjad = VPLAN.hebrew;
  // the point or haraka for a vowel ("Vowel marks"), and the long vowels' letters
  var MPLAN = {
    hebrew: function (v) { var s = shortOf(v); return { mark: v === 'ā' || v === cp(0x101) ? cp(0x101) : s === 'e' && v !== 'e' ? cp(0x113) : s, mater: v !== s ? (s === 'i' || s === 'e' ? 'y' : s === 'o' || s === 'u' ? 'w' : null) : null }; },
    arabic: function (v) { var s = shortOf(v); if (s === 'e') s = 'i'; if (s === 'o') s = 'u'; return { mark: s, mater: v !== shortOf(v) ? (s === 'a' ? cp(0x101) : s === 'i' ? 'y' : 'w') : null }; }
  };
  MPLAN.persian = function (v) { var s = shortOf(v), long = v !== s; return { mark: long ? (s === 'a' ? 'a' : s === 'i' || s === 'e' ? 'i' : 'u') : s === 'e' ? 'i' : s === 'o' ? 'u' : s, mater: long ? (s === 'a' ? cp(0x101) : s === 'i' || s === 'e' ? 'y' : 'w') : null }; };

  function abjadWord(sc, ix, w, opt) {
    var rule = sc.rules, plan = VPLAN[rule] || VPLAN.abjad, marks = opt.marks && MPLAN[rule === 'abjad' ? 'hebrew' : rule], out = [];
    var hasVowel = w.some(function (t) { return t.k === 'V'; });
    for (var i = 0; i < w.length; i++) {
      var t = w[i], prev = w[i - 1], next = w[i + 1];
      if (t.k === 'J') continue;
      if (t.k === 'L') {
        if (prev && prev.k === 'L' && prev.v === t.v) { if (marks && ix.mark[cp(0xB7)] && out.length) out[out.length - 1].g += ix.mark[cp(0xB7)]; continue; }   // a doubled letter is written once
        out.push(seg(ix.g[t.v] || t.v, t.v));
        continue;
      }
      // a vowel
      var pos = i === 0 ? 'init' : (i === w.length - 1 ? 'fin' : 'med');
      if (marks) {
        var mp = marks(t.v), last = out[out.length - 1];
        if (pos === 'init' || !last || last.k !== 'l') { out.push(seg(ix.g[rule === 'arabic' || rule === 'persian' ? cp(0x101) : 'ʾ'] || '', '')); last = out[out.length - 1]; }
        if (ix.mark[mp.mark]) { last.g += ix.mark[mp.mark]; last.r += t.v; }
        if (mp.mater && ix.g[mp.mater]) out.push(seg(ix.g[mp.mater], ''));
        continue;
      }
      if (!hasVowel) continue;
      plan(t.v, pos).forEach(function (p) { var g = ix.g[p[0]]; if (g) out.push(seg(g, p[1] || p[0])); });
    }
    // final forms
    if (out.length && ix.fin[out[out.length - 1].g]) out[out.length - 1].g = ix.fin[out[out.length - 1].g];
    if (out.length > 1 && rule !== 'hebrew') { /* no final forms elsewhere */ }
    return out;
  }

  // Greek: the vowels are letters; breathings, accents, final sigma; "As on stone": capitals without marks
  var GR = { smooth: 0x313, rough: 0x314, acute: 0x301, grave: 0x300, circ: 0x342, iota: 0x345, diaer: 0x308 };
  function greekWord(sc, ix, w, opt, marksOf) {
    var out = [], vowels = 'αεηιουω', initH = false;
    for (var i = 0; i < w.length; i++) {
      var t = w[i];
      if (t.v === 'h') { if (out.length === 0) initH = true; continue; }   // h only marks a rough breathing
      var g = ix.g[t.v]; if (!g) continue;
      out.push({ g: g, r: (initH && !out.length ? 'h' : '') + (t.v === 'r' && !out.length ? 'rh' : t.v), k: 'l', v: t.v, m: marksOf[i] || '' });   // romanised by the letter's value (ō, th; an initial ρ is rh)
    }
    if (!out.length) return out;
    // n before a velar is gamma (ἄγγελος)
    for (var j = 0; j < out.length - 1; j++) if (out[j].g === ix.g.n && /^(g|k|x|ch|kh)$/.test(out[j + 1].v)) out[j].g = ix.g.g;
    if (!opt.caps) {
      // breathing on the first vowel, or the second of a diphthong; initial rho takes the rough one
      var first = out[0];
      if (first.g === ix.g.r) first.m = cp(GR.rough) + first.m;
      else if (vowels.indexOf(first.g) >= 0) {
        var host = first, sec = out[1];
        if (sec && /^[ιυ]$/.test(sec.g) && /^[αεηου]$/.test(first.g) && !(first.g === 'ο' && sec.g === 'ι' && false)) host = sec;
        if (!RX_BREATH.test(host.m)) host.m = cp(initH ? GR.rough : GR.smooth) + host.m;
      }
      var lastL = out[out.length - 1]; if (lastL.g === 'σ') lastL.g = 'ς';
    }
    return out.map(function (o) {
      var g = opt.caps ? o.g.toUpperCase() : o.g + o.m;
      return seg(nfc(g), o.r);
    });
  }

  // Old Turkic (Orkhon), after Tekin: typed words are read as sounds (F) and spelt by the rules of the stones; a key's
  // exact sign (L: b¹, oq …) is written as it is. The consonants take a back (¹) or front (²) form from the first vowel
  // of the word; a and e are written only at the end of a word or in a word of one syllable, ı/i always, o/u and ö/ü
  // in the first syllable; q next to o/u is the sign oq, k after an ö/ü that is not written the sign ök; nt, lt, nč, ny
  // and ŋ have signs of their own.
  var TURKIC_F = [['ng', 'ŋ'], ['ny', 'ñ'], ['ch', 'č'], ['sh', 'š'], ['gh', 'ɣ'], ['ä', 'e'], ['ï', 'ı'], ['ğ', 'ɣ'], ['c', 'č'], ['j', 'y'], ['x', 'q'], ['w', 'b'], ['v', 'b'], ['h', 'q'], ['f', 'p']];
  'a e ı i o u ö ü b d g ɣ k q l m n ŋ ñ č p r s š t y z'.split(' ').forEach(function (p) { TURKIC_F.push([p, p]); });
  function turkicTable(sc) {
    if (sc._TT) return sc._TT;
    var T = new Table();
    // a key types its exact sign in brackets ([ök]), so that a typed word is never mistaken for one; b¹ needs none
    sc.signs.forEach(function (s) { T.add('[' + s[0] + ']', { k: 'L', v: s[0] }); if (/[¹²]/.test(s[0])) T.add(s[0], { k: 'L', v: s[0] }); });
    TURKIC_F.forEach(function (f) { T.add(f[0], { k: 'F', v: f[1] }); });
    (sc.punct || []).forEach(function (p) { T.add(p[0], { k: 'P', v: p[0] }); });
    return (sc._TT = T);
  }
  function turkicWord(sc, ix, w) {
    var BACKV = { a: 1, 'ı': 1, o: 1, u: 1 }, FRONTV = { e: 1, i: 1, 'ö': 1, 'ü': 1 }, V = function (x) { return BACKV[x] || FRONTV[x]; };
    var ph = w.map(function (t) { return t.k === 'F' ? t.v : null; });
    var front = false, firstV = -1, nV = 0, i;
    for (i = 0; i < ph.length; i++) if (ph[i] && V(ph[i])) { nV++; if (firstV < 0) { firstV = i; front = !!FRONTV[ph[i]]; } }
    var out = [];
    function put(v, r) { if (ix.g[v]) out.push(seg(ix.g[v], r)); }
    for (i = 0; i < w.length; i++) {
      if (w[i].k === 'L') { put(w[i].v, w[i].v); continue; }
      var p = ph[i], nx = ph[i + 1];
      if (V(p)) {
        var inFirst = i === firstV, atEnd = i === w.length - 1;
        if (p === 'a' || p === 'e') { if (atEnd || (nV === 1 && i === 0)) put('a/e', p); continue; }
        if (p === 'ı' || p === 'i') { put('ı/i', p); continue; }
        if ((p === 'o' || p === 'u') && (nx === 'q' || nx === 'k')) { put('oq', p + 'q'); i++; continue; }
        if ((p === 'ö' || p === 'ü') && nx === 'k' && !inFirst) { put('ök', p + 'k'); i++; continue; }
        if (inFirst) put(p === 'o' || p === 'u' ? 'o/u' : 'ö/ü', p);
        continue;
      }
      if (p === 'n' && (nx === 't' || nx === 'd')) { put('nt', 'n' + nx); i++; continue; }
      if (p === 'l' && (nx === 't' || nx === 'd')) { put('lt', 'l' + nx); i++; continue; }
      if (p === 'n' && nx === 'č') { put('nč', 'nč'); i++; continue; }
      if ((p === 'q' || p === 'k') && !front && (nx === 'o' || nx === 'u')) { put('oq', 'q' + nx); i++; continue; }
      if (p === 'q' || p === 'k') { put(front ? 'k²' : 'q', front ? 'k' : 'q'); continue; }
      if (p === 'g' || p === 'ɣ') { put(front ? 'g²' : 'g¹', front ? 'g' : 'ɣ'); continue; }
      if (ix.g[p + (front ? '²' : '¹')]) { put(p + (front ? '²' : '¹'), p); continue; }
      put(p, p);
    }
    return out;
  }

  function lettersConvert(sc, text, opt) {
    var ix = index(sc), T = sc.rules === 'oldturkic' ? turkicTable(sc) : letterTable(sc);
    var greek = sc.rules === 'greek', upper = null;
    if (greek) {
      // diacritics typed on Latin vowels are kept apart (NFD) and put back on the Greek letter; a circumflex on o or e
      // means ω or η (only long vowels take it), and so does a macron, which is dropped on the other vowels
      var CIRC = '[' + cp(0x302) + cp(0x303) + cp(0x342) + ']', MAC = cp(0x304);
      text = nfd(text).replace(new RegExp('([oOeE])' + MAC + '?(' + CIRC + ')', 'g'), function (m, v, c) { return v + v.toLowerCase() + c; })
        .replace(new RegExp('([oOeE])' + MAC, 'g'), function (m, v) { return v + v.toLowerCase(); }).replace(new RegExp(MAC, 'g'), '');
      var bare = text.replace(RX_COMB_G, '');
      upper = bare.split('').map(function (ch) { return ch !== ch.toLowerCase(); });   // where a capital was typed (names)
      text = text.toLowerCase();
    } else text = nfc(text).toLowerCase();
    var toks = tokens(T, greek ? text.replace(RX_COMB_G, '') : text), segs = [];
    if (greek) {   // the marks of each letter, in typing order
      var raw = text, k = 0, j = 0;
      for (j = 0; j < toks.length; j++) {
        var t = toks[j];
        if (t.k === 'sp' || t.k === 'nl') { while (k < raw.length && /\s/.test(raw.charAt(k))) k++; continue; }
        k += (t.f || '').length; var m = '';
        while (k < raw.length && RX_COMB.test(raw.charAt(k))) { var c = raw.charCodeAt(k); m += c === 0x301 ? cp(GR.acute) : c === 0x300 ? cp(GR.grave) : c === 0x302 || c === 0x303 || c === 0x342 ? cp(GR.circ) : c === 0x308 ? cp(GR.diaer) : c === 0x345 ? cp(GR.iota) : ''; k++; }
        t.m = m;
      }
    }
    words(toks).forEach(function (w) {
      if (w.t) {
        var t = w.t;
        if (t.k === 'sp') segs.push(sc.space ? seg(sc.space, ' ', 'sp') : SP);
        else if (t.k === 'nl') segs.push(NL);
        else if (t.k === 'P') segs.push(seg(ix.punct[t.v], t.v, 'p'));
        else segs.push(seg(t.v, t.v, 'x'));
        return;
      }
      var ws;
      if (!ABJAD[sc.rules]) w.w = w.w.filter(function (t) { return t.k !== 'J'; });   // only the abjads use the joiner
      if (ABJAD[sc.rules]) ws = abjadWord(sc, ix, w.w, opt);
      else if (greek) { ws = greekWord(sc, ix, w.w, opt, w.w.map(function (t) { return t.m; })); if (upper && upper[w.w[0].p] && ws.length && !opt.caps) ws[0].g = nfc(ws[0].g.charAt(0).toUpperCase() + ws[0].g.slice(1)); }
      else if (sc.rules === 'oldturkic') ws = turkicWord(sc, ix, w.w);
      else ws = w.w.reduce(function (a, t) {   // plain letters (runes): a doubled letter is written once
        if (a.length && a[a.length - 1].v === t.v) return a;
        var s = seg(ix.g[t.v] || t.v, t.v); s.v = t.v; a.push(s); return a;   // romanised by the rune's value (þur)
      }, []);
      segs = segs.concat(ws);
    });
    return segs;
  }

  // ── abugida: Devanagari and Brahmi from IAST (Harvard-Kyoto capitals also work) ──────────────────────────────────
  var IAST_V = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'ṛ', 'ṝ', 'ḷ', 'ḹ', 'e', 'ai', 'o', 'au'];
  var HK = [['A', 'ā'], ['I', 'ī'], ['U', 'ū'], ['RR', 'ṝ'], ['R', 'ṛ'], ['lRR', 'ḹ'], ['lR', 'ḷ'], ['T', 'ṭ'], ['Th', 'ṭh'], ['D', 'ḍ'], ['Dh', 'ḍh'], ['N', 'ṇ'], ['S', 'ṣ'], ['z', 'ś'], ['sh', 'ś'], ['Sh', 'ṣ'], ['M', 'ṃ'], ['H', 'ḥ'], ['G', 'ṅ'], ['J', 'ñ'], ['aa', 'ā'], ['ii', 'ī'], ['uu', 'ū'], ['w', 'v'], ['ṁ', 'ṃ'], ['r̥', 'ṛ'], ['r̥̄', 'ṝ'], ['l̥', 'ḷ']];
  function abugidaConvert(sc, text) {
    var ix = index(sc);
    if (!sc._A) {
      var T = new Table();
      sc.signs.forEach(function (s) { var isV = IAST_V.indexOf(s[0]) >= 0; T.add(s[0], { k: isV ? 'V' : 'C', v: s[0] }); (s[2] || []).forEach(function (a) { T.add(a, { k: isV ? 'V' : 'C', v: s[0] }); }); });
      HK.forEach(function (h) { var isV = IAST_V.indexOf(h[1]) >= 0; var kind = isV ? 'V' : (h[1] === 'ṃ' || h[1] === 'ḥ') ? 'M' : 'C'; T.add(nfc(h[0]), { k: kind, v: h[1] }); });
      ['ṃ', 'ḥ', 'm̐'].forEach(function (m) { T.add(nfc(m), { k: 'M', v: m }); });
      (sc.punct || []).forEach(function (p) { T.add(p[0], { k: 'P', v: p[0] }); });
      sc._A = T;
    }
    // a capitalised word is a name, not Harvard-Kyoto: "Rama" is rāma's r, not ṛ
    text = nfc(text).replace(/(^|[^A-Za-z])([A-Z])([a-z]+)/g, function (all, pre, a, rest) { return pre + a.toLowerCase() + rest; });
    var toks = tokens(sc._A, text), segs = [], pend = false, VIR = ix.mark.virama;
    function close() { if (pend) { segs[segs.length - 1].g += VIR; pend = false; } }
    toks.forEach(function (t) {
      if (t.k === 'C') { if (pend) segs[segs.length - 1].g += VIR; segs.push(seg(ix.g[t.v], t.v)); pend = true; return; }
      if (t.k === 'V') {
        if (pend) { if (t.v !== 'a') segs[segs.length - 1].g += ix.mark[t.v] || ''; segs[segs.length - 1].r += t.v; pend = false; }
        else segs.push(seg(ix.g[t.v], t.v));
        return;
      }
      if (t.k === 'M') { if (pend) { segs[segs.length - 1].r += 'a'; pend = false; } segs.push(seg(ix.mark[t.v] || '', t.v, 'm')); return; }
      close();
      if (t.k === 'sp') segs.push(SP); else if (t.k === 'nl') segs.push(NL);
      else if (t.k === 'P') segs.push(seg(ix.punct[t.v], t.v, 'p'));
      else segs.push(seg(t.v, t.v, 'x'));
    });
    close();
    return segs;
  }

  // ── syllables: cuneiform (Sumerian, Akkadian), Old Persian, Linear B ─────────────────────────────────────────────
  var SUB = '₀₁₂₃₄₅₆₇₈₉';
  function normVal(s) {   // ASCII and accented forms of a value -> the form in the sign list: "sh"->š, "u2"/"ú"->u₂, "ù"->u₃
    s = s.toLowerCase().replace(/sz|sh/g, 'š').replace(/s[,.]/g, 'ṣ').replace(/t[,.]/g, 'ṭ').replace(/h/g, 'ḫ').replace(/ḫ([,.])/g, 'ḫ').replace(/j/g, 'y');
    var idx = '';
    s = nfd(s).replace(RX_ACUTE, function (m, v) { idx = '₂'; return v; }).replace(RX_GRAVE, function (m, v) { idx = '₃'; return v; });
    s = nfc(s).replace(/[0-9]+$/, function (d) { return d.split('').map(function (x) { return SUB.charAt(+x); }).join(''); });
    if (idx && !/[₀-₉]$/.test(s)) s += idx;
    return s.replace(/[āâ]/g, 'a').replace(/[ēê]/g, 'e').replace(/[īî]/g, 'i').replace(/[ūû]/g, 'u');
  }
  function syllabicConvert(sc, text, opt) {
    var ix = index(sc), segs = [], rules = sc.rules;
    if (rules === 'oldpersian') return oldPersian(sc, ix, text);
    if (!sc._keys) {   // what an unhyphenated word is spelt with: the values on the keys, and any plain V, CV or VC value
      sc._keys = Object.create(null);
      sc.groups.forEach(function (g) { g[1].forEach(function (k) { if (!k[3] && /^[a-zšṣṭḫʾŋĝ]+$/.test(k[0])) sc._keys[k[0]] = k[1]; }); });
      sc.signs.forEach(function (s) { if (/^([bdgḫklmnpqrsṣštṭwyzʾ]?[aeiu]|[aeiu][bdgḫklmnpqrsṣštṭwyzʾ])$/.test(s[0]) && !sc._keys[s[0]]) sc._keys[s[0]] = s[1]; });
    }
    var lines = nfc(text).split('\n');
    lines.forEach(function (line, li) {
      if (li) segs.push(NL);
      line.split(/\s+/).filter(Boolean).forEach(function (word, wi) {
        if (wi) segs.push(rules === 'linearb' && ix.punct['.'] ? seg(ix.punct['.'], ' ', 'sp') : SP);
        // determinatives in braces, then parts joined by - or .
        var parts = word.split(/(\{[^}]*\})|[-.]/).filter(function (p) { return p; });
        parts.forEach(function (p) {
          var det = /^\{([^}]*)\}$/.exec(p);
          if (det) { var d = ix.det[det[1]] || ix.det[normVal(det[1])]; segs.push(d ? seg(d[1], '{' + d[0] + '}', 'd') : seg('?', p, 'x')); return; }
          // a word sign: LUGAL in Akkadian, lugal in Sumerian (also with digits for indices: E2, e2)
          var w = ix.word[p] || ix.word[p.replace(/[0-9]+$/, function (dg) { return dg.split('').map(function (x) { return SUB.charAt(+x); }).join(''); })];
          if (w) { segs.push(seg(w[1], w[0], 'w')); return; }
          var v = rules === 'linearb' ? p.toLowerCase() : normVal(p);
          if (ix.g[v]) { segs.push(seg(ix.g[v], v)); return; }
          var cut = rules === 'linearb' ? linearB(sc, ix, v) : splitSyll(sc._keys, v);
          if (cut) cut.forEach(function (c) { segs.push(seg(ix.g[c], c)); });
          else segs.push(seg('?', p, 'x'));
        });
      });
    });
    return segs;
  }
  // a word as the scribes spelt it: cut into syllables (one consonant between vowels starts the next syllable, two are
  // split), then each syllable written with its own sign where the keys have one (šar), else as CV + VC, the vowel
  // written twice (rum: ru-um): šarrum is šar-ru-um, Hammurabi ḫa-am-mu-ra-bi
  function splitSyll(keys, w) {
    var ph = [], i = 0;
    while (i < w.length) { var c = String.fromCodePoint(w.codePointAt(i)); ph.push(c); i += c.length; }
    var V = function (c) { return 'aeiu'.indexOf(c) >= 0; }, syl = [], j = 0;
    while (j < ph.length) {
      var on = '', nu, co = '';
      if (!V(ph[j])) { on = ph[j]; j++; }
      if (j >= ph.length || !V(ph[j])) return null;                     // a consonant with no vowel to carry it
      nu = ph[j]; j++;
      // a consonant closes the syllable if another consonant (or the end of the word) follows it
      if (j < ph.length && !V(ph[j]) && (j + 1 >= ph.length || !V(ph[j + 1]))) { co = ph[j]; j++; }
      syl.push([on, nu, co]);
    }
    var out = [];
    for (var k = 0; k < syl.length; k++) {
      var s = syl[k], whole = s.join('');
      if (keys[whole]) { out.push(whole); continue; }
      if (s[0] && s[2]) { if (keys[s[0] + s[1]] && keys[s[1] + s[2]]) { out.push(s[0] + s[1], s[1] + s[2]); continue; } return null; }
      return null;
    }
    return out;
  }
  // Linear B: hyphenated syllables as given; a whole word spelt as its scribes did: a consonant takes the vowel that
  // follows it, a consonant at the end of a word or a nasal before another consonant is not written (ko-no-so)
  function linearB(sc, ix, w) {
    var ph = w.replace(/ph/g, 'p').replace(/th/g, 't').replace(/kh|ch/g, 'k').replace(/[cg]/g, 'k').replace(/b/g, 'p').replace(/l/g, 'r').replace(/y/g, 'j').replace(/x/g, 'ks').replace(/ps/g, 'pes');
    var out = [], V = 'aeiou';
    for (var i = 0; i < ph.length; i++) {
      var c = ph.charAt(i);
      if (V.indexOf(c) >= 0) { out.push(c); continue; }
      var j = i + 1; while (j < ph.length && V.indexOf(ph.charAt(j)) < 0) j++;
      if (j >= ph.length) break;                                   // final consonants are left out
      if ((c === 'n' || c === 'm' || c === 's') && j > i + 1) continue;   // so are nasals and s before a consonant
      if (j > i + 1) { out.push(c + ph.charAt(j)); continue; }       // a cluster: the first consonant borrows the vowel
      out.push(c + ph.charAt(j)); i = j;
    }
    out = out.map(function (s) { return ix.g[s] ? s : (ix.g[s.charAt(s.length - 1)] ? s.charAt(s.length - 1) : null); });
    return out.every(Boolean) && out.length ? out : null;
  }
  // Old Persian: a consonant with a or no vowel is its Ca sign; before i or u the Ci or Cu sign if there is one, then
  // the vowel sign; a long ā adds a; a nasal before a consonant is not written; capitals are word signs (XŠ, AM ...)
  function oldPersian(sc, ix, text) {
    var segs = [], DIV = ix.punct['.'] || '';
    nfc(text).split('\n').forEach(function (line, li) {
      if (li) segs.push(NL);
      line.split(/\s+/).filter(Boolean).forEach(function (word, wi) {
        if (wi) segs.push(seg(DIV, ' ', 'sp'));
        if (ix.word[word]) { segs.push(seg(ix.word[word][1], ix.word[word][0], 'w')); return; }
        var w = word.toLowerCase().replace(/th/g, 'θ').replace(/sh/g, 'š').replace(/kh/g, 'x').replace(/ch/g, 'c').replace(/ç/g, 'ç').replace(/w/g, 'v').replace(/-/g, '');
        var i = 0, V = 'aāiīuū';
        function isV(c) { return V.indexOf(c) >= 0; }
        while (i < w.length) {
          var c = w.charAt(i);
          // each sign is romanised by its own value (a-da-ma), as in a transliteration
          if (isV(c)) {   // a vowel on its own: at the start of the word or after another vowel
            var b = c === 'ā' ? 'a' : c === 'ī' ? 'i' : c === 'ū' ? 'u' : c;
            if (ix.g[b]) segs.push(seg(ix.g[b], b)); i++; continue;
          }
          var nx = w.charAt(i + 1);
          if ((c === 'n' || c === 'm') && nx && !isV(nx)) { i++; continue; }   // n before a consonant is not written
          if (!isV(nx)) { if (ix.g[c + 'a']) segs.push(seg(ix.g[c + 'a'], c + 'a')); i++; continue; }
          var bv = nx === 'ā' ? 'a' : nx === 'ī' ? 'i' : nx === 'ū' ? 'u' : nx;
          if (bv === 'a') { segs.push(seg(ix.g[c + 'a'] || '?', c + 'a')); if (nx === 'ā') segs.push(seg(ix.g.a, 'a')); i += 2; continue; }
          var own = ix.g[c + bv] ? c + bv : c + 'a';
          segs.push(seg(ix.g[own] || '?', own));
          segs.push(seg(ix.g[bv], bv)); i += 2;
        }
      });
    });
    return segs;
  }

  // ── hieroglyphs: one-sound signs from Latin letters, [word signs] and [determinatives] in brackets, a cartouche ──
  function hieroConvert(sc, text, opt) {
    var ix = index(sc);
    if (!sc._H) {
      var T = new Table();
      sc.signs.forEach(function (s) { T.add(s[0], { k: 'L', v: s[0] }); (s[2] || []).forEach(function (a) { T.add(a, { k: 'L', v: s[0] }); }); });
      sc._H = T;
    }
    var segs = [], s = nfc(text).toLowerCase(), i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === '\n') { segs.push(NL); i++; continue; }
      if (/\s/.test(c)) { if (segs.length && segs[segs.length - 1].k !== 'sp') segs.push(SP); i++; continue; }
      if (c === '[') {
        var e = s.indexOf(']', i); if (e < 0) e = s.length;
        var key = s.slice(i + 1, e).trim(), w = ix.word[key] || ix.det[key];
        segs.push(w ? seg(w[1], '[' + w[0] + ']', ix.word[key] ? 'w' : 'd') : seg('?', key, 'x'));
        i = e + 1; continue;
      }
      if (ix.punct[c]) { segs.push(seg(ix.punct[c], c === '(' || c === ')' ? '' : c, 'p')); i++; continue; }   // ( and ) are the ends of a cartouche
      var t = sc._H.at(s, i);
      if (t) {
        var last = segs[segs.length - 1], g = ix.g[t.x.v];
        if (!(last && last.v === t.x.v)) { var sg = seg(g, t.x.v); sg.v = t.x.v; segs.push(sg); }   // a doubled sound is written once
        i += t.f.length; continue;
      }
      i++;
    }
    if (opt.cartouche && segs.length && ix.punct['('] && ix.punct[')']) {
      // a cartouche around each line
      var out = [], line = [];
      segs.concat([NL]).forEach(function (x) {
        if (x.k === 'nl') { if (line.length) { out.push(seg(ix.punct['('], '', 'p')); out = out.concat(line.filter(function (y) { return y.k !== 'sp'; })); out.push(seg(ix.punct[')'], '', 'p')); } out.push(NL); line = []; }
        else line.push(x);
      });
      out.pop(); segs = out;
    }
    return segs;
  }

  // ── Chinese characters: the text itself; the pinyin comes from the keys or hanzi.json ───────────────────────────
  var HANZI = null;
  function hanConvert(sc, text) {
    var ix = index(sc), segs = [];
    if (!sc._py) { sc._py = Object.create(null); sc.groups.forEach(function (g) { g[1].forEach(function (k) { sc._py[k[1]] = k[0]; }); }); }
    Array.from(nfc(text)).forEach(function (ch) {
      if (ch === '\n') { segs.push(NL); return; }
      if (/\s/.test(ch)) { segs.push(SP); return; }
      if (ix.punct[ch]) { segs.push(seg(ix.punct[ch], '', 'p')); return; }   // , and . typed become 、 and 。
      var py = sc._py[ch] || (HANZI && HANZI.r[ch]) || '';
      segs.push(seg(ch, py, RX_HAN.test(ch) ? 'l' : 'p'));
    });
    return segs;
  }

  // ── one entry point ──────────────────────────────────────────────────────────────────────────────────────────────
  function convert(sc, text, opt) {
    opt = opt || {};
    var segs = sc.engine === 'abugida' ? abugidaConvert(sc, text) : sc.engine === 'syllabic' ? syllabicConvert(sc, text, opt) :
      sc.engine === 'hiero' ? hieroConvert(sc, text, opt) : sc.engine === 'han' ? hanConvert(sc, text) : lettersConvert(sc, text, opt);
    return segs;
  }
  // the written text, and its romanisation: syllables joined by hyphens in the syllabic scripts, letters run together
  function written(segs) { return segs.map(function (s) { return s.g; }).join(''); }
  function roman(sc, segs) {
    var out = '', prev = null;
    segs.forEach(function (s) {
      if (s.k === 'sp') { out += ' '; prev = null; return; }
      if (s.k === 'nl') { out += '\n'; prev = null; return; }
      if (sc.engine === 'syllabic' && prev && s.r && prev.k !== 'd' && s.k !== 'd') out += prev.k === 'w' && s.k === 'w' ? '.' : '-';   // AMAR.UTU, a-wi-lum
      if (sc.engine === 'han' && prev && s.r) out += ' ';
      out += s.r; prev = s;
    });
    return out.replace(/ +/g, ' ').trim();
  }

  var api = { convert: convert, written: written, roman: roman, normVal: normVal };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return api; }

  // ── fonts: the scripts most devices lack, self-hosted (Noto, OFL), loaded when a tool opens ──────────────────────
  var FONTS = {
    cuneiform: ['Epoch Cuneiform', 'noto-sans-cuneiform'], hieroglyphs: ['Epoch Hieroglyphs', 'noto-sans-egyptian-hieroglyphs'],
    oldpersian: ['Epoch Old Persian', 'noto-sans-old-persian'], linearb: ['Epoch Linear B', 'noto-sans-linear-b'],
    imperialaramaic: ['Epoch Imperial Aramaic', 'noto-sans-imperial-aramaic'], syriac: ['Epoch Syriac', 'noto-sans-syriac'],
    brahmi: ['Epoch Brahmi', 'noto-sans-brahmi'], phoenician: ['Epoch Phoenician', 'noto-sans-phoenician'],
    oldturkic: ['Epoch Old Turkic', 'noto-sans-old-turkic'], runic: ['Epoch Runic', 'noto-sans-runic']
  };
  // the device's own fonts for the scripts every system has, the most book-like first
  var SYSTEM = {
    hebrew: '"SBL Hebrew", "Ezra SIL", "Noto Serif Hebrew", "Times New Roman", serif',
    arabic: 'Amiri, "Noto Naskh Arabic", "Scheherazade New", "Traditional Arabic", "Times New Roman", serif',
    persian: 'Amiri, "Noto Naskh Arabic", "Scheherazade New", "B Nazanin", "Times New Roman", serif',
    'ancient-greek': '"Gentium Plus", "GFS Didot", "Noto Serif", "Palatino Linotype", "Times New Roman", serif',
    sanskrit: '"Noto Serif Devanagari", "Kohinoor Devanagari", "Nirmala UI", Mangal, sans-serif',
    'classical-chinese': '"Noto Serif TC", "Noto Serif CJK TC", "Songti TC", PMingLiU, MingLiU, SimSun, serif'
  };
  var loaded = {};
  function family(slug, sc) { var f = FONTS[sc.font]; return f ? '"' + f[0] + '", "Segoe UI Historic", sans-serif' : (SYSTEM[slug] || 'serif'); }
  function loadFont(sc) {
    var f = FONTS[sc.font]; if (!f || !window.FontFace) return Promise.resolve();
    if (!loaded[sc.font]) {
      var ff = new FontFace(f[0], 'url(/fonts/' + f[1] + '.woff2) format("woff2")');
      loaded[sc.font] = ff.load().then(function (x) { document.fonts.add(x); }).catch(function () {});
    }
    return loaded[sc.font];
  }
  function getJSON(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  var LANG_CACHE = {};
  function loadLang(slug) { return LANG_CACHE[slug] || (LANG_CACHE[slug] = getJSON('/data/scribe/' + slug + '.json?v=' + LANGS_V)); }
  var HANZI_P = null;
  function loadHanzi() {
    return HANZI_P || (HANZI_P = getJSON('/data/scribe/hanzi.json?v=' + HANZI_V).then(function (d) {
      HANZI = { list: d.c, r: Object.create(null) };
      d.c.forEach(function (x) { if (!HANZI.r[x[0]]) HANZI.r[x[0]] = x[1]; });
      return HANZI;
    }));
  }
  function plainPy(s) { return nfd(s).replace(RX_COMB_G, '').toLowerCase().replace(/ü/g, 'v'); }

  // remembered per language: the script, the text and the switches (this browser only)
  function remember(slug, st) { try { var all = JSON.parse(localStorage.getItem('epoch-scribe') || '{}'); all[slug] = st; localStorage.setItem('epoch-scribe', JSON.stringify(all)); } catch (e) {} }
  function recall(slug) { try { return (JSON.parse(localStorage.getItem('epoch-scribe') || '{}') || {})[slug] || null; } catch (e) { return null; } }
  var E = function (s) { return typeof escHtml === 'function' ? escHtml(s) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LANGCODE = { sumerian: 'sux', akkadian: 'akk', 'ancient-egyptian': 'egy', 'ancient-greek': 'grc', aramaic: 'arc', sanskrit: 'sa', 'classical-chinese': 'lzh', arabic: 'ar', persian: 'fa', 'old-turkic': 'otk', hebrew: 'he', 'old-norse': 'non' };

  // ── the tool ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function mount(el, slug) {
    el.innerHTML = '<p class="scr-loading">Loading the keyboard…</p>';
    return loadLang(slug).then(function (L) { build(el, slug, L); }).catch(function () {
      el.innerHTML = '<p class="scr-loading">The keyboard could not be loaded. Please try again later.</p>';
    });
  }
  function build(el, slug, L) {
    var saved = recall(slug) || {}, si = Math.max(0, L.scripts.findIndex(function (s) { return s.id === saved.s; }));
    var st = { si: si, text: typeof saved.t === 'string' ? saved.t : '', opt: saved.o || {}, sample: null, consA: false };
    var uid = 'scr-' + slug;
    el.innerHTML =
      '<div class="scr" id="' + uid + '">' +
        (L.scripts.length > 1 ? '<div class="scr-scripts" role="radiogroup" aria-label="Script">' + L.scripts.map(function (s, i) { return '<button type="button" role="radio" class="scr-script" data-i="' + i + '">' + E(s.label) + '</button>'; }).join('') + '</div>' : '') +
        '<p class="scr-about"></p>' +
        '<div class="scr-board"><div class="scr-out"><span class="scr-text"></span></div><p class="scr-roman" aria-live="polite"></p></div>' +
        '<div class="scr-type"><label class="scr-lab" for="' + uid + '-in"></label>' +
          '<textarea id="' + uid + '-in" class="scr-in" rows="2" maxlength="300" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea>' +
          '<div class="scr-han" hidden><label class="scr-lab" for="' + uid + '-py">Find a character by its pinyin</label><input id="' + uid + '-py" class="scr-py" type="search" placeholder="xue, dao, ren …" autocomplete="off" spellcheck="false"><div class="scr-cands" role="group" aria-label="Characters found"></div></div>' +
          '<div class="scr-opts"></div></div>' +
        '<div class="scr-kb" role="group" aria-label="Keyboard"><div class="scr-groups"></div>' +
          '<div class="scr-kb-acts"><button type="button" class="scr-act" data-a="space">Space</button><button type="button" class="scr-act" data-a="back">&#9003; Back</button><button type="button" class="scr-act" data-a="clear">Clear</button></div></div>' +
        '<p class="scr-note"></p>' +
        '<div class="scr-samples"></div>' +
        '<div class="scr-acts"><button type="button" class="hero-cta scr-make">Make a picture</button><button type="button" class="scr-act scr-copy">Copy the text</button><button type="button" class="scr-act scr-share">Share</button></div>' +
        '<div class="scr-pic" hidden><img class="scr-pic-img" alt=""><div class="scr-pic-acts"><a class="scr-act scr-dl" download>Download</a><button type="button" class="scr-act scr-copypic" hidden>Copy the picture</button><button type="button" class="scr-act scr-sharepic">Share the picture</button></div><p class="scr-pic-tip"></p></div>' +
        '<p class="scr-status" role="status"></p>' +
      '</div>';
    var root = el.querySelector('.scr'), $ = function (s) { return root.querySelector(s); };
    var input = $('.scr-in'), out = $('.scr-text'), board = $('.scr-out');
    var caret = null;   // the last place of the caret in the text (the keys type there without opening the phone's keyboard)
    input.addEventListener('select', function () { caret = [input.selectionStart, input.selectionEnd]; });
    input.addEventListener('keyup', function () { caret = [input.selectionStart, input.selectionEnd]; });
    input.addEventListener('click', function () { caret = [input.selectionStart, input.selectionEnd]; });
    input.addEventListener('input', function () { st.text = input.value; st.sample = null; st.consA = false; caret = [input.selectionStart, input.selectionEnd]; render(); });
    function sc() { return L.scripts[st.si]; }
    function status(t) { $('.scr-status').textContent = t || ''; }

    function setScript(i) {
      st.si = i; var s = sc();
      Array.prototype.forEach.call(root.querySelectorAll('.scr-script'), function (b, j) { b.setAttribute('aria-checked', String(j === i)); });
      $('.scr-about').textContent = s.about;
      $('.scr-note').textContent = s.note;
      root.setAttribute('data-engine', s.engine);
      $('.scr-lab').textContent = s.engine === 'han' ? 'Your text (characters)' : 'Type in Latin letters';
      $('.scr-han').hidden = s.engine !== 'han';
      board.setAttribute('dir', s.dir === 'rtl' ? 'rtl' : 'ltr');
      board.setAttribute('lang', LANGCODE[slug] || '');
      board.style.fontFamily = family(slug, s);
      // the switches this script has
      var opts = [];
      if (s.vowelmarks) opts.push(['marks', 'Vowel marks']);
      if (s.caps) opts.push(['caps', 'As on stone (capitals)']);
      if (s.engine === 'hiero') opts.push(['cartouche', 'In a cartouche']);
      if (s.vertical) opts.push(['vertical', 'Top to bottom']);
      $('.scr-opts').innerHTML = opts.map(function (o) { return '<label class="scr-opt"><input type="checkbox" data-o="' + o[0] + '"' + (st.opt[o[0]] ? ' checked' : '') + '> ' + o[1] + '</label>'; }).join('');
      keys(); samples();
      board.classList.add('is-loading');
      loadFont(s).then(function () { board.classList.remove('is-loading'); render(); });
      if (s.engine === 'han') loadHanzi().then(function () { render(); }).catch(function () {});
      render();
    }
    // the keyboard: one row per group; a key shows the sign, its value and how it sounds
    function keys() {
      var s = sc(), groups = s.groups.slice(), fam = family(slug, s);
      if (st.opt.marks && s.vowelmarks && s.marks.length) groups.push(['Vowel marks', s.marks.filter(function (m) { return /^[aeiouāēīōū]$/.test(m[0]); }).map(function (m) { return [m[0], cp(0x25CC) + m[1], m[2] || m[0], 'm']; })]);
      $('.scr-groups').innerHTML = groups.map(function (g) {
        return '<section class="scr-grp"><h4 class="scr-grp-t">' + E(g[0]) + '</h4><div class="scr-keys">' + g[1].map(function (k) {
          var hint = String(k[2] || ''), parts = hint.split(' · '), sound = parts.length > 1 ? parts.slice(1).join(' · ') : (hint !== k[0] ? hint : '');
          var val = s.engine === 'han' ? k[0] : (k[3] === '2' ? '{' + k[0] + '}' : k[0]);
          return '<button type="button" class="scr-key' + (k[3] === '1' ? ' is-word' : k[3] === '2' ? ' is-det' : '') + '" data-v="' + E(k[0]) + '" data-g="' + E(k[1]) + '" data-k="' + (k[3] || '') + '" title="' + E(hint || k[0]) + '" aria-label="' + E(k[1] + ', ' + (hint || k[0])) + '">' +
            '<span class="scr-kg" style="font-family:' + E(fam) + '" dir="' + (s.dir === 'rtl' ? 'rtl' : 'ltr') + '">' + E(k[1]) + '</span>' +
            '<span class="scr-kv">' + E(s.engine === 'han' ? k[0] : val) + '</span>' + (sound && s.engine !== 'han' ? '<span class="scr-kh">' + E(sound) + '</span>' : s.engine === 'han' ? '<span class="scr-kh">' + E(hint) + '</span>' : '') + '</button>';
        }).join('') + '</div></section>';
      }).join('') + (s.engine === 'abugida' && s.marks.some(function (m) { return m[0] === 'virama'; }) ? '<section class="scr-grp"><h4 class="scr-grp-t">Join consonants</h4><div class="scr-keys"><button type="button" class="scr-key" data-a="virama" title="no vowel after the consonant: the next one joins it" aria-label="virāma: no vowel, join the next consonant"><span class="scr-kg" style="font-family:' + E(fam) + '">' + cp(0x25CC) + s.marks.filter(function (m) { return m[0] === 'virama'; })[0][1] + '</span><span class="scr-kv">virāma</span><span class="scr-kh">no vowel</span></button></div></section>' : '');
    }
    function samples() {
      var s = sc();
      $('.scr-samples').innerHTML = s.samples.length ? '<span class="scr-try">Try:</span> ' + s.samples.map(function (x, i) { return '<button type="button" class="scr-sample" data-i="' + i + '" title="' + E(x[1]) + '">' + E(x[0]) + '</button>'; }).join('') : '';
    }
    // what was written
    var lastSegs = [];
    function render() {
      var s = sc(), segs = convert(s, st.text, st.opt);
      lastSegs = segs;
      var w = written(segs);
      out.textContent = w || '';
      board.classList.toggle('is-empty', !w);
      board.classList.toggle('is-vertical', !!(st.opt.vertical && s.vertical));
      $('.scr-roman').textContent = w ? roman(s, segs) : '';
      if (input.value !== st.text) input.value = st.text;
      remember(slug, { s: s.id, t: st.text, o: st.opt });
      $('.scr-pic').hidden = true;
    }
    // typing from the keys, at the caret
    function put(txt, replaceBack) {
      var a = caret ? caret[0] : st.text.length, b = caret ? caret[1] : st.text.length;
      if (a > st.text.length) a = b = st.text.length;
      var before = st.text.slice(0, a - (replaceBack || 0)), after = st.text.slice(b);
      st.text = before + txt + after; caret = [before.length + txt.length, before.length + txt.length]; st.sample = null;
      render();
    }
    function prevChar() { var a = caret ? caret[0] : st.text.length; return st.text.slice(0, a).slice(-1); }
    var IAST_VOW = IAST_V;
    function keyTyped(btn) {
      var s = sc(), v = btn.getAttribute('data-v'), kind = btn.getAttribute('data-k'), g = btn.getAttribute('data-g'), pc = prevChar();
      if (btn.getAttribute('data-a') === 'virama') { if (st.consA && pc === 'a') { put('', 1); } st.consA = false; return; }
      if (s.engine === 'han') { put(kind === '3' ? v : g); return; }
      if (s.engine === 'hiero') { put(kind === '1' || kind === '2' ? '[' + v + ']' : v); return; }
      if (s.engine === 'syllabic') {
        if (kind === '3') { put(v); return; }
        if (kind === '2') { put((pc && !/[\s{\-.(]/.test(pc) ? ' ' : '') + '{' + v + '}'); return; }
        var join = pc && !/[\s}\-.(]/.test(pc);
        put((join ? (kind === '1' && /[A-ZŠṢṬḪ0-9₀-₉]/.test(pc) ? '.' : '-') : '') + v);
        return;
      }
      if (s.engine === 'abugida') {
        if (kind === '3') { st.consA = false; put(v); return; }
        if (IAST_VOW.indexOf(v) >= 0) { var rep = st.consA && pc === 'a' ? 1 : 0; st.consA = false; if (v === 'a' && rep) return; put(v, rep); return; }
        st.consA = true; put(v + 'a'); return;
      }
      if (s.exact && kind !== '3') { put('[' + v + ']'); return; }
      put(v);
    }
    // Back takes away the last thing typed: a sign in brackets or braces, a syllable, or a letter with its marks
    function back() {
      var a = caret ? caret[0] : st.text.length, t = st.text.slice(0, a), m, cut;
      if (!t) return;
      if ((m = /\[[^\]]*\]$/.exec(t)) || (m = /\{[^}]*\}$/.exec(t))) cut = m[0].length;
      else if (sc().engine === 'syllabic' && (m = /[-.]?[^\s\-.{}]+$/.exec(t))) cut = m[0].length;
      else { var ch = Array.from(t), k = ch.length - 1; while (k > 0 && RX_COMB.test(ch[k])) k--; cut = ch.slice(k).join('').length; }
      st.text = t.slice(0, t.length - cut) + st.text.slice(a); caret = [a - cut, a - cut]; st.consA = false; render();
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.classList.contains('scr-script')) { setScript(+b.getAttribute('data-i')); return; }
      if (b.classList.contains('scr-key')) { keyTyped(b); return; }
      if (b.classList.contains('scr-sample')) { var x = sc().samples[+b.getAttribute('data-i')]; st.text = x[0]; st.sample = x; st.consA = false; caret = null; render(); st.sample = x; status(x[1]); return; }
      if (b.classList.contains('scr-cand')) { put(b.getAttribute('data-g')); return; }
      var a = b.getAttribute('data-a');
      if (a === 'space') put(' '); else if (a === 'back') back(); else if (a === 'clear') { st.text = ''; caret = null; st.consA = false; render(); }
      if (b.classList.contains('scr-make')) makePicture();
      if (b.classList.contains('scr-copy')) { var w = written(lastSegs); if (!w) return status('Write something first.'); (typeof copyText === 'function' ? copyText(w) : navigator.clipboard.writeText(w)).then(function () { status('Copied: ' + w); }, function () { status('Copying was refused by the browser.'); }); }
      if (b.classList.contains('scr-share')) { var w2 = written(lastSegs); if (!w2) return status('Write something first.'); pictureBlob().then(function (blob) { share(blob, w2); }); }
      if (b.classList.contains('scr-copypic')) { if (picBlob && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({ 'image/png': picBlob })]).then(function () { status('The picture is copied.'); }, function () { status('Copying pictures was refused by the browser.'); }); }
      if (b.classList.contains('scr-sharepic')) { if (picBlob) share(picBlob, written(lastSegs)); }
    });
    root.addEventListener('change', function (e) {
      var o = e.target.getAttribute && e.target.getAttribute('data-o'); if (!o) return;
      st.opt[o] = e.target.checked; if (o === 'marks') keys(); render();
    });
    // Chinese: characters by their pinyin (tones optional), the most frequent first
    var py = $('.scr-py');
    py.addEventListener('input', function () {
      var q = plainPy(py.value.trim()).replace(/[1-5]/g, ''), box = $('.scr-cands');
      if (!q) { box.innerHTML = ''; return; }
      loadHanzi().then(function (H) {
        var hits = [], exact = [];
        for (var i = 0; i < H.list.length && exact.length + hits.length < 400; i++) { var p = plainPy(H.list[i][1]); if (p === q) exact.push(H.list[i]); else if (p.indexOf(q) === 0) hits.push(H.list[i]); }
        var all = exact.concat(hits).slice(0, 24);
        box.innerHTML = all.length ? all.map(function (x) { return '<button type="button" class="scr-cand" data-g="' + E(x[0]) + '" title="' + E(x[1] + ': ' + x[2]) + '"><span class="scr-cg">' + E(x[0]) + '</span><span class="scr-cp">' + E(x[1]) + '</span><span class="scr-cm">' + E(x[2]) + '</span></button>'; }).join('') : '<p class="scr-none">No character with that reading here.</p>';
      }).catch(function () { box.innerHTML = '<p class="scr-none">The list of characters could not be loaded.</p>'; });
    });

    // ── the picture ──────────────────────────────────────────────────────────────────────────────────────────────
    var picBlob = null, picUrl = null;
    function pictureBlob() {
      var s = sc(), w = written(lastSegs);
      return loadFont(s).then(function () {
        return (document.fonts && document.fonts.load ? document.fonts.load('80px ' + family(slug, s), w).catch(function () {}) : Promise.resolve());
      }).then(function () {
        var cv = drawPicture({ lang: L.name, script: s.label, material: s.material, family: family(slug, s), dir: s.dir, text: w, roman: roman(s, lastSegs), meaning: st.sample ? st.sample[1] : '', vertical: !!(st.opt.vertical && s.vertical) });
        return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/png'); });
      });
    }
    function makePicture() {
      if (!written(lastSegs)) return status('Write something first.');
      status('Making the picture…');
      pictureBlob().then(function (blob) {
        picBlob = blob; if (picUrl) URL.revokeObjectURL(picUrl); picUrl = URL.createObjectURL(blob);
        var box = $('.scr-pic'), img = $('.scr-pic-img'), dl = $('.scr-dl');
        img.src = picUrl; img.alt = L.name + ' in ' + sc().label + ': ' + written(lastSegs);
        dl.href = picUrl; dl.setAttribute('download', 'epoch-' + slug + '.png');
        var inapp = !!window.EPOCH_INAPP;
        dl.hidden = inapp;
        $('.scr-copypic').hidden = !(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) || inapp;
        $('.scr-pic-tip').textContent = inapp ? 'Press and hold the picture to save it.' : '';
        box.hidden = false; status('');
        if (box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }
    function share(blob, w) {
      if (typeof sharePoster !== 'function') return;
      var url = 'https://the-epoch-institute.org' + location.pathname + (location.pathname === '/write' ? '#' + slug : '#write');
      sharePoster({ text: w + ' (' + L.name + ', ' + sc().label + ')', url: url, title: 'Written in ' + L.name, heading: 'Share what you wrote', image: blob, file: 'epoch-' + slug + '.png', alt: L.name + ': ' + w });
    }

    var startI = st.si; setScript(startI);
  }

  // ── the picture: the writing on its material, drawn on a 1080 x 1080 canvas ───────────────────────────────────────
  // the materials are painted in code (no pictures to fetch): clay, papyrus, marble, parchment, rock, sandstone, a palm
  // leaf, a stele, a runestone and a paper scroll; the ink and the carving take the colours of each
  var MAT = {
    clay: { bg: ['#c99a64', '#9c6e41'], ink: '#4a2f17', shade: 'rgba(255,240,215,0.35)', tablet: true },
    papyrus: { bg: ['#ecd9a8', '#cdb27a'], ink: '#1d150c', fibres: true },
    marble: { bg: ['#f3f1ec', '#d9d5cc'], ink: '#35302a', veins: true, cut: true },
    parchment: { bg: ['#f2e3c2', '#d8bf8e'], ink: '#24170c', vignette: true },
    rock: { bg: ['#a29a8e', '#6f685f'], ink: '#2b2722', grain: true, cut: true, panel: true },
    sandstone: { bg: ['#d9b48a', '#b48a5e'], ink: '#4b2e16', grain: true, cut: true },
    palmleaf: { bg: ['#2b2116', '#1a140d'], ink: '#2a1a0a', leaf: true },
    stele: { bg: ['#7d7a75', '#4e4c48'], ink: '#1f1e1c', grain: true, cut: true, panel: true },
    runestone: { bg: ['#8d8b86', '#5e5c58'], ink: '#a3241a', grain: true, paint: true },
    scroll: { bg: ['#efe6d0', '#dccfae'], ink: '#14100a', scroll: true }
  };
  function rnd(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function drawPicture(o) {
    var S = 1080, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    var c = cv.getContext('2d'), m = MAT[o.material] || MAT.parchment, r = rnd(7919);
    // ground
    var g = c.createRadialGradient(S / 2, S * 0.42, S * 0.1, S / 2, S / 2, S * 0.75); g.addColorStop(0, m.bg[0]); g.addColorStop(1, m.bg[1]);
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    var box = [90, 150, S - 180, 640];   // where the writing goes
    if (m.tablet) {   // a clay tablet: a pillow-shaped slab with a lit edge
      c.save(); c.shadowColor = 'rgba(0,0,0,0.35)'; c.shadowBlur = 40; c.shadowOffsetY = 14;
      roundRect(c, 70, 110, S - 140, 760, 70); var tg = c.createLinearGradient(0, 110, 0, 870); tg.addColorStop(0, '#d8ab74'); tg.addColorStop(1, '#a9773f'); c.fillStyle = tg; c.fill(); c.restore();
      c.strokeStyle = m.shade; c.lineWidth = 6; roundRect(c, 76, 116, S - 152, 748, 64); c.stroke();
    }
    if (m.fibres) { for (var i = 0; i < 260; i++) { c.strokeStyle = 'rgba(120,90,40,' + (0.05 + r() * 0.08) + ')'; c.lineWidth = 1 + r() * 2; var y = r() * S; c.beginPath(); c.moveTo(0, y); c.lineTo(S, y + (r() - 0.5) * 6); c.stroke(); } for (i = 0; i < 90; i++) { c.strokeStyle = 'rgba(110,80,30,' + (0.03 + r() * 0.05) + ')'; c.lineWidth = 1 + r() * 2; var x = r() * S; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 8, S); c.stroke(); } }
    if (m.veins) { for (i = 0; i < 9; i++) { c.strokeStyle = 'rgba(120,115,105,' + (0.12 + r() * 0.15) + ')'; c.lineWidth = 0.8 + r() * 2.2; c.beginPath(); var x0 = r() * S, y0 = r() * S; c.moveTo(x0, y0); c.bezierCurveTo(x0 + (r() - 0.5) * 700, y0 + (r() - 0.5) * 500, x0 + (r() - 0.5) * 700, y0 + (r() - 0.5) * 500, x0 + (r() - 0.5) * 900, y0 + (r() - 0.5) * 900); c.stroke(); } }
    if (m.grain) { for (i = 0; i < 6000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + (r() * 0.08) + ')' : 'rgba(0,0,0,' + (r() * 0.1) + ')'; c.fillRect(r() * S, r() * S, 1 + r() * 2.5, 1 + r() * 2.5); } }
    if (m.panel) { c.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(c, 80, 120, S - 160, 720, 18); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 3; c.stroke(); }
    if (m.vignette) { var vg = c.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,50,10,0.35)'); c.fillStyle = vg; c.fillRect(0, 0, S, S); }
    if (m.leaf) {   // a palm leaf with its two binding holes
      c.save(); c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; roundRect(c, 40, 300, S - 80, 380, 60); var lg = c.createLinearGradient(0, 300, 0, 680); lg.addColorStop(0, '#e8c98a'); lg.addColorStop(0.5, '#d9b06a'); lg.addColorStop(1, '#c2934c'); c.fillStyle = lg; c.fill(); c.restore();
      for (i = 0; i < 40; i++) { c.strokeStyle = 'rgba(120,80,30,0.12)'; c.lineWidth = 1; var ly = 310 + r() * 360; c.beginPath(); c.moveTo(60, ly); c.lineTo(S - 60, ly + (r() - 0.5) * 4); c.stroke(); }
      [[S * 0.3, 490], [S * 0.7, 490]].forEach(function (h) { c.fillStyle = '#2b2116'; c.beginPath(); c.arc(h[0], h[1], 14, 0, Math.PI * 2); c.fill(); });
      box = [80, 330, S - 160, 320];
    }
    if (m.scroll) {   // a hanging paper scroll with wooden rollers
      c.fillStyle = '#3a2416'; roundRect(c, 150, 40, S - 300, 26, 13); c.fill(); roundRect(c, 150, S - 216, S - 300, 26, 13); c.fill();
      c.fillStyle = '#f6efdc'; c.fillRect(190, 66, S - 380, S - 282); c.strokeStyle = 'rgba(150,40,30,0.55)'; c.lineWidth = 3; c.strokeRect(220, 96, S - 440, S - 342);
      box = [240, 120, S - 480, S - 390];
    }
    // the writing, as large as fits
    c.fillStyle = m.ink; c.textBaseline = 'alphabetic';
    if (o.vertical) drawVertical(c, o.text, o.family, box); else drawLines(c, o.text, o.family, box, o.dir === 'rtl', m);
    // the romanisation, the meaning, and where it was made
    var foot = m.scroll ? S - 175 : m.leaf ? 750 : 880;
    c.textAlign = 'center'; c.direction = 'ltr';
    c.fillStyle = m.leaf || m.scroll ? '#e9dcc0' : 'rgba(20,14,8,0.82)';
    if (m.leaf || m.scroll || o.material === 'stele' || o.material === 'runestone' || o.material === 'rock') c.fillStyle = m.scroll ? '#3a2416' : '#f1eadb';
    c.font = 'italic 40px "Crimson Pro", Georgia, serif';
    fitLine(c, o.roman, S - 160, 40, 'italic', '"Crimson Pro", Georgia, serif'); c.fillText(o.roman, S / 2, foot);
    if (o.meaning) { c.font = '28px "Crimson Pro", Georgia, serif'; fitLine(c, o.meaning, S - 160, 28, '', '"Crimson Pro", Georgia, serif'); c.fillText(o.meaning, S / 2, foot + 46); }
    c.font = '600 22px "Source Sans 3", "Segoe UI", sans-serif';
    c.fillText((o.lang + ' · ' + o.script).toUpperCase(), S / 2, S - 70);
    c.font = '20px "Source Sans 3", "Segoe UI", sans-serif';
    c.fillText('the-epoch-institute.org/write', S / 2, S - 40);
    return cv;
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fitLine(c, t, max, px, style, fam) { var p = px; c.font = (style ? style + ' ' : '') + p + 'px ' + fam; while (p > 14 && c.measureText(t).width > max) { p -= 2; c.font = (style ? style + ' ' : '') + p + 'px ' + fam; } }
  // lines broken at spaces (or between signs where a script has no spaces), at the largest size that fits the box
  function drawLines(c, text, fam, box, rtl, m) {
    var paras = text.split('\n'), px = 280, lines, lh;
    function wrap(size) {
      c.font = size + 'px ' + fam; var out = [];
      paras.forEach(function (p) {
        var words = p.split(' '), cur = '';
        words.forEach(function (w) {
          var t = cur ? cur + ' ' + w : w;
          if (c.measureText(t).width <= box[2] || !cur) {
            if (!cur && c.measureText(w).width > box[2]) {   // one long word: break it between its signs
              var chars = Array.from(w), piece = '';
              chars.forEach(function (ch) { if (c.measureText(piece + ch).width > box[2] && piece) { out.push(piece); piece = ''; } piece += ch; });
              cur = piece;
            } else cur = t;
          } else { out.push(cur); cur = w; }
        });
        out.push(cur);
      });
      return out;
    }
    for (; px >= 28; px -= 6) { lines = wrap(px); lh = px * 1.35; if (lines.length * lh <= box[3]) break; }
    c.textAlign = 'center'; c.direction = rtl ? 'rtl' : 'ltr';
    var y0 = box[1] + (box[3] - lines.length * lh) / 2 + px;
    lines.forEach(function (l, i) {
      var y = y0 + i * lh;
      if (m.cut) { c.save(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillText(l, box[0] + box[2] / 2 + 2, y + 2); c.restore(); }   // a carved edge
      c.fillText(l, box[0] + box[2] / 2, y);
    });
  }
  // Chinese in columns, top to bottom and right to left
  function drawVertical(c, text, fam, box) {
    var chars = Array.from(text.replace(/\s+/g, '')), n = chars.length || 1, px = 150, rows, cols;
    for (; px >= 30; px -= 4) { rows = Math.floor(box[3] / (px * 1.08)); cols = Math.ceil(n / Math.max(1, rows)); if (cols * px * 1.35 <= box[2]) break; }
    c.font = px + 'px ' + fam; c.textAlign = 'center';
    var colW = px * 1.35, x0 = box[0] + box[2] / 2 + (cols - 1) * colW / 2;
    chars.forEach(function (ch, i) {
      var col = Math.floor(i / rows), row = i % rows;
      c.fillText(ch, x0 - col * colW, box[1] + px + row * px * 1.08);
    });
  }

  // the language profiles' #write section: <div class="scribe" data-lang="akkadian">
  return { mount: mount, convert: convert, written: written, roman: roman, normVal: normVal, picture: drawPicture };
})();
