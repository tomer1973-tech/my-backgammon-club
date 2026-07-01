/**
 * Practice layout — full-screen, no navigation, no auth.
 * Wide enough to fit the board + side panel.
 */
export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-dvh bg-surface-canvas wood-texture flex items-start justify-center px-4 py-10 [@media(max-height:500px)]:py-2">
      {/* Ambient gold glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]
          bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,hsl(var(--gold)/0.07),transparent)]"
      />
      <div className="relative z-10 w-full max-w-5xl">
        {children}
      </div>
    </div>
  )
}
