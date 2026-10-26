// shared-nav.js — injected on every page of The Epoch Institute

// ── Shared utilities ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Kids mode keeps wars and killings out of the day's events at first (the home page's On This Day, the day pages):
// grim words anywhere, military ones only in the title (a description may mention an army in passing)
function kidsGentle(title, desc) {
  return !/\b(wars?|warfare|battles?|massacr\w*|kill(s|ed|ing|ings)?|slain|execut(e|ed|es|ion|ions|ing)|assassin\w*|bomb(s|ed|er|ers|ing|ings)?|attack\w*|invad\w*|invasions?|sieges?|besieg\w*|murder\w*|slaughter\w*|genocide|kamikaze|suicide|behead\w*|hanged|pogroms?|terror\w*|atrocit\w*|tortur\w*|crucifi\w*|burned at the stake)\b/i.test((title || '') + ' ' + (desc || '')) &&
    !/\b(shot|shoot\w*|raid\w*|sack(s|ed)?|troops|arm(y|ies|ed)|coup|defeats?|routs?|occup(y|ies|ied)|captur\w*|bombard\w*|destroys?|surrender\w*|conquer\w*)\b/i.test(title || '');
}

// The newsletter (Formspree): the same form as FORMSPREE_URL in shared-data.js, which the generated reference pages
// do not load. Resolves when Formspree accepted the address.
var NEWSLETTER_URL = 'https://formspree.io/f/mpqkezdj';
function subscribeNewsletter(email, source) {
  return fetch(typeof FORMSPREE_URL !== 'undefined' ? FORMSPREE_URL : NEWSLETTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email: email, _subject: 'Newsletter signup — ' + source, source: source })
  }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res; });
}

// After a daily challenge: the weekly newsletter in one line (none once this browser has signed up). The form is
// handled by initNav (form[data-nl]); the source names where it was shown.
function newsletterPrompt(source) {
  try { if (localStorage.getItem('epoch-nl')) return ''; } catch (e) {}
  return '<form class="gm-nl" data-nl="' + escHtml(source) + '" novalidate><p class="gm-nl-t">A new puzzle and a story from history, every week by email</p><span class="gm-nl-row"><input type="email" required placeholder="your@email.com" aria-label="Your email address"><button type="submit">Sign up</button></span><p class="gm-nl-msg" aria-live="polite"></p></form>';
}

