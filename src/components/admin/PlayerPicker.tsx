'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

export interface PickerPlayer {
  id: string
  username: string
  full_name: string | null
}

export function playerLabel(p: PickerPlayer) {
  return p.full_name?.trim() || p.username
}

interface Props {
  players: PickerPlayer[]
  selected: string[]
  onChange: (ids: string[]) => void
}

/** Searchable multi-select list of players. */
export function PlayerPicker({ players, selected, onChange }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return players.filter(p =>
      p.username.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q)
    )
  }, [players, search])

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Zoek speler…"
        className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none mb-2 focus:border-[var(--color-gold-500)]"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
      />
      <div className="rounded-xl border max-h-72 overflow-auto" style={{ borderColor: 'var(--border-color)' }}>
        {filtered.length === 0 ? (
          <p className="text-sm px-4 py-3" style={{ color: 'var(--text-muted)' }}>Geen spelers gevonden</p>
        ) : (
          filtered.map((p, i) => {
            const active = selected.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors')}
                style={{
                  background: active ? 'var(--bg-selected)' : 'var(--bg-card)',
                  borderTop: i === 0 ? undefined : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px]"
                  style={{
                    background: active ? 'var(--color-gold-500)' : 'transparent',
                    border: active ? undefined : '1.5px solid var(--border-strong)',
                    color: 'var(--on-accent)',
                  }}
                >
                  {active ? '✓' : ''}
                </span>
                <span className="flex-1 truncate">{playerLabel(p)}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{p.username}</span>
              </button>
            )
          })
        )}
      </div>
      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
        {selected.length} geselecteerd
      </p>
    </div>
  )
}
