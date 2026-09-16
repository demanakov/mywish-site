"use client";
import { useEffect } from "react";
import { initializeAnalytics, goal } from "@/lib/analytics";
import { resolveAttribution } from "@/lib/attribution.mjs";

export default function ProductionIntegration() {
  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = sessionStorage; } catch { /* Current URL still works. */ }
    resolveAttribution(window.location.search, storage);
    initializeAnalytics();
    const contactClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const href = target?.getAttribute("href") || "";
      if (href.startsWith("tel:")) goal("phone_click");
      if (/^https:\/\/(t\.me|telegram\.me)\//.test(href)) goal("telegram_click");
      if (/^https:\/\/max\.ru\//.test(href)) goal("max_click");
    };
    document.addEventListener("click", contactClick);
    return () => document.removeEventListener("click", contactClick);
  }, []);
  return null;
}
