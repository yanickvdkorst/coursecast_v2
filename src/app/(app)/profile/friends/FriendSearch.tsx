'use client'

import { useState, useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types/match'

interface Props {
  currentUserId: string
  existingFriendIds: string[]
}

export function FriendSearch({ currentUserId, existingFriendIds }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (query.trim().length < 2) { setResults([]); return }

    debounce.current = setTimeout(async () => {
      setLoading(true)
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', currentUserId)
        .limit(8)
      setResults((data ?? []) as Profile[])
      setLoading(false)
    }, 300)
  }, [query, currentUserId])

  const sendRequest = async (addresseeId: string) => {
    setSending(addresseeId)
    const supabase = getSupabaseBrowserClient()
    await supabase.from('friendships').insert({
      requester_id: currentUserId,
      addressee_id: addresseeId,
    })
    setSending(null)
    router.refresh()
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Zoek op gebruikersnaam…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border text-base outline-none mb-2 transition-colors focus:border-[var(--color-gold-500)]"
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-color)',
        }}
      />

      {loading && (
        <p className="text-sm text-center py-2" style={{ color: 'var(--text-muted)' }}>Zoeken…</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(player => {
            const alreadyAdded = existingFriendIds.includes(player.id)
            return (
              <div
                key={player.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                >
                  {(player.full_name || player.username)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                    {player.full_name || player.username}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{player.username}</p>
                </div>
                <button
                  onClick={() => sendRequest(player.id)}
                  disabled={alreadyAdded || sending === player.id}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
                  style={{
                    background: alreadyAdded ? 'var(--bg-secondary)' : 'var(--color-gold-500)',
                    color: alreadyAdded ? 'var(--text-muted)' : '#040d1a',
                  }}
                >
                  {alreadyAdded ? 'Toegevoegd' : sending === player.id ? '…' : 'Toevoegen'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
