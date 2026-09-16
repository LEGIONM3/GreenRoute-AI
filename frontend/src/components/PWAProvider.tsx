"use client";

import React, { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }

    // 2. Offline / Online Status Listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. PWA Install Prompt Capture
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Background Sync Listener from Service Worker
    const handleServiceWorkerMessage = async (event: MessageEvent) => {
      if (event.data?.type === "TRIGGER_BACKGROUND_SYNC") {
        console.log("[PWA] Background sync triggered by Service Worker:", event.data.tag);
        await syncOfflineQueue();
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleServiceWorkerMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleServiceWorkerMessage);
      }
    };
  }, []);

  const syncOfflineQueue = async () => {
    try {
      const queueRaw = localStorage.getItem("wastecare_offline_queue");
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (Array.isArray(queue) && queue.length > 0) {
        console.log(`[PWA] Syncing ${queue.length} pending offline items...`);
        // Trigger sync endpoint
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("http://localhost:8000/api/v1/reports/batch-sync", {
          method: "POST",
          headers,
          body: JSON.stringify({
            sync_timestamp: new Date().toISOString(),
            worker_device_id: "browser-pwa-client",
            updates: queue
          })
        });
        if (res.ok) {
          localStorage.removeItem("wastecare_offline_queue");
          console.log("[PWA] Offline queue successfully synced!");
        }
      }
    } catch (e) {
      console.warn("[PWA] Failed to flush offline queue:", e);
    }
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  };

  return (
    <>
      {/* Offline Status Alert */}
      {isOffline && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-amber-600 text-white text-xs sm:text-sm font-medium px-4 py-2 text-center flex items-center justify-center space-x-2 sticky top-0 z-50 shadow-md"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span>Offline Mode Active. Viewing cached municipal facilities and guidance.</span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div
          role="banner"
          aria-label="Install Application"
          className="bg-emerald-800 text-white px-4 py-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 sticky top-0 z-40"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-700 rounded-lg text-emerald-100 font-bold">
              WC
            </div>
            <div>
              <p className="font-semibold text-sm">Install WasteCare Municipal App</p>
              <p className="text-xs text-emerald-200">
                Access facility maps, report illegal dumping, and search policies offline.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              className="bg-white text-emerald-900 hover:bg-emerald-50 px-3 py-1.5 rounded text-xs font-semibold shadow transition-colors"
            >
              Install App
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              aria-label="Dismiss install banner"
              className="text-emerald-200 hover:text-white px-2 py-1.5 text-xs transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
