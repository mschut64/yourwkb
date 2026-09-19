// ─────────────────────────────────────────────────────────────────────────────
// Openbare bronnen bij het lezen van een paspoort: de index en de veldnotities
//
// De index (sleutels van installateurs, uitgevers en erkenners) en de feeds met
// veldnotities zijn openbaar en voor iedereen gelijk. Ophalen verraadt dus niets
// over het gescande paspoort: de vergelijking met mat[] gebeurt op het toestel,
// in mkpControleer uit het pakket (spec §8.1).
//
// Offline — in een kelder zonder bereik — gebruiken we de laatst opgehaalde
// versie uit localStorage, met de datum erbij. Zonder die versie blijft het
// paspoort gewoon leesbaar; alleen handtekeningen zijn dan niet te controleren.
// ─────────────────────────────────────────────────────────────────────────────

import { MKP_INDEX_URL, MKP_DEMO_FEED_URL } from "meterkastpaspoort";

const OPSLAG = "ywkb_mkp_bronnen";
const MAX_FEEDS = 20;

async function haalJson(url, ms = 6000) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms) : null;
  try {
    const r = await fetch(url, { signal: ctl?.signal, cache: "no-cache", credentials: "omit" });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    if (t) clearTimeout(t);
  }
}

function bewaard() {
  try { return JSON.parse(localStorage.getItem(OPSLAG) || "null"); } catch { return null; }
}

// { index, feeds, opgehaald, uitCache }. De demo-feed staat er altijd bij: de
// uitgever ervan staat in de index, en de handtekening beslist of hij telt —
// niet de plek waar het bestand vandaan komt.
export async function haalMkpBronnen() {
  const index = await haalJson(MKP_INDEX_URL);
  if (!index) {
    const oud = bewaard();
    return oud ? { ...oud, uitCache: true } : { index: null, feeds: [], opgehaald: null, uitCache: false };
  }
  const urls = [
    ...(Array.isArray(index.uitgevers) ? index.uitgevers.map((u) => u && u.feed).filter((u) => typeof u === "string" && u.startsWith("https://")) : []),
    MKP_DEMO_FEED_URL,
  ].slice(0, MAX_FEEDS);
  const feeds = (await Promise.all([...new Set(urls)].map((u) => haalJson(u)))).filter(Boolean);
  const uit = { index, feeds, opgehaald: new Date().toISOString().slice(0, 10) };
  try { localStorage.setItem(OPSLAG, JSON.stringify(uit)); } catch { /* vol of geblokkeerd — dan maar niet bewaren */ }
  return { ...uit, uitCache: false };
}
