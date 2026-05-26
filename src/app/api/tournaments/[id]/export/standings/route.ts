import { NextRequest, NextResponse } from 'next/server'
import { db }                        from '@/lib/db'
import { requireSessionUser }        from '@/lib/session'
import { buildStandingsCsv }         from '@/lib/csv'
import { getStandings }              from '@/actions/match'

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

  const [tournament, standings] = await Promise.all([
    db.tournament.findUnique({ where: { id: tournamentId }, select: { name: true } }),
    getStandings(tournamentId),
  ])

  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const csv = buildStandingsCsv(standings, tournament.name)
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-standings.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