// ── In-app browsers ───────────────────────────────────────────────────────────────────────────────────────────────
// A link tapped in Instagram, Facebook or Messenger opens in the app's own browser: on Android it has no share sheet
// and saves no downloads, and every app keeps its own storage (scores and streaks stay there). EPOCH_INAPP is
// { app, os, name } there (html.in-app for the CSS), else null.
var EPOCH_INAPP = (function () {
  var ua = navigator.userAgent || '', os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : '';
  var APPS = [[/Instagram/, 'Instagram'], [/MicroMessenger/, 'WeChat'], [/Messenger|Orca-Android/, 'Messenger'], [/FBAN|FBAV|FB_IAB|FB4A|FBIOS/, 'Facebook'],
    [/Barcelona/, 'Threads'], [/musical_ly|TikTok|BytedanceWebview/i, 'TikTok'], [/Snapchat/, 'Snapchat'], [/LinkedInApp/, 'LinkedIn'], [/Pinterest/, 'Pinterest'], [/\bLine\//, 'LINE']];
  for (var i = 0; i < APPS.length; i++) if (APPS[i][0].test(ua)) return { app: APPS[i][1], os: os, name: APPS[i][1] + '’s browser' };
  if (os === 'android' && /; wv\)/.test(ua)) return { app: '', os: os, name: 'this app’s browser' };
  return null;
})();
if (EPOCH_INAPP) document.documentElement.classList.add('in-app');
// the way out to the reader's own browser: on Android a link the apps hand to the system, everywhere the app's menu
function inAppTip(why) {
  if (!EPOCH_INAPP) return '';
  var u = location.href.split('#')[0];
  return '<p class="ia-tip"><b>You are in ' + escHtml(EPOCH_INAPP.name) + '.</b> ' + escHtml(why) + ' open the page in your own browser: use the app’s ' +
    (EPOCH_INAPP.os === 'android' ? '⋮' : '⋯') + ' menu and choose to open it in ' + (EPOCH_INAPP.os === 'ios' ? 'Safari' : EPOCH_INAPP.os === 'android' ? 'Chrome' : 'your browser') + '.' +
    (EPOCH_INAPP.os === 'android' ? ' <a class="ia-open" href="intent://' + escHtml(u.replace(/^https?:\/\//, '')) + '#Intent;scheme=https;S.browser_fallback_url=' + encodeURIComponent(u) + ';end">Open in my browser</a>' : '') + '</p>';
}

// Copy to the clipboard; the old way where the Clipboard API is missing or refused (Android in-app browsers)
function copyText(text) {
  return new Promise(function (ok, no) {
    function legacy() {
      var t = document.createElement('textarea'), was = document.activeElement, done = false;
      t.value = text; t.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
      document.body.appendChild(t); t.focus(); t.select();
      try { t.setSelectionRange(0, text.length); done = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t); if (was && was.focus) was.focus({ preventScroll: true });
      if (done) ok(); else no();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, legacy); else legacy();
  });
}

// ── Sharing: a line, its address and a picture (a page's poster, a game's score card) ──────────────────────────────
// Phones get the system share sheet with the picture; elsewhere, and in in-app browsers without a share sheet, a panel
// of our own: the picture to save, the apps, Copy. o: { text, url, title (of what is shared), heading (the panel's),
// image (a Blob, a promise of one or the poster's address), file (its name), btn }. A poster's address is fetched
// when the button is first touched (warmPoster).
var SHARE_ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#25D366" d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.45 18.63.07 12 .07S0 5.45 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.03 24 18.06 24 12.07z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24H16.17l-4.71-6.23-5.4 6.23H2.75l7.73-8.84L1.25 2.25H8.08l4.25 5.62zm-1.16 17.52h1.83L7.08 4.13H5.12z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#26A5E4" d="M11.94 0A12 12 0 1 0 12 24 12 12 0 0 0 11.94 0zm4.96 7.22c.1 0 .32.02.47.14.1.08.16.2.17.33.02.09.04.3.02.47-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.22-.46-1.9-.9-1.05-.7-1.65-1.13-2.67-1.8-1.19-.78-.42-1.21.26-1.91.17-.19 3.25-2.98 3.3-3.23.01-.03.02-.15-.05-.21-.07-.06-.17-.04-.25-.02-.1.02-1.79 1.14-5.06 3.34-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.87-.44-.75-.24-1.35-.37-1.3-.79.03-.22.33-.44.9-.66 3.5-1.53 5.83-2.53 7-3.02 3.33-1.38 4.02-1.63 4.47-1.63z"/></svg>',
  email: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>'
};
var POSTER_CACHE = {};
function warmPoster(src) {   // fetch a poster once; .b holds the Blob when it has arrived
  if (!src || typeof src !== 'string') return null;
  if (!POSTER_CACHE[src]) {
    var c = POSTER_CACHE[src] = { b: null };
    c.p = fetch(src).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (b) { c.b = b; return b; });
    c.p.catch(function () { delete POSTER_CACHE[src]; });
  }
  return POSTER_CACHE[src];
}
function shareFiles(blob, name) {   // [File] when this browser can hand a picture to the share sheet, else null
  if (!blob || !navigator.share || !navigator.canShare || typeof File !== 'function') return null;
  try { var f = [new File([blob], name || 'the-epoch-institute.jpg', { type: blob.type || 'image/jpeg' })]; return navigator.canShare({ files: f }) ? f : null; } catch (e) { return null; }
}
function sharePoster(o) {
  var url = o.url || location.href.split('#')[0], all = (o.text ? o.text + '\n' : '') + url, img = o.image;
  var phone = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  function fail(e) { if (!e || e.name !== 'AbortError') shareSheet(o); }
  if (!phone || !navigator.share) return shareSheet(o);
  if (!img) { navigator.share({ title: o.title || '', text: o.text || '', url: url }).catch(fail); return; }
  // the address goes inside the text: an app given a picture keeps the caption but may drop a separate url
  function go(b) { var f = shareFiles(b, o.file); if (!f) return shareSheet(o); navigator.share({ files: f, title: o.title || '', text: all }).catch(fail); }
  var c = img instanceof Blob ? { b: img } : typeof img === 'string' ? warmPoster(img) : img;
  if (c && c.b) return go(c.b);
  // a picture still on its way: wait a moment (the tap still counts that long), else the panel shows it as it comes
  var late = false, t = setTimeout(function () { late = true; shareSheet(o); }, 900);
  (c && c.p ? c.p : Promise.reject()).then(function (b) { if (!late) { clearTimeout(t); go(b); } }, function () { if (!late) { clearTimeout(t); shareSheet(o); } });
}
// the line, the address and a button: the old signature, kept for the pages that call it
function shareThis(text, url, btn) { sharePoster({ text: text, url: url, btn: btn }); }
// a score poster (share-card.js, fetched the first time a result is shown): { p: promise of the picture, b: once drawn }
var SHARE_CARD_SRC = '/share-card.js?v=1', CARD_LIB = null;
function scoreCard(spec) {
  CARD_LIB = CARD_LIB || new Promise(function (ok, no) {
    if (window.EpochCard) return ok();
    var s = document.createElement('script'); s.src = SHARE_CARD_SRC; s.onload = ok; s.onerror = function () { CARD_LIB = null; no(); }; document.head.appendChild(s);
  });
  var job = { b: null };
  job.p = CARD_LIB.then(function () { return EpochCard.make(spec).p; }).then(function (b) { job.b = b; return b; });
  job.p.catch(function () {});
  return job;
}

function shareSheet(o) {
  var url = o.url || location.href.split('#')[0], line = o.text || '', all = (line ? line + '\n' : '') + url, enc = encodeURIComponent;
  var old = document.getElementById('share-sheet'); if (old) old.remove();
  var opener = document.activeElement, box = document.createElement('div'), objUrl = null;
  var phone = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var apps = [
    ['whatsapp', 'WhatsApp', 'https://api.whatsapp.com/send?text=' + enc(all)],
    ['facebook', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
    ['x', 'X', 'https://twitter.com/intent/tweet?text=' + enc(line) + '&url=' + enc(url)],
    ['telegram', 'Telegram', 'https://t.me/share/url?url=' + enc(url) + '&text=' + enc(line)],
    ['email', 'Email', 'mailto:?subject=' + enc(o.title || 'From The Epoch Institute') + '&body=' + enc(all)]
  ];
  box.id = 'share-sheet'; box.className = 'shr'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'shr-t');
  box.innerHTML = '<div class="shr-box"><div class="shr-head"><p class="shr-t" id="shr-t">' + escHtml(o.heading || o.title || 'Share') + '</p><button type="button" class="shr-x" aria-label="Close">&times;</button></div>' +
    (o.image ? '<figure class="shr-pic"><img alt="' + escHtml(o.alt || 'The picture to share') + '"><figcaption class="shr-save"></figcaption></figure>' : '') +
    (line ? '<p class="shr-line">' + escHtml(line) + '</p>' : '') +
    '<div class="shr-acts">' + (o.image ? '<button type="button" class="shr-act shr-sys" hidden>Share the picture…</button><a class="shr-act shr-dl" hidden>Save the picture</a>' : '') + '</div>' +
    '<div class="shr-apps">' + apps.map(function (a) { return '<a class="shr-app" href="' + escHtml(a[2]) + '" target="_blank" rel="noopener">' + SHARE_ICONS[a[0]] + '<span>' + a[1] + '</span></a>'; }).join('') +
    '<button type="button" class="shr-app shr-copy">' + SHARE_ICONS.copy + '<span>Copy</span></button></div>' +
    (navigator.share && !o.image ? '<button type="button" class="shr-act shr-more">More apps…</button>' : '') +
    inAppTip(o.image ? 'To share the picture straight to other apps,' : 'To share straight to other apps,') + '</div>';
  document.body.appendChild(box); document.body.classList.add('shr-open');
  function close() { box.remove(); document.body.classList.remove('shr-open'); if (objUrl) URL.revokeObjectURL(objUrl); document.removeEventListener('keydown', key); if (opener && opener.focus) opener.focus({ preventScroll: true }); }
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = box.querySelectorAll('a[href], button:not([hidden])'), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', key);
  box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.shr-x')) close(); });
  box.querySelector('.shr-copy').addEventListener('click', function () {
    var b = this, sp = b.querySelector('span');
    copyText(all).then(function () { sp.textContent = 'Copied ✓'; }, function () { sp.textContent = 'Copy failed'; });
    setTimeout(function () { sp.textContent = 'Copy'; }, 2200);
  });
  var more = box.querySelector('.shr-more');
  if (more) more.addEventListener('click', function () { navigator.share({ title: o.title || '', text: line, url: url }).catch(function () {}); });
  if (o.image) {
    var pic = box.querySelector('.shr-pic img'), sys = box.querySelector('.shr-sys'), dl = box.querySelector('.shr-dl'), save = box.querySelector('.shr-save'), blob = null;
    var show = function (b) {
      blob = b; objUrl = URL.createObjectURL(b); pic.src = objUrl;
      if (shareFiles(b, o.file)) sys.hidden = false;
      // a download saves nothing inside an in-app browser: there the picture is pressed and held (or screenshotted)
      if (!EPOCH_INAPP) { dl.href = objUrl; dl.setAttribute('download', o.file || 'the-epoch-institute.jpg'); dl.hidden = false; }
      save.textContent = phone ? (EPOCH_INAPP && EPOCH_INAPP.os === 'android' ? 'Press and hold the picture to save it, or take a screenshot.' : 'Press and hold the picture to save it.') : '';
      save.hidden = !save.textContent;
    };
    var img = o.image;
    if (img instanceof Blob) show(img);
    else {
      var c = typeof img === 'string' ? warmPoster(img) : img;
      if (typeof img === 'string') pic.src = img;   // shows at once; the Blob for sharing follows
      var p = c && (c.p || (c.then ? c : null));
      // a picture that could not be had leaves no empty frame behind
      var gone = function () { if (typeof img !== 'string') { var f = box.querySelector('.shr-pic'); if (f) f.remove(); } };
      if (c && c.b) show(c.b); else if (p) p.then(function (b) { if (b instanceof Blob && document.body.contains(box)) show(b); }, gone); else gone();
    }
    sys.addEventListener('click', function () {
      var f = shareFiles(blob, o.file); if (!f) return;
      navigator.share({ files: f, title: o.title || '', text: all }).catch(function () {});
    });
  }
  setTimeout(function () { var x = box.querySelector('.shr-x'); if (x) x.focus({ preventScroll: true }); }, 30);
}

function jsonp(url, cb) {
  // an Apps Script error comes back as an HTML page (status 200): it never calls back, so give up after 10 s
  const fn = '_ep_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  let done = false;
  const finish = data => { if (done) return; done = true; clearTimeout(timer); window[fn] = function () {}; if (s.parentNode) s.parentNode.removeChild(s); cb(data); };
  window[fn] = finish;
  const s = document.createElement('script');
  s.src = url + '&callback=' + fn;
  s.onerror = function() { finish([]); };
  const timer = setTimeout(function () { finish([]); }, 10000);
  document.head.appendChild(s);
}

function buildPagination(totalPages, currentPage, fnName) {
  if (totalPages <= 1) return '';
  let html = '';
  if (currentPage > 1)
    html += `<button class="pagination-btn" onclick="${fnName}(${currentPage - 1})">← Prev</button>`;
  for (let p = 1; p <= totalPages; p++)
    html += `<button class="pagination-btn${p === currentPage ? ' active' : ''}" onclick="${fnName}(${p})">${p}</button>`;
  if (currentPage < totalPages)
    html += `<button class="pagination-btn" onclick="${fnName}(${currentPage + 1})">Next →</button>`;
  return html;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

function composeTweet(ev) {
  var yearDisplay = ev.yearDisplay || String(ev.year);
  var title = ev.title;
  var desc = ev.description || '';
  var firstSentence = desc.replace(/^([\s\S]*?[.!?])(?:\s|$)[\s\S]*$/, '$1') || desc;
  var hashtags = '#OnThisDay #History #EpochInstitute';
  var header = 'On this day in ' + yearDisplay + ': ' + title + '.';
  var full = header + '\n\n' + firstSentence + '\n\n' + hashtags;
  if (full.length <= 240) return full;
  var budget = 240 - header.length - 6 - hashtags.length;
  if (budget > 5) {
    return header + '\n\n' + firstSentence.substring(0, budget) + '…\n\n' + hashtags;
  }
  return header + '\n\n' + hashtags;
}

// Today in History: related-profile tag + encyclopedia links (precomputed in data/history.json)
function tihTags(ev) {
  var out = '';
  if (ev.profile) out += '<a class="tih-tag tih-tag-profile" href="' + escHtml(ev.profile[1]) + '">' + escHtml(ev.profile[0]) + '</a>';
  (ev.links || []).forEach(function (l) { out += '<a class="tih-tag enc-link" href="/encyclopedia/' + escHtml(l[0]) + '">' + escHtml(l[1]) + '</a>'; });
  return out ? '<div class="tih-tags">' + out + '</div>' : '';
}

// ── Reusable share button ─────────────────────────────────────────────────────
var SHARE_BTN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

function buildShareButton(ddId, shareUrl, tweetText, pageTitle) {
  pageTitle = pageTitle || '';
  return '<button class="tih-share-btn" data-dd="' + ddId + '" aria-label="Share">' + SHARE_BTN_SVG + '</button>' +
    '<div class="tih-share-dropdown" id="' + ddId + '" style="display:none;">' +
      '<button class="tih-share-dd-item" data-action="tweet"     data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '" data-tweet="' + escHtml(tweetText) + '">Post on X</button>' +
      '<button class="tih-share-dd-item" data-action="facebook"  data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '">Share on Facebook</button>' +
      '<button class="tih-share-dd-item" data-action="linkedin"  data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '">Share on LinkedIn</button>' +
      '<button class="tih-share-dd-item" data-action="reddit"    data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '" data-title="' + escHtml(pageTitle) + '">Share on Reddit</button>' +
      '<button class="tih-share-dd-item" data-action="whatsapp"  data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '" data-tweet="' + escHtml(tweetText) + '">Share on WhatsApp</button>' +
      '<button class="tih-share-dd-item" data-action="copy"      data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '">Copy link</button>' +
    '</div>';
}

function attachShareListeners(container, fallbackUrl) {
  var activeDropdown = null;
  function closeAll() { if (activeDropdown) { activeDropdown.style.display = 'none'; activeDropdown = null; } }
  container.querySelectorAll('.tih-share-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var ddId = btn.dataset.dd;
      var dd   = document.getElementById(ddId);
      if (!dd) return;
      if (dd.style.display === 'none') { closeAll(); dd.style.display = ''; activeDropdown = dd; }
      else { closeAll(); }
    });
  });
  container.querySelectorAll('.tih-share-dd-item').forEach(function(item) {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      var action = item.dataset.action;
      var url    = item.dataset.url || fallbackUrl;
      var tweet  = item.dataset.tweet || '';
      if (action === 'tweet') {
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(tweet + (url ? '\n\n' + url : '')), '_blank');
        closeAll();
      } else if (action === 'facebook') {
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank');
        closeAll();
      } else if (action === 'linkedin') {
        window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank');
        closeAll();
      } else if (action === 'reddit') {
        var title = item.dataset.title || '';
        window.open('https://www.reddit.com/submit?url=' + encodeURIComponent(url) + (title ? '&title=' + encodeURIComponent(title) : ''), '_blank');
        closeAll();
      } else if (action === 'whatsapp') {
        window.open('https://wa.me/?text=' + encodeURIComponent(tweet + (url ? '\n\n' + url : '')), '_blank');
        closeAll();
      } else if (action === 'copy') {
        copyText(url).then(function() {
          var orig = item.textContent; item.textContent = '✓ Copied!';
          setTimeout(function() { item.textContent = orig; }, 2000);
        }, function() {});
        setTimeout(closeAll, 2100);
      }
    });
  });
  document.addEventListener('click', function(e) {
    if (activeDropdown && !activeDropdown.parentNode.contains(e.target)) closeAll();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && activeDropdown) closeAll();
  });
}

// ── Site-wide search (profiles + encyclopedia + states; index loaded on first open) ─────
var SEARCH_TYPES = { person: 'Person', event: 'Event', place: 'Place', polity: 'State', group: 'People / group',
  institution: 'Institution', term: 'Term', idea: 'Idea', work: 'Work', factor: 'Factor' };
