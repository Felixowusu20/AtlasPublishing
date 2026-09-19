"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import AOS from "aos";
import "aos/dist/aos.css";

const AosReadyContext = createContext(false);

export function useAosReady() {
  return useContext(AosReadyContext);
}

function stripAosClasses() {
  document.querySelectorAll(".aos-init, .aos-animate").forEach((el) => {
    el.classList.remove("aos-init", "aos-animate");
  });
}

function markReady(on: boolean) {
  document.documentElement.classList.toggle("aos-ready", on);
}

/**
 * Boots AOS only after the document has finished loading (and React has
 * hydrated streamed trees). Starting earlier mutates className with
 * `aos-init` / `aos-animate` and triggers hydration mismatches.
 */
export function AosProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!ready) return;
    AOS.refreshHard();
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const boot = () => {
      if (cancelled) return;
      stripAosClasses();
      AOS.init({
        duration: 800,
        easing: "ease-out-cubic",
        once: true,
        mirror: false,
        offset: 40,
        delay: 0,
        anchorPlacement: "top-bottom",
        disableMutationObserver: true,
      });
      markReady(true);
      AOS.refresh();
      setReady(true);
    };

    const schedule = () => {
      if (cancelled) return;
      // Idle after load so Suspense/streaming hydration can finish first.
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => boot(), { timeout: 1800 });
      } else {
        timeoutId = window.setTimeout(boot, 400);
      }
    };

    if (document.readyState === "complete") {
      schedule();
    } else {
      window.addEventListener("load", schedule, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idleId != null) window.cancelIdleCallback?.(idleId);
      if (timeoutId != null) window.clearTimeout(timeoutId);
      markReady(false);
      stripAosClasses();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      AOS.refreshHard();
    }, 80);
    return () => window.clearTimeout(id);
  }, [pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    const onLoad = () => refresh();
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [ready, refresh]);

  return (
    <AosReadyContext.Provider value={ready}>{children}</AosReadyContext.Provider>
  );
}
