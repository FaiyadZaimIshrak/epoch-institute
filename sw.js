// sw.js - the Institute's service worker (Nov 2026), registered by shared-nav.js after the page has loaded. It makes
// repeat visits fast on the slow line to the host (Singapore) and lets a reader open the pages they have read before
// without a connection.
//   pages (navigations): the network first; a copy of every page read is kept (the 200 latest); when the network fails,
//     or gives nothing within 4 seconds, the kept copy, else /offline.html (which lists the pages kept)
//   files with ?v= and fonts: from the cache when there (their addresses change when they do)
//   pictures, emblems and data files (preview cards): the kept copy at once, refreshed behind it. Until Nov 2026 they
//     were kept for good, so a picture replaced at the same address (or taken off a namesake) stayed in the reader's
//     browser, and so did the preview cards, whose ?v= does not change with them
//   the files loaded without ?v= (shared.css, css/, shared-nav.js, enc-page.js …): the kept copy at once, refreshed
//     behind it for the next page (as their own 10-minute cache did)
// Never: other sites, anything but GET, /send.php, /feeds/, search addresses with a query. To retire it, deploy a sw.js
// that unregisters itself (self.registration.unregister() in activate) - a browser checks this file at least daily.
'use strict';
const VERSION = '2026-11-13b';
const PAGES = 'pages-' + VERSION, FILES = 'files-' + VERSION, OFFLINE = '/offline.html';
const MAX_PAGES = 200, MAX_FILES = 600;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(PAGES).then(c => c.add(new Request(OFFLINE, { cache: 'reload' }))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== PAGES && k !== FILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}
function timeout(ms) { return new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms)); }

async function page(req) {
  const c = await caches.open(PAGES);
  const net = fetch(req).then(async r => {
    if (r.ok && !r.redirected && r.type === 'basic' && (r.headers.get('content-type') || '').includes('text/html')) {   // a redirected answer may not be given to a later navigation
      const key = new URL(req.url); key.search = ''; key.hash = '';
      await c.put(key.href, r.clone()); trim(PAGES, MAX_PAGES);
    }
    return r;
  });
  net.catch(() => {});   // answered from the kept copy: a later failure of the network is nobody's to handle
  try { return await Promise.race([net, timeout(4000)]); }
  catch (err) {
    const key = new URL(req.url); key.search = ''; key.hash = '';
    const kept = await c.match(key.href);
    if (kept) return kept;
    try { return await net; } catch (e2) { return (await c.match(OFFLINE)) || Response.error(); }
  }
}
// a file asked for again when the connection failed (the host drops one now and then): twice more, a little apart
async function fetchAgain(req) {
  for (let i = 0; ; i++) {
    try { return await fetch(req); } catch (err) { if (i >= 2) throw err; await new Promise(ok => setTimeout(ok, 400 * (i + 1))); }
  }
}
async function cacheFirst(req) {
  const c = await caches.open(FILES), hit = await c.match(req);
  if (hit) return hit;
  const r = await fetchAgain(req);
  if (r.ok && !r.redirected && r.type === 'basic') { c.put(req, r.clone()); trim(FILES, MAX_FILES); }
  return r;
}
async function staleWhileRevalidate(e, req) {
  const c = await caches.open(FILES), hit = await c.match(req);
  const fresh = fetchAgain(req).then(r => { if (r.ok && !r.redirected && r.type === 'basic') { c.put(req, r.clone()); trim(FILES, MAX_FILES); } return r; });
  if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
  return fresh;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url); if (u.origin !== self.location.origin) return;
  if (u.pathname === '/send.php' || u.pathname.startsWith('/feeds/') || u.pathname === '/sw.js') return;
  if (req.mode === 'navigate') { if (u.pathname === '/search' && u.search) return; e.respondWith(page(req)); return; }
  const pic = /^\/(images|logos)\//.test(u.pathname) || /\.(png|jpe?g|svg|ico)$/.test(u.pathname);
  if (pic || u.pathname.startsWith('/data/')) { e.respondWith(staleWhileRevalidate(e, req)); return; }
  if (u.search.includes('v=') || u.pathname.startsWith('/fonts/') || /\.woff2$/.test(u.pathname)) { e.respondWith(cacheFirst(req)); return; }
  if (/\.(js|css)$/.test(u.pathname)) { e.respondWith(staleWhileRevalidate(e, req)); return; }
});
