'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelTournamentInvite } from './actions'

export function TournamentInvitedList({ tournamentId, invited }: { tournamentId: string; invited: { playerId: string; name: string }[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  if (invited.length === 0) return null

  const cancel = (playerId: string) => {
    setBusy(playerId)
    start(async () => {
      await cancelTournamentInvite(tournamentId, playerId)
      setBusy(null)
      router.refresh()
    })
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Uitgenodigd ({invited.length})
      </h2>
      <div className="space-y-2">
        {invited.map(p => (
          <div key={p.playerId} className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>wacht op reactie</span>
            <button
              onClick={() => cancel(p.playerId)}
              disabled={pending && busy === p.playerId}
              className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
            >
              {busy === p.playerId ? '…' : 'Annuleer'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
