// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — Analytics helper voor PostHog custom events
// Gebruik: import { trackEvent } from "./analytics";
//          trackEvent("rapport_gegenereerd", { discipline: "gk" });
//
// PostHog wordt geïnitialiseerd in layout.js (via env var NEXT_PUBLIC_POSTHOG_KEY).
// Zonder die key is window.posthog niet aanwezig — trackEvent doet dan niets,
// en crasht nooit.
// ─────────────────────────────────────────────────────────────────────────────

export function trackEvent(naam, props = {}) {
  try {
    if (typeof window === "undefined") return;
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(naam, props);
    }
    // Geen PostHog geladen (bijv. env var nog niet gezet) — stil negeren.
  } catch {
    // Nooit crashen op tracking
  }
}

