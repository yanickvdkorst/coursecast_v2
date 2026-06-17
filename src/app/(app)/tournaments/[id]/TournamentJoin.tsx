'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestToJoin, leaveTournament } from './actions'

interface Props {
  tournamentId: string
  visibility: string
  status: 'none' | 'requested' | 'accepted'
  closed?: boolean
  deadlineLabel?: string | null
}

export function TournamentJoin({ tournamentId, visibility, status, closed, deadlineLabel }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) setError(res.error ?? 'Er ging iets mis')
      else router.refresh()
    })
  }

  // Already enrolled → allow withdrawing.
  if (status === 'accepted') {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Je bent ingeschreven</span>
          <button
            onClick={() => run(() => leaveTournament(tournamentId))}
            disabled={pending}
            className="text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-60"
            style={{ background: 'var(--bg-card)', color: 'var(--status-danger)', border: '1px solid var(--border-color)' }}
          >
            {pending ? '…' : 'Uitschrijven'}
          </button>
        </div>
        {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
      </div>
    )
  }

  // Pending request → allow cancelling.
  if (status === 'requested') {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl" style={{ background: 'var(--bg-elevated)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Aanvraag verstuurd — wacht op goedkeuring.</span>
          <button
            onClick={() => run(() => leaveTournament(tournamentId))}
            disabled={pending}
            className="text-sm font-medium px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
            style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
          >
            {pending ? '…' : 'Intrekken'}
          </button>
        </div>
        {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
      </div>
    )
  }

  if (closed) {
    return (
      <div className="mb-8 px-4 py-3 rounded-2xl text-sm text-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
        De inschrijving is gesloten.
      </div>
    )
  }

  const label = visibility === 'public' ? 'Inschrijven' : 'Inschrijving aanvragen'

  return (
    <div className="mb-8">
      <button
        onClick={() => run(() => requestToJoin(tournamentId))}
        disabled={pending}
        className="w-full py-3.5 rounded-2xl font-semibold text-base disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {pending ? 'Bezig…' : label}
      </button>
      {deadlineLabel && (
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>Inschrijven kan tot {deadlineLabel}</p>
      )}
      {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  )
}
