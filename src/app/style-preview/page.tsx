/**
 * Temporary, no-auth style comparison page — five full visual directions for the
 * lobby hero, each rendered with real component shapes but independent inline
 * color/material tokens so they can sit side-by-side without touching the
 * live theme. Delete once a direction is chosen.
 */
import { StyleSwatch } from '@/components/lobby/style-swatch'

export const dynamic = 'force-static'

const styles = [
  {
    slug: 'club-noir', name: 'Club Noir',
    sub: 'Current — obsidian + copper, glossy sheen',
    base: '#15171c', raised: '#1d2026', line: 'rgba(255,255,255,0.08)',
    accent: '#c9824a', accentInk: '#1d1410', ink: '#f1efe9', inkSubtle: '#9a9893',
    felt: '#1c2a22', feltDark: 0.55, glossy: true,
  },
  {
    slug: 'luxury-wood', name: 'Luxury Wood',
    sub: 'Warm walnut + cream + brass — classic club lounge',
    base: '#f6efe2', raised: '#fffaf0', line: 'rgba(91,61,34,0.18)',
    accent: '#8a5a2b', accentInk: '#fbe9d2', ink: '#3a2a1a', inkSubtle: '#8a7a64',
    felt: '#5b3d22', feltDark: 0.4, glossy: false,
  },
  {
    slug: 'marquetry', name: 'Marquetry',
    sub: 'Oxblood lacquer + brass + emerald inlay — opulent',
    base: '#1a0e0e', raised: '#241412', line: 'rgba(212,175,99,0.16)',
    accent: '#c9a23a', accentInk: '#241404', ink: '#f2e6d8', inkSubtle: '#a48f7a',
    felt: '#0f3d2c', feltDark: 0.5, glossy: true,
  },
  {
    slug: 'royal-sapphire', name: 'Royal Sapphire',
    sub: 'Deep navy + gold leaf — premium card room',
    base: '#0c1530', raised: '#13204a', line: 'rgba(212,178,86,0.14)',
    accent: '#d4af56', accentInk: '#231a04', ink: '#eef1fa', inkSubtle: '#8e9bc4',
    felt: '#142a4a', feltDark: 0.45, glossy: true,
  },
  {
    slug: 'emerald-modern', name: 'Emerald Modern',
    sub: 'Felt green + warm gold — clean, flat, minimal',
    base: '#0f1a14', raised: '#16241c', line: 'rgba(255,255,255,0.07)',
    accent: '#e0a849', accentInk: '#1c1303', ink: '#eef2ee', inkSubtle: '#8fa39a',
    felt: '#142e22', feltDark: 0.35, glossy: false,
  },
  {
    slug: 'midnight-jade', name: 'Midnight Jade',
    sub: 'Cool charcoal + teal — moody, modern, understated',
    base: '#10161a', raised: '#1a2226', line: 'rgba(255,255,255,0.07)',
    accent: '#4cc3bc', accentInk: '#06201e', ink: '#eef4f4', inkSubtle: '#8aa3a3',
    felt: '#15302d', feltDark: 0.5, glossy: false,
  },
  {
    slug: 'champagne', name: 'Champagne',
    sub: 'Soft cream + rose gold — airy, elegant, light',
    base: '#fbf4ea', raised: '#fffbf5', line: 'rgba(150,90,63,0.16)',
    accent: '#bb5a3f', accentInk: '#fde8dd', ink: '#3a2620', inkSubtle: '#8f7a6c',
    felt: '#5c4a3a', feltDark: 0.3, glossy: false,
  },
]

export default function StylePreviewPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0c] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-white/40">Style preview · not live</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Pick a direction</h1>
        <p className="mt-1 text-sm text-white/50">Each card is a complete visual direction. Click "Use this style" to try it live across the whole app (saved on this device), or just tell me a name.</p>
      </div>
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        {styles.map(s => <StyleSwatch key={s.name} {...s} />)}
      </div>
    </div>
  )
}
