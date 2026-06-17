import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface NotificationItem {
  id: string
  text: string
  href: string
  kind: 'friend' | 'invite' | 'request'
}

const nameOf = (p?: { full_name: string | null; username: string }) =>
  p?.full_name?.trim() || p?.username || 'Iemand'

// Action-oriented notifications derived from current state — things that need
// the user's attention. No history table; reflects the live situation.
export async function getNotifications(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<NotificationItem[]> {
  const [{ data: friendReqs }, { data: invites }, { data: myTournaments }] = await Promise.all([
    supabase.from('friendships').select('id, requester_id').eq('addressee_id', userId).eq('status', 'pending'),
    supabase.from('tournament_players').select('id, tournament_id').eq('player_id', userId).eq('status', 'invited'),
    supabase.from('tournaments').select('id, name').eq('created_by', userId),
  ])

  const myTournamentName = new Map((myTournaments ?? []).map(t => [t.id, t.name]))
  const myTournamentIds = [...myTournamentName.keys()]

  let pendingRequests: { tournament_id: string; player_id: string }[] = []
  if (myTournamentIds.length > 0) {
    const { data } = await supabase
      .from('tournament_players')
      .select('tournament_id, player_id')
      .in('tournament_id', myTournamentIds)
      .eq('status', 'requested')
    pendingRequests = data ?? []
  }

  // Resolve names + remaining tournament names.
  const nameIds = [...new Set([...(friendReqs ?? []).map(f => f.requester_id), ...pendingRequests.map(p => p.player_id)])]
  const nameMap = new Map<string, { full_name: string | null; username: string }>()
  if (nameIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name, username').in('id', nameIds)
    for (const p of data ?? []) nameMap.set(p.id, p)
  }

  const tournamentName = new Map(myTournamentName)
  const missingTids = (invites ?? []).map(i => i.tournament_id).filter(tid => !tournamentName.has(tid))
  if (missingTids.length > 0) {
    const { data } = await supabase.from('tournaments').select('id, name').in('id', missingTids)
    for (const t of data ?? []) tournamentName.set(t.id, t.name)
  }

  const items: NotificationItem[] = []
  for (const f of friendReqs ?? []) {
    items.push({ id: `fr-${f.id}`, kind: 'friend', text: `${nameOf(nameMap.get(f.requester_id))} wil je vriend worden`, href: '/profile/friends' })
  }
  for (const i of invites ?? []) {
    items.push({ id: `inv-${i.id}`, kind: 'invite', text: `Uitnodiging: ${tournamentName.get(i.tournament_id) ?? 'toernooi'}`, href: `/tournaments/${i.tournament_id}` })
  }
  for (const p of pendingRequests) {
    items.push({ id: `req-${p.tournament_id}-${p.player_id}`, kind: 'request', text: `${nameOf(nameMap.get(p.player_id))} wil meedoen aan ${myTournamentName.get(p.tournament_id) ?? 'je toernooi'}`, href: `/tournaments/${p.tournament_id}` })
  }
  return items
}
