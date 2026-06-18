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
  // Luxury: cream felt, jet-black + warm amber triangles — matches premium physical boards
  { id: 'luxury',   label: 'Luxury',   felt: 'hsl(38 38% 87%)',  rail: 'hsl(28 52% 18%)',  pointDark: 'hsl(20 8% 11%)',    pointLight: 'hsl(37 70% 55%)' },
  // Classic: dark walnut felt — forest green + warm amber triangles
  { id: 'classic',  label: 'Classic',  felt: 'hsl(26 26% 9%)',   rail: 'hsl(28 32% 6%)',   pointDark: 'hsl(155 55% 24%)',  pointLight: 'hsl(33 72% 52%)' },
  // Emerald: rich green felt — deep green + gold accent triangles
  { id: 'emerald',  label: 'Emerald',  felt: 'hsl(158 34% 7%)',  rail: 'hsl(160 38% 4%)',  pointDark: 'hsl(156 55% 20%)',  pointLight: 'hsl(45 72% 54%)' },
  // Midnight: deep navy felt — sapphire + warm gold triangles
  { id: 'midnight', label: 'Midnight', felt: 'hsl(221 38% 8%)',  rail: 'hsl(223 42% 5%)',  pointDark: 'hsl(220 60% 28%)',  pointLight: 'hsl(38 72% 52%)' },
  // Crimson: deep red felt — crimson + cream triangles
  { id: 'crimson',  label: 'Crimson',  felt: 'hsl(351 34% 8%)',  rail: 'hsl(352 40% 5%)',  pointDark: 'hsl(352 58% 30%)',  pointLight: 'hsl(38 65% 58%)' },
  // Slate: cool grey felt — steel + warm amber triangles
  { id: 'slate',    label: 'Slate',    felt: 'hsl(220 9% 11%)',  rail: 'hsl(220 12% 7%)',  pointDark: 'hsl(220 30% 30%)',  pointLight: 'hsl(38 52% 54%)' },
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
