import type { Config } from 'tailwindcss'

// All values reference CSS custom properties defined in globals.css.
// The HSL syntax `hsl(var(--x) / <alpha-value>)` lets Tailwind inject
// the opacity modifier so bg-surface-raised/50 works as expected.

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/actions/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Design tokens ─────────────────────────────────────────────────────
      colors: {
        // Backgrounds — dark mahogany progression
        surface: {
          canvas:   'hsl(var(--surface-canvas)   / <alpha-value>)',
          base:     'hsl(var(--surface-base)     / <alpha-value>)',
          raised:   'hsl(var(--surface-raised)   / <alpha-value>)',
          elevated: 'hsl(var(--surface-elevated) / <alpha-value>)',
          muted:    'hsl(var(--surface-muted)    / <alpha-value>)',
          subtle:   'hsl(var(--surface-subtle)   / <alpha-value>)',
        },

        // Gold — antique warm gold
        gold: {
          DEFAULT: 'hsl(var(--gold)       / <alpha-value>)',
          dim:     'hsl(var(--gold-dim)   / <alpha-value>)',
          bright:  'hsl(var(--gold-bright)/ <alpha-value>)',
          muted:   'hsl(var(--gold-muted) / <alpha-value>)',
        },

        // Ink — text hierarchy
        ink: {
          DEFAULT: 'hsl(var(--ink)       / <alpha-value>)',
          muted:   'hsl(var(--ink-muted) / <alpha-value>)',
          subtle:  'hsl(var(--ink-subtle)/ <alpha-value>)',
        },

        // Line — borders
        line: {
          DEFAULT: 'hsl(var(--line)     / <alpha-value>)',
          gold:    'hsl(var(--line-gold)/ <alpha-value>)',
        },

        // Semantic
        win:  'hsl(var(--win)  / <alpha-value>)',
        loss: 'hsl(var(--loss) / <alpha-value>)',
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia',  'serif'],
        mono:    ['var(--font-mono)',    'monospace'],
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        sm:   '6px',
        DEFAULT: '10px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        '2xl':'24px',
        '3xl':'32px',
      },

      // ── Shadows (warm-tinted, no cold grey) ───────────────────────────────
      boxShadow: {
        sm:  '0 1px 3px 0 rgb(0 0 0 / 0.4)',
        DEFAULT:'0 2px 8px 0 rgb(0 0 0 / 0.5)',
        md:  '0 4px 16px 0 rgb(0 0 0 / 0.5)',
        lg:  '0 8px 32px 0 rgb(0 0 0 / 0.6)',
        gold:'0 0 0 1px hsl(var(--gold) / 0.3), 0 4px 16px 0 hsl(var(--gold) / 0.08)',
        inner:'inset 0 1px 2px 0 rgb(0 0 0 / 0.3)',
      },

      // ── Keyframes ─────────────────────────────────────────────────────────
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to:   { backgroundPosition: '-200% 0' },
        },
        'dice-in': {
          '0%':   { opacity: '0', transform: 'scale(0.5) rotate(-25deg)' },
          '60%':  { opacity: '1', transform: 'scale(1.12) rotate(6deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        shimmer:    'shimmer 2s linear infinite',
        'dice-in':  'dice-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

export default config
