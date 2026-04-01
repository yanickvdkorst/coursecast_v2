'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { computeMatchStatus, getHoleResult } from '@/lib/matchplay/scoring'
import { cn } from '@/lib/utils'
import type { Match, Profile, Course, HoleResult } from '@/types/match'

interface Props {
  match: Match
  playerA: Profile
  playerB: Profile
  course: Course | null
  initialHoleResults: HoleResult[]
  currentUserId: string
  totalHoles: number
}

type ScoringResult = 'player_a' | 'player_b' | 'halved'

export function MatchScorecard({
  match,
  playerA,
  playerB,
  course,
  initialHoleResults,
  currentUserId,
  totalHoles,
}: Props) {
  const [holeResults, setHoleResults] = useState<HoleResult[]>(initialHoleResults)
  const [savingHole, setSavingHole] = useState<number | null>(null)
  const [online, setOnline] = useState(true)
  const offlineQueue = useRef<Array<{ holeNumber: number; result: ScoringResult }>>([])
  const supabase = getSupabaseBrowserClient()

  const matchStatus = computeMatchStatus(holeResults, match.player_a_id, match.player_b_id, totalHoles)

  // ── Realtime subscription ────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`match:${match.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hole_results', filter: `match_id=eq.${match.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newRow = payload.new as HoleResult
            setHoleResults(prev => {
              const existing = prev.findIndex(hr => hr.hole_number === newRow.hole_number)
              if (existing >= 0) {
                const updated = [...prev]; updated[existing] = newRow; return updated
              }
              return [...prev, newRow]
            })
          }
          if (payload.eventType === 'DELETE') {
            setHoleResults(prev => prev.filter(hr => hr.id !== (payload.old as HoleResult).id))
          }
        }
      )
      .subscribe((status) => setOnline(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [match.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!online || offlineQueue.current.length === 0) return
    const queue = [...offlineQueue.current]
    offlineQueue.current = []
    queue.forEach(({ holeNumber, result }) => scoreHole(holeNumber, result))
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  const scoreHole = useCallback(async (holeNumber: number, result: ScoringResult) => {
    if (!online) offlineQueue.current.push({ holeNumber, result })

    const tempId = `temp-${holeNumber}`
    setHoleResults(prev => {
      const existing = prev.findIndex(hr => hr.hole_number === holeNumber)
      const newRow: HoleResult = {
        id: tempId, match_id: match.id, hole_number: holeNumber, result,
        recorded_by: currentUserId, recorded_at: new Date().toISOString(),
      }
      if (existing >= 0) { const u = [...prev]; u[existing] = newRow; return u }
      return [...prev, newRow]
    })

    if (!online) return

    setSavingHole(holeNumber)
    const { error, data } = await supabase
      .from('hole_results')
      .upsert(
        { match_id: match.id, hole_number: holeNumber, result, recorded_by: currentUserId },
        { onConflict: 'match_id,hole_number' }
      )
      .select().single()
    setSavingHole(null)

    if (error) { setHoleResults(initialHoleResults); return }
    if (data) setHoleResults(prev => prev.map(hr => hr.id === tempId ? data as HoleResult : hr))
  }, [online, match.id, currentUserId, supabase, initialHoleResults])

  const clearHole = useCallback(async (holeNumber: number) => {
    setHoleResults(prev => prev.filter(hr => hr.hole_number !== holeNumber))
    await supabase.from('hole_results').delete().eq('match_id', match.id).eq('hole_number', holeNumber)
  }, [match.id, supabase])

  const leaderName = matchStatus.leaderId === match.player_a_id
    ? (playerA.full_name || playerA.username).split(' ')[0]
    : matchStatus.leaderId === match.player_b_id
    ? (playerB.full_name || playerB.username).split(' ')[0]
    : null

  const nameA = (playerA.full_name || playerA.username).split(' ')[0]
  const nameB = (playerB.full_name || playerB.username).split(' ')[0]

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 px-4 pt-3 pb-3"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto mb-2.5">
          <Link href="/matches" style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>

          <div className="text-center">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              <span>{nameA}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}>vs</span>
              <span>{nameB}</span>
            </div>
            {course && (
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{course.name}</p>
            )}
          </div>

          <div
            className="w-2 h-2 rounded-full"
            style={{ background: online ? '#4ade80' : '#ef4444' }}
            title={online ? 'Verbonden' : 'Offline'}
          />
        </div>

        {/* Status pill */}
        <div className="max-w-lg mx-auto">
          <div
            className="px-4 py-2 rounded-xl text-center"
            style={{ background: matchStatus.isComplete ? 'rgba(201,162,39,0.12)' : 'var(--bg-elevated)' }}
          >
            {matchStatus.isComplete ? (
              <p className="text-sm font-bold" style={{ color: 'var(--color-gold-500)' }}>
                {matchStatus.resultSummary === 'AS'
                  ? 'Gelijk gespeeld'
                  : `${leaderName} wint · ${matchStatus.resultSummary}`}
              </p>
            ) : matchStatus.holesPlayed === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Tik op een hole om te scoren
              </p>
            ) : (
              <p className="text-sm font-semibold" style={{ color: 'var(--color-gold-500)' }}>
                {matchStatus.leaderId === null
                  ? `Gelijk · nog ${matchStatus.holesRemaining} te gaan`
                  : `${leaderName} staat ${matchStatus.resultSummary} · nog ${matchStatus.holesRemaining}`}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── Hole list ── */}
      <div className="flex-1 overflow-y-auto pb-32 max-w-lg mx-auto w-full">
        {Array.from({ length: totalHoles }, (_, i) => i + 1).map(holeNumber => (
          <HoleRow
            key={holeNumber}
            holeNumber={holeNumber}
            par={course?.par?.[holeNumber - 1] ?? null}
            holeResult={getHoleResult(holeResults, holeNumber)}
            isSaving={savingHole === holeNumber}
            playerAName={nameA}
            playerBName={nameB}
            isMatchComplete={matchStatus.isComplete}
            onScore={(result) => scoreHole(holeNumber, result)}
            onClear={() => clearHole(holeNumber)}
          />
        ))}
      </div>
    </div>
  )
}

