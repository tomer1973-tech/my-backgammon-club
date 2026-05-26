import { NextRequest, NextResponse }     from 'next/server'
import { renderToBuffer }               from '@react-pdf/renderer'
import React                            from 'react'
import { db }                           from '@/lib/db'
import { requireSessionUser }           from '@/lib/session'
import { getStandings }                 from '@/actions/match'
import { computeTournamentSnapshot,
         computeOpeningStats }          from '@/lib/analytics'
import { TournamentReportDocument }     from '@/components/export/pdf/tournament-report'
import type { AnalyticsMatch, AnalyticsGame } from '@/lib/analytics'
import { TOURNAMENT_FORMAT_LABEL,
         TOURNAMENT_STATUS_LABEL }      from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await requireSessionUser()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tournamentId = params.id

  const [tournament, standings, matchRows, gameRows] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId } }),
    getStandings(tournamentId),
    db.match.findMany({
      where: { tournamentId },
      include: {
        player1: { select: { player: { select: { name: true } }, guestName: true } },
        player2: { select: { player: { select: { name: true } }, guestName: true } },
        winner:  { select: { player: { select: { name: true } }, guestName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.matchGame.findMany({ where: { match: { tournamentId } } }),
  ])

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const memberCount = await db.tournamentMember.count({ where: { tournamentId } })

  const analyticsMatches: AnalyticsMatch[] = matchRows.map(m => ({
    id:           m.id,
    player1Id:    m.player1Id,
    player2Id:    m.player2Id,
    player1Name:  m.player1.player?.name ?? m.player1.guestName ?? 'Unknown',
    player2Name:  m.player2.player?.name ?? m.player2.guestName ?? 'Unknown',
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    targetScore:  m.targetScore,
    winnerId:     m.winnerId,
    status:       m.status as 'PENDING' | 'ACTIVE' | 'COMPLETED',
    openingType:  m.openingType,
    duration:     m.duration,
    createdAt:    m.createdAt,
  }))

  const analyticsGames: AnalyticsGame[] = gameRows.map(g => ({
    matchId:       g.matchId,
    winnerId:      g.winnerId,
    loserId:       g.loserId,
    cubeValue:     g.cubeValue,
    gameType:      g.gameType as 'NORMAL' | 'GAMMON' | 'BACKGAMMON',
    pointsAwarded: g.pointsAwarded,
  }))

  const snapshot     = computeTournamentSnapshot(memberCount, analyticsMatches, analyticsGames)
  const openingStats = computeOpeningStats(analyticsMatches)

  const matchData = matchRows
    .filter(m => m.status === 'COMPLETED')
    .map(m => ({
      date:    m.createdAt.toLocaleDateString('en-US'),
      player1: m.player1.player?.name ?? m.player1.guestName ?? '?',
      player2: m.player2.player?.name ?? m.player2.guestName ?? '?',
      score:   `${m.player1Score}-${m.player2Score}`,
      winner:  m.winner ? (m.winner.player?.name ?? m.winner.guestName ?? '?') : '—',
      opening: m.openingType?.replace(/_/g, ' ') ?? '—',
      duration: m.duration ? `${Math.round(m.duration / 60)}m` : '—',
    }))

  const format = TOURNAMENT_FORMAT_LABEL[tournament.format as keyof typeof TOURNAMENT_FORMAT_LABEL] ?? tournament.format
  const status = TOURNAMENT_STATUS_LABEL[tournament.status as keyof typeof TOURNAMENT_STATUS_LABEL] ?? tournament.status

  const reportData = {
    tournamentName: tournament.name,
    status,
    format,
    location:  tournament.location,
    startDate: tournament.startDate
      ? tournament.startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null,
    exportDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    playerCount: memberCount,
    snapshot,
    standings,
    matches: matchData,
    openings: openingStats.map(o => ({ label: o.label, count: o.count, winRate: o.winRate })),
  }

  const pdfBuffer = await renderToBuffer(
    // @react-pdf/renderer expects DocumentProps but our wrapper renders <Document> internally;
    // cast through unknown to satisfy the overly-strict type signature.
    React.createElement(TournamentReportDocument, { data: reportData }) as unknown as React.ReactElement,
  )

  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
