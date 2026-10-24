// shared-nav.js — injected on every page of The Epoch Institute

// ── Shared utilities ──────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

// ── Site-wide search (profiles + encyclopedia + states; index loaded on first open) ─────
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
    if (s > 0) out.push({ s: s, name: r[1], type: SEARCH_TYPES[r[2]] || r[2], href: '/encyclopedia/' + r[0], enc: r[2] === 'polity' });
  });
  // every state in the register (page /state/<id>); an encyclopedia polity of the same name is dropped in its favour
  if (typeof SEARCH_STATES !== 'undefined') {
    var stateNames = {};
    SEARCH_STATES.forEach(function (r) {
      var s = searchScore(q, r[1]);
      if (!s && r[3]) r[3].split('|').forEach(function (a) { s = Math.max(s, searchScore(q, a) - 10); });
      if (s > 0) { out.push({ s: s + 2, name: r[1], type: String(r[2] || 'state').replace(/-/g, ' ') + ' · state', href: '/state/' + r[0] }); stateNames[searchFold(r[1])] = 1; }
    });
    out = out.filter(function (o) { return !(o.enc && stateNames[searchFold(o.name)]); });
  }
  out.sort(function (a, b) { return b.s - a.s || a.name.length - b.name.length; });
  return out.slice(0, 12);
}
var SEARCH_INDEX_SRC = '/search-index.js?v=5';   // also loaded by quiz.js for answer suggestions
function initSiteSearch() {
  var box = document.getElementById('site-search'), input = document.getElementById('site-search-input'),
      list = document.getElementById('site-search-results'), hint = document.getElementById('site-search-hint'),
      opener = null, active = -1, loading = false;
  function load(cb) {
    if (typeof SEARCH_INDEX !== 'undefined') return cb();
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = SEARCH_INDEX_SRC;
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
    ['quiz', '/quiz', 'History Quiz', 'A new puzzle every day'], ['glossary', '/encyclopedia/glossary', 'Glossary', 'Historical terms explained']];
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
    ${[['profiles', '/profiles', 'Profiles'], ['encyclopedia', '/encyclopedia/', 'Encyclopedia'], ['states', '/state/', 'States'], ['today', '/today-in-history/', 'Today in History']].map(x => navItem(x, 'nav-dropdown-link')).join('\n    ')}
    <span class="nav-dropdown-group">Explore</span>
    ${EXPLORE.map(x => navItem(x, 'nav-dropdown-link')).join('\n    ')}
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
        <a class="footer-link" href="/quiz">History Quiz</a>
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
        </div>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span data-i18n="footer_copy">© ${new Date().getFullYear()} The Epoch Institute</span>
  </div>
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
