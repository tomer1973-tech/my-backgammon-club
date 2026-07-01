import type { Metadata, Viewport } from 'next'
import { Inter }                   from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-sans' })

export const metadata: Metadata = {
  title: { default: 'Backgammon Club', template: '%s · Backgammon Club' },
  description: 'Track tournaments, standings, and stats for your backgammon club.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#050b18' },
    { media: '(prefers-color-scheme: light)', color: '#f5f0e8' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Runs before paint to apply saved theme + accent — prevents flash of wrong colors */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('pb_theme')||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','dark');}try{document.documentElement.setAttribute('data-accent',localStorage.getItem('pb_accent')||'copper');}catch(e){document.documentElement.setAttribute('data-accent','copper');}try{var s=localStorage.getItem('pb_skin');if(s&&s!=='none')document.documentElement.setAttribute('data-skin',s);}catch(e){}})();` }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
