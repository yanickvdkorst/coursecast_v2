'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTournamentMatchResult } from './actions'

interface OpenMatch { id: string; aName: string; bName: string }

export function TournamentResults({ matches, allowDraw }: { tournamentId: string; matches: OpenMatch[]; allowDraw: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  if (matches.length === 0) return null

  const set = (matchId: string, outcome: 'a' | 'b' | 'draw') => {
    setBusy(matchId)
    setError(null)
    start(async () => {
      const res = await setTournamentMatchResult(matchId, outcome, scores[matchId])
      setBusy(null)
      if (!res.ok) setError(res.error ?? 'Mislukt')
      else router.refresh()
    })
  }

  const btn = (m: OpenMatch, outcome: 'a' | 'b' | 'draw', label: string) => (
    <button
      type="button"
      onClick={() => set(m.id, outcome)}
      disabled={pending && busy === m.id}
      className="flex-1 py-2 rounded-lg text-xs font-semibold truncate disabled:opacity-60"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
    >
      {label}
    </button>
  )

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
        Uitslagen invullen
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Als organisator kun je hier de winnaar bepalen (bijv. voor spelers zonder account).
      </p>
      <div className="space-y-2">
        {matches.map(m => (
          <div key={m.id} className="px-4 py-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-medium mb-2 truncate" style={{ color: 'var(--text-primary)' }}>{m.aName} vs {m.bName}</p>
            <input
              type="text"
              value={scores[m.id] ?? ''}
              onChange={e => setScores(s => ({ ...s, [m.id]: e.target.value }))}
              placeholder="Score (optioneel, bijv. 3&2)"
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-2 focus:border-[var(--color-gold-500)]"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
            <div className="flex gap-2">
              {btn(m, 'a', `${m.aName} wint`)}
              {allowDraw && btn(m, 'draw', 'Gelijk')}
              {btn(m, 'b', `${m.bName} wint`)}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--status-danger)' }}>{error}</p>}
    </section>
  )
}
