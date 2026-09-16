"use client";

export const COUNTER = 111392359;
type Metrika = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
declare global { interface Window { ym?: Metrika } }
const production = () => typeof window !== "undefined" && window.location.hostname === "mwsh.ru";

export function initializeAnalytics() {
  if (!production() || document.getElementById("mywish-metrika")) return;
  if (!window.ym) {
    const queue: Metrika = (...args: unknown[]) => { (queue.a ??= []).push(args); };
    queue.l = Date.now();
    window.ym = queue;
  }
  const script = document.createElement("script");
  script.id = "mywish-metrika";
  script.async = true;
  script.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(script);
  window.ym(COUNTER, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
}

/** Only aggregate labels: no names, contacts, free text or raw advertising tags. */
export function goal(name: string, params: Record<string, string> = {}) {
  if (production()) window.ym?.(COUNTER, "reachGoal", name, params);
}

export async function clientId(): Promise<string> {
  const cookie = document.cookie.match(/(?:^|;\s*)_ym_uid=(\d{4,32})(?:;|$)/)?.[1] ?? "";
  if (!production() || !window.ym) return cookie;
  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(cookie), 800);
    window.ym?.(COUNTER, "getClientID", (id: unknown) => {
      clearTimeout(timeout);
      resolve(/^\d{4,32}$/.test(String(id)) ? String(id) : cookie);
    });
  });
}
