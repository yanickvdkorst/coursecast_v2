'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface PMatch {
  id: string
  round: number
  status: string
  result_summary: string | null
  winner_id: string | null
  player_a_id: string
  player_b_id: string
  a_name: string
  b_name: string
}
interface PublicTournamentData {
  tournament: { id: string; name: string; format: string; status: string }
  matches: PMatch[]
}

export function PublicTournament({ tournamentId }: { tournamentId: string }) {
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<PublicTournamentData | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading')

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data: res, error } = await supabase.rpc('get_public_tournament', { p_tournament_id: tournamentId })
      if (!alive) return
      if (error || !res) { setState(prev => (prev === 'loading' ? 'notfound' : prev)); return }
      setData(res as unknown as PublicTournamentData)
      setState('ok')
    }
    load()
    const poll = setInterval(load, 5000)
    return () => { alive = false; clearInterval(poll) }
  }, [tournamentId, supabase])

  if (state === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Laden…</p>
      </div>
    )
  }
  if (state === 'notfound' || !data) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--bg-primary)' }}>
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Toernooi niet gevonden</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Deze link is ongeldig.</p>
      </div>
    )
  }

  const t = data.tournament
  const isLive = t.status === 'active'
  const rounds = data.matches.reduce<Record<number, PMatch[]>>((acc, m) => {
    (acc[m.round] ??= []).push(m)
    return acc
  }, {})
  const showRounds = t.format !== 'round_robin'

  const statusLabel = (m: PMatch) =>
    m.status === 'complete' || m.status === 'conceded'
      ? (m.result_summary ? String(m.result_summary) : 'Gespeeld')
      : m.status === 'active' ? 'Bezig' : 'Gepland'
  const statusColor = (m: PMatch) =>
    m.status === 'complete' || m.status === 'conceded' ? 'var(--accent)'
      : m.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)'

  const MatchRow = (m: PMatch) => {
    const aWon = m.winner_id === m.player_a_id
    const bWon = m.winner_id === m.player_b_id
    return (
      <Link
        key={m.id}
        href={`/t/${tournamentId}/m/${m.id}`}
        className="flex items-center justify-between p-4 rounded-2xl border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: aWon ? 'var(--accent)' : 'var(--text-primary)', fontWeight: aWon ? 700 : 500 }}>{m.a_name}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}> vs </span>
            <span style={{ color: bWon ? 'var(--accent)' : 'var(--text-primary)', fontWeight: bWon ? 700 : 500 }}>{m.b_name}</span>
          </p>
          <p className="text-xs mt-0.5" style={{ color: statusColor(m) }}>{statusLabel(m)}</p>
        </div>
        <span style={{ color: 'var(--text-muted)' }}>→</span>
      </Link>
    )
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-10 px-4 pt-5 pb-4 text-center" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--status-success)' }}>
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
            Live
          </span>
        )}
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.name}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {t.format === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'}
        </p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-16">
        {data.matches.length === 0 ? (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
            Nog geen wedstrijden — het toernooi is nog niet gestart.
          </p>
        ) : showRounds ? (
          <div className="space-y-6">
            {Object.entries(rounds).sort(([a], [b]) => Number(a) - Number(b)).map(([round, ms]) => (
              <div key={round}>
                <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>Ronde {round}</p>
                <div className="space-y-2">{ms.map(MatchRow)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">{data.matches.map(MatchRow)}</div>
        )}
      </div>
    </div>
  )
}