function searchFold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'ʿʾ]/g, ''); }
// "hastings" means the Battle of Hastings as much as Hastings Banda: a name's words after a leading "Battle of",
// "Kingdom of" … count almost as its beginning
var SEARCH_LEAD = /^(?:battle|siege|sack|fall|capture|conquest|treaty|peace|congress|council|edict|war|wars|revolt|rebellion|kingdom|empire|republic|duchy|county|principality|emirate|sultanate|caliphate|khanate) (?:of|at|in) (?:the )?/;
function searchScore(q, name) {
  var n = searchFold(name);
  if (n === q) return 100;
  if (n.indexOf(q) === 0) return 80;
  var core = n.replace(SEARCH_LEAD, '');
  if (core !== n && core.indexOf(q) === 0) return core === q ? 90 : 78;
  if ((' ' + n).indexOf(' ' + q) !== -1) return 70;
  if (n.indexOf(q) !== -1) return 40;
  return 0;
}
// Every match, best first. Each result: s (score), name, type (its label), href, k (kind: 'profile', 'state' or the
// entry's type), src ('p' EMPIRES, 'P' SEARCH_PROFILES, 'e' SEARCH_INDEX, 's' SEARCH_STATES) and i (its row there),
// which /search uses for its filters (search-facets.js)
function siteSearchAll(query) {
  var q = searchFold(query).trim(), out = [];
  if (q.length < 2) return out;
  // profiles first among equal matches (+20 outweighs an entry's notability, at most +16)
  if (typeof EMPIRES !== 'undefined') EMPIRES.forEach(function (e, i) {
    var s = searchScore(q, e.name);
    if (s) out.push({ s: s + 20, name: e.name, type: profileSubtype(e) + ' · profile', href: profileUrl(e), k: 'profile', src: 'p', i: i });
  });
  // pages without shared-data.js (the generated reference pages) get the profiles from /search-profiles.js instead
  else if (typeof SEARCH_PROFILES !== 'undefined') SEARCH_PROFILES.forEach(function (r, i) {
    var s = searchScore(q, r[0]);
    if (s) out.push({ s: s + 20, name: r[0], type: r[2] + ' · profile', href: r[1], k: 'profile', src: 'P', i: i });
  });
  // entries: r[4] is their notability (0-8: mentions in profiles and state histories, a picture)
  if (typeof SEARCH_INDEX !== 'undefined') SEARCH_INDEX.forEach(function (r, i) {
    var s = searchScore(q, r[1]);
    if (!s && r[3]) r[3].split('|').forEach(function (a) { s = Math.max(s, searchScore(q, a) - 10); });
    if (s > 0) out.push({ s: s + 2 * (r[4] || 0), name: r[1], type: SEARCH_TYPES[r[2]] || r[2], href: '/encyclopedia/' + r[0], enc: r[2] === 'polity', k: r[2], src: 'e', i: i });
  });
  // every state in the register (page /state/<id>); an encyclopedia polity of the same name is dropped in its favour
  if (typeof SEARCH_STATES !== 'undefined') {
    var stateNames = {};
    SEARCH_STATES.forEach(function (r, i) {
      var s = searchScore(q, r[1]);
      if (!s && r[3]) r[3].split('|').forEach(function (a) { s = Math.max(s, searchScore(q, a) - 10); });
      if (s > 0) { out.push({ s: s + 2, name: r[1], type: String(r[2] || 'state').replace(/-/g, ' ') + ' · state', href: '/state/' + r[0], k: 'state', src: 's', i: i }); stateNames[searchFold(r[1])] = 1; }
    });
    out = out.filter(function (o) { return !(o.enc && stateNames[searchFold(o.name)]); });
  }
  out.sort(function (a, b) { return b.s - a.s || a.name.length - b.name.length; });
  return out;
}
function siteSearch(query) { return siteSearchAll(query).slice(0, 12); }
var SEARCH_INDEX_SRC = '/search-index.js?v=9';   // also loaded by quiz.js for answer suggestions
var SEARCH_PROFILES_SRC = '/search-profiles.js?v=1';   // the 394 profiles, for pages without shared-data.js
function initSiteSearch() {
  var box = document.getElementById('site-search'), input = document.getElementById('site-search-input'),
      list = document.getElementById('site-search-results'), hint = document.getElementById('site-search-hint'),
      opener = null, active = -1, loading = false, pending = [];
  function load(cb) {
    if (typeof SEARCH_INDEX !== 'undefined') return cb();
    pending.push(cb);
    if (loading) return; loading = true;
    if (typeof EMPIRES === 'undefined' && typeof SEARCH_PROFILES === 'undefined') {
      var p = document.createElement('script'); p.src = SEARCH_PROFILES_SRC; document.head.appendChild(p);
    }
    var done = function () { loading = false; var q = pending; pending = []; q.forEach(function (f) { f(); }); };
    var s = document.createElement('script'); s.src = SEARCH_INDEX_SRC;
    s.onload = done; s.onerror = done;
    document.head.appendChild(s);
  }
  function render() {
    var all = siteSearchAll(input.value), res = all.slice(0, 12), q = input.value.trim(); active = -1;
    list.innerHTML = res.map(function (r, i) {
      return '<li role="option" id="ss-opt-' + i + '"><a href="' + r.href + '"><span class="ss-name">' + escHtml(r.name) + '</span><span class="ss-type">' + escHtml(r.type) + '</span></a></li>';
    }).join('') +
      // the full list, with filters, on /search
      (res.length ? '<li role="option" id="ss-opt-' + res.length + '" class="ss-all"><a href="/search?q=' + encodeURIComponent(q) + '">' + (all.length > res.length ? 'See all ' + all.length.toLocaleString('en-GB') + ' results' : 'Open the search page') + ' <span aria-hidden="true">&rarr;</span></a></li>' : '');
    hint.textContent = input.value.trim().length < 2 ? 'Profiles, states and the full encyclopedia.' : (res.length ? '' : 'No matches. Try another spelling or a shorter word.');
    hint.hidden = !hint.textContent;
  }
  function setActive(i) {
    var items = list.querySelectorAll('li'); if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach(function (li, k) { li.classList.toggle('active', k === active); li.setAttribute('aria-selected', k === active); });
    input.setAttribute('aria-activedescendant', 'ss-opt-' + active);
    items[active].scrollIntoView({ block: 'nearest' });
  }
  function open(prefill) {
    opener = document.activeElement; box.hidden = false; document.body.style.overflow = 'hidden';
    if (typeof prefill === 'string') input.value = prefill;
    input.focus(); render();
    load(render);
  }
  function close() { box.hidden = true; document.body.style.overflow = ''; if (opener && opener.focus) opener.focus(); }
  window.openSiteSearch = open;
  document.getElementById('nav-search-btn').addEventListener('click', function () { open(); });
  document.getElementById('site-search-close').addEventListener('click', close);
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { var a = list.querySelectorAll('li a')[Math.max(active, 0)]; if (a) { e.preventDefault(); a.click(); } }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', function (e) { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', function (e) {
    if (!box.hidden) return;
    var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); open(); }
  });
  // warm the index up when a search looks likely (hovering or focusing the search button), never on every page view:
  // it is 800 KB that most readers never need
  var warm = function () { load(function () {}); };
  window.warmSiteSearch = warm;   // the home page's search field warms up on focus too
  var sb = document.getElementById('nav-search-btn');
  sb.addEventListener('pointerover', warm, { once: true });
  sb.addEventListener('focus', warm, { once: true });
}

