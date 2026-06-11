import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/lib/db'
import { requireSessionUser }        from '@/lib/session'
import { buildPlayersCsv }           from '@/lib/csv'
import { computePlayerAnalytics }    from '@/lib/analytics'
import type { AnalyticsMatch, AnalyticsGame } from '@/lib/analytics'

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

  const [tournament, memberRows, matchRows, gameRows] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true } }),
    db.tournamentMember.findMany({
      where: { tournamentId },
      include: { player: { select: { name: true } } },
    }),
    db.match.findMany({
      where: { tournamentId, player1Id: { not: null }, player2Id: { not: null } },
      include: {
        player1: { select: { player: { select: { name: true } }, guestName: true } },
        player2: { select: { player: { select: { name: true } }, guestName: true } },
      },
    }),
    db.matchGame.findMany({ where: { match: { tournamentId } } }),
  ])

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const matches: AnalyticsMatch[] = matchRows.map(m => ({
    id:           m.id,
    player1Id:    m.player1Id!,
    player2Id:    m.player2Id!,
    player1Name:  m.player1?.player?.name ?? m.player1?.guestName ?? 'Unknown',
    player2Name:  m.player2?.player?.name ?? m.player2?.guestName ?? 'Unknown',
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    targetScore:  m.targetScore,
    winnerId:     m.winnerId,
    status:       m.status as 'PENDING' | 'ACTIVE' | 'COMPLETED',
    openingType:  m.openingType,
    duration:     m.duration,
    createdAt:    m.createdAt,
  }))

  const games: AnalyticsGame[] = gameRows.map(g => ({
    matchId:       g.matchId,
    winnerId:      g.winnerId,
    loserId:       g.loserId,
    cubeValue:     g.cubeValue,
    gameType:      g.gameType as 'NORMAL' | 'GAMMON' | 'BACKGAMMON',
    pointsAwarded: g.pointsAwarded,
  }))

  const playerRows = memberRows.map(m => {
    const name = m.player?.name ?? m.guestName ?? 'Unknown'
    const a    = computePlayerAnalytics(m.id, name, matches, games, m.points)
    return {
      name,
      isGuest:       m.playerId === null,
      wins:          m.wins,
      losses:        m.losses,
      winRate:       a.winRate,
      points:        m.points,
      totalGames:    a.totalGames,
      cubeUsageRate: a.cubeUsageRate,
      gammonRate:    a.gammonRate,
      currentStreak: a.currentStreak.count,
      streakType:    a.currentStreak.type,
      bestWinStreak: a.bestWinStreak,
    }
  }).sort((a, b) => b.points - a.points)

  const csv = buildPlayersCsv(playerRows, tournament.name)
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-players.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
