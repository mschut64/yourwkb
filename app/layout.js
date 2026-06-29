export const metadata = {
  title: 'YourWkb — NEN1010 opleverrapport voor elektriciens',
  description: 'Leg foto\'s, meetwaarden en materialen vast op je telefoon. Automatisch een professioneel NEN1010 rapport naar je klant.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__YWKB_DROPBOX_KEY__ = "zrc981iaivs4ims";`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