// ── Encyclopedia previews: hover/focus (or first tap on touch) a gold link → small card ─
// Data: /data/enc-preview/<first char of slug>.json, fetched on demand and cached.
function initEncPreviews() {
  var cache = {}, card = null, showTimer = null, hideTimer = null, current = null;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  function slugOf(a) {   // /encyclopedia/<slug>, /state/<id> (and the old #-addresses)
    var h = a.getAttribute('href') || '', m;
    if ((m = /^\/state\/([a-z0-9-]+)$/.exec(h)) || (m = /^\/state\/?#(.+)$/.exec(h))) return 'state:' + decodeURIComponent(m[1]);
    if ((m = /^\/encyclopedia\/([a-z0-9-]+)$/.exec(h)) || (m = /^\/encyclopedia\/?#(.+)$/.exec(h)) || (m = /^#(.+)$/.exec(h))) return decodeURIComponent(m[1]);
    return null;
  }
  function load(slug, cb, a) {
    if (slug.indexOf('state:') === 0) {   // a state page: teaser and picture from its data chunk
      var id = slug.slice(6), k = 's' + (/^[a-z]/.test(id) ? id[0] : '0');
      var done = function (j) { var r = j && j[id]; cb(r ? { n: a.textContent, t: 'State', s: (r.t || '').replace(/\[\[[es]:[^|\]]+\|([^\]]*)\]\]/g, '$1'), i: r.img } : null); };
      if (cache[k]) return done(cache[k]);
      fetch('/data/states/' + k.slice(1) + '.json?v=5').then(function (r) { return r.json(); }).then(function (j) { cache[k] = j; done(j); }).catch(function () { cb(null); });
      return;
    }
    var c = /^[a-z]/.test(slug) ? slug[0] : '0';
    if (cache[c]) return cb(cache[c][slug]);
    fetch('/data/enc-preview/' + c + '.json?v=3').then(function (r) { return r.json(); })
      .then(function (j) { cache[c] = j; cb(j[slug]); }).catch(function () { cb(null); });
  }
  function ensureCard() {
    if (card) return card;
    card = document.createElement('div'); card.className = 'enc-preview'; card.setAttribute('role', 'tooltip'); card.id = 'enc-preview';
    card.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    card.addEventListener('mouseleave', hideSoon);
    document.body.appendChild(card); return card;
  }
  function place(a) {
    var r = a.getBoundingClientRect(), c = card.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - c.width / 2), vw - c.width - 8);
    var top = r.bottom + 8; if (top + c.height > window.innerHeight - 8 && r.top - c.height - 8 > 0) top = r.top - c.height - 8;
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function show(a) {
    var slug = slugOf(a); if (!slug) return;
    current = a;
    load(slug, function (p) {
      if (current !== a || !p) return;
      var href = a.getAttribute('href');
      ensureCard().innerHTML = (p.i ? '<img src="' + escHtml(p.i) + '" alt="" width="96" height="96">' : '') +
        '<div><p class="enc-preview-kicker">' + escHtml(p.t || '') + (p.d ? ' · ' + escHtml(p.d) : '') + '</p>' +
        '<p class="enc-preview-name">' + escHtml(p.n) + '</p><p class="enc-preview-text">' + escHtml(p.s) + '</p>' +
        '<a class="enc-preview-more" href="' + escHtml(href) + '">' + (slug.indexOf('state:') === 0 ? 'Read about this state →' : 'Read the full entry →') + '</a></div>';
      card.classList.toggle('no-img', !p.i);
      card.hidden = false; place(a); a.setAttribute('aria-describedby', 'enc-preview');
    }, a);
  }
  function hide() { if (card) card.hidden = true; if (current) current.removeAttribute('aria-describedby'); current = null; }
  function hideSoon() { clearTimeout(showTimer); hideTimer = setTimeout(hide, 220); }
  document.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('a.enc-link'); if (!a || touch) return;
    clearTimeout(hideTimer); clearTimeout(showTimer);
    showTimer = setTimeout(function () { show(a); }, 280);
  });
  document.addEventListener('mouseout', function (e) {
    var a = e.target.closest && e.target.closest('a.enc-link'); if (a && !touch) hideSoon();
  });
  document.addEventListener('focusin', function (e) { var a = e.target.closest && e.target.closest('a.enc-link'); if (a) show(a); else if (card && !card.contains(e.target)) hide(); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.enc-link');
    if (touch && a && slugOf(a) && current !== a) { e.preventDefault(); show(a); return; }   // first tap previews
    if (card && !card.hidden && !card.contains(e.target) && !a) hide();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', function () { if (card && !card.hidden && !touch) hide(); }, { passive: true });
  window.addEventListener('hashchange', hide);
}

// ── initNav(activePage) ───────────────────────────────────────────────────────
function initNav(activePage) {

  // The current page's links carry aria-current="page" (styled gold in shared.css).
  function activeStyle(page) {
    return activePage === page ? ' aria-current="page"' : '';
  }

  // Explore: the ways into the collections; More: the Institute's other pages
  const EXPLORE = [['atlas', '/atlas', 'Atlas', 'The world in any year'], ['countries', '/countries/', 'Country Histories', 'Each land through time'],
    ['centuries', '/centuries/', 'Centuries', 'One century at a time'], ['explorer', '/explorer', 'Empire Explorer', 'Rise and fall compared'],
    ['connections', '/connections', 'Connections', 'The states as a network'], ['paths', '/paths/', 'Reading Paths', 'Themed routes through history'],
    ['speeches', '/speeches/', 'Great Speeches', 'The words that moved history'],
    ['quiz', '/quiz', 'History Quiz', 'A new puzzle every day'], ['games', '/games', 'History Games', 'Puzzles, word hunts and the globe'],
    ['kids', '/kids', 'Kids Corner', 'History for young explorers'],
    ['glossary', '/encyclopedia/glossary', 'Glossary', 'Historical terms explained'],
    ['start', '/start', 'Find Your Way In', 'Four questions, your reading paths']];
  const MORE = [['series', '/research-series', 'Research Series'], ['dataset', '/dataset', 'Open Data'], ['research', '/research', 'Research Hub'],
    ['community', '/community', 'Community'], ['', '/community#submit', 'Submit an Article'], ['', '/#newsletter-section', 'Newsletter'],
    ['about', '/about', 'About the Institute'], ['contributors', '/contributors', 'Write for Us'], ['contact', '/contact', 'Contact']];
  const exploreActive = EXPLORE.some(x => x[0] === activePage);
  const moreActive = MORE.some(x => x[0] && x[0] === activePage);
  const navItem = (x, cls) => `<a href="${x[1]}"${cls ? ` class="${cls}"` : ''}${x[0] ? activeStyle(x[0]) : ''}>${x[2]}</a>`;

  const navHtml = `
<a class="skip-link" href="#main">Skip to content</a>
<nav class="site-nav" id="site-nav" aria-label="Main">
  <a href="/" class="nav-logo">
    <span class="nav-logo-text">THE EPOCH INSTITUTE</span>
  </a>
  <div class="nav-links">
    <a href="/profiles" class="nav-link"${activeStyle('profiles')}>Profiles</a>
    <a href="/encyclopedia/" class="nav-link"${activeStyle('encyclopedia')}>Encyclopedia</a>
    <a href="/state/" class="nav-link"${activeStyle('states')}>States</a>
    <div class="nav-group-wrap" id="nav-explore-wrap">
      <button class="nav-parent-btn${exploreActive ? ' active-group' : ''}" id="nav-explore-btn" aria-haspopup="true" aria-expanded="false">Explore ▾</button>
      <div class="nav-group-menu nav-group-menu-wide" id="nav-explore-menu" role="menu">
        ${EXPLORE.map(x => `<a href="${x[1]}"${activeStyle(x[0])}><b>${x[2]}</b><span>${x[3]}</span></a>`).join('\n        ')}
        <a href="#" id="nav-surprise" class="nav-surprise"><b>Surprise me</b><span>A random leap into history</span></a>
      </div>
    </div>
    <a href="/today-in-history/" class="nav-link"${activeStyle('today')}>Today in History</a>
    <div class="nav-group-wrap" id="nav-more-wrap">
      <button class="nav-parent-btn${moreActive ? ' active-group' : ''}" id="nav-more-btn" aria-haspopup="true" aria-expanded="false">More ▾</button>
      <div class="nav-group-menu" id="nav-more-menu" role="menu">
        ${MORE.map(x => navItem(x)).join('\n        ')}
      </div>
    </div>
  </div>
  <div class="nav-toggles">
    <button class="nav-search-btn" id="nav-search-btn" aria-label="Search the site" title="Search (/)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></button>
    <button class="nav-toggle-btn" id="theme-toggle">&#x2600;</button>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-dropdown">&#x2630;</button>
  </div>
  <div id="nav-dropdown" class="nav-dropdown">
    <div class="nav-dd-display" role="group" aria-label="Display"><button type="button" class="nav-dd-btn" id="nav-dd-theme"></button><button type="button" class="nav-dd-btn" id="nav-dd-kids"></button></div>
    ${[['profiles', '/profiles', 'Profiles'], ['encyclopedia', '/encyclopedia/', 'Encyclopedia'], ['states', '/state/', 'States'], ['today', '/today-in-history/', 'Today in History']].map(x => navItem(x, 'nav-dropdown-link')).join('\n    ')}
    <span class="nav-dropdown-group">Explore</span>
    ${EXPLORE.map(x => navItem(x, 'nav-dropdown-link')).join('\n    ')}
    <a href="#" class="nav-dropdown-link" data-surprise>Surprise me</a>
    <span class="nav-dropdown-group">More</span>
    ${MORE.map(x => navItem(x, 'nav-dropdown-link')).join('\n    ')}
  </div>
</nav>`;

  // every page but the contact page itself invites corrections, with its own address filled in
  const fixHtml = location.pathname === '/contact' ? '' :
    `<p class="footer-fix">Spotted a mistake on this page? <a href="/contact?topic=correction&amp;page=${encodeURIComponent(location.pathname)}">Suggest a correction &rarr;</a></p>`;

  const footerHtml = `
<footer id="site-footer">
  ${fixHtml}
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-logo">THE EPOCH INSTITUTE</span>
      <span class="footer-brand-tag" data-i18n="brand_tag">Historical &amp; Societal Research</span>
      <div class="footer-social">
        <a class="footer-social-link" href="https://www.facebook.com/the.epoch.institute" target="_blank" rel="noopener" aria-label="Facebook">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          <span class="footer-social-text">The Epoch Institute</span>
        </a>
        <a class="footer-social-link" href="https://www.instagram.com/the.epoch.institute/" target="_blank" rel="noopener" aria-label="Instagram">
          <svg width="22" height="22" viewBox="0 0 24 24"><defs><radialGradient id="ig-grad" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          <span class="footer-social-text">@the.epoch.institute</span>
        </a>
        <a class="footer-social-link" href="https://x.com/Epoch_Institute" target="_blank" rel="noopener" aria-label="X (Twitter)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          <span class="footer-social-text">@Epoch_Institute</span>
        </a>
      </div>
    </div>
    <div class="footer-links">
      <div class="footer-col">
        <span class="footer-col-title">Collections</span>
        <a class="footer-link" href="/profiles">Profiles</a>
        <a class="footer-link" href="/encyclopedia/">Encyclopedia</a>
        <a class="footer-link" href="/state/">States</a>
        <a class="footer-link" href="/countries/">Country Histories</a>
        <a class="footer-link" href="/centuries/">Centuries</a>
        <a class="footer-link" href="/today-in-history/">Today in History</a>
        <a class="footer-link" href="/encyclopedia/glossary">Glossary</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Explore</span>
        <a class="footer-link" href="/atlas">Atlas</a>
        <a class="footer-link" href="/explorer">Empire Explorer</a>
        <a class="footer-link" href="/connections">Connections</a>
        <a class="footer-link" href="/paths/">Reading Paths</a>
        <a class="footer-link" href="/speeches/">Great Speeches</a>
        <a class="footer-link" href="/quiz">History Quiz</a>
        <a class="footer-link" href="/games">History Games</a>
        <a class="footer-link" href="/kids">Kids Corner</a>
        <a class="footer-link" href="/start">Find Your Way In</a>
        <a class="footer-link" href="/research-series">Research Series</a>
        <a class="footer-link" href="/dataset">Open Data</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Institute</span>
        <a class="footer-link" href="/about">About the Institute</a>
        <a class="footer-link" href="/about#methodology">Methodology</a>
        <a class="footer-link" href="/research">Research Hub</a>
        <a class="footer-link" href="/contributors">Write for Us</a>
        <a class="footer-link" href="/community">Community</a>
        <a class="footer-link" href="/community#submit">Submit an Article</a>
        <a class="footer-link" href="/contact">Contact</a>
      </div>
      <div class="footer-col">
        <div class="footer-newsletter">
          <span class="footer-nl-label">Newsletter</span>
          <form class="footer-nl-form" id="footer-nl-form">
            <input type="email" id="footer-nl-email" placeholder="your@email.com" required aria-label="Email for newsletter">
            <button type="submit">→</button>
          </form>
          <p id="footer-nl-msg" style="display:none; font-size:11px; color:var(--success); margin-top:6px; font-family:'Crimson Pro',serif;"></p>
          <a class="footer-link footer-feed" href="/feeds/today.xml" type="application/rss+xml">Today in History by RSS</a>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span data-i18n="footer_copy">© ${new Date().getFullYear()} The Epoch Institute</span>
    <button type="button" class="footer-quote-btn" id="footer-quote-btn" aria-expanded="false" aria-label="A word from the past" title="A word from the past">✦</button>
  </div>
  <p class="footer-quote" id="footer-quote" hidden></p>
</footer>`;

  const searchHtml = `
<div id="site-search" class="site-search" role="dialog" aria-modal="true" aria-label="Search" hidden>
  <div class="site-search-box">
    <div class="site-search-row">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
      <input type="search" id="site-search-input" placeholder="Search empires, people, events, places…" autocomplete="off" aria-controls="site-search-results" aria-label="Search">
      <button type="button" class="site-search-close" id="site-search-close" aria-label="Close search">Esc</button>
    </div>
    <ul id="site-search-results" class="site-search-results" role="listbox"></ul>
    <p class="site-search-hint" id="site-search-hint">Profiles and the full encyclopedia.</p>
  </div>
</div>`;

  // Inject nav, footer, search
  document.body.insertAdjacentHTML('afterbegin', navHtml);
  document.body.insertAdjacentHTML('beforeend', footerHtml + searchHtml);
  initSiteSearch();
  initEncPreviews();
  // any [data-share-text] button shares its line (a speech's key passage), with its poster (data-share-img), which
  // is fetched as soon as the button is pointed at or touched
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-share-text]');
    var img = b && b.getAttribute('data-share-img');
    if (b) sharePoster({ text: b.getAttribute('data-share-text'), url: b.getAttribute('data-share-url'), image: img, title: b.getAttribute('data-share-title'), heading: b.getAttribute('data-share-heading'), file: b.getAttribute('data-share-file') || (img ? img.split('/').pop() : null), btn: b });
  });
  ['pointerdown', 'mouseover', 'focusin'].forEach(function (t) {
    document.addEventListener(t, function (e) { var b = e.target.closest && e.target.closest('[data-share-img]'); if (b) warmPoster(b.getAttribute('data-share-img')); }, { passive: true });
  });
  // a page with a poster of its own (a profile, a day, a country, a century, a reading path) gets a Share button that
  // sends the poster with the page's name and address
  (function () {
    var m = document.querySelector('meta[property="og:image"]'), src = m && m.getAttribute('content') || '';
    if (!/\/images\/og\/(?!default\.)[^/]+\.jpg$/.test(src)) return;
    var host = document.querySelector('.empire-page .info-share-row') || document.querySelector('.day-page .ref-head, .cty-head, .cen-head, .path-head');
    if (!host || host.querySelector('.page-share')) return;
    var t = document.querySelector('meta[property="og:title"]'), c = document.querySelector('link[rel="canonical"]');
    var name = ((t && t.getAttribute('content')) || document.title).replace(/\s+—\s+The Epoch Institute$/, '');
    var b = document.createElement('button');
    b.type = 'button'; b.className = host.classList.contains('info-share-row') ? 'info-share-btn page-share' : 'sp-share page-share';
    b.textContent = 'Share'; b.setAttribute('data-share-text', name); b.setAttribute('data-share-title', name); b.setAttribute('data-share-heading', 'Share this page');
    b.setAttribute('data-share-img', src.replace(/^https:\/\/the-epoch-institute\.org/, ''));
    if (c) b.setAttribute('data-share-url', c.getAttribute('href'));
    if (host.classList.contains('info-share-row')) host.insertBefore(b, host.children[1] || null);
    else { var row = document.createElement('p'); row.className = 'page-share-row'; row.appendChild(b); host.appendChild(row); }
  })();
  // the one-line newsletter forms (newsletterPrompt)
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-nl]'); if (!f) return;
    e.preventDefault();
    var inp = f.querySelector('input'), msg = f.querySelector('.gm-nl-msg'), b = f.querySelector('button'), email = inp.value.trim();
    if (!isValidEmail(email)) { msg.textContent = 'Please check the address.'; inp.focus(); return; }
    b.disabled = true; msg.textContent = 'Signing you up…';
    subscribeNewsletter(email, f.getAttribute('data-nl') || 'prompt').then(function () {
      try { localStorage.setItem('epoch-nl', '1'); } catch (e2) {}
      f.innerHTML = '<p class="gm-nl-ok">You are on the list: see you next week.</p>';
    }).catch(function () { b.disabled = false; msg.textContent = 'That did not go through. Please try again.'; });
  });

  // ── Theme toggle (on phones it lives in the menu's Display row: the bar has room for search, shelf and menu only) ──
  (function() {
    const btn = document.getElementById('theme-toggle'), dd = document.getElementById('nav-dd-theme');
    function applyTheme(isDark) {
      btn.textContent    = isDark ? '☀' : '🌙';
      btn.title          = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
      dd.textContent = isDark ? '☀ Light theme' : '🌙 Dark theme';
      // pin the browser chrome's colour to the chosen theme (the metas' media rules covered only the system theme)
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) { m.setAttribute('content', isDark ? '#0b0c10' : '#f4efe4'); m.removeAttribute('media'); });
    }
    applyTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    btn.addEventListener('click', () => {
      const html   = document.documentElement;
      const isDark = html.getAttribute('data-theme') !== 'light';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      try { localStorage.setItem('epoch-theme', isDark ? 'light' : 'dark'); } catch (e) {}
      applyTheme(!isDark);
    });
    dd.addEventListener('click', function () { btn.click(); });
  })();

  // ── My shelf: pages saved for later and recently viewed (kept in this browser only) ──
  (function () {
    function sGet(k, cap) { try { var v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v.slice(0, cap) : []; } catch (e) { return []; } }
    function sSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    // the reading pages that can be saved and are recorded as recently viewed
    var KINDS = [[/^\/empire\/[a-z0-9-]+$/, 'profile'], [/^\/encyclopedia\/[a-z0-9-]+$/, 'entry'], [/^\/state\/[a-z0-9.-]+$/, 'state'],
      [/^\/countries\/[a-z-]+$/, 'country history'], [/^\/centuries\/[a-z0-9-]+$/, 'century'], [/^\/today-in-history\/[a-z]+-\d+$/, 'day'], [/^\/paths\/[a-z0-9-]+$/, 'reading path']];
    var kind = null;
    if (!/^\/encyclopedia\/(browse|conflicts)\//.test(location.pathname) && location.pathname !== '/encyclopedia/glossary')
      KINDS.some(function (k) { if (k[0].test(location.pathname)) { kind = k[1]; return true; } return false; });
    var h1 = document.querySelector('h1');
    var here = kind && h1 && h1.textContent.trim() ? { u: location.pathname, n: h1.textContent.trim().slice(0, 90), t: kind } : null;
    if (here) {
      var rec = sGet('epoch-recent', 20).filter(function (r) { return r && r.u !== here.u; });
      rec.unshift(here); sSet('epoch-recent', rec.slice(0, 10));
    }
    var tog = document.querySelector('.nav-toggles');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'nav-search-btn'; btn.id = 'nav-shelf-btn';
    btn.title = 'My shelf (saved pages)'; btn.setAttribute('aria-label', 'My shelf'); btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    var panel = document.createElement('div'); panel.className = 'shelf-menu'; panel.id = 'shelf-menu'; panel.hidden = true;
    tog.insertBefore(btn, document.getElementById('theme-toggle'));
    tog.appendChild(panel);
    function renderShelf() {
      var shelf = sGet('epoch-shelf', 100), rec2 = sGet('epoch-recent', 10);
      var saved = !!(here && shelf.some(function (r) { return r && r.u === here.u; }));
      var row = function (r) { return '<a href="' + escHtml(r.u) + '"><span class="shelf-n">' + escHtml(r.n) + '</span><span class="shelf-t">' + escHtml(r.t) + '</span></a>'; };
      panel.innerHTML =
        (here ? '<button type="button" class="shelf-save' + (saved ? ' is-saved' : '') + '" id="shelf-save">' + (saved ? '✓ Saved — tap to remove' : '☆ Save this page') + '</button>' : '') +
        '<p class="shelf-head">Saved' + (shelf.length ? ' · ' + shelf.length : '') + '</p>' +
        (shelf.length ? shelf.map(row).join('') : '<p class="shelf-empty">Nothing saved yet. Open a profile or an entry and save it from here.</p>') +
        (rec2.length ? '<p class="shelf-head">Recently viewed</p>' + rec2.map(row).join('') : '');
      var sv = document.getElementById('shelf-save');
      if (sv) sv.addEventListener('click', function () {
        var s2 = sGet('epoch-shelf', 100).filter(function (r) { return r && r.u !== here.u; });
        if (!saved) s2.unshift(here);
        sSet('epoch-shelf', s2.slice(0, 100)); renderShelf();
      });
    }
    function closeShelf() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) { renderShelf(); panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
      else closeShelf();
    });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) closeShelf(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { closeShelf(); btn.focus(); } });
  })();

  // ── Kids mode: brighter colours, rounder type, the short version of long pages first ─────────────────────────────
  // html[data-kids="1"], kept in localStorage epoch-kids and set before first paint by every page's head snippet;
  // the Kids corner always looks this way (html[data-kids-always]), so there the switch changes only the other pages
  (function () {
    var html = document.documentElement, tog = document.querySelector('.nav-toggles'), btn = document.createElement('button');
    var always = html.hasAttribute('data-kids-always'), mem = html.getAttribute('data-kids') === '1' && !always;
    btn.type = 'button'; btn.className = 'nav-search-btn nav-kids-btn'; btn.id = 'nav-kids-btn';
    btn.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"/></svg>';
    window.kidsModeOn = function () { try { return localStorage.getItem('epoch-kids') === '1'; } catch (e) { return mem; } };
    if (window.kidsModeOn()) html.setAttribute('data-kids', '1');   // a page cached from before Kids mode lacks the head line
    var dd = document.getElementById('nav-dd-kids');   // the same switch in the phone menu
    function paint() {
      var on = window.kidsModeOn();
      btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', 'Kids mode');
      btn.title = on ? 'Kids mode is on: tap to switch it off' : 'Kids mode: brighter, simpler pages for young readers';
      dd.textContent = (on ? '★' : '☆') + ' Kids mode: ' + (on ? 'on' : 'off'); dd.setAttribute('aria-pressed', String(on));
    }
    dd.addEventListener('click', function () { window.setKidsMode(!window.kidsModeOn()); });
    window.setKidsMode = function (on) {
      mem = !!on;
      try { if (on) localStorage.setItem('epoch-kids', '1'); else localStorage.removeItem('epoch-kids'); } catch (e) {}
      if (on || always) html.setAttribute('data-kids', '1'); else { html.removeAttribute('data-kids'); html.classList.remove('kd-open'); }
      paint();
      document.dispatchEvent(new CustomEvent('epoch:kids', { detail: { on: !!on } }));
    };
    btn.addEventListener('click', function () { window.setKidsMode(!window.kidsModeOn()); });
    tog.insertBefore(btn, document.getElementById('theme-toggle'));
    paint();

    // the short version first (shared.css shows these only in Kids mode): an entry's first sentence, and on profiles
    // and state pages a button that reveals the full history
    function openAll() { html.classList.add('kd-open'); }
    function firstSentence(t) {
      var re = /[.!?]["'”’)\]]*\s+(?=["'“‘(]?[A-Z0-9])/g, m;
      while ((m = re.exec(t))) {
        var before = t.slice(0, m.index), w = (/(\S+)$/.exec(before) || ['', ''])[1].replace(/^[("'“‘]+/, '');
        if (/^(c|ca|fl|r|b|d|St|Mt|Mr|Mrs|Ms|Dr|Jr|Sr|vs|No|Nos|vol|ed|eds|tr|e\.g|i\.e|[A-Z])$/.test(w)) continue;   // abbreviations and initials
        return t.slice(0, m.index + 1);
      }
      return t;
    }
    var desc = document.querySelector('.enc-article .enc-desc');
    if (desc) {
      // one cell of the entry's text-and-picture grid holds the note, the short version and the description
      var col = document.createElement('div'), box = document.createElement('div');
      var full = desc.textContent.replace(/\s+/g, ' ').trim(), first = firstSentence(full);
      col.className = 'kd-col'; desc.parentNode.insertBefore(col, desc);
      if (document.querySelector('.enc-kicker a[href*="/encyclopedia/conflicts/"]')) {
        var note = document.createElement('p'); note.className = 'kd-note';
        note.textContent = 'This page is about a war, a battle or a hard time. Wars caused great suffering for the people who lived through them.';
        col.appendChild(note);
      }
      box.className = 'kd-short';
      // a one-sentence description is its own short version (keeping its links)
      box.innerHTML = '<b>In short</b>' + (first.length < full.length ? escHtml(first) + ' <button type="button" class="kd-story">Read more</button>' : desc.innerHTML);
      col.appendChild(box); col.appendChild(desc);
      var more = box.querySelector('.kd-story'); if (more) more.addEventListener('click', openAll);
    }
    [document.querySelector('.profile-section-block'), document.querySelector('.st-text')].forEach(function (el) {
      if (!el) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'kd-story'; b.textContent = 'Read the whole story';
      b.addEventListener('click', openAll); el.parentNode.insertBefore(b, el);
    });
    // a link (the profile's "On this page") or an address that points into the folded text opens it first
    function folded(id) {
      try { id = decodeURIComponent(id); } catch (e) {}
      var t = id && document.getElementById(id);
      return t && html.getAttribute('data-kids') === '1' && !html.classList.contains('kd-open') && t.closest('.profile-section-block, .profile-references, .st-text, .enc-desc') ? t : null;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && folded(a.getAttribute('href').slice(1))) openAll();
    }, true);
    var ft = location.hash && folded(location.hash.slice(1));
    if (ft) { openAll(); requestAnimationFrame(function () { ft.scrollIntoView(); }); }
    // a day page: the wars and killings of the day wait behind a button (unless they are all there is)
    var evs = Array.prototype.slice.call(document.querySelectorAll('li.tih-event-card')), rough = evs.filter(function (li) {
      var t = li.querySelector('.tih-event-title'), d = li.querySelector('.tih-event-desc');
      return !kidsGentle(t ? t.textContent : li.textContent, d ? d.textContent : '');
    });
    if (rough.length && rough.length < evs.length) {
      rough.forEach(function (li) { li.classList.add('kd-rough'); });
      var rb = document.createElement('button'); rb.type = 'button'; rb.className = 'kd-story';
      rb.textContent = 'Show the battles and wars of this day too (' + rough.length + ')';
      rb.addEventListener('click', openAll);
      evs[evs.length - 1].parentNode.parentNode.insertBefore(rb, evs[evs.length - 1].parentNode.nextSibling);
    }
  })();

  // ── Reading paths as journeys ────────────────────────────────────────────────
  // epoch-seen: the reading pages visited in this browser; epoch-paths: each opened path's stops (progress on
  // /paths/); epoch-path: the path being followed, whose stops show where they stand and lead to the next one
  (function () {
    function get(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } }
    function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    var here = location.pathname.replace(/\/+$/, '') || '/', seen = get('epoch-seen', []);
    if (!Array.isArray(seen)) seen = [];
    if (/^\/(empire|encyclopedia|state|speeches|countries|centuries)\/[^/]+$/.test(here) && seen.indexOf(here) < 0) { seen.push(here); if (seen.length > 3000) seen = seen.slice(-3000); put('epoch-seen', seen); }
    function isSeen(h) { return seen.indexOf(String(h || '').replace(/\/+$/, '')) >= 0; }
    // a path's own page: the stops already read, the progress, the next stop
    var list = document.querySelector('ol.path-steps');
    if (list) {
      var links = Array.prototype.slice.call(list.querySelectorAll('a.path-step')), slug = here.split('/').pop();
      var title = ((document.querySelector('h1') || {}).textContent || '').trim();
      var steps = links.map(function (a) { return [a.getAttribute('href'), ((a.querySelector('.path-step-name') || a).textContent || '').trim()]; });
      var paths = get('epoch-paths', {}); paths[slug] = steps.map(function (s) { return s[0]; }); put('epoch-paths', paths);
      var read = 0, nextI = -1;
      links.forEach(function (a, i) { if (isSeen(a.getAttribute('href'))) { a.classList.add('is-read'); read++; } else if (nextI < 0) nextI = i; });
      var box = document.createElement('div'); box.className = 'path-progress';
      box.innerHTML = '<div class="path-bar" aria-hidden="true"><i style="width:' + Math.round(100 * read / Math.max(1, steps.length)) + '%"></i></div><p>' +
        (read ? read + ' of ' + steps.length + ' stops read' : steps.length + ' stops') +
        (nextI >= 0 ? ' · <a class="path-continue" href="' + escHtml(steps[nextI][0]) + '" data-i="' + nextI + '">' + (read ? 'Continue' : 'Start') + ': ' + escHtml(steps[nextI][1]) + ' &rarr;</a>' : ' · every stop read &#10003;') + '</p>';
      list.parentNode.insertBefore(box, list);
      var follow = function (i) { put('epoch-path', { s: slug, t: title, steps: steps, i: i }); };
      list.addEventListener('click', function (e) { var a = e.target.closest('a.path-step'); if (a) follow(links.indexOf(a)); });
      box.addEventListener('click', function (e) { var a = e.target.closest('a.path-continue'); if (a) follow(+a.getAttribute('data-i')); });
      return;
    }
    // the paths index: progress on the paths opened before
    var paths2 = get('epoch-paths', {});
    Array.prototype.forEach.call(document.querySelectorAll('a.path-card'), function (c) {
      var st = paths2[(c.getAttribute('href') || '').replace(/\/+$/, '').split('/').pop()]; if (!st || !st.length) return;
      var n = st.filter(isSeen).length; if (!n) return;
      var b = document.createElement('span'); b.className = 'path-card-progress'; b.textContent = n >= st.length ? 'Read ✓' : n + ' of ' + st.length + ' read';
      c.appendChild(b);
    });
    // a stop of the path being followed: where it stands, and the next stop
    var jp = get('epoch-path', null);
    if (!jp || !Array.isArray(jp.steps)) return;
    var at = -1; jp.steps.forEach(function (s, i) { if (String(s[0]).replace(/\/+$/, '') === here) at = i; });
    if (at < 0) return;
    var nx = jp.steps[at + 1], bar = document.createElement('div');
    bar.className = 'path-journey'; bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Reading path');
    bar.innerHTML = '<a class="pj-path" href="/paths/' + escHtml(jp.s) + '">' + escHtml(jp.t) + '</a><span class="pj-at">Stop ' + (at + 1) + ' of ' + jp.steps.length + '</span>' +
      (nx ? '<a class="pj-next" href="' + escHtml(nx[0]) + '">Next: ' + escHtml(nx[1]) + ' &rarr;</a>' : '<a class="pj-next" href="/paths/' + escHtml(jp.s) + '">The last stop: back to the path &rarr;</a>') +
      '<button type="button" class="pj-x" aria-label="Stop following this path">&times;</button>';
    document.body.appendChild(bar); document.body.classList.add('has-journey');
    bar.querySelector('.pj-x').addEventListener('click', function () { try { localStorage.removeItem('epoch-path'); } catch (e) {} bar.remove(); document.body.classList.remove('has-journey'); });
    if (nx) bar.querySelector('.pj-next').addEventListener('click', function () { jp.i = at + 1; put('epoch-path', jp); });
  })();

  // ── Reading progress: a thin gold line on the long reading pages ─────────────
  (function () {
    if (!/^\/(empire|encyclopedia)\/[a-z0-9-]+$/.test(location.pathname) || location.pathname === '/encyclopedia/glossary') return;
    var bar = document.createElement('div'); bar.className = 'read-progress'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var ticking = false;
    function set() { ticking = false; var max = document.documentElement.scrollHeight - window.innerHeight; bar.style.width = (max > 600 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0) + '%'; }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(set); } }, { passive: true });
    set();
  })();

  // ── Listen: the page read aloud by the device's own voices (speechSynthesis) ─────────────
  // Reading pages only (entries, states, profiles of every kind, speeches, day pages, essays, community articles), and
  // only their text: the title, the lede and the sections, never menus, pictures, credits, references or buttons. Text
  // that is hidden (Kids mode folds, a closed full speech) is not read. It never starts by itself; it reads in short
  // sentence chunks (long utterances stop in Chrome); Pause cancels and Resume restarts the chunk (pause() is not
  // reliable on phones); a passage in another language gets a voice of that language or is skipped with a word.
  (function () {
    var synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;   // Android in-app browsers have none
    var TYPES = [
      ['article.enc-article', 'h1.enc-title, .enc-meta, .enc-desc'],
      ['article.st-article', 'h1.st-title, .st-meta, .st-teaser, .st-text h2, .st-text h3, .st-text p'],
      ['main.empire-page', 'h1.profile-detail-name, .profile-summary, .profile-section-block > h2.profile-section-title, .profile-section-body p, .profile-section-body li'],
      ['article.sp-view', 'h1.sp-title, .sp-by, .sp-sec > h2, .sp-sec > p:not(.sp-source), blockquote.sp-quote, .sp-ft-body p, .sp-ft-body > div > p'],
      ['main.day-page', 'h1, .ref-lede, .day-events .tih-event-card'],
      ['article.essay-view', 'h1, .essay-sub, .essay-body h2, .essay-body h3, .essay-body p, .essay-body li'],
      ['article.cm-article', 'h1, .cm-by, .cm-body h2, .cm-body h3, .cm-body p']
    ];
    var type = null, root = null;
    for (var t = 0; t < TYPES.length && !root; t++) { root = document.querySelector(TYPES[t][0]); if (root) type = TYPES[t]; }
    if (!root) return;
    var kidsOn = function () { return document.documentElement.getAttribute('data-kids') === '1'; };
    // the text to say: dates and abbreviations as words, separators as pauses
    function speakable(s) {
      return String(s).replace(/\s+/g, ' ')
        .replace(/(^|[\s(])r\.\s?(?=c\.\s?\d|\d)/g, '$1reigned ').replace(/(^|[\s(])d\.\s?(?=c\.\s?\d|\d)/g, '$1died ')
        .replace(/(^|[\s(])b\.\s?(?=c\.\s?\d|\d)/g, '$1born ').replace(/(^|[\s(])fl\.\s?(?=c\.\s?\d|\d)/g, '$1flourished ')
        .replace(/(^|[\s(–-])c\.\s?(?=\d)/g, '$1circa ')
        .replace(/(\d(?:st|nd|rd|th)?)\s?[–-]\s?(?=(?:circa )?\d)/g, '$1 to ').replace(/\s[–-]\s(?=(?:circa )?\d)/g, ' to ')
        .replace(/\(approx\.\)/g, '(approximately)')
        .replace(/\s[·|]\s/g, ', ').replace(/&/g, ' and ').replace(/\s+/g, ' ').trim();
    }
    // an element's text without its chips, buttons and pictures
    function textOf(el) {
      var c = el.cloneNode(true);
      [].forEach.call(c.querySelectorAll('button, figure, img, svg, .tih-ago, .tih-tags, .tih-hero-kicker, .tih-event-thumb, .ph, .sr-only, sup'), function (x) { x.remove(); });
      if (el.classList.contains('tih-event-card')) {   // a day's event: "1825. The Erie Canal opens. Governor …"
        var y = c.querySelector('.tih-event-year'), h = c.querySelector('.tih-event-title'), d = c.querySelector('.tih-event-desc');
        return [y && y.textContent, h && h.textContent, d && d.textContent].filter(Boolean).map(function (x) { return x.trim().replace(/[.:]?$/, '.'); }).join(' ');
      }
      return c.textContent;
    }
    function shown(el) { return el.getClientRects().length > 0 && !el.closest('[hidden], [aria-hidden="true"], details:not([open]) > :not(summary)'); }
    function langOf(el) { var l = el.closest('[lang]'); l = l ? l.getAttribute('lang').toLowerCase() : 'en'; return l.split('-')[0]; }
    function parts() {
      var out = [];
      [].forEach.call(root.querySelectorAll(type[1]), function (el) {
        if (!shown(el)) return;
        var s = speakable(textOf(el)); if (s.length < 2) return;
        out.push({ el: el, text: s, lang: langOf(el) });
      });
      return out;
    }
    // short chunks: whole sentences up to about 220 characters, long sentences cut at commas
    function chunks(s) {
      var sent = s.match(/[^.!?]+(?:[.!?]+["'’”)\]]*|$)\s*/g) || [s], out = [], cur = '';
      sent.forEach(function (p) {
        var bits = p.length > 260 ? p.split(/,\s/).map(function (b, i, a) { return b + (i < a.length - 1 ? ',' : ''); }) : [p];
        bits.forEach(function (b) { b = b.trim(); if (!b) return; if (cur && (cur + ' ' + b).length > 220) { out.push(cur.trim()); cur = ''; } cur += (cur && !/^[,;:.)\]]/.test(b) ? ' ' : '') + b; });
      });
      if (cur.trim()) out.push(cur.trim());
      return out;
    }
    function voiceFor(lang) {
      var vs = synth.getVoices() || []; if (!vs.length) return null;
      var mine = vs.filter(function (v) { return String(v.lang || '').toLowerCase().replace('_', '-').indexOf(lang) === 0; });
      if (!mine.length) return null;
      if (lang !== 'en') return mine[0];
      function rank(v) { var l = String(v.lang).toLowerCase(); return (l.indexOf('en-gb') === 0 ? 0 : l.indexOf('en-us') === 0 ? 1 : 2) * 2 + (/natural|neural|google/i.test(v.name) ? 0 : 1); }
      return mine.slice().sort(function (a, b) { return rank(a) - rank(b); })[0];
    }
    var RATES = [0.8, 1, 1.2], rate = 1;
    try { var sr = parseFloat(localStorage.getItem('epoch-listen-rate')); if (RATES.indexOf(sr) >= 0) rate = sr; else if (kidsOn()) rate = 0.8; } catch (e) {}
    // the button under the title, the player at the foot of the screen
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'listen-btn'; btn.setAttribute('aria-pressed', 'false');
    var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    function label() { btn.innerHTML = ICON + '<span>' + (state === 'play' ? 'Pause' : state === 'pause' ? 'Resume' : (kidsOn() ? 'Read it to me' : 'Listen')) + '</span>'; btn.setAttribute('aria-pressed', String(state === 'play')); }
    var bar = null, list = [], pos = 0, token = 0, state = 'stop', current = null, userScrolled = false, skipped = {}, lastU = null;
    function ensureBar() {
      if (bar) return;
      bar = document.createElement('div'); bar.className = 'listen-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Reading aloud');
      bar.innerHTML = '<button type="button" class="lb-play"></button><button type="button" class="lb-stop">Stop</button><button type="button" class="lb-rate" aria-label="Reading speed"></button><span class="lb-pos" aria-hidden="true"></span><span class="sr-only lb-live" aria-live="polite"></span>';
      document.body.appendChild(bar);
      bar.querySelector('.lb-play').addEventListener('click', toggle);
      bar.querySelector('.lb-stop').addEventListener('click', stop);
      bar.querySelector('.lb-rate').addEventListener('click', function () {
        rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; try { localStorage.setItem('epoch-listen-rate', String(rate)); } catch (e) {}
        paint(); if (state === 'play') { synth.cancel(); speakFrom(pos); }
      });
    }
    function paint() {
      label(); if (!bar) return;
      bar.hidden = state === 'stop'; document.body.classList.toggle('has-listen', state !== 'stop');
      bar.querySelector('.lb-play').textContent = state === 'play' ? 'Pause' : 'Resume';
      bar.querySelector('.lb-rate').textContent = String(rate).replace(/^1$/, '1') + '×';
      bar.querySelector('.lb-pos').textContent = list.length ? 'Part ' + Math.min(list[Math.min(pos, list.length - 1)].part + 1, list.total) + ' of ' + list.total : '';
    }
    function say(msg) { if (bar) bar.querySelector('.lb-live').textContent = msg; }
    function mark(el) {
      if (current === el) return;
      if (current) current.classList.remove('is-speaking');
      current = el; if (!el) return;
      el.classList.add('is-speaking');
      var r = el.getBoundingClientRect();
      if (!userScrolled && (r.top < 70 || r.bottom > window.innerHeight - 90)) el.scrollIntoView({ block: 'center', behavior: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    function build() {
      var ps = parts(), out = []; skipped = {};
      ps.forEach(function (p, k) {
        var v = voiceFor(p.lang);
        if (!v && p.lang !== 'en') { if (!skipped[p.lang]) { skipped[p.lang] = 1; out.push({ el: p.el, text: 'The original text, in another language, is skipped: there is no voice for it on this device.', lang: 'en', part: k }); } return; }
        chunks(p.text).forEach(function (c) { out.push({ el: p.el, text: c, lang: p.lang, part: k }); });
      });
      out.total = ps.length; return out;
    }
    function speakFrom(i) {
      var my = ++token; pos = i;
      if (pos >= list.length) { stop(); say('Finished reading.'); return; }
      var it = list[pos], u = new SpeechSynthesisUtterance(it.text), v = voiceFor(it.lang) || voiceFor('en');
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = it.lang === 'en' ? 'en-GB' : it.lang;
      u.rate = rate; lastU = u;   // kept: Chrome can collect a speaking utterance and never send its end
      u.onstart = function () { if (my === token) { mark(it.el); paint(); } };
      u.onend = function () { if (my === token && state === 'play') speakFrom(pos + 1); };
      u.onerror = function (e) { if (my !== token) return; if (e && (e.error === 'interrupted' || e.error === 'canceled')) return; if (state === 'play') speakFrom(pos + 1); };
      synth.speak(u);
    }
    function play() {
      if (state === 'stop') { synth.cancel(); list = build(); pos = 0; if (!list.length) return; }
      ensureBar(); state = 'play'; userScrolled = false; paint(); say('Reading aloud.');
      speakFrom(pos);
    }
    function pause() { if (state !== 'play') return; state = 'pause'; token++; synth.cancel(); paint(); say('Paused.'); }
    function stop() { token++; if (state !== 'stop') synth.cancel(); state = 'stop'; mark(null); pos = 0; paint(); say('Stopped.'); }
    function toggle() { if (state === 'play') pause(); else play(); }
    btn.addEventListener('click', toggle);
    // the reader takes over the scrolling: the page then stops following the voice until the next Resume
    ['wheel', 'touchmove'].forEach(function (ev) { window.addEventListener(ev, function () { if (state === 'play') userScrolled = true; }, { passive: true }); });
    window.addEventListener('keydown', function (e) { if (state === 'play' && /^(PageUp|PageDown|ArrowUp|ArrowDown|Home|End| )$/.test(e.key) && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) userScrolled = true; });
    window.addEventListener('pagehide', function () { if (state !== 'stop') { token++; synth.cancel(); } });
    document.addEventListener('epoch:kids', function () { label(); });
    // where the button goes: under the title (profiles: next to the meta line)
    function place() {
      var host = root.querySelector('.enc-meta, .st-meta, .empire-meta, .sp-by, .essay-sub, .cm-by') || (type[0] === 'main.day-page' ? root.querySelector('.ref-lede') : null) || root.querySelector('h1');
      if (!host) return false;
      var row = document.createElement('p'); row.className = 'listen-row'; row.appendChild(btn);
      host.parentNode.insertBefore(row, host.nextSibling); label(); return true;
    }
    // only where an English voice exists (the list of voices can arrive late)
    var placed = false, tries = 0;
    function check() {
      if (placed) return;
      if (voiceFor('en')) { placed = parts().length > 0 && place(); return; }   // a page with nothing to read gets no button
      if (++tries < 8) setTimeout(check, 400);
    }
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', check); else synth.onvoiceschanged = check;
    check();
    window.epochListen = { parts: function () { return parts().map(function (p) { return p.text; }); }, chunks: chunks, speakable: speakable, play: play, pause: pause, stop: stop, state: function () { return state; } };
  })();

  // ── Surprise me: a random profile, day or century ─────────────────────────────
  (function () {
    var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    var DMAX = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function ordinal(n) { return n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'); }
    function go(u) { document.body.classList.add('page-leaving'); setTimeout(function () { location.href = u; }, 180); }
    function surprise() {
      var r = Math.random();
      if (r < 0.55) {
        var pick = function () { var p = SEARCH_PROFILES[Math.floor(Math.random() * SEARCH_PROFILES.length)]; go(p[1]); };
        if (typeof SEARCH_PROFILES !== 'undefined') pick();
        else if (typeof EMPIRES !== 'undefined') go(profileUrl(EMPIRES[Math.floor(Math.random() * EMPIRES.length)]));
        else { var s = document.createElement('script'); s.src = SEARCH_PROFILES_SRC; s.onload = pick; s.onerror = function () { go('/today-in-history/'); }; document.head.appendChild(s); }
      } else if (r < 0.8) {
        var m = Math.floor(Math.random() * 12);
        go('/today-in-history/' + MONTHS[m] + '-' + (Math.floor(Math.random() * DMAX[m]) + 1));
      } else {
        var i = Math.floor(Math.random() * 51);   // 30th century BCE … 21st century
        go('/centuries/' + (i < 30 ? ordinal(30 - i) + '-century-bce' : ordinal(i - 29) + '-century'));
      }
    }
    document.querySelectorAll('#nav-surprise, [data-surprise]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); surprise(); });
    });
  })();

  // ── Back to top: appears after a screen and a half of scrolling ─────────────
  (function () {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'to-top'; b.hidden = true; b.title = 'Back to top';
    b.setAttribute('aria-label', 'Back to top');
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>';
    document.body.appendChild(b);
    let shown = false;
    const check = () => { const s = window.scrollY > window.innerHeight * 1.5; if (s !== shown) { shown = s; b.hidden = !s; } };
    window.addEventListener('scroll', check, { passive: true }); check();
    b.addEventListener('click', () => {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      const m = document.getElementById('main'); if (m) m.focus({ preventScroll: true });
    });
  })();

  // ── Page transitions ────────────────────────────────────────────────────────
  document.body.classList.add('page-entering');
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.getAttribute('target') === '_blank' || a.hasAttribute('download')) return;
    try {
      // an SVG link's .href is an object (SVGAnimatedString), not a string: read the attribute's text instead
      const raw = typeof a.href === 'string' ? a.href : (a.href && a.href.baseVal) || a.getAttribute('href');
      const dest = new URL(raw, location.href);
      if (dest.origin !== location.origin) return;
      if (dest.pathname === location.pathname && dest.hash) return;
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(() => { window.location.href = dest.href; }, 180);
    } catch(e) {}
  });

  window.addEventListener('pageshow', function() {
    document.body.classList.remove('page-leaving');
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.querySelectorAll('.modal-overlay').forEach(function(el) {
      // close a modal left open across navigation, without pinning an inline display:none that would stop
      // class-based modals (community's share form opens with .is-open) from ever opening again
      el.classList.remove('is-open', 'closing');
      if (el.style.display && el.style.display !== 'none') el.style.display = 'none';
    });
  });

  // ── Hamburger ───────────────────────────────────────────────────────────────
  (function() {
    const btn = document.getElementById('nav-hamburger');
    const drop = document.getElementById('nav-dropdown');
    function closeMenu() {
      drop.classList.remove('open');
      btn.textContent = '☰';
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = drop.classList.toggle('open');
      btn.textContent = open ? '✕' : '☰';
      btn.setAttribute('aria-expanded', String(open));
      if (open) { const first = drop.querySelector('.nav-dropdown-link'); if (first) first.focus(); }
    });
    drop.querySelectorAll('.nav-dropdown-link').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('click', e => {
      if (drop.classList.contains('open') && !drop.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drop.classList.contains('open')) { closeMenu(); btn.focus(); }
    });
  })();

  // ── Skip link target: the page's <main>, or the first content element after the nav ──
  (function() {
    let main = document.getElementById('main') || document.querySelector('main');
    if (!main) {
      main = document.getElementById('site-nav').nextElementSibling;
      while (main && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(main.tagName)) main = main.nextElementSibling;
    }
    if (!main) return;
    if (!main.id) main.id = 'main';
    else document.querySelector('.skip-link').setAttribute('href', '#' + main.id);
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  })();

  // ── Nav scroll ──────────────────────────────────────────────────────────────
  window.addEventListener('scroll', () => {
    document.getElementById('site-nav').classList.toggle('scrolled', window.scrollY > 80);
  });

  // ── Contact: a page of its own (/contact); old callers of the modal go there ──
  window.openContactModal = function () { location.href = '/contact'; };

  // ── Desktop dropdown groups (hover + click + keyboard nav) ──────────────────
  (function() {
    var wraps = Array.prototype.slice.call(document.querySelectorAll('.nav-group-wrap'));
    var timers = wraps.map(function() { return null; });

    function closeAll() {
      wraps.forEach(function(w, i) {
        clearTimeout(timers[i]); timers[i] = null;
        w.classList.remove('open');
        var b = w.querySelector('.nav-parent-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    }

    wraps.forEach(function(wrap, i) {
      var btn  = wrap.querySelector('.nav-parent-btn');
      var menu = wrap.querySelector('.nav-group-menu');
      if (!btn || !menu) return;

      wrap.addEventListener('mouseenter', function() {
        clearTimeout(timers[i]);
        wrap.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      });
      wrap.addEventListener('mouseleave', function() {
        timers[i] = setTimeout(function() {
          wrap.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          timers[i] = null;
        }, 300);
      });

      btn.addEventListener('click', function(e) {
        var isOpen = wrap.classList.contains('open');
        closeAll();
        if (!isOpen) {
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
        e.stopPropagation();
      });

      btn.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          wrap.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          var first = menu.querySelector('a, button');
          if (first) first.focus();
        } else if (e.key === 'Escape') { closeAll(); }
      });

      var items = Array.prototype.slice.call(menu.querySelectorAll('a, button'));
      items.forEach(function(item, idx) {
        item.addEventListener('keydown', function(e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (items[idx + 1]) items[idx + 1].focus(); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); if (idx === 0) btn.focus(); else items[idx - 1].focus(); }
          else if (e.key === 'Escape') { closeAll(); btn.focus(); }
        });
      });
    });

    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav-group-wrap')) closeAll();
    });
  })();

  // ── Footer newsletter form ────────────────────────────────────────────────────
  (function() {
    var form = document.getElementById('footer-nl-form');
    if (!form) return;
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = document.getElementById('footer-nl-email').value.trim();
      if (!isValidEmail(email)) return;
      var btn = form.querySelector('button'), msg = document.getElementById('footer-nl-msg');
      btn.disabled = true;
      subscribeNewsletter(email, 'footer').then(function() {
        try { localStorage.setItem('epoch-nl', '1'); } catch (e2) {}
        msg.textContent = 'Subscribed!'; msg.style.color = 'var(--success)';
        msg.style.display = 'block';
        form.style.display = 'none';
      }).catch(function() {
        btn.disabled = false;
        msg.textContent = 'That did not go through. Please try again.'; msg.style.color = 'var(--error)';
        msg.style.display = 'block';
      });
    });
  })();

  // ── A word from the past: the ✦ in the footer reveals a rotating quotation ───
  (function () {
    var QUOTES = [
      ['Those who cannot remember the past are condemned to repeat it.', 'George Santayana'],
      ['The past resembles the future more than one drop of water resembles another.', 'Ibn Khaldun'],
      ['History is the witness that testifies to the passing of time.', 'Cicero'],
      ['Great deeds are usually wrought at great risks.', 'Herodotus'],
      ['The secret of happiness is freedom, the secret of freedom is courage.', 'Thucydides'],
      ['Loss is nothing else but change, and change is Nature’s delight.', 'Marcus Aurelius'],
      ['The more corrupt the state, the more numerous the laws.', 'Tacitus'],
      ['Those who know how to win are much more numerous than those who know how to make proper use of their victories.', 'Polybius'],
      ['A man has only one death. It may be as weighty as Mount Tai or as light as a goose feather.', 'Sima Qian'],
      ['Study the past if you would define the future.', 'Confucius'],
      ['History is little more than the register of the crimes, follies, and misfortunes of mankind.', 'Edward Gibbon'],
      ['We owe respect to the living; to the dead we owe only truth.', 'Voltaire'],
      ['People will not look forward to posterity, who never look backward to their ancestors.', 'Edmund Burke'],
      ['Whoever wishes to foresee the future must consult the past.', 'Niccolò Machiavelli'],
      ['The two most powerful warriors are patience and time.', 'Leo Tolstoy'],
      ['The Moving Finger writes; and, having writ, moves on.', 'Omar Khayyám'],
      ['Every epoch is immediate to God.', 'Leopold von Ranke'],
      ['What experience and history teach is this — that peoples and governments have never learned anything from history.', 'G. W. F. Hegel']
    ];
    var btn = document.getElementById('footer-quote-btn'), out = document.getElementById('footer-quote');
    if (!btn || !out) return;
    var day = Math.floor(Date.now() / 86400000), i = day % QUOTES.length, shown = false;
    btn.addEventListener('click', function () {
      if (shown) i = (i + 1) % QUOTES.length;   // another click, another voice
      var q = QUOTES[i];
      out.innerHTML = '“' + escHtml(q[0]) + '” <span class="footer-quote-by">— ' + escHtml(q[1]) + '</span>';
      out.hidden = false; shown = true;
      btn.setAttribute('aria-expanded', 'true');
    });
  })();
}
