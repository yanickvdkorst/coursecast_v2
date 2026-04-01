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

  const isPlayerA = currentUserId === match.player_a_id
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
                const updated = [...prev]
                updated[existing] = newRow
                return updated
              }
              return [...prev, newRow]
            })
          }
          if (payload.eventType === 'DELETE') {
            setHoleResults(prev => prev.filter(hr => hr.id !== (payload.old as HoleResult).id))
          }
        }
      )
      .subscribe((status) => {
        setOnline(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [match.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Offline queue flush ──────────────────────────────────────
  useEffect(() => {
    if (!online || offlineQueue.current.length === 0) return
    const queue = [...offlineQueue.current]
    offlineQueue.current = []
    queue.forEach(({ holeNumber, result }) => scoreHole(holeNumber, result))
  }, [online]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Score a hole ─────────────────────────────────────────────
  const scoreHole = useCallback(async (holeNumber: number, result: ScoringResult) => {
    if (!online) {
      // Queue for later, apply optimistically
      offlineQueue.current.push({ holeNumber, result })
    }

    // Optimistic update
    const tempId = `temp-${holeNumber}`
    setHoleResults(prev => {
      const existing = prev.findIndex(hr => hr.hole_number === holeNumber)
      const newRow: HoleResult = {
        id: tempId,
        match_id: match.id,
        hole_number: holeNumber,
        result,
        recorded_by: currentUserId,
        recorded_at: new Date().toISOString(),
      }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newRow
        return updated
      }
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
      .select()
      .single()

    setSavingHole(null)

    if (error) {
      // Rollback
      setHoleResults(initialHoleResults)
      console.error('Failed to save hole result', error)
      return
    }

    // Replace temp with real row
    if (data) {
      setHoleResults(prev =>
        prev.map(hr => hr.id === tempId ? data as HoleResult : hr)
      )
    }
  }, [online, match.id, currentUserId, supabase, initialHoleResults])

  const clearHole = useCallback(async (holeNumber: number) => {
    setHoleResults(prev => prev.filter(hr => hr.hole_number !== holeNumber))
    await supabase
      .from('hole_results')
      .delete()
      .eq('match_id', match.id)
      .eq('hole_number', holeNumber)
  }, [match.id, supabase])

  const leaderName = matchStatus.leaderId === match.player_a_id
    ? (playerA.full_name || playerA.username)
    : matchStatus.leaderId === match.player_b_id
    ? (playerB.full_name || playerB.username)
    : null

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Header ── */}
      <header
        className="sticky top-0 z-10 px-4 py-3 border-b"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href="/matches" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
            ←
          </Link>

          {/* Players */}
          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            <span>{playerA.full_name || playerA.username}</span>
            <span style={{ color: 'var(--text-muted)' }}>vs</span>
            <span>{playerB.full_name || playerB.username}</span>
          </div>

          {/* Online indicator */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: online ? 'var(--color-gold-500)' : '#ef4444' }}
            title={online ? 'Connected' : 'Offline'}
          />
        </div>

        {/* Match status */}
        <div className="text-center mt-2">
          {matchStatus.isComplete ? (
            <p className="text-base font-bold" style={{ color: 'var(--color-gold-500)' }}>
              {matchStatus.resultSummary === 'AS'
                ? 'All Square — Match Halved'
                : `${leaderName} wins ${matchStatus.resultSummary}`}
            </p>
          ) : matchStatus.holesPlayed === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {course?.name ?? '18 holes'} · Tap to score each hole
            </p>
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--color-gold-500)' }}>
              {matchStatus.leaderId === null
                ? `All Square · ${matchStatus.holesRemaining} to play`
                : `${leaderName} ${matchStatus.resultSummary} · ${matchStatus.holesRemaining} to play`}
            </p>
          )}
        </div>
      </header>

      {/* ── Hole list ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map(holeNumber => {
            const hr = getHoleResult(holeResults, holeNumber)
            const isSaving = savingHole === holeNumber
            const par = course?.par?.[holeNumber - 1] ?? null

            return (
              <HoleRow
                key={holeNumber}
                holeNumber={holeNumber}
                par={par}
                holeResult={hr}
                isSaving={isSaving}
                isPlayerA={isPlayerA}
                playerAName={playerA.full_name || playerA.username}
                playerBName={playerB.full_name || playerB.username}
                isMatchComplete={matchStatus.isComplete}
                onScore={(result) => scoreHole(holeNumber, result)}
                onClear={() => clearHole(holeNumber)}
              />
            )
          })}
        </div>
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
  isPlayerA: boolean
  playerAName: string
  playerBName: string
  isMatchComplete: boolean
  onScore: (result: ScoringResult) => void
  onClear: () => void
}

function HoleRow({
  holeNumber,
  par,
  holeResult,
  isSaving,
  isPlayerA,
  playerAName,
  playerBName,
  isMatchComplete,
  onScore,
  onClear,
}: HoleRowProps) {
  const myResult: ScoringResult | null = holeResult
    ? isPlayerA
      ? holeResult.result === 'player_a' ? 'player_a'
        : holeResult.result === 'player_b' ? 'player_b'
        : 'halved'
      : holeResult.result === 'player_b' ? 'player_a'  // flip for player B POV
        : holeResult.result === 'player_a' ? 'player_b'
        : 'halved'
    : null

  const winResult: ScoringResult = isPlayerA ? 'player_a' : 'player_b'
  const loseResult: ScoringResult = isPlayerA ? 'player_b' : 'player_a'

  const buttons: Array<{ label: string; result: ScoringResult; active: boolean }> = [
    { label: 'WIN', result: winResult, active: myResult === 'player_a' },
    { label: 'HALF', result: 'halved', active: myResult === 'halved' },
    { label: 'LOSE', result: loseResult, active: myResult === 'player_b' },
  ]

  return (
    <div
      className={cn(
        'flex items-center px-4 py-3 gap-3',
        holeResult ? '' : ''
      )}
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Hole number + par */}
      <div className="w-10 shrink-0 text-center">
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {holeNumber}
        </p>
        {par && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            par {par}
          </p>
        )}
      </div>

      {/* Score buttons */}
      <div className="flex gap-2 flex-1">
        {buttons.map(btn => (
          <button
            key={btn.label}
            onClick={() => {
              if (btn.active) {
                onClear()
              } else {
                onScore(btn.result)
              }
            }}
            disabled={isMatchComplete || isSaving}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm font-bold tracking-wide transition-all active:scale-95',
              'disabled:opacity-50'
            )}
            style={
              btn.active
                ? {
                    background:
                      btn.label === 'WIN'
                        ? 'var(--color-gold-500)'
                        : btn.label === 'LOSE'
                        ? '#ef4444'
                        : 'var(--color-navy-500)',
                    color: btn.label === 'HALF' ? '#fff' : '#040d1a',
                  }
                : {
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                  }
            }
          >
            {isSaving && btn.active ? '…' : btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
