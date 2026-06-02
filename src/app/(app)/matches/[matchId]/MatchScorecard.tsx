'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { BackButton } from '@/components/ui/BackButton'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { computeMatchStatus, getHoleResult } from '@/lib/matchplay/scoring'
import { cn } from '@/lib/utils'
import type { Match, Profile, Course, HoleResult, MatchStatus } from '@/types/match'
import { deleteMatch } from './actions'

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
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting'>('idle')
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
              if (existing >= 0) { const u = [...prev]; u[existing] = newRow; return u }
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

  // Ryder Cup color of the leading player, used for the big up-score.
  const leaderColor = matchStatus.leaderId === match.player_a_id
    ? 'var(--player-a-text)'
    : matchStatus.leaderId === match.player_b_id
    ? 'var(--player-b-text)'
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
          <BackButton
            fallback={match.competition_id ? `/competitions/${match.competition_id}` : match.tournament_id ? `/tournaments/${match.tournament_id}` : '/play'}
            style={{ color: 'var(--text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </BackButton>

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

          {/* Delete button */}
          <button
            onClick={() => setDeleteState(s => s === 'confirm' ? 'idle' : 'confirm')}
            style={{ color: deleteState === 'confirm' ? 'var(--status-danger)' : 'var(--text-muted)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Delete confirmation bar */}
        {deleteState === 'confirm' && (
          <div
            className="max-w-lg mx-auto flex items-center justify-between px-4 py-2.5 rounded-xl mb-2"
            style={{ background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--status-danger)' }}>Wedstrijd verwijderen?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteState('idle')}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Annuleer
              </button>
              <form action={deleteMatch.bind(null, match.id)}>
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: 'var(--btn-danger)', color: 'var(--on-btn)' }}
                >
                  Verwijder
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Status board — big tussenstand */}
        <div className="max-w-lg mx-auto">
          <StatusBoard
            matchStatus={matchStatus}
            leaderName={leaderName}
            leaderColor={leaderColor}
            holesRemaining={matchStatus.holesRemaining}
          />
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
  onScore: (result: ScoringResult) => void
  onClear: () => void
}

function HoleRow({
  holeNumber, par, holeResult, isSaving,
  playerAName, playerBName, onScore, onClear,
}: HoleRowProps) {
  const current = holeResult?.result ?? null
  const scored = current !== null

  const buttons: Array<{ label: string; result: ScoringResult; activeBg: string; activeColor: string }> = [
    { label: playerAName, result: 'player_a', activeBg: 'var(--player-a)', activeColor: 'var(--on-btn)' },
    { label: 'Gelijk',    result: 'halved',   activeBg: 'var(--btn-neutral)', activeColor: 'var(--on-btn-neutral)' },
    { label: playerBName, result: 'player_b', activeBg: 'var(--player-b)', activeColor: 'var(--on-btn)' },
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
      <div className="w-8 shrink-0 text-center">
        <p
          className="text-base font-bold"
          style={{ color: scored ? 'var(--color-gold-500)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
        >
          {holeNumber}
        </p>
        {par && (
          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'var(--text-muted)' }}>{par}</p>
        )}
      </div>

      <div className="flex gap-1.5 flex-1">
        {buttons.map(btn => {
          const active = current === btn.result
          return (
            <button
              key={btn.result}
              onClick={() => active ? onClear() : onScore(btn.result)}
              disabled={isSaving}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-[0.97] disabled:opacity-40',
              )}
              style={
                active
                  ? { background: btn.activeBg, color: btn.activeColor }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }
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

// ── StatusBoard ──────────────────────────────────────────────

interface StatusBoardProps {
  matchStatus: MatchStatus
  leaderName: string | null
  leaderColor: string | null
  holesRemaining: number
}

function StatusBoard({ matchStatus, leaderName, leaderColor, holesRemaining }: StatusBoardProps) {
  // Empty state — no holes scored yet
  if (!matchStatus.isComplete && matchStatus.holesPlayed === 0) {
    return (
      <div className="px-4 py-4 rounded-2xl text-center" style={{ background: 'var(--bg-elevated)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tik op een hole om te scoren
        </p>
      </div>
    )
  }

  const isAllSquare = matchStatus.leaderId === null
  const isDormie = !matchStatus.isComplete && matchStatus.isDormie
  // Strip "(Dormie)" suffix so we can render the modifier separately.
  const cleanSummary = matchStatus.resultSummary.replace(/\s*\(Dormie\)\s*$/i, '').trim()

  // Big-number variant: NUP, N&M, 1UP — anything matching digits at start.
  const isBigNumber = /^\d/.test(cleanSummary)
  const bigText = isAllSquare ? 'GELIJK' : (isBigNumber ? cleanSummary : cleanSummary.toUpperCase())
  const bigColor = isAllSquare ? 'var(--text-primary)' : (leaderColor ?? 'var(--accent)')

  // Caption above the big number
  const caption = matchStatus.isComplete
    ? (isAllSquare ? 'Eindstand' : `${leaderName} wint`)
    : (isAllSquare ? 'Tussenstand' : `${leaderName} staat voor`)

  // Subtext below
  const subtext = matchStatus.isComplete
    ? 'Tik op een hole om te corrigeren'
    : `Nog ${holesRemaining} ${holesRemaining === 1 ? 'hole' : 'holes'} te gaan${isDormie ? ' · Dormie' : ''}`

  return (
    <div
      className="px-4 py-5 rounded-2xl text-center"
      style={{
        background: 'var(--bg-elevated)',
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {caption}
      </p>
      <p
        className="font-black leading-none tabular-nums"
        style={{
          color: bigColor,
          fontSize: bigText.length > 5 ? '3rem' : '4.5rem',
          letterSpacing: '-0.03em',
        }}
      >
        {bigText}
      </p>
      <p className="text-sm mt-2.5" style={{ color: 'var(--text-muted)' }}>
        {subtext}
      </p>
    </div>
  )
}
