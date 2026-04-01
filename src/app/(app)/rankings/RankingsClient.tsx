'use client'

import { useState } from 'react'

export interface PlayerStat {
  id: string
  name: string
  wins: number
  draws: number
  losses: number
  played: number
  isFriend: boolean
  isMe: boolean
}

export function RankingsClient({ players }: { players: PlayerStat[] }) {
  const [filter, setFilter] = useState<'all' | 'friends'>('all')

  const visible = (filter === 'friends' ? players.filter(p => p.isFriend || p.isMe) : players)
    .filter(p => p.played > 0)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.played - a.played)
    .slice(0, 10)

  return (
    <div>
      {/* Filter toggle */}
      <div className="flex gap-2 mb-6">
        {(['all', 'friends'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={
              filter === f
                ? { background: 'var(--color-gold-500)', color: '#040d1a' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
            }
          >
            {f === 'all' ? 'Iedereen' : 'Vrienden'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          {filter === 'friends' ? 'Geen vrienden met statistieken.' : 'Nog geen statistieken.'}
        </p>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
          {/* Header */}
          <div
            className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-2 text-xs font-semibold"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          >
            <span>#</span>
            <span>Speler</span>
            <span className="text-center">Gesp</span>
            <span className="text-center">W</span>
            <span className="text-center">G</span>
            <span className="text-center">V</span>
          </div>

          {visible.map((p, i) => (
            <div
              key={p.id}
              className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-3 border-t items-center"
              style={{
                borderColor: 'var(--border-color)',
                background: p.isMe ? 'var(--color-navy-800)' : 'var(--bg-card)',
              }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: i === 0 ? 'var(--color-gold-500)' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : 'var(--text-muted)' }}
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {p.name}
                {p.isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>(jij)</span>}
              </span>
              <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{p.played}</span>
              <span className="text-center text-sm font-bold" style={{ color: 'var(--color-gold-500)' }}>{p.wins}</span>
              <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{p.draws}</span>
              <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{p.losses}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
        Gebaseerd op competitie-uitkomsten · Top 10
      </p>
    </div>
  )
}
