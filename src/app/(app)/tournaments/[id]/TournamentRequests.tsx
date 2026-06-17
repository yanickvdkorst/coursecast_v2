'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { respondToJoinRequest } from './actions'

interface Props {
  tournamentId: string
  requests: { playerId: string; name: string }[]
}

export function TournamentRequests({ tournamentId, requests }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)

  if (requests.length === 0) return null

  const respond = (playerId: string, accept: boolean) => {
    setBusy(playerId)
    start(async () => {
      await respondToJoinRequest(tournamentId, playerId, accept)
      setBusy(null)
      router.refresh()
    })
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Aanvragen ({requests.length})
      </h2>
      <div className="space-y-2">
        {requests.map(r => (
          <div
            key={r.playerId}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--color-gold-500)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {r.name[0].toUpperCase()}
            </div>
            <p className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => respond(r.playerId, true)}
                disabled={pending && busy === r.playerId}
                className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {busy === r.playerId ? '…' : 'Accepteer'}
              </button>
              <button
                onClick={() => respond(r.playerId, false)}
                disabled={pending && busy === r.playerId}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border disabled:opacity-60"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                Weiger
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
