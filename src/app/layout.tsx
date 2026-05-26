import type { Metadata, Viewport } from 'next'
import { Inter }                   from 'next/font/google'
import './globals.css'

// ── Fonts ──────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets:  ['latin'],
  display:  'swap',
  variable: '--font-sans',
})

// ── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default:  'Backgammon Club',
    template: '%s · Backgammon Club',
  },
  description: 'Track tournaments, standings, and stats for your backgammon club.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        1,        // prevent auto-zoom on iOS form inputs
  themeColor:          '#100d08',
}

// ── Root layout ────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
