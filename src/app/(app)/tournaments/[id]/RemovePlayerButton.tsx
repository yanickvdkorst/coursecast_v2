'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeTournamentPlayer } from './actions'

export function RemovePlayerButton({ tournamentId, playerId }: { tournamentId: string; playerId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      onClick={() => start(async () => { await removeTournamentPlayer(tournamentId, playerId); router.refresh() })}
      disabled={pending}
      aria-label="Verwijder speler"
      className="text-xs font-medium px-2.5 py-1 rounded-lg shrink-0 disabled:opacity-60"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
    >
      {pending ? '…' : 'Verwijder'}
    </button>
  )
}
