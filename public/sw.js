/* Knips Service Worker — App-Shell-Cache + Offline-Fallback. */
'use strict';

const VERSION = 'v6';
const CACHE = `fch-shell-${VERSION}`;

// Statische App-Shell. Dynamische, auth-geschützte Inhalte (API, Fotos) werden
// bewusst NICHT gecacht.
const SHELL = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/icon.svg',
  '/icon-maskable.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API und Fotos immer aus dem Netz (auth-geschützt, dynamisch).
  if (url.pathname.startsWith('/api/')) return;

  // Navigationen: Netz zuerst, offline auf die App-Shell zurückfallen.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Statische Assets: Cache zuerst, sonst Netz (und in den Cache legen).
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return res;
    })),
  );
});
