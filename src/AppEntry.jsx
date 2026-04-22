"use client";

import { useEffect } from "react";
import App from "./App";

export default function AppEntry() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
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
