export const metadata = {
  title: 'YourWkb — NEN1010 opleverrapport voor elektriciens',
  description: 'Leg foto\'s, meetwaarden en materialen vast op je telefoon. Automatisch een professioneel NEN1010 rapport naar je klant.',
}

export default function RootLayout({ children }) {
  // Dropbox App key komt uit Vercel environment variable NEXT_PUBLIC_DROPBOX_KEY.
  // Variabelen die met NEXT_PUBLIC_ beginnen worden door Next.js veilig naar de browser doorgezet.
  const dropboxKey = process.env.NEXT_PUBLIC_DROPBOX_KEY || ""
  return (
    <html lang="nl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__YWKB_DROPBOX_KEY__ = ${JSON.stringify(dropboxKey)};`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
