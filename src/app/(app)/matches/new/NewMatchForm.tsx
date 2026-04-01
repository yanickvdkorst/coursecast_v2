'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, Course } from '@/types/match'

interface Props {
  players: Profile[]
  courses: Course[]
  currentUserId: string
}

export function NewMatchForm({ players, courses, currentUserId }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedOpponent, setSelectedOpponent] = useState<Profile | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = players.filter(p => {
    const q = search.toLowerCase()
    return (
      p.username.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q)
    )
  })

  const handleCreate = async () => {
    if (!selectedOpponent) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from('matches')
      .insert({
        player_a_id: currentUserId,
        player_b_id: selectedOpponent.id,
        course_id: selectedCourse || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (error || !data) {
      setError(error?.message ?? 'Failed to create match')
      setLoading(false)
      return
    }

    router.push(`/matches/${data.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Opponent search */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Choose opponent
        </h2>

        <input
          type="text"
          placeholder="Search players…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border text-base outline-none mb-3 transition-colors focus:border-[var(--color-gold-500)]"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
        />

        {filtered.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            {players.length === 0 ? 'No other players yet' : 'No players found'}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.map(player => {
              const selected = selectedOpponent?.id === player.id
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => setSelectedOpponent(selected ? null : player)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors'
                  )}
                  style={{
                    background: selected ? 'var(--color-navy-700)' : 'var(--bg-card)',
                    borderColor: selected ? 'var(--color-gold-500)' : 'var(--border-color)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                  >
                    {(player.full_name || player.username)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {player.full_name || player.username}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      @{player.username}
                    </p>
                  </div>
                  {selected && (
                    <span className="ml-auto text-lg" style={{ color: 'var(--color-gold-500)' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Course (optional) */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Course <span className="normal-case font-normal">(optional)</span>
        </h2>

        {courses.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No courses added yet.</p>
        ) : (
          <div className="space-y-2">
            {courses.map(course => {
              const selected = selectedCourse === course.id
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourse(selected ? '' : course.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors"
                  style={{
                    background: selected ? 'var(--color-navy-700)' : 'var(--bg-card)',
                    borderColor: selected ? 'var(--color-gold-500)' : 'var(--border-color)',
                  }}
                >
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {course.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {course.holes} holes
                    </p>
                  </div>
                  {selected && (
                    <span className="text-lg" style={{ color: 'var(--color-gold-500)' }}>✓</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Create button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={!selectedOpponent || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading
          ? 'Creating…'
          : selectedOpponent
          ? `Start match vs ${selectedOpponent.full_name || selectedOpponent.username}`
          : 'Select an opponent'}
      </button>
    </div>
  )
}
