/**
 * Board & dice colour themes for the backgammon board.
 *
 * Applied as CSS custom properties on the board root so every sub-component
 * inherits them. The first entry of each list is the default and reproduces the
 * original ("Classic") look, so callers that don't pass a theme are unchanged.
 */

import type { CSSProperties } from 'react'

export interface BoardTheme {
  id:         string
  label:      string
  felt:       string   // board surface
  pointDark:  string   // darker triangles (even points)
  pointLight: string   // lighter triangles (odd points)
  rail:       string   // outer frame + centre bar
  trim?:      string   // inner frame bead / metal accent (defaults to a warm gold)
  weave?:     number   // felt crosshatch texture opacity, 0-1 (defaults to a subtle felt weave)
  gloss?:     number   // diagonal sheen reflection opacity, 0-1 (defaults to a faint highlight)
}

export interface DiceTheme {
  id:     string
  label:  string
  bg:     string   // die face
  pip:    string   // pips
  border: string   // die edge
}

const DEFAULT_TRIM  = 'hsl(35 55% 32% / 0.5)'
const DEFAULT_WEAVE = 0.008
const DEFAULT_GLOSS = 0.05

export const BOARD_THEMES: BoardTheme[] = [
  // Royal Sapphire: warm ivory felt — vivid sapphire + bright gold, light frame, polished (default)
  { id: 'royal',    label: 'Royal Sapphire', felt: 'hsl(36 42% 85%)', rail: 'hsl(30 38% 44%)',  pointDark: 'hsl(213 72% 34%)',  pointLight: 'hsl(38 92% 52%)' },

  // ── Premium / high-end inspired finishes ──────────────────────────────────
  // Walnut Pearl: rich wood-inlay board with mother-of-pearl checkers look
  { id: 'walnut-pearl', label: 'Walnut Pearl', felt: 'hsl(28 38% 34%)', rail: 'hsl(25 42% 18%)', pointDark: 'hsl(24 48% 19%)', pointLight: 'hsl(36 32% 80%)', trim: 'hsl(40 70% 50% / 0.6)' },
  // Saddle Tan: tan leather board with brass fittings
  { id: 'saddle-tan',   label: 'Saddle Tan',  felt: 'hsl(32 55% 70%)', rail: 'hsl(15 50% 20%)', pointDark: 'hsl(20 45% 24%)', pointLight: 'hsl(24 88% 52%)', trim: 'hsl(42 65% 48% / 0.65)' },
  // Carbon Elite: dense carbon-fibre weave with vivid orange accent, chrome trim, glassy clear-coat sheen
  { id: 'carbon-elite', label: 'Carbon Elite', felt: 'hsl(220 6% 14%)', rail: 'hsl(220 8% 8%)',  pointDark: 'hsl(220 7% 18%)', pointLight: 'hsl(24 92% 54%)', trim: 'hsl(210 10% 75% / 0.5)', weave: 0.16, gloss: 0.22 },
  // Championship Onyx: black lacquer with gold trim, white/orange points, glossy lacquer sheen
  { id: 'championship', label: 'Championship', felt: 'hsl(220 10% 10%)', rail: 'hsl(220 12% 6%)', pointDark: 'hsl(220 8% 15%)', pointLight: 'hsl(26 92% 55%)', trim: 'hsl(43 80% 58% / 0.7)', gloss: 0.18 },
  // Inferno: red lacquer with black/yellow points, racing stripe energy
  { id: 'inferno',      label: 'Inferno',      felt: 'hsl(355 68% 36%)', rail: 'hsl(0 0% 8%)',   pointDark: 'hsl(0 0% 9%)',    pointLight: 'hsl(48 95% 55%)', trim: 'hsl(48 90% 55% / 0.55)' },

  // Navy & Copper: medium navy felt — vivid royal blue + bright amber, clear contrast
  { id: 'navy',     label: 'Navy & Copper', felt: 'hsl(218 48% 16%)', rail: 'hsl(20 45% 12%)',  pointDark: 'hsl(220 82% 38%)',  pointLight: 'hsl(38 96% 56%)' },
  // Luxury: warm cream felt — deep espresso + vivid amber, bright & elegant
  { id: 'luxury',   label: 'Luxury',        felt: 'hsl(38 40% 88%)',  rail: 'hsl(28 52% 18%)',  pointDark: 'hsl(20 70% 18%)',   pointLight: 'hsl(37 88% 52%)' },
  // Classic: forest-green felt — vivid emerald + warm amber
  { id: 'classic',  label: 'Classic',       felt: 'hsl(155 40% 13%)', rail: 'hsl(25 38% 11%)',  pointDark: 'hsl(155 65% 28%)',  pointLight: 'hsl(38 92% 58%)' },
  // Emerald: deep green felt — bright emerald + vivid gold
  { id: 'emerald',  label: 'Emerald',       felt: 'hsl(158 48% 12%)', rail: 'hsl(160 32% 8%)',  pointDark: 'hsl(156 68% 30%)',  pointLight: 'hsl(44 95% 60%)' },
  // Midnight: indigo felt — bright sapphire + vivid gold
  { id: 'midnight', label: 'Midnight',      felt: 'hsl(232 50% 14%)', rail: 'hsl(234 46% 9%)',  pointDark: 'hsl(228 80% 40%)',  pointLight: 'hsl(42 94% 58%)' },
  // Crimson: burgundy felt — vivid crimson + bright ivory
  { id: 'crimson',  label: 'Crimson',       felt: 'hsl(350 46% 14%)', rail: 'hsl(352 40% 9%)',  pointDark: 'hsl(352 75% 36%)',  pointLight: 'hsl(40 85% 70%)' },
  // Slate: charcoal felt — bright steel blue + warm amber
  { id: 'slate',    label: 'Slate',         felt: 'hsl(220 15% 15%)', rail: 'hsl(220 13% 10%)', pointDark: 'hsl(218 55% 38%)',  pointLight: 'hsl(38 85% 60%)' },
]

