// app/manifest.js
// Next.js 14 App Router genereert hieruit automatisch /manifest.webmanifest
// én plaatst zelf de <link rel="manifest"> in de <head>.
//
// v2026-07-30-B: verwijst nu naar schone icoon-bestanden op EXACTE maten
// (192/512), plus een aparte maskable-versie zodat Android het logo niet afsnijdt.
// De oude yourwkblogo-bestanden hadden afwijkende maten (532/280) én witte hoeken,
// waardoor de telefoon terugviel op een gegenereerd letter-icoon ("Y" op grijs).
//
// start_url staat op '/app' zodat het icoon meteen de tool opent.

export default function manifest() {
  return {
    name: 'YourWkb — Wkb-opleverrapport & NEN1010',
    short_name: 'YourWkb',
    description:
      'Maak je Wkb-opleverdossier en NEN1010-rapport direct op je telefoon. Automatische normcheck, klaar in minuten.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'nl',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
