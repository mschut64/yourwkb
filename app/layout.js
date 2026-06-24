import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'YourWkb — NEN1010 opleverrapport voor elektriciens',
  description: 'Leg foto\'s, meetwaarden en materialen vast op je telefoon. Automatisch een professioneel NEN1010 rapport naar je klant.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
