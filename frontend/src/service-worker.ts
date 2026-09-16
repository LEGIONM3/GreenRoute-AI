/**
 * WasteCare Municipal SaaS - TypeScript Service Worker Source
 * Phase 12: Offline Mode, Cache Storage, Background Sync & Push Notifications
 */

export const CACHE_NAME = "wastecare-pwa-v2";
export const OFFLINE_URL = "/offline.html";

export const PRECACHE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg"
];

// Reference implementation compiled to public/sw.js
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registered with scope:", reg.scope);
          // Register background sync if supported
          if ("sync" in reg) {
            (reg as any).sync.register("sync-complaints").catch(() => {});
          }
        })
        .catch((err) => {
          console.error("[PWA] Service Worker registration failed:", err);
        });
    });
  }
}
