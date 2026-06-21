import { notFound, redirect } from 'next/navigation'
import { getTournamentWithMembers } from '@/actions/tournament'
import { getSessionUser }           from '@/lib/session'
import { EditTournamentForm }       from '@/components/tournament/edit-tournament-form'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export default async function EditTournamentPage({ params }: Props) {
  const [user, tournament] = await Promise.all([
    getSessionUser(),
    getTournamentWithMembers(params.id).catch(() => null),
  ])

  if (!tournament) notFound()

  // Only owner, organizer, or admin can edit
  const canEdit = tournament.isOwner || tournament.isAdmin ||
    tournament.userRole === 'ORGANIZER'
  if (!canEdit) redirect(`/tournaments/${params.id}`)

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-lg">
      <EditTournamentForm tournament={tournament} />
    </div>
  )
}
