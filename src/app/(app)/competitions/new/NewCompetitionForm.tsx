'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/match'

interface Props {
  friends: Profile[]
  currentUserId: string
}

export function NewCompetitionForm({ friends, currentUserId }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'matchplay_points' | 'winsonly'>('matchplay_points')
  const [endDate, setEndDate] = useState('')
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFriend = (id: string) =>
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()

    const { data: competition, error: cErr } = await supabase
      .from('competitions')
      .insert({
        name: name.trim(),
        format,
        status: 'active',
        created_by: currentUserId,
        ends_at: endDate ? new Date(endDate).toISOString() : null,
      })
      .select('id')
      .single()

    if (cErr || !competition) {
      setError(cErr?.message ?? 'Fout bij aanmaken')
      setLoading(false)
      return
    }

    const playerIds = [currentUserId, ...selectedFriends]
    await supabase.from('competition_players').insert(
      playerIds.map(pid => ({
        competition_id: competition.id,
        player_id: pid,
      }))
    )

    router.push(`/competitions/${competition.id}`)
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--color-gold-500)]'
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Naam *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="Clubkampioenschap 2025"
        />
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Puntensysteem</label>
        <div className="grid grid-cols-2 gap-2">
          {(['matchplay_points', 'winsonly'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className="py-3 rounded-xl border text-sm font-semibold"
              style={
                format === f
                  ? { background: 'var(--color-gold-500)', color: '#040d1a', borderColor: 'transparent' }
                  : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
              }
            >
              {f === 'matchplay_points' ? '2-1-0 punten' : 'Alleen winst'}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {format === 'matchplay_points' ? 'Win = 2 pts · Gelijk = 1 pt · Verlies = 0 pts' : 'Win = 1 pt · Gelijk/Verlies = 0 pts'}
        </p>
      </div>

      {/* End date (optional) */}
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Einddatum <span className="font-normal">(optioneel)</span>
        </label>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Friends */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Spelers uitnodigen</label>
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
        disabled={!name.trim() || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading ? 'Aanmaken…' : `Competitie aanmaken${selectedFriends.length > 0 ? ` met ${selectedFriends.length + 1} spelers` : ''}`}
      </button>
    </div>
  )
}
