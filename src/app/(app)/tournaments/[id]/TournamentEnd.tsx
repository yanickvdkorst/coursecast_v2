'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { endTournament } from './actions'

export function TournamentEnd({ tournamentId, name }: { tournamentId: string; name: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const onClick = () => {
    if (!confirm(`Toernooi "${name}" beëindigen? Het wordt op Gespeeld gezet.`)) return
    setError(null)
    start(async () => {
      const res = await endTournament(tournamentId)
      if (!res.ok) setError(res.error ?? 'Beëindigen mislukte')
      else router.refresh()
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full py-4 rounded-2xl font-semibold text-base disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {pending ? 'Beëindigen…' : 'Toernooi beëindigen'}
      </button>
      {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  )
}
