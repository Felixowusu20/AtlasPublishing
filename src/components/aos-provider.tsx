"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
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

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Only unblock nodes that are already on screen but never received .aos-animate. */
function unstickInView() {
  document.querySelectorAll("[data-aos]:not(.aos-animate)").forEach((node) => {
    const el = node as HTMLElement;
    const rect = el.getBoundingClientRect();
    const inView =
      rect.bottom > 0 &&
      rect.top < (window.innerHeight || document.documentElement.clientHeight);
    if (inView) {
      el.classList.add("aos-init", "aos-animate");
    }
  });
}

/**
 * Scroll-triggered AOS for cards, images, and sections.
 * Content stays clickable; above-fold nodes are unstuck if AOS misses them.
 * Soft navigations refresh AOS so the next page can animate on scroll again.
 */
export function AosProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

  useLayoutEffect(() => {
    if (!booted.current) return;
    // New route: let AOS re-scan so cards animate as the user scrolls.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          AOS.refreshHard();
        } catch {
          // ignore
        }
        window.setTimeout(unstickInView, 700);
      });
    });
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let bootTimer: number | undefined;
    let refreshTimer: number | undefined;
    let unstickTimer: number | undefined;
    let observer: MutationObserver | undefined;

    const boot = () => {
      if (cancelled || booted.current) return;
      booted.current = true;

      if (prefersReducedMotion()) {
        document.documentElement.classList.add("aos-ready");
        document
          .querySelectorAll("[data-aos]")
          .forEach((el) => el.classList.add("aos-init", "aos-animate"));
        setReady(true);
        return;
      }

      AOS.init({
        duration: 900,
        easing: "ease-out-cubic",
        once: true,
        mirror: false,
        offset: 80,
        delay: 0,
        anchorPlacement: "top-bottom",
        disableMutationObserver: false,
        disable: prefersReducedMotion,
      });

      document.documentElement.classList.add("aos-ready");
      AOS.refresh();
      // Above-fold only — do NOT force-animate below-fold (that kills scroll).
      unstickTimer = window.setTimeout(unstickInView, 600);
      setReady(true);
    };

    if (document.readyState === "complete") {
      bootTimer = window.setTimeout(boot, 40);
    } else {
      const onReady = () => {
        bootTimer = window.setTimeout(boot, 40);
      };
      window.addEventListener("load", onReady, { once: true });
      if (document.readyState === "interactive") onReady();
      else document.addEventListener("DOMContentLoaded", onReady, { once: true });
    }

    observer = new MutationObserver((mutations) => {
      if (!booted.current || prefersReducedMotion()) return;
      let found = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.hasAttribute("data-aos") ||
            node.querySelector?.("[data-aos]")
          ) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (!found) return;
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        try {
          AOS.refresh();
        } catch {
          // ignore
        }
        window.setTimeout(unstickInView, 500);
      }, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onScroll = () => {
      // Lightweight: if something in view is stuck, free it.
      window.clearTimeout(unstickTimer);
      unstickTimer = window.setTimeout(unstickInView, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      window.clearTimeout(refreshTimer);
      window.clearTimeout(unstickTimer);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      document.documentElement.classList.remove("aos-ready");
    };
  }, []);

  return (
    <AosReadyContext.Provider value={ready}>{children}</AosReadyContext.Provider>
  );
}
