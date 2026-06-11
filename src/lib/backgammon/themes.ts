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
}

export interface DiceTheme {
  id:     string
  label:  string
  bg:     string   // die face
  pip:    string   // pips
  border: string   // die edge
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'classic',  label: 'Classic',  felt: 'hsl(25 24% 10%)',  pointDark: 'hsl(26 22% 14%)', pointLight: 'hsl(26 20% 18%)' },
  { id: 'emerald',  label: 'Emerald',  felt: 'hsl(155 32% 8%)',  pointDark: 'hsl(155 28% 13%)', pointLight: 'hsl(150 24% 18%)' },
  { id: 'midnight', label: 'Midnight', felt: 'hsl(220 36% 9%)',  pointDark: 'hsl(220 32% 15%)', pointLight: 'hsl(218 27% 21%)' },
  { id: 'crimson',  label: 'Crimson',  felt: 'hsl(350 33% 9%)',  pointDark: 'hsl(352 34% 15%)', pointLight: 'hsl(350 28% 21%)' },
  { id: 'slate',    label: 'Slate',    felt: 'hsl(220 8% 12%)',  pointDark: 'hsl(220 7% 18%)',  pointLight: 'hsl(220 6% 24%)' },
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
    '--bg-point-dark': board.pointDark,
    '--bg-point-light':board.pointLight,
    '--die-bg':        dice.bg,
    '--die-pip':       dice.pip,
    '--die-border':    dice.border,
  } as CSSProperties
}
