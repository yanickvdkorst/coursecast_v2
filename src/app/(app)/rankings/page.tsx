import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/match'
import { RankingsClient } from './RankingsClient'
import type { PlayerStat } from './RankingsClient'

export default async function RankingsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Fetch all competition_players (SELECT is open to all authenticated)
  const { data: allCPs } = await supabase
    .from('competition_players')
    .select('player_id, wins, draws, losses, matches_played')

  // Aggregate per player
  const statsMap: Record<string, { wins: number; draws: number; losses: number; played: number }> = {}
  for (const cp of allCPs ?? []) {
    if (!statsMap[cp.player_id]) statsMap[cp.player_id] = { wins: 0, draws: 0, losses: 0, played: 0 }
    statsMap[cp.player_id].wins += cp.wins ?? 0
    statsMap[cp.player_id].draws += cp.draws ?? 0
    statsMap[cp.player_id].losses += cp.losses ?? 0
    statsMap[cp.player_id].played += cp.matches_played ?? 0
  }

  const playerIds = Object.keys(statsMap)

  // Fetch profiles
  let profiles: Profile[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', playerIds)
    profiles = (data ?? []) as Profile[]
  }

  // Fetch friends
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = new Set(
    (friendships ?? []).map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id)
  )

  const players: PlayerStat[] = profiles.map(p => ({
    id: p.id,
    name: p.full_name || p.username,
    ...(statsMap[p.id] ?? { wins: 0, draws: 0, losses: 0, played: 0 }),
    isFriend: friendIds.has(p.id),
    isMe: p.id === user.id,
  }))

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Rankings</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Top 10 spelers op basis van wins in competities</p>
      <RankingsClient players={players} />
    </div>
  )
}
