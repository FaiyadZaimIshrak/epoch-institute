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

function buildShareButton(ddId, shareUrl, tweetText) {
  return '<button class="tih-share-btn" data-dd="' + ddId + '" aria-label="Share">' + SHARE_BTN_SVG + '</button>' +
    '<div class="tih-share-dropdown" id="' + ddId + '" style="display:none;">' +
      '<button class="tih-share-dd-item" data-action="tweet" data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '" data-tweet="' + escHtml(tweetText) + '">Post on X</button>' +
      '<button class="tih-share-dd-item" data-action="copy" data-dd="' + ddId + '" data-url="' + escHtml(shareUrl) + '">Copy link</button>' +
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
      if (navigator.share) {
        var url = (dd.querySelector('[data-url]') || {}).dataset.url || fallbackUrl;
        var tweet = (dd.querySelector('[data-tweet]') || {}).dataset.tweet || '';
        navigator.share({ title: document.title, text: tweet, url: url }).catch(function() {});
        return;
      }
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

// ── initNav(activePage) ───────────────────────────────────────────────────────
function initNav(activePage) {

  function activeStyle(page) {
    return activePage === page ? ' style="color:var(--gold)"' : '';
  }

  const researchActive = ['research','series','explorer','profiles','dataset'].includes(activePage) ? ' style="color:var(--gold)"' : '';
  const communityActive = activePage === 'community' ? ' style="color:var(--gold)"' : '';
  const aboutActive = ['about','contributors'].includes(activePage) ? ' style="color:var(--gold)"' : '';

  const navHtml = `
<nav class="site-nav" id="site-nav">
  <a href="/index" class="nav-logo">
    <span class="nav-logo-text">THE EPOCH INSTITUTE</span>
  </a>
  <div class="nav-links">
    <a href="/today-in-history" class="nav-link"${activeStyle('today')} id="nav-today-link">Today in History</a>
    <div class="nav-group-wrap" id="nav-research-wrap">
      <button class="nav-parent-btn${researchActive ? ' active-group' : ''}" id="nav-research-btn" aria-haspopup="true" aria-expanded="false">Research ▾</button>
      <div class="nav-group-menu" id="nav-research-menu" role="menu">
        <a href="/explorer" id="nav-explorer-link"${activeStyle('explorer')}>Empire Explorer</a>
        <a href="/profiles" id="nav-profiles-link"${activeStyle('profiles')}>Empire Profiles</a>
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
        <a href="/index#newsletter-section">Newsletter</a>
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
    <button class="nav-toggle-btn" id="theme-toggle">&#x2600;</button>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">&#x2630;</button>
  </div>
  <div id="nav-dropdown" class="nav-dropdown" role="menu">
    <a href="/today-in-history" class="nav-dropdown-link" id="mob-today">Today in History</a>
    <a href="/explorer" class="nav-dropdown-link" id="mob-explorer">Empire Explorer</a>
    <a href="/profiles" class="nav-dropdown-link" id="mob-profiles">Empire Profiles</a>
    <a href="/research-series" class="nav-dropdown-link" id="mob-series">Research Series</a>
    <a href="/research" class="nav-dropdown-link" id="mob-research">Research Hub</a>
    <a href="/dataset" class="nav-dropdown-link" id="mob-dataset">Open Dataset</a>
    <a href="/community" class="nav-dropdown-link" id="mob-community">Community</a>
    <a href="/about" class="nav-dropdown-link" id="mob-about">The Institute</a>
    <a href="/contributors" class="nav-dropdown-link" id="mob-contributors">Contributors</a>
  </div>
</nav>`;

  const footerHtml = `
<footer id="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-logo">THE EPOCH INSTITUTE</span>
      <span class="footer-brand-tag" data-i18n="brand_tag">Historical &amp; Societal Research</span>
    </div>
    <div class="footer-links">
      <div class="footer-col">
        <span class="footer-col-title">Research</span>
        <a class="footer-link" href="/today-in-history" id="fl-today">Today in History</a>
        <a class="footer-link" href="/explorer" id="fl-explorer">Empire Explorer</a>
        <a class="footer-link" href="/profiles" id="fl-profiles">Empire Profiles</a>
        <a class="footer-link" href="/research" id="fl-research">Research Hub</a>
        <a class="footer-link" href="/research-series" id="fl-series">Research Series</a>
        <a class="footer-link" href="/dataset" id="fl-dataset">Open Dataset</a>
        <a class="footer-link" href="/epoch-methodology.pdf" target="_blank" rel="noopener">Methodology</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Community</span>
        <a class="footer-link" href="/community" id="fl-blogs">Blogs</a>
        <a class="footer-link" href="/community" id="fl-opinions">Opinions</a>
        <a class="footer-link" href="/community" id="fl-submit">Submit Article</a>
        <a class="footer-link" href="/community" id="fl-newsletter">Newsletter</a>
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

  // Inject nav, footer, contact modal
  document.body.insertAdjacentHTML('afterbegin', navHtml);
  document.body.insertAdjacentHTML('beforeend', footerHtml + contactModalHtml);

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
      const isDark = html.getAttribute('data-theme') === 'dark';
      html.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('epoch-theme', isDark ? 'light' : 'dark');
      applyTheme(!isDark);
    });
  })();

  // ── Page transitions ────────────────────────────────────────────────────────
  document.body.classList.add('page-entering');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
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
    btn.addEventListener('click', () => {
      const open = drop.classList.toggle('open');
      btn.textContent = open ? '✕' : '☰';
      btn.setAttribute('aria-expanded', String(open));
    });
    drop.querySelectorAll('.nav-dropdown-link').forEach(link => link.addEventListener('click', closeMenu));
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
    .then(() => {
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
      }).then(function() {
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
