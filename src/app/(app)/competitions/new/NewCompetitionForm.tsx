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
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleFriend = (id: string) =>
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const handleCreate = async () => {
    if (!name.trim() || selectedFriends.length === 0) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()

    const { data: competition, error: cErr } = await supabase
      .from('competitions')
      .insert({
        name: name.trim(),
        format: 'winsonly',
        status: 'active',
        created_by: currentUserId,
        ends_at: null,
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
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Naam *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="bijv. Eeuwig duel"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Speel tegen *
        </label>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Kies één of meer vrienden. Jullie kunnen op elk moment een nieuwe wedstrijd starten en het houdt bij wie de meeste partijen wint.
        </p>
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
        disabled={!name.trim() || selectedFriends.length === 0 || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading ? 'Aanmaken…' : 'Duel starten'}
      </button>
    </div>
  )
}
