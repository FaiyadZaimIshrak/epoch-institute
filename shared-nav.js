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

// ── Language ──────────────────────────────────────────────────────────────────
function applyLang(lang) {
  currentLang = lang;
  const T = TRANSLATIONS[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (!T || T[key] === undefined) return;
    if (el.tagName === 'INPUT') el.placeholder = T[key];
    else el.textContent = T[key];
  });
  document.body.classList.toggle('bangla-mode', lang === 'bn');
  localStorage.setItem('epoch-lang', lang);
}

// ── initNav(activePage) ───────────────────────────────────────────────────────
function initNav(activePage) {

  function activeStyle(page) {
    return activePage === page ? ' style="color:var(--gold)"' : '';
  }

  const navHtml = `
<nav class="site-nav" id="site-nav">
  <a href="/index.html" class="nav-logo">
    <span class="nav-logo-text">THE EPOCH INSTITUTE</span>
  </a>
  <div class="nav-links">
    <a href="/research.html" class="nav-link"${activeStyle('research')} data-i18n="nav_research">Research</a>
    <a href="/research-series.html" class="nav-link"${activeStyle('series')} id="nav-series-link">Series</a>
    <a href="/about.html" class="nav-link"${activeStyle('about')} id="nav-about-link">About</a>
    <a href="/contributors.html" class="nav-link"${activeStyle('contributors')} id="nav-contributors-link">Contributors</a>
    <a href="/dataset.html" class="nav-link"${activeStyle('dataset')} id="nav-dataset-link">Dataset</a>
    <a href="/community.html" class="nav-link"${activeStyle('community')} id="nav-community-link" data-i18n="nav_community">Community</a>
    <a href="/explorer.html" class="nav-link"${activeStyle('explorer')} id="nav-explorer-link" data-i18n="nav_explorer">Explorer</a>
    <a href="https://discord.gg/DmjwDbkW" class="nav-discord-btn" target="_blank" rel="noopener">Community →</a>
  </div>
  <div class="nav-toggles">
    <button class="nav-toggle-btn" id="export-btn" title="Export PNG" data-i18n="export_btn"${activePage !== 'explorer' ? ' style="display:none"' : ''}>&#x2193; PNG</button>
    <button class="nav-toggle-btn" id="lang-toggle" title="Language">বাং</button>
    <button class="nav-toggle-btn" id="theme-toggle" title="Toggle theme">&#x2600;</button>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu" aria-expanded="false">&#x2630;</button>
  </div>
  <div id="nav-dropdown" class="nav-dropdown" role="menu">
    <a href="/research.html" class="nav-dropdown-link" id="mob-research">Research</a>
    <a href="/research-series.html" class="nav-dropdown-link" id="mob-series">Series</a>
    <a href="/about.html" class="nav-dropdown-link" id="mob-about">About</a>
    <a href="/contributors.html" class="nav-dropdown-link" id="mob-contributors">Contributors</a>
    <a href="/dataset.html" class="nav-dropdown-link" id="mob-dataset">Dataset</a>
    <a href="/community.html" class="nav-dropdown-link" id="mob-community">Community</a>
    <a href="/explorer.html" class="nav-dropdown-link" id="mob-explorer">Explorer</a>
    <a href="https://discord.gg/DmjwDbkW" class="nav-dropdown-link nav-discord-btn" target="_blank" rel="noopener">Community →</a>
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
        <a class="footer-link" href="/explorer.html" id="fl-explorer">Empire Explorer</a>
        <a class="footer-link" href="/profiles.html" id="fl-profiles">Empire Profiles</a>
        <a class="footer-link" href="/research.html" id="fl-research">Research Hub</a>
        <a class="footer-link" href="/research-series.html" id="fl-series">Research Series</a>
        <a class="footer-link" href="/dataset.html" id="fl-dataset">Open Dataset</a>
        <a class="footer-link" href="/epoch-methodology.pdf" target="_blank" rel="noopener">Methodology</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Community</span>
        <a class="footer-link" href="/community.html" id="fl-blogs">Blogs</a>
        <a class="footer-link" href="/community.html" id="fl-opinions">Opinions</a>
        <a class="footer-link" href="/community.html" id="fl-submit">Submit Article</a>
        <a class="footer-link" href="/community.html" id="fl-newsletter">Newsletter</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">About</span>
        <a class="footer-link" href="/about.html" id="fl-institute">The Institute</a>
        <a class="footer-link" href="/contributors.html" id="fl-contributors">Contributors</a>
        <a class="footer-link" href="#" id="fl-contact">Contact</a>
      </div>
      <div class="footer-col">
        <span class="footer-col-title">Institute</span>
        <a class="footer-link" href="/about.html" id="fl-about">About</a>
        <a class="footer-link" href="/about.html" id="fl-mission">Our Mission</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span data-i18n="footer_hint">Hover over a line to inspect · Click to isolate · Use region tabs or era selector to filter</span>
    <span data-i18n="footer_copy">© 2025 The Epoch Institute</span>
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
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-toggle').textContent = isDark ? '🌙' : '☀';
    localStorage.setItem('epoch-theme', isDark ? 'light' : 'dark');
  });

  // ── Language toggle ─────────────────────────────────────────────────────────
  const savedLang = localStorage.getItem('epoch-lang');
  if (savedLang && savedLang !== 'en') applyLang(savedLang);
  document.getElementById('lang-toggle').addEventListener('click', () => {
    applyLang(currentLang === 'en' ? 'bn' : 'en');
    document.getElementById('lang-toggle').textContent = currentLang === 'bn' ? 'EN' : 'বাং';
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

  document.getElementById('contact-form').addEventListener('submit', e => {
    e.preventDefault();
    const name    = document.getElementById('ct-name').value.trim();
    const email   = document.getElementById('ct-email').value.trim();
    const message = document.getElementById('ct-message').value.trim();
    let ok = true;
    [['ct-name', !name], ['ct-email', !isValidEmail(email)], ['ct-message', !message]].forEach(([id, bad]) => {
      document.getElementById(id).classList.toggle('form-input-error', bad);
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
      document.getElementById(id).classList.remove('form-input-error');
    });
  });
}
