'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'
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

  const { data: me } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()
  const name = me?.full_name?.trim() || me?.username || 'Iemand'

  await sendPushToUser(opponentId, {
    title: 'Nieuwe wedstrijd',
    body: `${name} is een wedstrijd met je gestart`,
    url: `/matches/${match.id}`,
    tag: `match-${match.id}`,
  }).catch(() => {})

  redirect(`/matches/${match.id}`)
}
