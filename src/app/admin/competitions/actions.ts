'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type CompetitionFormat = 'matchplay_points' | 'winsonly'
type CompetitionStatus = 'draft' | 'active' | 'complete'

export async function createCompetition(input: {
  name: string
  format: CompetitionFormat
  playerIds: string[]
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data, error } = await supabase
    .from('competitions')
    .insert({
      name: input.name.trim(),
      format: input.format,
      status: 'active',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Kon competitie niet aanmaken')

  if (input.playerIds.length > 0) {
    const { error: pErr } = await supabase
      .from('competition_players')
      .insert(input.playerIds.map(pid => ({ competition_id: data.id, player_id: pid })))
    if (pErr) throw new Error(pErr.message)
  }

  revalidatePath('/admin/competitions')
  redirect(`/admin/competitions/${data.id}`)
}

export async function updateCompetition(id: string, input: {
  name: string
  format: CompetitionFormat
  status: CompetitionStatus
}) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('competitions')
    .update({ name: input.name.trim(), format: input.format, status: input.status })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/competitions/${id}`)
  revalidatePath('/admin/competitions')
}

export async function addCompetitionPlayer(id: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('competition_players')
    .insert({ competition_id: id, player_id: playerId })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/competitions/${id}`)
}

export async function removeCompetitionPlayer(id: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('competition_players')
    .delete()
    .eq('competition_id', id)
    .eq('player_id', playerId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/competitions/${id}`)
}

export async function deleteCompetition(id: string) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.from('competitions').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/competitions')
  redirect('/admin/competitions')
}
