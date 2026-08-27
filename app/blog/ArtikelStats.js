"use client";
// Blog-statistieken naar PostHog (blogspec):
//  - blog_artikel_bekeken { slug } — bij openen van het artikel
//  - blog_artikel_gelezen { slug, seconden } — één keer, zodra de lezer 75%
//    van het artikel heeft bereikt (scroll-diepte als leesmaat).
// $pageview loopt al sitewide mee via de layout; dit zijn de inhoudsmaten.
import { useEffect } from "react";

export default function ArtikelStats({ slug }) {
  useEffect(() => {
    try { window.posthog?.capture("blog_artikel_bekeken", { slug }); } catch {}
    const start = Date.now();
    let gelezen = false;
    const meet = () => {
      if (gelezen) return;
      const el = document.documentElement;
      const diepte = (window.scrollY + window.innerHeight) / el.scrollHeight;
      if (diepte >= 0.75) {
        gelezen = true;
        try {
          window.posthog?.capture("blog_artikel_gelezen", {
            slug,
            seconden: Math.round((Date.now() - start) / 1000),
          });
        } catch {}
        window.removeEventListener("scroll", meet);
      }
    };
    window.addEventListener("scroll", meet, { passive: true });
    meet(); // korte artikelen op grote schermen tellen direct
    return () => window.removeEventListener("scroll", meet);
  }, [slug]);
  return null;
}
