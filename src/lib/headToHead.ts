import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface H2HRecord { wins: number; losses: number; draws: number }

// Map of opponentId → the user's head-to-head record against them, from all
// decided matches. wins/losses are from the user's perspective.
export async function getHeadToHeadMap(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Record<string, H2HRecord>> {
  const { data } = await supabase
    .from('matches')
    .select('player_a_id, player_b_id, winner_id')
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .in('status', ['complete', 'conceded'])

  const map: Record<string, H2HRecord> = {}
  for (const m of data ?? []) {
    const opponent = m.player_a_id === userId ? m.player_b_id : m.player_a_id
    const rec = (map[opponent] ??= { wins: 0, losses: 0, draws: 0 })
    if (!m.winner_id) rec.draws++
    else if (m.winner_id === userId) rec.wins++
    else rec.losses++
  }
  return map
}

// Winst–gelijk–verlies, e.g. "3-2-1". Null when no decided matches yet.
export const h2hLabel = (r: H2HRecord) =>
  r.wins + r.losses + r.draws === 0 ? null : `${r.wins}-${r.draws}-${r.losses}`
