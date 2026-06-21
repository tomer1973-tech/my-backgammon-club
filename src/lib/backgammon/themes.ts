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
}

export interface DiceTheme {
  id:     string
  label:  string
  bg:     string   // die face
  pip:    string   // pips
  border: string   // die edge
}

export const BOARD_THEMES: BoardTheme[] = [
  // Navy & Copper: DARK navy felt, deep navy + vivid amber triangles, rosewood rail
  { id: 'navy',     label: 'Navy & Copper', felt: 'hsl(218 55% 9%)',  rail: 'hsl(20 52% 9%)',   pointDark: 'hsl(222 80% 11%)',  pointLight: 'hsl(40 90% 50%)' },
  // Luxury: cream felt, jet-black + warm amber triangles
  { id: 'luxury',   label: 'Luxury',        felt: 'hsl(38 38% 87%)',  rail: 'hsl(28 52% 18%)',  pointDark: 'hsl(20 8% 11%)',    pointLight: 'hsl(37 82% 52%)' },
  // Classic: dark walnut felt — deep green + warm amber triangles
  { id: 'classic',  label: 'Classic',       felt: 'hsl(155 50% 8%)',  rail: 'hsl(25 45% 8%)',   pointDark: 'hsl(155 60% 16%)',  pointLight: 'hsl(38 88% 54%)' },
  // Emerald: rich green felt — deep green + gold accent triangles
  { id: 'emerald',  label: 'Emerald',       felt: 'hsl(158 55% 7%)',  rail: 'hsl(160 38% 5%)',  pointDark: 'hsl(156 65% 14%)',  pointLight: 'hsl(45 90% 56%)' },
  // Midnight: deep navy felt — sapphire + warm gold triangles
  { id: 'midnight', label: 'Midnight',      felt: 'hsl(222 65% 7%)',  rail: 'hsl(224 55% 5%)',  pointDark: 'hsl(220 75% 22%)',  pointLight: 'hsl(42 88% 54%)' },
  // Crimson: deep red felt — crimson + cream triangles
  { id: 'crimson',  label: 'Crimson',       felt: 'hsl(350 55% 7%)',  rail: 'hsl(352 48% 5%)',  pointDark: 'hsl(352 70% 24%)',  pointLight: 'hsl(40 80% 62%)' },
  // Slate: cool grey felt — steel + warm amber triangles
  { id: 'slate',    label: 'Slate',         felt: 'hsl(220 14% 9%)',  rail: 'hsl(220 16% 6%)',  pointDark: 'hsl(220 38% 24%)',  pointLight: 'hsl(38 80% 56%)' },
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
    '--die-bg':        dice.bg,
    '--die-pip':       dice.pip,
    '--die-border':    dice.border,
  } as CSSProperties
}
