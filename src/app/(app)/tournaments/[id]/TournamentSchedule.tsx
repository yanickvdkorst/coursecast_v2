'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMatchSchedule } from './actions'

interface SMatch { id: string; aName: string; bName: string; scheduledAt: string | null }

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TournamentSchedule({ matches }: { tournamentId: string; matches: SMatch[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(matches.map(m => [m.id, toLocalInput(m.scheduledAt)]))
  )

  if (matches.length === 0) return null

  const save = (id: string) => {
    start(async () => { await setMatchSchedule(id, vals[id] || null); router.refresh() })
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
        Wedstrijdplanning
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Ken optioneel een datum en tijd toe per wedstrijd.
      </p>
      <div className="space-y-2">
        {matches.map(m => (
          <div key={m.id} className="px-4 py-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm font-medium mb-2 truncate" style={{ color: 'var(--text-primary)' }}>{m.aName} vs {m.bName}</p>
            <input
              type="datetime-local"
              value={vals[m.id] ?? ''}
              onChange={e => setVals(v => ({ ...v, [m.id]: e.target.value }))}
              onBlur={() => save(m.id)}
              disabled={pending}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--color-gold-500)]"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
