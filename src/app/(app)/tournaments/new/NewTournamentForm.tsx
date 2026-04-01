'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile, Course } from '@/types/match'

interface Props {
  friends: Profile[]
  courses: Course[]
  currentUserId: string
}

export function NewTournamentForm({ friends, courses, currentUserId }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'bracket' | 'round_robin'>('round_robin')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseId, setCourseId] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFriend = (id: string) =>
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const handleCreate = async () => {
    if (!name.trim() || !startDate || !endDate) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()

    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format,
        status: 'draft',
        course_id: courseId || null,
        created_by: currentUserId,
        starts_at: new Date(startDate).toISOString(),
        ends_at: new Date(endDate).toISOString(),
      })
      .select('id')
      .single()

    if (tErr || !tournament) {
      setError(tErr?.message ?? 'Fout bij aanmaken')
      setLoading(false)
      return
    }

    // Add creator + selected friends as players
    const playerIds = [currentUserId, ...selectedFriends]
    await supabase.from('tournament_players').insert(
      playerIds.map((pid, i) => ({
        tournament_id: tournament.id,
        player_id: pid,
        seed: i + 1,
      }))
    )

    router.push(`/tournaments/${tournament.id}`)
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--color-gold-500)]'
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Naam *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="Zomerkampioenschap 2025"
        />
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Formaat
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['round_robin', 'bracket'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className="py-3 rounded-xl border text-sm font-semibold transition-colors"
              style={
                format === f
                  ? { background: 'var(--color-gold-500)', color: '#040d1a', borderColor: 'transparent' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
              }
            >
              {f === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Startdatum *
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Einddatum *
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Course */}
      {courses.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Baan <span className="font-normal">(optioneel)</span>
          </label>
          <div className="space-y-2">
            {courses.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCourseId(courseId === c.id ? '' : c.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left"
                style={
                  courseId === c.id
                    ? { background: 'var(--color-navy-700)', borderColor: 'var(--color-gold-500)' }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }
                }
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                {courseId === c.id && <span style={{ color: 'var(--color-gold-500)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Friends */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Spelers uitnodigen
        </label>
        {friends.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            Geen vrienden gevonden. Voeg eerst vrienden toe via je profiel.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => {
              const selected = selectedFriends.includes(friend.id)
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleFriend(friend.id)}
                  className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left')}
                  style={
                    selected
                      ? { background: 'var(--color-navy-700)', borderColor: 'var(--color-gold-500)' }
                      : { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }
                  }
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                  >
                    {(friend.full_name || friend.username)[0].toUpperCase()}
                  </div>
                  <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                    {friend.full_name || friend.username}
                  </p>
                  {selected && <span style={{ color: 'var(--color-gold-500)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleCreate}
        disabled={!name.trim() || !startDate || !endDate || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading ? 'Aanmaken…' : `Toernooi aanmaken${selectedFriends.length > 0 ? ` met ${selectedFriends.length + 1} spelers` : ''}`}
      </button>
    </div>
  )
}
