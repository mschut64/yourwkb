export const metadata = {
  metadataBase: new URL('https://yourwkb.nl'),
  title: 'YourWkb — Wkb-opleverrapport & NEN1010 app voor installateurs',
  description: 'Maak je Wkb-opleverdossier en NEN1010-rapport direct op je telefoon. Voor zzp-elektriciens, PV-, cv- en warmtepompinstallateurs. Automatische normcheck, klaar in minuten.',
  keywords: ['Wkb opleverrapport', 'NEN1010 app', 'opleverdossier elektricien', 'Wkb consumentendossier', 'groepenkast opleverrapport', 'installateur software'],
  alternates: {
    canonical: 'https://yourwkb.nl',
  },
  robots: {
    index: true,
    follow: true,
  },
  // PWA: manifest wordt door Next automatisch gelinkt zodra app/manifest.js bestaat.
  // We benoemen 'm hier ook expliciet voor de duidelijkheid.
  manifest: '/manifest.webmanifest',
  // iOS gebruikt het manifest niet voor standalone-modus; daarvoor zijn deze Apple-tags
  // nodig. Hiermee opent de app óók op iPhone/iPad schermvullend zonder adresbalk zodra
  // hij via Safari → Deel → "Zet op beginscherm" is toegevoegd.
  appleWebApp: {
    capable: true,
    title: 'YourWkb',
    statusBarStyle: 'default', // 'default' = lichte statusbalk, past bij de witte app
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'YourWkb — Wkb-opleverrapport & NEN1010 app voor installateurs',
    description: 'Maak je Wkb-opleverdossier en NEN1010-rapport direct op je telefoon. Automatische normcheck, klaar in minuten.',
    url: 'https://yourwkb.nl',
    siteName: 'YourWkb',
    locale: 'nl_NL',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'YourWkb — Wkb-opleverrapport & NEN1010 app voor installateurs',
    description: 'Maak je Wkb-opleverdossier en NEN1010-rapport direct op je telefoon.',
  },
}

// Next.js 14: themeColor hoort in een aparte viewport-export (niet in metadata),
// anders krijg je bij de build de waarschuwing "Unsupported metadata themeColor".
// theme_color kleurt op Android de statusbalk-omgeving; wit past bij de lichte app.
export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }) {
  // Dropbox App key komt uit Vercel environment variable NEXT_PUBLIC_DROPBOX_KEY.
  const dropboxKey = process.env.NEXT_PUBLIC_DROPBOX_KEY || ""

  // PostHog analytics — key en regio-host komen uit Vercel env variables.
  // Cookieloos geconfigureerd (persistence: memory) zodat er geen cookiebanner nodig is.
  const posthogKey  = process.env.NEXT_PUBLIC_POSTHOG_KEY  || ""
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com"

  // Structured data voor Google (SoftwareApplication + FAQPage) — hier server-side
  // in layout.js gerenderd i.p.v. in de 'use client' landingspagina zelf. Dat laatste
  // veroorzaakte React hydration errors (#418/#423/#425): een <script>-tag met
  // dangerouslySetInnerHTML binnen een client-component kan een mismatch geven
  // tussen server-HTML en client-render. Server-side renderen voorkomt dit structureel.
  // FAQ-inhoud hier bewust hetzelfde gehouden als de faqs-array in app/landing/page.js —
  // bij het aanpassen van een FAQ-vraag/antwoord dus op BEIDE plekken bijwerken.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "YourWkb",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "description": "Wkb-opleverdossier en NEN1010-rapport maken op je telefoon, voor zzp-installateurs elektra, PV, cv en warmtepomp.",
        "url": "https://yourwkb.nl",
        "offers": {
          "@type": "Offer",
          "price": "2.50",
          "priceCurrency": "EUR",
          "description": "Per definitief rapport, na de gratis testfase"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Moet ik iets installeren?", "acceptedAnswer": { "@type": "Answer", "text": "Nee. YourWkb is een website die je opent in Safari of Chrome op je telefoon. Je kunt hem toevoegen aan je homescreen — dan ziet het eruit als een app. Geen app store, geen updates." } },
          { "@type": "Question", "name": "Is het rapport echt NEN1010-compliant?", "acceptedAnswer": { "@type": "Answer", "text": "Het rapport is gebaseerd op NEN1010 deel 6 en bevat alle verplichte onderdelen: NAW-gegevens, meetapparatuur, eindgroepen-meetstaat met ISO, ΔT en ΔI, impedantie, aardingswaarden en een conformverklaring. Jij bent verantwoordelijk voor de juistheid van de ingevoerde meetwaarden." } },
          { "@type": "Question", "name": "Hoe lang worden mijn dossiers bewaard?", "acceptedAnswer": { "@type": "Answer", "text": "Wij bewaren niets op onze servers — de PDF en al je projectdata staan op je eigen toestel. Gebruik de ingebouwde back-up-functie (JSON-export of gratis Dropbox-koppeling) om je dossiers zelf voor de lange termijn te bewaren, bijvoorbeeld conform de Wkb-aansprakelijkheidstermijn." } },
          { "@type": "Question", "name": "Worden er advertenties getoond of wordt mijn data verkocht?", "acceptedAnswer": { "@type": "Answer", "text": "Nooit. YourWkb verdient geen geld met advertenties en verkoopt geen data aan derden. Jouw klantgegevens, meetwaarden en projectdata zijn van jou. We verdienen alleen aan definitieve rapporten (€2,50 per stuk). Dat is ons volledige verdienmodel." } },
          { "@type": "Question", "name": "Werkt het ook voor andere disciplines?", "acceptedAnswer": { "@type": "Answer", "text": "Ja — groepenkast, zonnepanelen, combiketel en warmtepomp zijn nu beschikbaar. Specifieke wensen? Mail naar info@yourwkb.nl." } },
          { "@type": "Question", "name": "Wat kost het na de testperiode?", "acceptedAnswer": { "@type": "Answer", "text": "De app blijft altijd gratis. Rapporten zijn nu gratis tijdens de testfase. Daarna betaal je €2,50 per definitief rapport. Je wordt van tevoren op de hoogte gesteld — geen verrassingen." } }
        ]
      }
    ]
  };

  return (
    <html lang="nl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__YWKB_DROPBOX_KEY__ = ${JSON.stringify(dropboxKey)};`,
          }}
        />
        {posthogKey && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify createPersonProfile group resetGroups setPersonProperties setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfileIfMissing".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
                posthog.init(${JSON.stringify(posthogKey)}, {
                  api_host: ${JSON.stringify(posthogHost)},
                  persistence: "memory",
                  autocapture: false,
                  capture_pageview: true,
                  disable_session_recording: true
                });
              `,
            }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  )
}