// ── HoleRow ──────────────────────────────────────────────────

interface HoleRowProps {
  holeNumber: number
  par: number | null
  holeResult: HoleResult | undefined
  isSaving: boolean
  playerAName: string
  playerBName: string
  isMatchComplete: boolean
  onScore: (result: ScoringResult) => void
  onClear: () => void
}

function HoleRow({
  holeNumber, par, holeResult, isSaving,
  playerAName, playerBName, isMatchComplete, onScore, onClear,
}: HoleRowProps) {
  const current = holeResult?.result ?? null
  const scored = current !== null

  const buttons: Array<{ label: string; result: ScoringResult; activeBg: string; activeColor: string }> = [
    { label: playerAName, result: 'player_a', activeBg: 'var(--color-gold-500)', activeColor: '#07101e' },
    { label: 'Gelijk',    result: 'halved',   activeBg: 'var(--bg-elevated)',     activeColor: 'var(--text-primary)' },
    { label: playerBName, result: 'player_b', activeBg: '#2563eb',                activeColor: '#ffffff' },
  ]

  return (
    <div
      className="flex items-center px-4 py-3 gap-3"
      style={{
        borderBottom: '1px solid var(--border-color)',
        background: scored ? 'var(--bg-secondary)' : 'var(--bg-primary)',
        transition: 'background 0.15s ease',
      }}
    >
      {/* Hole number */}
      <div className="w-8 shrink-0 text-center">
        <p
          className="text-base font-bold"
          style={{ color: scored ? 'var(--color-gold-500)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
        >
          {holeNumber}
        </p>
        {par && (
          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {par}
          </p>
        )}
      </div>

      {/* Score buttons */}
      <div className="flex gap-1.5 flex-1">
        {buttons.map(btn => {
          const active = current === btn.result
          return (
            <button
              key={btn.result}
              onClick={() => active ? onClear() : onScore(btn.result)}
              disabled={isMatchComplete || isSaving}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40',
              )}
              style={
                active
                  ? { background: btn.activeBg, color: btn.activeColor }
                  : {
                      background: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                    }
              }
            >
              {isSaving && active ? '…' : btn.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
