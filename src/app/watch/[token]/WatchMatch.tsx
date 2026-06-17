'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { computeMatchStatus, getHoleResult } from '@/lib/matchplay/scoring'
import type { HoleResult } from '@/types/match'

interface SharedMatch {
  match: {
    id: string
    status: string
    result_summary: string | null
    winner_id: string | null
    player_a_id: string
    player_b_id: string
  }
  player_a_name: string
  player_b_name: string
  course_name: string | null
  total_holes: number
  course_par: number[] | null
  hole_results: { hole_number: number; result: string }[]
}

export function WatchMatch({ token, matchId, backHref }: { token?: string; matchId?: string; backHref?: string }) {
  const supabase = getSupabaseBrowserClient()
  const [data, setData] = useState<SharedMatch | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading')

  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data: res, error } = matchId
        ? await supabase.rpc('get_public_tournament_match', { p_match_id: matchId })
        : await supabase.rpc('get_shared_match', { p_token: token! })
      if (!alive) return
      if (error || !res) {
        // Keep showing existing data on a transient poll error; only flip to
        // "not found" on the very first load.
        setState(prev => (prev === 'loading' ? 'notfound' : prev))
        return
      }
      setData(res as unknown as SharedMatch)
      setState('ok')
    }
    load()
    // Poll for live updates — golf scoring changes only every few minutes.
    const poll = setInterval(load, 4000)
    return () => { alive = false; clearInterval(poll) }
  }, [token, matchId, supabase])

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
        <h1 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Wedstrijd niet gevonden</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Deze kijklink is ongeldig of het delen is gestopt.
        </p>
      </div>
    )
  }

  const m = data.match
  const holeResults = data.hole_results.map(h => ({ hole_number: h.hole_number, result: h.result })) as HoleResult[]
  const matchStatus = computeMatchStatus(holeResults, m.player_a_id, m.player_b_id, data.total_holes)

  const nameA = data.player_a_name
  const nameB = data.player_b_name
  const isAllSquare = matchStatus.leaderId === null
  const leaderIsA = matchStatus.leaderId === m.player_a_id
  const leaderName = isAllSquare ? null : (leaderIsA ? nameA : nameB).split(' ')[0]
  const leaderColor = isAllSquare ? 'var(--text-primary)' : (leaderIsA ? 'var(--player-a-text)' : 'var(--player-b-text)')

  const cleanSummary = matchStatus.resultSummary.replace(/\s*\(Dormie\)\s*$/i, '').trim()
  const isBigNumber = /^\d/.test(cleanSummary)
  const hasStarted = matchStatus.holesPlayed > 0
  const bigText = !hasStarted ? '–' : isAllSquare ? 'GELIJK' : (isBigNumber ? cleanSummary : cleanSummary.toUpperCase())

  const caption = !hasStarted
    ? 'Nog niet begonnen'
    : m.status === 'complete' || m.status === 'conceded'
    ? (isAllSquare ? 'Eindstand' : `${leaderName} wint`)
    : (isAllSquare ? 'Tussenstand' : `${leaderName} staat voor`)

  const isLive = m.status === 'active' || m.status === 'pending'

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="max-w-lg mx-auto">
          {backHref && (
            <a href={backHref} className="inline-flex items-center gap-1 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Terug naar overzicht
            </a>
          )}
          <div className="flex items-center justify-center gap-2 mb-2">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--status-success)' }}>
                <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success)' }} />
                Live
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--player-a-text)' }}>{nameA}</span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>vs</span>
            <span style={{ color: 'var(--player-b-text)' }}>{nameB}</span>
          </div>
          {data.course_name && (
            <p className="text-[11px] text-center mt-0.5" style={{ color: 'var(--text-muted)' }}>{data.course_name}</p>
          )}

          {/* Status board */}
          <div className="px-4 py-5 rounded-2xl text-center mt-3" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>{caption}</p>
            <p className="font-black leading-none tabular-nums" style={{ color: leaderColor, fontSize: bigText.length > 5 ? '3rem' : '4.5rem', letterSpacing: '-0.03em' }}>
              {bigText}
            </p>
            {isLive && hasStarted && (
              <p className="text-sm mt-2.5" style={{ color: 'var(--text-muted)' }}>
                Nog {matchStatus.holesRemaining} {matchStatus.holesRemaining === 1 ? 'hole' : 'holes'} te gaan
                {matchStatus.isDormie ? ' · Dormie' : ''}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Hole list (read-only) */}
      <div className="max-w-lg mx-auto w-full pb-16">
        {Array.from({ length: data.total_holes }, (_, i) => i + 1).map(holeNumber => {
          const hr = getHoleResult(holeResults, holeNumber)
          const result = hr?.result ?? null
          const par = data.course_par?.[holeNumber - 1] ?? null
          const cells: { label: string; key: string; color: string }[] = [
            { label: nameA.split(' ')[0], key: 'player_a', color: 'var(--player-a)' },
            { label: 'Gelijk', key: 'halved', color: 'var(--btn-neutral)' },
            { label: nameB.split(' ')[0], key: 'player_b', color: 'var(--player-b)' },
          ]
          return (
            <div key={holeNumber} className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: '1px solid var(--border-color)', background: result ? 'var(--bg-secondary)' : 'var(--bg-primary)' }}>
              <div className="w-8 shrink-0 text-center">
                <p className="text-base font-bold tabular-nums" style={{ color: result ? 'var(--color-gold-500)' : 'var(--text-muted)' }}>{holeNumber}</p>
                {par && <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>{par}</p>}
              </div>
              <div className="flex gap-1.5 flex-1">
                {cells.map(c => {
                  const active = result === c.key
                  return (
                    <div
                      key={c.key}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center"
                      style={active
                        ? { background: c.color, color: c.key === 'halved' ? 'var(--on-btn-neutral)' : 'var(--on-btn)' }
                        : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
                    >
                      {c.label}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
