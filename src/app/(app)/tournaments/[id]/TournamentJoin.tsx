'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { requestToJoin } from './actions'

interface Props {
  tournamentId: string
  visibility: string
  status: 'none' | 'requested' | 'accepted'
}

export function TournamentJoin({ tournamentId, visibility, status }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (status === 'accepted') return null

  if (status === 'requested') {
    return (
      <div
        className="mb-8 px-4 py-3 rounded-2xl text-sm text-center"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
      >
        Aanvraag verstuurd — wacht op goedkeuring van de organisator.
      </div>
    )
  }

  const label = visibility === 'public' ? 'Inschrijven' : 'Aanvraag indienen'

  const onClick = () => {
    setError(null)
    start(async () => {
      const res = await requestToJoin(tournamentId)
      if (!res.ok) setError(res.error ?? 'Er ging iets mis')
      else router.refresh()
    })
  }

  return (
    <div className="mb-8">
      <button
        onClick={onClick}
        disabled={pending}
        className="w-full py-3.5 rounded-2xl font-semibold text-base disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {pending ? 'Bezig…' : label}
      </button>
      {error && <p className="text-sm mt-2 text-center" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  )
}
