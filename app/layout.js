export const metadata = {
  title: 'YourWkb — NEN1010 opleverrapport voor elektriciens',
  description: 'Leg foto\'s, meetwaarden en materialen vast op je telefoon. Automatisch een professioneel NEN1010 rapport naar je klant.',
}

export default function RootLayout({ children }) {
  // Dropbox App key komt uit Vercel environment variable NEXT_PUBLIC_DROPBOX_KEY.
  const dropboxKey = process.env.NEXT_PUBLIC_DROPBOX_KEY || ""

  // PostHog analytics — key en regio-host komen uit Vercel env variables.
  // Cookieloos geconfigureerd (persistence: memory) zodat er geen cookiebanner nodig is.
  const posthogKey  = process.env.NEXT_PUBLIC_POSTHOG_KEY  || ""
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com"

  return (
    <html lang="nl">
      <head>
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
