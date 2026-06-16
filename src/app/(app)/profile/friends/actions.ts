'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })
  if (error) return { ok: false, error: error.message }

  const { data: me } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()
  const name = me?.full_name?.trim() || me?.username || 'Iemand'

  await sendPushToUser(addresseeId, {
    title: 'Nieuw vriendverzoek',
    body: `${name} wil je vriend worden`,
    url: '/profile/friends',
    tag: `friend-${user.id}`,
  }).catch(() => {})

  return { ok: true }
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  if (!accept) {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
    return { ok: !error }
  }

  // Accept → notify the original requester.
  const { data: row, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select('requester_id')
    .single()
  if (error || !row) return { ok: false, error: error?.message }

  const { data: me } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()
  const name = me?.full_name?.trim() || me?.username || 'Iemand'

  await sendPushToUser(row.requester_id, {
    title: 'Vriendverzoek geaccepteerd',
    body: `${name} is nu je vriend`,
    url: '/profile/friends',
    tag: `friend-accept-${friendshipId}`,
  }).catch(() => {})

  return { ok: true }
}
