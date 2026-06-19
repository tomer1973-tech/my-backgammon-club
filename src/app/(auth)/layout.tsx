import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
}

/**
 * Auth layout — full-screen centred, no navigation.
 * Uses a subtle wood-grain texture on the canvas background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-dvh bg-surface-canvas wood-texture flex items-center justify-center px-4 py-12">
      {/* Ambient gold glow from top-center — subtle depth cue */}
      {/* Copper ambient glow from top + navy depth from bottom */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[500px]
        bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,hsl(var(--gold)/0.08),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-64
        bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsl(218_55%_10%/0.6),transparent)]" />

      <div className="relative z-10 w-full max-w-[400px]">
        {children}
      </div>
    </div>
  )
}
