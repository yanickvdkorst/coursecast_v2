'use server'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

async function displayName(admin: ReturnType<typeof adminClient>, userId: string) {
  const { data } = await admin.from('profiles').select('full_name, username').eq('id', userId).single()
  return data?.full_name?.trim() || data?.username || 'Iemand'
}

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
    .eq('status', 'accepted')

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
        matches.push({ player_a_id: playerIds[i], player_b_id: playerIds[j], tournament_id: tournamentId, round: 1, status: 'pending' })
      }
    }
  } else {
    for (let i = 0; i + 1 < playerIds.length; i += 2) {
      matches.push({ player_a_id: playerIds[i], player_b_id: playerIds[i + 1], tournament_id: tournamentId, round: 1, status: 'pending' })
    }
  }

  await supabase.from('matches').insert(matches)
  await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)

  redirect(`/tournaments/${tournamentId}`)
}

// Player asks to join. Public → instant accept. Private → pending request +
// notify the owner.
export async function requestToJoin(tournamentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('id, name, visibility, status, created_by')
    .eq('id', tournamentId)
    .single()
  if (!t) return { ok: false, error: 'Toernooi niet gevonden' }
  if (t.status !== 'draft') return { ok: false, error: 'Dit toernooi is al gestart' }
  if (t.created_by === user.id) return { ok: false, error: 'Je bent de organisator' }

  const { data: existing } = await admin
    .from('tournament_players')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('player_id', user.id)
    .maybeSingle()
  if (existing) return { ok: true } // already a member or pending

  const status = t.visibility === 'public' ? 'accepted' : 'requested'
  const { error } = await admin
    .from('tournament_players')
    .insert({ tournament_id: tournamentId, player_id: user.id, status })
  if (error) return { ok: false, error: error.message }

  if (status === 'requested') {
    const name = await displayName(admin, user.id)
    await sendPushToUser(t.created_by, {
      title: 'Nieuwe aanmelding',
      body: `${name} wil meedoen aan ${t.name}`,
      url: `/tournaments/${tournamentId}`,
      tag: `tjoin-${tournamentId}`,
    }).catch(() => {})
  }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Owner accepts or declines a pending request.
export async function respondToJoinRequest(tournamentId: string, playerId: string, accept: boolean) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('id, name, created_by')
    .eq('id', tournamentId)
    .single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }

  if (!accept) {
    await admin.from('tournament_players').delete()
      .eq('tournament_id', tournamentId).eq('player_id', playerId).eq('status', 'requested')
    revalidatePath(`/tournaments/${tournamentId}`)
    return { ok: true }
  }

  const { error } = await admin
    .from('tournament_players')
    .update({ status: 'accepted' })
    .eq('tournament_id', tournamentId).eq('player_id', playerId).eq('status', 'requested')
  if (error) return { ok: false, error: error.message }

  await sendPushToUser(playerId, {
    title: 'Toegelaten tot toernooi',
    body: `Je doet nu mee aan ${t.name}`,
    url: `/tournaments/${tournamentId}`,
    tag: `taccept-${tournamentId}`,
  }).catch(() => {})

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}
