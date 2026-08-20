"use client";

import { useCallback, useEffect, useRef } from "react";

type Options = {
  enabled: boolean;
  dirty: boolean;
  delayMs?: number;
  save: () => Promise<void>;
};

/** Debounced save while editing, plus a flush when the tab hides or unloads. */
export function useAutosave({
  enabled,
  dirty,
  delayMs = 1200,
  save,
}: Options) {
  const inFlight = useRef(false);
  const queued = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || !dirty) return;
    if (inFlight.current) {
      queued.current = true;
      return;
    }
    inFlight.current = true;
    try {
      await save();
    } finally {
      inFlight.current = false;
      if (queued.current) {
        queued.current = false;
        await flush();
      }
    }
  }, [dirty, enabled, save]);

  useEffect(() => {
    if (!enabled || !dirty) return;
    const timer = window.setTimeout(() => {
      void flush();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [enabled, dirty, delayMs, flush]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") void flush();
    }
    function onPageHide() {
      void flush();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flush]);

  return flush;
}
