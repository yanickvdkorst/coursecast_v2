'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/match'

interface Request {
  friendshipId: string
  profile: Profile
}

export function FriendRequests({ requests }: { requests: Request[] }) {
  const router = useRouter()
  const [acting, setActing] = useState<string | null>(null)

  const respond = async (friendshipId: string, accept: boolean) => {
    setActing(friendshipId)
    const supabase = getSupabaseBrowserClient()

    if (accept) {
      await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)
    } else {
      await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)
    }

    setActing(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {requests.map(req => (
        <div
          key={req.friendshipId}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--color-gold-500)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
          >
            {(req.profile?.full_name || req.profile?.username || '?')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {req.profile?.full_name || req.profile?.username}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              wil je vriend worden
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => respond(req.friendshipId, true)}
              disabled={acting === req.friendshipId}
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
            >
              {acting === req.friendshipId ? '…' : 'Accepteer'}
            </button>
            <button
              onClick={() => respond(req.friendshipId, false)}
              disabled={acting === req.friendshipId}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              Weiger
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