export const DICE_THEMES: DiceTheme[] = [
  { id: 'ivory',   label: 'Ivory',   bg: 'hsl(40 35% 94%)',  pip: 'hsl(25 20% 14%)',  border: 'hsl(40 62% 55% / 0.5)' },
  { id: 'gold',    label: 'Gold',    bg: 'hsl(43 70% 60%)',  pip: 'hsl(30 45% 14%)',  border: 'hsl(40 62% 45%)' },
  { id: 'crimson', label: 'Crimson', bg: 'hsl(352 58% 47%)', pip: 'hsl(0 0% 96%)',    border: 'hsl(352 58% 36%)' },
  { id: 'onyx',    label: 'Onyx',    bg: 'hsl(25 12% 16%)',  pip: 'hsl(40 35% 88%)',  border: 'hsl(40 30% 50% / 0.6)' },
  { id: 'azure',   label: 'Azure',   bg: 'hsl(208 68% 50%)', pip: 'hsl(0 0% 98%)',    border: 'hsl(208 68% 38%)' },
]

export function getBoardTheme(id: string | null | undefined): BoardTheme {
  return BOARD_THEMES.find(t => t.id === id) ?? BOARD_THEMES[0]
}
export function getDiceTheme(id: string | null | undefined): DiceTheme {
  return DICE_THEMES.find(t => t.id === id) ?? DICE_THEMES[0]
}

/** CSS custom properties for a board + dice theme, to spread onto a style prop. */
export function themeVars(board: BoardTheme, dice: DiceTheme): CSSProperties {
  return {
    '--bg-felt':       board.felt,
    '--bg-rail':       board.rail,
    '--bg-point-dark': board.pointDark,
    '--bg-point-light':board.pointLight,
    '--bg-trim':       board.trim ?? DEFAULT_TRIM,
    '--felt-weave':    String(board.weave ?? DEFAULT_WEAVE),
    '--felt-gloss':    String(board.gloss ?? DEFAULT_GLOSS),
    '--die-bg':        dice.bg,
    '--die-pip':       dice.pip,
    '--die-border':    dice.border,
  } as CSSProperties
}
