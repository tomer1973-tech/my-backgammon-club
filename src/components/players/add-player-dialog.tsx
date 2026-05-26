'use client'

/**
 * AddPlayerDialog — two-tab dialog: search registered players OR add a guest.
 */

import { useState, useTransition } from 'react'
import { UserPlus, Search, User }  from 'lucide-react'
import { Dialog, DialogFooter }    from '@/components/ui/dialog'
import { Button }                  from '@/components/ui/button'
import { Input }                   from '@/components/ui/input'
import { Avatar }                  from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { searchPlayers, addMemberByEmail, addGuestMember } from '@/actions/player'
import type { Player }             from '@/types'

interface AddPlayerDialogProps {
  open:         boolean
  onClose:      () => void
  tournamentId: string
}

export function AddPlayerDialog({ open, onClose, tournamentId }: AddPlayerDialogProps) {
  const [tab, setTab] = useState<'search' | 'guest'>('search')

  // Search state
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<Player[]>([])
  const [searching, startSearch]    = useTransition()
  const [addingId, setAddingId]     = useState<string | null>(null)

  // Guest state
  const [guestName, setGuestName]   = useState('')
  const [addingGuest, setAddingGuest] = useState(false)

  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState<string | null>(null)

  function resetState() {
    setQuery(''); setResults([]); setGuestName(''); setError(null); setSuccess(null)
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleSearch(q: string) {
    setQuery(q)
    setError(null)
    if (q.length < 2) { setResults([]); return }
    startSearch(async () => {
      const res = await searchPlayers(tournamentId, q)
      if (res.success) setResults(res.data)
    })
  }

  async function handleAddRegistered(player: Player) {
    setAddingId(player.id)
    setError(null)
    const result = await addMemberByEmail({ tournamentId, email: player.email })
    setAddingId(null)
    if (result.success) {
      setSuccess(`${player.name} added!`)
      setQuery(''); setResults([])
    } else {
      setError(result.error)
    }
  }

  async function handleAddGuest() {
    if (!guestName.trim()) return
    setAddingGuest(true)
    setError(null)
    const result = await addGuestMember({ tournamentId, guestName: guestName.trim() })
    setAddingGuest(false)
    if (result.success) {
      setSuccess(`${guestName.trim()} added as a guest!`)
      setGuestName('')
    } else {
      setError(result.error)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Add player" size="md">
      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={v => { setTab(v as typeof tab); resetState() }}>
          <TabsList>
            <TabsTrigger value="search">Registered player</TabsTrigger>
            <TabsTrigger value="guest">Guest</TabsTrigger>
          </TabsList>

          {/* REGISTERED PLAYER */}
          <TabsContent value="search">
            <div className="flex flex-col gap-3">
              <Input
                name="search"
                placeholder="Search by name or email…"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                leading={<Search className="h-4 w-4" />}
                autoFocus
              />

              {/* Results list */}
              {results.length > 0 && (
                <div className="rounded-lg border border-line divide-y divide-line/50 overflow-hidden">
                  {results.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-elevated transition-colors"
                    >
                      <Avatar name={player.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{player.name}</p>
                        <p className="truncate text-xs text-ink-subtle">{player.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAddRegistered(player)}
                        isLoading={addingId === player.id}
                        disabled={!!addingId}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="text-center text-sm text-ink-subtle py-4">
                  No players found for &ldquo;{query}&rdquo;
                </p>
              )}
            </div>
          </TabsContent>

          {/* GUEST */}
          <TabsContent value="guest">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                Add a guest player by name. Guests don&apos;t need an account.
              </p>
              <Input
                name="guestName"
                label="Guest name"
                placeholder="Avi Cohen"
                value={guestName}
                onChange={e => { setGuestName(e.target.value); setError(null); setSuccess(null) }}
                leading={<User className="h-4 w-4" />}
                autoFocus
                maxLength={50}
              />
              <Button
                onClick={handleAddGuest}
                isLoading={addingGuest}
                disabled={!guestName.trim()}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add guest
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Feedback messages */}
        {error && (
          <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">
            {success}
          </p>
        )}
      </div>

      <DialogFooter className="mt-2">
        <Button variant="ghost" onClick={handleClose}>Done</Button>
      </DialogFooter>
    </Dialog>
  )
}
