'use client'

import { useState, useTransition } from 'react'
import { deleteTournament } from './actions'

export function TournamentDelete({ tournamentId, name }: { tournamentId: string; name: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    if (!confirm(`Toernooi "${name}" definitief verwijderen?`)) return
    setError(null)
    start(async () => {
      const res = await deleteTournament(tournamentId)
      if (res && !res.ok) setError(res.error ?? 'Verwijderen mislukte')
      // On success the action redirects to /tournaments.
    })
  }

  return (
    <div className="mt-10 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full py-3 rounded-2xl font-semibold text-sm disabled:opacity-60"
        style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)', border: '1px solid var(--status-danger)' }}
      >
        {pending ? 'Verwijderen…' : 'Toernooi verwijderen'}
      </button>
      <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
        Niet-gespeelde wedstrijden worden verwijderd; gespeelde blijven als losse historie bestaan.
      </p>
      {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  )
}
