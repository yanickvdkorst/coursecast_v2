import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { FriendSearch } from './FriendSearch'
import { FriendRequests } from './FriendRequests'
import type { Profile } from '@/types/match'
import Link from 'next/link'

export default async function FriendsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: friendshipsData } = await supabase
    .from('friendships')
    .select('*')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendships = friendshipsData ?? []

  // Collect all friend IDs to fetch profiles
  const friendIds = friendships
    .filter(f => f.status === 'accepted')
    .map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)

  const pendingIncoming = friendships.filter(
    f => f.status === 'pending' && f.addressee_id === user.id
  )
  const pendingOutgoing = friendships.filter(
    f => f.status === 'pending' && f.requester_id === user.id
  )

  // Fetch friend profiles
  let friends: Profile[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', friendIds)
    friends = (data ?? []) as Profile[]
  }

  // Fetch incoming requester profiles
  const incomingIds = pendingIncoming.map(f => f.requester_id)
  let incomingProfiles: Profile[] = []
  if (incomingIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', incomingIds)
    incomingProfiles = (data ?? []) as Profile[]
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Vrienden
        </h1>
      </div>

      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Verzoeken ({pendingIncoming.length})
          </h2>
          <FriendRequests
            requests={pendingIncoming.map(f => ({
              friendshipId: f.id,
              profile: incomingProfiles.find(p => p.id === f.requester_id)!,
            }))}
          />
        </section>
      )}

      {/* Friend search */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Vriend toevoegen
        </h2>
        <FriendSearch
          currentUserId={user.id}
          existingFriendIds={[...friendIds, ...pendingIncoming.map(f => f.requester_id), ...pendingOutgoing.map(f => f.addressee_id)]}
        />
      </section>

      {/* Friends list */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Vrienden ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Nog geen vrienden. Zoek een speler hierboven.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                >
                  {(friend.full_name || friend.username)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {friend.full_name || friend.username}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    @{friend.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingOutgoing.length > 0 && (
          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            {pendingOutgoing.length} verzoek{pendingOutgoing.length > 1 ? 'en' : ''} uitstaand
          </p>
        )}
      </section>
    </div>
  )
}
