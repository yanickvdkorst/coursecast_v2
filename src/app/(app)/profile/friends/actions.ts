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
