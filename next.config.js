/** @type {import('next').NextConfig} */

// Security headers (audit 25-08, BEV-05). CSP eerst in Report-Only zoals de
// audit adviseert: overtredingen zijn zichtbaar in de browserconsole zonder
// iets te breken. 'unsafe-inline' is nog nodig zolang de PostHog-bootstrap en
// JSON-LD inline staan; verplaatsen naar /public is de vervolgstap, daarna
// kan script-src naar 'self'.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://eu-assets.i.posthog.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  // meterkastpaspoort.nl: index en demo-feed bij het lezen van een paspoort. Feeds
  // van échte uitgevers staan op hun eigen domein (/.well-known/…); die moeten
  // hier bij, of via een vaste lijst, vóórdat de CSP van Report-Only af gaat.
  "connect-src 'self' https://eu.i.posthog.com https://eu-assets.i.posthog.com https://api.pdok.nl https://www.meterkastpaspoort.nl",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
module.exports = nextConfig;
