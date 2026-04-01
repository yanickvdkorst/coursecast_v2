'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function startCompetitionMatch(competitionId: string, opponentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      player_a_id: user.id,
      player_b_id: opponentId,
      competition_id: competitionId,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !match) return

  redirect(`/matches/${match.id}`)
}
