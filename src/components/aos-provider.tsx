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

function ensureVisible() {
  // Guarantees clickability even if AOS misses a node after soft navigation.
  document.querySelectorAll("[data-aos]").forEach((el) => {
    el.classList.add("aos-init", "aos-animate");
  });
}

/**
 * Boots AOS after load. Content stays visible via globals.css overrides so
 * soft navigation / remounts never blank papers or links.
 */
export function AosProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!ready) return;
    AOS.refresh();
    ensureVisible();
  }, [ready]);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const boot = () => {
      if (cancelled) return;
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
      document.documentElement.classList.add("aos-ready");
      AOS.refresh();
      ensureVisible();
      setReady(true);
    };

    const schedule = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => boot(), { timeout: 1200 });
      } else {
        timeoutId = window.setTimeout(boot, 200);
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
      document.documentElement.classList.remove("aos-ready");
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      AOS.refresh();
      ensureVisible();
    }, 50);
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
