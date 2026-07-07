/* =====================================================
   AlatiphA GES PromoHub— Service Worker
   ─────────────────────────────────────────────────
   HOW TO UPDATE:
   Bump APP_VERSION on every release (e.g. "1.0.5").
   The cache name updates automatically. Users will
   get a "New version available" prompt on next visit.
===================================================== */

const APP_VERSION  = "v1.4.0";
const CACHE_NAME   = `alatipha-ges-promohub-${APP_VERSION}`;

/* ====================
   FIREBASE CLOUD MESSAGING
   ─────────────────────────
   TODO: Replace the config below with your
   own project's values (same as app.js):
   Firebase Console → Project Settings →
   General → Your apps → Web app (</>)
==================== */

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD4Ny0DaGZdXo6b-TMQzNzSouKu1c0CU-E",
  authDomain: "ges-promohub.firebaseapp.com",
  projectId: "ges-promohub",
  storageBucket: "ges-promohub.firebasestorage.app",
  messagingSenderId: "225534263785",
  appId: "1:225534263785:web:aa61f6e5f2f5552963cb78"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {

  const title =
    (payload.notification && payload.notification.title) ||
    "GES PromoHub";

  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png"
  };

  self.registration.showNotification(title, options);

});

/* ====================
   APP SHELL
==================== */

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./sw.js",
  "./manifest.json",
  "./library/sample.epub",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
];

/* =========================
   INSTALL — cache app shell
========================= */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting()) // activate immediately after caching succeeds
  );

});

/* =========================
   ACTIVATE — clean old caches
========================= */

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );

});

/* =========================
   FETCH — network-first for
   HTML/JS/CSS, cache-first
   for EPUB and icons
========================= */

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isAppShell =
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css")  ||
    url.pathname.endsWith(".js")   ||
    url.pathname.endsWith(".json") ||
    url.pathname === "/" ||
    url.pathname.endsWith("/");

  if (isAppShell) {

    /* Network-first: always try to get the freshest
       app shell, fall back to cache if offline */
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );

  } else {

    /* Cache-first: EPUB, icons, fonts — stable assets */
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(networkResponse => {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
              return networkResponse;
            });
        })
        .catch(() => caches.match("./index.html"))
    );

  }

});

/* =========================
   MESSAGE — version check
========================= */

self.addEventListener("message", event => {

  if (event.data === "GET_VERSION") {
    event.ports[0].postMessage(APP_VERSION);
  }

});
