"use client";

import { useEffect } from "react";
import App from "./App";

const SW_CLEANUP_STORAGE_KEY = "conecta-clube:sw-cleanup:v1";

export default function AppEntry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isDevelopment = process.env.NODE_ENV === "development";
    const cleanupAlreadyDone = !isDevelopment
      && window.localStorage.getItem(SW_CLEANUP_STORAGE_KEY) === "1";

    if (cleanupAlreadyDone) {
      return;
    }

    (async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }

        if (!isDevelopment) {
          window.localStorage.setItem(SW_CLEANUP_STORAGE_KEY, "1");
        }
      } catch (error) {
        console.warn(
          "Nao foi possivel limpar Service Workers antigos:",
          error,
        );
      }
    })();
  }, []);

  return <App />;
}
