import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

// Self-hosted so builds never depend on fetching from Google Fonts.
const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-sans',
})
const cormorant = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/cormorant-garamond-latin-700-normal.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: { default: 'Backgammon Club', template: '%s · Backgammon Club' },
  description: 'Track tournaments, standings, and stats for your backgammon club.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f0e4' },
    { media: '(prefers-color-scheme: dark)',  color: '#14171f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before paint to apply saved theme + accent — prevents flash of wrong colors.
            Default is now "light" (the club's cream/gold look) unless the person has
            explicitly chosen dark or asked to follow their system setting. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('pb_theme')||'light';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}try{document.documentElement.setAttribute('data-accent',localStorage.getItem('pb_accent')||'copper');}catch(e){document.documentElement.setAttribute('data-accent','copper');}try{var s=localStorage.getItem('pb_skin');if(s&&s!=='none')document.documentElement.setAttribute('data-skin',s);}catch(e){}})();` }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
