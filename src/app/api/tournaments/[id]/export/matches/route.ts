import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/lib/db'
import { requireSessionUser }        from '@/lib/session'
import { buildMatchesCsv }           from '@/lib/csv'

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

  const [tournament, matches] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true } }),
    db.match.findMany({
      where: { tournamentId },
      include: {
        player1: { select: { player: { select: { name: true } }, guestName: true } },
        player2: { select: { player: { select: { name: true } }, guestName: true } },
        winner:  { select: { player: { select: { name: true } }, guestName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rows = matches.map(m => ({
    id:           m.id,
    date:         m.createdAt,
    player1Name:  m.player1.player?.name ?? m.player1.guestName ?? 'Unknown',
    player2Name:  m.player2.player?.name ?? m.player2.guestName ?? 'Unknown',
    player1Score: m.player1Score,
    player2Score: m.player2Score,
    targetScore:  m.targetScore,
    winnerName:   m.winner ? (m.winner.player?.name ?? m.winner.guestName ?? null) : null,
    status:       m.status,
    openingType:  m.openingType,
    duration:     m.duration,
  }))

  const csv = buildMatchesCsv(rows, tournament.name)
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-matches.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
