/**
 * WasteCare Municipal SaaS - Enterprise Service Worker
 * Phase 12: Offline Mode, Cache Storage, Background Sync & Push Notifications
 */

const CACHE_NAME = "wastecare-pwa-v2";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg"
];

// 1. Install Event: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up legacy caches & take immediate control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event:
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // NEVER cache SSE streaming endpoints or auth mutations
  if (url.pathname.includes("/chat/stream") || url.pathname.includes("/auth/login") || url.pathname.includes("/auth/logout")) {
    return;
  }

  // Skip non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== "GET") {
    return;
  }

  // A. Municipal API Endpoints (Facilities, Articles, Policies, Catalog) -> Network-First with Cache Fallback
  if (
    url.pathname.startsWith("/api/v1/locations") ||
    url.pathname.startsWith("/api/v1/articles") ||
    url.pathname.startsWith("/api/v1/policies") ||
    url.pathname.startsWith("/api/v1/search")
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response(JSON.stringify({ 
            offline: true, 
            message: "Offline Mode: Cached municipal record unavailable for this specific query." 
          }), {
            headers: { "Content-Type": "application/json" },
            status: 503
          });
        })
    );
    return;
  }

  // B. HTML Navigation Requests -> Network-First with Offline Fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // C. Static Assets (JS, CSS, Images, Fonts) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Background Sync for Offline Reports & Field Officer Store-and-Forward
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-complaints" || event.tag === "sync-field-reports") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "TRIGGER_BACKGROUND_SYNC", tag: event.tag });
        });
      })
    );
  }
});

// 5. Push Notifications for Civic Alerts & Incident Resolutions
self.addEventListener("push", (event) => {
  let data = { title: "Municipal Alert", body: "WasteCare notice received.", url: "/" };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url: data.url || "/" }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 6. Notification Click Action
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
