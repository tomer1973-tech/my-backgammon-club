/**
 * Tournament PDF Report — built with @react-pdf/renderer.
 *
 * Uses only @react-pdf/renderer primitives (Document, Page, View, Text, etc.).
 * NO standard HTML/DOM elements — this renders to a binary PDF stream.
 */

import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { StandingsRow }         from '@/types'
import type { TournamentSnapshot }   from '@/lib/analytics'

// ─────────────────────────────────────────────────────────────────────────────
// DATA SHAPE
// ─────────────────────────────────────────────────────────────────────────────

export interface TournamentReportData {
  tournamentName: string
  status:         string
  format:         string
  location:       string | null
  startDate:      string | null   // formatted
  exportDate:     string          // formatted
  playerCount:    number

  snapshot:       TournamentSnapshot
  standings:      StandingsRow[]

  matches: {
    date:        string
    player1:     string
    player2:     string
    score:       string
    winner:      string
    opening:     string
    duration:    string
  }[]

  openings: {
    label:   string
    count:   number
    winRate: number
  }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// COLOUR PALETTE  (no CSS variables — must be literals for @react-pdf)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  bg:         '#0D0F12',
  surface:    '#13161B',
  raised:     '#181C22',
  elevated:   '#1E222A',
  border:     '#252930',
  gold:       '#C9A84C',
  goldLight:  '#E8C46A',
  ink:        '#E8EAF0',
  inkMuted:   '#8890A0',
  inkSubtle:  '#4A5060',
  win:        '#56C97A',
  loss:       '#E05252',
  white:      '#FFFFFF',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    fontFamily: 'Helvetica',
    paddingHorizontal: 40,
    paddingVertical: 36,
    color: C.ink,
    fontSize: 9,
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tournamentName: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    marginBottom: 6,
  },
  headerMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6,
  },
  headerMetaItem: {
    fontSize: 8,
    color: C.inkMuted,
  },

  // ── Sections ────────────────────────────────────────────────────────────
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: C.inkSubtle,
    textTransform: 'uppercase',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 5,
  },

  // ── KPI row ─────────────────────────────────────────────────────────────
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: C.raised,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: C.inkMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: C.gold,
  },
  kpiSub: {
    fontSize: 7,
    color: C.inkMuted,
    marginTop: 2,
  },

  // ── Tables ──────────────────────────────────────────────────────────────
  table: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 7,
    letterSpacing: 0.8,
    color: C.inkMuted,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.surface,
  },
  tableCell: {
    fontSize: 9,
    color: C.ink,
  },
  tableCellMuted: {
    fontSize: 9,
    color: C.inkMuted,
  },
  tableCellGold: {
    fontSize: 9,
    color: C.gold,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellWin: {
    fontSize: 9,
    color: C.win,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellLoss: {
    fontSize: 9,
    color: C.loss,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: C.inkSubtle,
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function TableRow({
  cols,
  widths,
  alt = false,
  firstRank = false,
}: {
  cols:      React.ReactNode[]
  widths:    number[]
  alt?:      boolean
  firstRank?: boolean
}) {
  return (
    <View style={[s.tableRow, alt ? s.tableRowAlt : {}]}>
      {cols.map((col, i) => (
        <View key={i} style={{ width: `${widths[i]}%` }}>
          {col}
        </View>
      ))}
    </View>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF DOCUMENT
// ─────────────────────────────────────────────────────────────────────────────

export function TournamentReportDocument({ data: d }: { data: TournamentReportData }) {
  return (
    <Document
      title={`${d.tournamentName} — Tournament Report`}
      author="My Backgammon Club"
      creator="My Backgammon Club"
    >
      {/* ── PAGE 1: Overview + Standings ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerLabel}>Tournament Report</Text>
          <Text style={s.tournamentName}>{d.tournamentName}</Text>
          <View style={s.headerMeta}>
            {d.location    && <Text style={s.headerMetaItem}>📍 {d.location}</Text>}
            {d.startDate   && <Text style={s.headerMetaItem}>📅 {d.startDate}</Text>}
            <Text style={s.headerMetaItem}>{d.format.replace(/_/g, ' ')}</Text>
            <Text style={s.headerMetaItem}>{d.status}</Text>
            <Text style={s.headerMetaItem}>Generated {d.exportDate}</Text>
          </View>
        </View>

        {/* KPI row */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Tournament at a glance</Text>
          <View style={s.kpiRow}>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Players</Text>
              <Text style={s.kpiValue}>{d.snapshot.totalPlayers}</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Matches</Text>
              <Text style={s.kpiValue}>{d.snapshot.completedMatches}</Text>
              <Text style={s.kpiSub}>of {d.snapshot.totalPossibleMatches} possible</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Completion</Text>
              <Text style={s.kpiValue}>{d.snapshot.completionPct}%</Text>
            </View>
            <View style={s.kpiCard}>
              <Text style={s.kpiLabel}>Games played</Text>
              <Text style={s.kpiValue}>{d.snapshot.totalGamesPlayed}</Text>
              {d.snapshot.gammonRate > 0 && (
                <Text style={s.kpiSub}>{d.snapshot.gammonRate}% gammon rate</Text>
              )}
            </View>
          </View>
        </View>

        {/* Standings */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Final standings</Text>
          <View style={s.table}>
            {/* Header */}
            <View style={s.tableHeaderRow}>
              {['#', 'Player', 'W', 'L', 'Pts', 'Win%'].map((h, i) => (
                <View key={h} style={{ width: `${[6, 44, 10, 10, 15, 15][i]}%` }}>
                  <Text style={s.tableHeaderCell}>{h}</Text>
                </View>
              ))}
            </View>
            {/* Rows */}
            {d.standings.map((r, i) => (
              <View key={r.memberId} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                <View style={{ width: '6%' }}>
                  <Text style={i === 0 ? s.tableCellGold : s.tableCellMuted}>{r.rank}</Text>
                </View>
                <View style={{ width: '44%' }}>
                  <Text style={i === 0 ? s.tableCellGold : s.tableCell}>{r.name}</Text>
                </View>
                <View style={{ width: '10%' }}>
                  <Text style={s.tableCellWin}>{r.wins}</Text>
                </View>
                <View style={{ width: '10%' }}>
                  <Text style={s.tableCellLoss}>{r.losses}</Text>
                </View>
                <View style={{ width: '15%' }}>
                  <Text style={s.tableCellGold}>{r.points}</Text>
                </View>
                <View style={{ width: '15%' }}>
                  <Text style={s.tableCell}>{r.winRate}%</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>My Backgammon Club</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          } />
        </View>
      </Page>

      {/* ── PAGE 2: Match History ─────────────────────────────────────────── */}
      {d.matches.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.headerLabel}>Tournament Report</Text>
            <Text style={[s.tournamentName, { fontSize: 18 }]}>{d.tournamentName}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Match history ({d.matches.length} matches)</Text>
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                {['Date', 'Player 1', 'Player 2', 'Score', 'Winner', 'Opening', 'Dur.'].map((h, i) => (
                  <View key={h} style={{ width: `${[12, 17, 17, 10, 17, 17, 10][i]}%` }}>
                    <Text style={s.tableHeaderCell}>{h}</Text>
                  </View>
                ))}
              </View>
              {d.matches.map((m, i) => (
                <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <View style={{ width: '12%' }}><Text style={s.tableCellMuted}>{m.date}</Text></View>
                  <View style={{ width: '17%' }}><Text style={s.tableCell}>{m.player1}</Text></View>
                  <View style={{ width: '17%' }}><Text style={s.tableCell}>{m.player2}</Text></View>
                  <View style={{ width: '10%' }}><Text style={s.tableCellGold}>{m.score}</Text></View>
                  <View style={{ width: '17%' }}><Text style={s.tableCellWin}>{m.winner}</Text></View>
                  <View style={{ width: '17%' }}><Text style={s.tableCellMuted}>{m.opening}</Text></View>
                  <View style={{ width: '10%' }}><Text style={s.tableCellMuted}>{m.duration}</Text></View>
                </View>
              ))}
            </View>
          </View>

          {/* Opening analytics */}
          {d.openings.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Opening analytics</Text>
              <View style={s.table}>
                <View style={s.tableHeaderRow}>
                  {['Opening', 'Matches', 'Avg Win Rate'].map((h, i) => (
                    <View key={h} style={{ width: `${[50, 25, 25][i]}%` }}>
                      <Text style={s.tableHeaderCell}>{h}</Text>
                    </View>
                  ))}
                </View>
                {d.openings.map((o, i) => (
                  <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                    <View style={{ width: '50%' }}><Text style={s.tableCell}>{o.label}</Text></View>
                    <View style={{ width: '25%' }}><Text style={s.tableCellMuted}>{o.count}</Text></View>
                    <View style={{ width: '25%' }}><Text style={s.tableCellGold}>{o.winRate}%</Text></View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={s.footer} fixed>
            <Text style={s.footerText}>My Backgammon Club</Text>
            <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            } />
          </View>
        </Page>
      )}
    </Document>
  )
}
