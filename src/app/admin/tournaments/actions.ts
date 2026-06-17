'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

type TournamentFormat = 'round_robin' | 'bracket'
type TournamentStatus = 'draft' | 'active' | 'complete'
type TournamentVisibility = 'public' | 'private'

export async function createTournament(input: {
  name: string
  format: TournamentFormat
  visibility: TournamentVisibility
  startsAt: string | null
  endsAt: string | null
  playerIds: string[]
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: input.name.trim(),
      format: input.format,
      visibility: input.visibility,
      status: 'draft',
      created_by: user.id,
      starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
      ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Kon toernooi niet aanmaken')

  if (input.playerIds.length > 0) {
    const { error: pErr } = await supabase
      .from('tournament_players')
      .insert(input.playerIds.map((pid, i) => ({ tournament_id: data.id, player_id: pid, seed: i + 1 })))
    if (pErr) throw new Error(pErr.message)
  }

  revalidatePath('/admin/tournaments')
  redirect(`/admin/tournaments/${data.id}`)
}

export async function updateTournament(id: string, input: {
  name: string
  format: TournamentFormat
  status: TournamentStatus
  visibility: TournamentVisibility
  startsAt: string | null
  endsAt: string | null
}) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('tournaments')
    .update({
      name: input.name.trim(),
      format: input.format,
      status: input.status,
      visibility: input.visibility,
      starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
      ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tournaments/${id}`)
  revalidatePath('/admin/tournaments')
}

export async function addTournamentPlayer(id: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  // Next seed = current max + 1
  const { data: existing } = await supabase
    .from('tournament_players')
    .select('seed')
    .eq('tournament_id', id)
  const nextSeed = (existing ?? []).reduce((max, r) => Math.max(max, r.seed ?? 0), 0) + 1
  const { error } = await supabase
    .from('tournament_players')
    .insert({ tournament_id: id, player_id: playerId, seed: nextSeed })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tournaments/${id}`)
}

export async function removeTournamentPlayer(id: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase
    .from('tournament_players')
    .delete()
    .eq('tournament_id', id)
    .eq('player_id', playerId)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/tournaments/${id}`)
}

export async function deleteTournament(id: string) {
  const supabase = await getSupabaseServerClient()
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/tournaments')
  redirect('/admin/tournaments')
}
