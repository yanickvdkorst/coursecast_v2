'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteMatch(matchId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data, error } = await supabase.rpc('delete_match_and_recompute', {
    p_match_id: matchId,
    p_user_id:  user.id,
  })

  type RpcResult = { competition_id?: string | null; tournament_id?: string | null; error?: string }
  const result = data as unknown as RpcResult

  if (error || result?.error) return

  if (result.competition_id) redirect(`/competitions/${result.competition_id}`)
  if (result.tournament_id)  redirect(`/tournaments/${result.tournament_id}`)
  redirect('/matches')
}
