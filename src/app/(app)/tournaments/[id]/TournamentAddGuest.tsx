'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addTournamentGuest } from './actions'

export function TournamentAddGuest({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const add = () => {
    if (!name.trim()) return
    setError(null)
    start(async () => {
      const res = await addTournamentGuest(tournamentId, name)
      if (!res.ok) setError(res.error ?? 'Toevoegen mislukte')
      else { setName(''); router.refresh() }
    })
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Naam (zonder account)"
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-[var(--color-gold-500)]"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
        />
        <button
          type="button"
          onClick={add}
          disabled={pending || !name.trim()}
          className="px-4 py-2.5 rounded-xl font-semibold text-sm shrink-0 disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {pending ? '…' : 'Toevoegen'}
        </button>
      </div>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </div>
  )
}
