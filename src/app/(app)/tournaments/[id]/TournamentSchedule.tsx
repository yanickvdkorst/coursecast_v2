'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMatchSchedule, setSlotSchedule } from './actions'

// A schedulable item: either an existing match (round-robin), or a bracket
// slot addressed by round + pos (which may not have a match row yet).
export interface ScheduleItem {
  key: string
  label: string
  group?: string
  scheduledAt: string | null
  matchId?: string
  round?: number
  pos?: number
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TournamentSchedule({ tournamentId, items }: { tournamentId: string; items: ScheduleItem[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(items.map(m => [m.key, toLocalInput(m.scheduledAt)]))
  )

  if (items.length === 0) return null

  const save = (item: ScheduleItem) => {
    const val = vals[item.key] || null
    start(async () => {
      if (item.matchId) await setMatchSchedule(item.matchId, val)
      else await setSlotSchedule(tournamentId, item.round!, item.pos!, val)
      router.refresh()
    })
  }

  // Group headers (bracket rounds); round-robin passes no group.
  let lastGroup: string | undefined

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
        Wedstrijdplanning
      </h2>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        Ken optioneel een datum en tijd toe per wedstrijd — ook voor rondes die nog gespeeld moeten worden.
      </p>
      <div className="space-y-2">
        {items.map(m => {
          const showGroup = m.group && m.group !== lastGroup
          lastGroup = m.group
          return (
            <div key={m.key}>
              {showGroup && (
                <p className="text-xs font-semibold uppercase tracking-wide mt-4 mb-1" style={{ color: 'var(--text-muted)' }}>
                  {m.group}
                </p>
              )}
              <div className="px-4 py-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-medium mb-2 truncate" style={{ color: 'var(--text-primary)' }}>{m.label}</p>
                <input
                  type="datetime-local"
                  value={vals[m.key] ?? ''}
                  onChange={e => setVals(v => ({ ...v, [m.key]: e.target.value }))}
                  onBlur={() => save(m)}
                  disabled={pending}
                  className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-[var(--color-gold-500)]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
