'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteMatch(matchId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: match } = await supabase
    .from('matches')
    .select('player_a_id, player_b_id, winner_id, status, competition_id, tournament_id')
    .eq('id', matchId)
    .single()

  if (!match) return
  if (match.player_a_id !== user.id && match.player_b_id !== user.id) return

  const { competition_id, tournament_id } = match

  // Delete hole results, then match
  await supabase.from('hole_results').delete().eq('match_id', matchId)
  await supabase.from('matches').delete().eq('id', matchId)

  // Recompute competition standings from remaining matches
  if (competition_id) {
    const { data: remaining } = await supabase
      .from('matches')
      .select('player_a_id, player_b_id, winner_id')
      .eq('competition_id', competition_id)
      .eq('status', 'complete')

    const stats: Record<string, { wins: number; losses: number; draws: number; played: number; points: number }> = {}
    const ensure = (id: string) => {
      if (!stats[id]) stats[id] = { wins: 0, losses: 0, draws: 0, played: 0, points: 0 }
    }
    for (const m of remaining ?? []) {
      ensure(m.player_a_id); ensure(m.player_b_id)
      stats[m.player_a_id].played++; stats[m.player_b_id].played++
      if (!m.winner_id) {
        stats[m.player_a_id].draws++; stats[m.player_b_id].draws++
        stats[m.player_a_id].points++; stats[m.player_b_id].points++
      } else {
        const loserId = m.winner_id === m.player_a_id ? m.player_b_id : m.player_a_id
        stats[m.winner_id].wins++; stats[m.winner_id].points += 2
        stats[loserId].losses++
      }
    }

    // Update each player's stats
    for (const [playerId, s] of Object.entries(stats)) {
      await supabase.from('competition_players')
        .update({ wins: s.wins, losses: s.losses, draws: s.draws, matches_played: s.played, points: s.points })
        .eq('competition_id', competition_id)
        .eq('player_id', playerId)
    }
    // Zero out players with no remaining matches
    const { data: cpRows } = await supabase
      .from('competition_players')
      .select('player_id')
      .eq('competition_id', competition_id)
    for (const cp of cpRows ?? []) {
      if (!stats[cp.player_id]) {
        await supabase.from('competition_players')
          .update({ wins: 0, losses: 0, draws: 0, matches_played: 0, points: 0 })
          .eq('competition_id', competition_id)
          .eq('player_id', cp.player_id)
      }
    }

    redirect(`/competitions/${competition_id}`)
  }

  if (tournament_id) redirect(`/tournaments/${tournament_id}`)
  redirect('/matches')
}
