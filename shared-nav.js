// shared-nav.js — injected on every page of The Epoch Institute

// ── Shared utilities ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function jsonp(url, cb) {
  const fn = '_ep_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  window[fn] = function(data) { delete window[fn]; document.head.removeChild(s); cb(data); };
  const s = document.createElement('script');
  s.src = url + '&callback=' + fn;
  s.onerror = function() { delete window[fn]; cb([]); };
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
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(function() {
          var orig = item.textContent; item.textContent = '✓ Copied!';
          setTimeout(function() { item.textContent = orig; }, 2000);
        }).catch(function() {});
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

// ── Site-wide search (empires + encyclopedia; index loaded on first open) ─────
var SEARCH_TYPES = { person: 'Person', event: 'Event', place: 'Place', polity: 'State', group: 'People / group',
  institution: 'Institution', term: 'Term', idea: 'Idea', work: 'Work', factor: 'Factor' };
function searchFold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'ʿʾ]/g, ''); }
function searchScore(q, name) {
  var n = searchFold(name);
  if (n === q) return 100;
  if (n.indexOf(q) === 0) return 80;
  if ((' ' + n).indexOf(' ' + q) !== -1) return 60;
  if (n.indexOf(q) !== -1) return 40;
  return 0;
}
function siteSearch(query) {
  var q = searchFold(query).trim(), out = [];
  if (q.length < 2) return out;
  if (typeof EMPIRES !== 'undefined') EMPIRES.forEach(function (e) {
    var s = searchScore(q, e.name);
    if (s) out.push({ s: s + 15, name: e.name, type: profileSubtype(e) + ' · profile', href: profileUrl(e) });
  });
  if (typeof SEARCH_INDEX !== 'undefined') SEARCH_INDEX.forEach(function (r) {
    var s = searchScore(q, r[1]);
    if (!s && r[3]) r[3].split('|').forEach(function (a) { s = Math.max(s, searchScore(q, a) - 10); });
    if (s > 0) out.push({ s: s, name: r[1], type: SEARCH_TYPES[r[2]] || r[2], href: '/encyclopedia#' + r[0] });
  });
  out.sort(function (a, b) { return b.s - a.s || a.name.length - b.name.length; });
  return out.slice(0, 12);
}
function initSiteSearch() {
  var box = document.getElementById('site-search'), input = document.getElementById('site-search-input'),
      list = document.getElementById('site-search-results'), hint = document.getElementById('site-search-hint'),
      opener = null, active = -1, loading = false;
  function load(cb) {
    if (typeof SEARCH_INDEX !== 'undefined') return cb();
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = '/search-index.js?v=1';
    s.onload = function () { loading = false; cb(); }; s.onerror = function () { loading = false; cb(); };
    document.head.appendChild(s);
  }
  function render() {
    var res = siteSearch(input.value); active = -1;
    list.innerHTML = res.map(function (r, i) {
      return '<li role="option" id="ss-opt-' + i + '"><a href="' + r.href + '"><span class="ss-name">' + escHtml(r.name) + '</span><span class="ss-type">' + escHtml(r.type) + '</span></a></li>';
    }).join('');
    hint.textContent = input.value.trim().length < 2 ? EMPIRES.length + ' profiles and the full encyclopedia.' : (res.length ? '' : 'No matches. Try another spelling or a shorter word.');
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
}

// ── Encyclopedia previews: hover/focus (or first tap on touch) a gold link → small card ─
// Data: /data/enc-preview/<first char of slug>.json, fetched on demand and cached.
function initEncPreviews() {
  var cache = {}, card = null, showTimer = null, hideTimer = null, current = null;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  function slugOf(a) { var h = a.getAttribute('href') || '', i = h.indexOf('#'); return (i !== -1 && (h.indexOf('/encyclopedia') === 0 || i === 0)) ? decodeURIComponent(h.slice(i + 1)) : null; }
  function load(slug, cb) {
    var c = /^[a-z]/.test(slug) ? slug[0] : '0';
    if (cache[c]) return cb(cache[c][slug]);
    fetch('/data/enc-preview/' + c + '.json?v=1').then(function (r) { return r.json(); })
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
        '<a class="enc-preview-more" href="' + escHtml(href) + '">Read the full entry →</a></div>';
      card.classList.toggle('no-img', !p.i);
      card.hidden = false; place(a); a.setAttribute('aria-describedby', 'enc-preview');
    });
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

  const researchActive = ['research','series','explorer','profiles','dataset'].includes(activePage);
  const communityActive = activePage === 'community';
  const aboutActive = ['about','contributors'].includes(activePage);

  const navHtml = `
<a class="skip-link" href="#main">Skip to content</a>
<nav class="site-nav" id="site-nav" aria-label="Main">
  <a href="/" class="nav-logo">
    <span class="nav-logo-text">THE EPOCH INSTITUTE</span>
  </a>
  <div class="nav-links">
    <a href="/today-in-history" class="nav-link"${activeStyle('today')} id="nav-today-link">Today in History</a>
    <a href="/encyclopedia" class="nav-link"${activeStyle('encyclopedia')} id="nav-encyclopedia-link">Encyclopedia</a>
    <div class="nav-group-wrap" id="nav-research-wrap">
      <button class="nav-parent-btn${researchActive ? ' active-group' : ''}" id="nav-research-btn" aria-haspopup="true" aria-expanded="false">Research ▾</button>
      <div class="nav-group-menu" id="nav-research-menu" role="menu">
        <a href="/explorer" id="nav-explorer-link"${activeStyle('explorer')}>Empire Explorer</a>
        <a href="/profiles" id="nav-profiles-link"${activeStyle('profiles')}>Profiles</a>
        <a href="/research-series" id="nav-series-link"${activeStyle('series')}>Research Series</a>
        <a href="/research" id="nav-research-link"${activeStyle('research')}>Research Hub</a>
        <a href="/dataset" id="nav-dataset-link"${activeStyle('dataset')}>Open Dataset</a>
      </div>
    </div>
    <div class="nav-group-wrap" id="nav-community-wrap">
      <button class="nav-parent-btn${communityActive ? ' active-group' : ''}" id="nav-community-btn" aria-haspopup="true" aria-expanded="false">Community ▾</button>
      <div class="nav-group-menu" id="nav-community-menu" role="menu">
        <a href="/community" id="nav-community-link"${activeStyle('community')}>Community Hub</a>
        <a href="/community#submit">Submit Article</a>
        <a href="/#newsletter-section">Newsletter</a>
      </div>
    </div>
    <div class="nav-group-wrap" id="nav-about-wrap">
      <button class="nav-parent-btn${aboutActive ? ' active-group' : ''}" id="nav-about-btn" aria-haspopup="true" aria-expanded="false">About ▾</button>
      <div class="nav-group-menu" id="nav-about-menu" role="menu">
        <a href="/about" id="nav-about-link"${activeStyle('about')}>The Institute</a>
        <a href="/contributors" id="nav-contributors-link"${activeStyle('contributors')}>Contributors</a>
        <button onclick="openContactModal()">Contact</button>
      </div>
    </div>
  </div>
  <div class="nav-toggles">
    <button class="nav-search-btn" id="nav-search-btn" aria-label="Search the site" title="Search (/)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></button>
    <button class="nav-toggle-btn" id="theme-toggle">&#x2600;</button>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-dropdown">&#x2630;</button>
  </div>
  <div id="nav-dropdown" class="nav-dropdown">
    <a href="/today-in-history" class="nav-dropdown-link" id="mob-today"${activeStyle('today')}>Today in History</a>
    <a href="/encyclopedia" class="nav-dropdown-link" id="mob-encyclopedia"${activeStyle('encyclopedia')}>Encyclopedia</a>
    <span class="nav-dropdown-group">Research</span>
    <a href="/explorer" class="nav-dropdown-link" id="mob-explorer"${activeStyle('explorer')}>Empire Explorer</a>
    <a href="/profiles" class="nav-dropdown-link" id="mob-profiles"${activeStyle('profiles')}>Profiles</a>
    <a href="/research-series" class="nav-dropdown-link" id="mob-series"${activeStyle('series')}>Research Series</a>
    <a href="/research" class="nav-dropdown-link" id="mob-research"${activeStyle('research')}>Research Hub</a>
    <a href="/dataset" class="nav-dropdown-link" id="mob-dataset"${activeStyle('dataset')}>Open Dataset</a>
    <span class="nav-dropdown-group">Community</span>
    <a href="/community" class="nav-dropdown-link" id="mob-community"${activeStyle('community')}>Community Hub</a>
    <a href="/community#submit" class="nav-dropdown-link">Submit Article</a>
    <a href="/#newsletter-section" class="nav-dropdown-link">Newsletter</a>
    <span class="nav-dropdown-group">About</span>
    <a href="/about" class="nav-dropdown-link" id="mob-about"${activeStyle('about')}>The Institute</a>
    <a href="/contributors" class="nav-dropdown-link" id="mob-contributors"${activeStyle('contributors')}>Contributors</a>
    <button type="button" class="nav-dropdown-link" id="mob-contact">Contact</button>
  </div>
</nav>`;

  const footerHtml = `
<footer id="site-footer">
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
        <span class="footer-col-title">Research</span>
        <a class="footer-link" href="/today-in-history" id="fl-today">Today in History</a>
        <a class="footer-link" href="/encyclopedia" id="fl-encyclopedia">Encyclopedia</a>
        <a class="footer-link" href="/explorer" id="fl-explorer">Empire Explorer</a>
        <a class="footer-link" href="/profiles" id="fl-profiles">Profiles</a>
        <a class="footer-link" href="/research" id="fl-research">Research Hub</a>
        <a class="footer-link" href="/research-series" id="fl-series">Research Series</a>
        <a class="footer-link" href="/dataset" id="fl-dataset">Open Dataset</a>
        <a class="footer-link" href="/about#methodology">Methodology</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Community</span>
        <a class="footer-link" href="/community#community-blogs" id="fl-blogs">Blogs</a>
        <a class="footer-link" href="/community#community-opinions-display" id="fl-opinions">Opinions</a>
        <a class="footer-link" href="/community#submit" id="fl-submit">Submit Article</a>
        <a class="footer-link" href="/community#newsletter-band" id="fl-newsletter">Newsletter</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">About</span>
        <a class="footer-link" href="/about" id="fl-institute">The Institute</a>
        <a class="footer-link" href="/contributors" id="fl-contributors">Contributors</a>
        <a class="footer-link" href="#" id="fl-contact">Contact</a>
      </div>
      <div class="footer-col">
        <div class="footer-newsletter">
          <span class="footer-nl-label">Newsletter</span>
          <form class="footer-nl-form" id="footer-nl-form">
            <input type="email" id="footer-nl-email" placeholder="your@email.com" required aria-label="Email for newsletter">
            <button type="submit">→</button>
          </form>
          <p id="footer-nl-msg" style="display:none; font-size:11px; color:var(--success); margin-top:6px; font-family:'Crimson Pro',serif;"></p>
        </div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span data-i18n="footer_copy">© ${new Date().getFullYear()} The Epoch Institute</span>
  </div>
</footer>`;

  const contactModalHtml = `
<div id="contact-modal" class="modal-overlay" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
  <div class="modal-box">
    <button class="modal-close" id="contact-modal-close" aria-label="Close">✕</button>
    <h3 class="modal-title" id="contact-modal-title">Get in Touch</h3>
    <form class="modal-form" id="contact-form" novalidate>
      <div class="form-row">
        <label class="form-label" for="ct-name">Name <span class="form-required">*</span></label>
        <input class="form-input" id="ct-name" type="text" placeholder="Your name" autocomplete="name">
      </div>
      <div class="form-row">
        <label class="form-label" for="ct-email">Email <span class="form-required">*</span></label>
        <input class="form-input" id="ct-email" type="email" placeholder="your@email.com" autocomplete="email">
      </div>
      <div class="form-row">
        <label class="form-label" for="ct-message">Message <span class="form-required">*</span></label>
        <textarea class="form-input form-textarea" id="ct-message" placeholder="Your message…"></textarea>
      </div>
      <button type="submit" class="form-submit" id="ct-submit">Send Message →</button>
      <p class="form-success" id="ct-success" style="display:none;">Thank you — we’ll be in touch shortly.</p>
    </form>
  </div>
</div>`;

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

  // Inject nav, footer, contact modal, search
  document.body.insertAdjacentHTML('afterbegin', navHtml);
  document.body.insertAdjacentHTML('beforeend', footerHtml + contactModalHtml + searchHtml);
  initSiteSearch();
  initEncPreviews();

  // ── Theme toggle ────────────────────────────────────────────────────────────
  (function() {
    const btn = document.getElementById('theme-toggle');
    function applyTheme(isDark) {
      btn.textContent    = isDark ? '☀' : '🌙';
      btn.title          = isDark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }
    applyTheme(document.documentElement.getAttribute('data-theme') !== 'light');
    btn.addEventListener('click', () => {
      const html   = document.documentElement;
      const isDark = html.getAttribute('data-theme') !== 'light';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('epoch-theme', isDark ? 'light' : 'dark');
      applyTheme(!isDark);
    });
  })();

  // ── Page transitions ────────────────────────────────────────────────────────
  document.body.classList.add('page-entering');
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    try {
      const dest = new URL(a.href, location.href);
      if (dest.origin !== location.origin) return;
      if (dest.pathname === location.pathname && dest.hash) return;
      e.preventDefault();
      const href = a.href;
      document.body.classList.add('page-leaving');
      setTimeout(() => { window.location.href = href; }, 180);
    } catch(e) {}
  });

  window.addEventListener('pageshow', function() {
    document.body.classList.remove('page-leaving');
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    document.querySelectorAll('.modal-overlay').forEach(function(el) {
      el.style.display = 'none';
      el.classList.remove('is-open', 'closing');
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
    document.getElementById('mob-contact').addEventListener('click', () => openContactModal());
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

  // ── Contact modal ───────────────────────────────────────────────────────────
  function openContactModal() {
    const overlay = document.getElementById('contact-modal');
    overlay.classList.remove('closing');
    overlay.style.display = 'flex';
    overlay.offsetHeight; // force reflow for animation
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const f = document.getElementById('ct-name'); if (f) f.focus(); }, 50);
  }
  function closeContactModal() {
    const overlay = document.getElementById('contact-modal');
    overlay.classList.remove('is-open');
    overlay.classList.add('closing');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('closing');
      document.body.style.overflow = '';
    }, 220);
  }
  window.openContactModal = openContactModal;

  document.getElementById('contact-modal-close').addEventListener('click', closeContactModal);
  document.getElementById('contact-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeContactModal();
  });
  document.getElementById('fl-contact').addEventListener('click', e => {
    e.preventDefault();
    openContactModal();
  });

  // ── Escape closes contact modal ──────────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var m = document.getElementById('contact-modal');
      if (m && m.style.display !== 'none') closeContactModal();
    }
  });

  document.getElementById('contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const name    = document.getElementById('ct-name').value.trim();
    const email   = document.getElementById('ct-email').value.trim();
    const message = document.getElementById('ct-message').value.trim();
    let ok = true;
    [['ct-name', !name], ['ct-email', !isValidEmail(email)], ['ct-message', !message]].forEach(([id, bad]) => {
      const el = document.getElementById(id);
      el.classList.toggle('form-input-error', bad);
      bad ? el.setAttribute('aria-invalid', 'true') : el.removeAttribute('aria-invalid');
      if (bad) ok = false;
    });
    if (!ok) return;
    const btn = document.getElementById('ct-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ name, email, message, _subject: 'Contact — The Epoch Institute' })
    })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      document.getElementById('contact-form').style.display = 'none';
      document.getElementById('ct-success').style.display = 'block';
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'Send Message →';
    });
  });

  ['ct-name', 'ct-email', 'ct-message'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const el = document.getElementById(id);
      el.classList.remove('form-input-error');
      el.removeAttribute('aria-invalid');
    });
  });

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
      var btn = form.querySelector('button');
      btn.disabled = true;
      fetch(FORMSPREE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: email, _subject: 'Newsletter signup — footer', source: 'footer' })
      }).then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var msg = document.getElementById('footer-nl-msg');
        msg.textContent = 'Subscribed!';
        msg.style.display = 'block';
        form.style.display = 'none';
      }).catch(function() {
        btn.disabled = false;
      });
    });
  })();
}
