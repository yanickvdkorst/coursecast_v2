'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function startTournament(tournamentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .eq('created_by', user.id)
    .single()

  if (!tournament || tournament.status !== 'draft') return

  const { data: players } = await supabase
    .from('tournament_players')
    .select('player_id')
    .eq('tournament_id', tournamentId)

  const playerIds = (players ?? []).map(p => p.player_id)
  if (playerIds.length < 2) return

  type MatchInsert = {
    player_a_id: string
    player_b_id: string
    tournament_id: string
    round: number
    status: string
  }

  const matches: MatchInsert[] = []

  if (tournament.format === 'round_robin') {
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        matches.push({
          player_a_id: playerIds[i],
          player_b_id: playerIds[j],
          tournament_id: tournamentId,
          round: 1,
          status: 'pending',
        })
      }
    }
  } else {
    // bracket: pair sequentially, round 1
    for (let i = 0; i + 1 < playerIds.length; i += 2) {
      matches.push({
        player_a_id: playerIds[i],
        player_b_id: playerIds[i + 1],
        tournament_id: tournamentId,
        round: 1,
        status: 'pending',
      })
    }
  }

  await supabase.from('matches').insert(matches)
  await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)

  redirect(`/tournaments/${tournamentId}`)
}
