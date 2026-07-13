'use server'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push'
import { buildRound1Slots, pendingNextMatches, type BracketMatchRow } from '@/lib/bracket'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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

  const admin = adminClient()
  const { data: tournament } = await admin
    .from('tournaments')
    .select('id, format, status, created_by')
    .eq('id', tournamentId)
    .single()
  if (!tournament || tournament.created_by !== user.id || tournament.status !== 'draft') return

  const { data: players } = await admin
    .from('tournament_players')
    .select('player_id, seed')
    .eq('tournament_id', tournamentId)
    .eq('status', 'accepted')
  const accepted = players ?? []
  if (accepted.length < 2) return

  if (tournament.format === 'round_robin') {
    const ids = accepted.map(p => p.player_id)
    const matches = []
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        matches.push({ player_a_id: ids[i], player_b_id: ids[j], tournament_id: tournamentId, round: 1, status: 'pending' })
    await admin.from('matches').insert(matches)
    await admin.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)
    redirect(`/tournaments/${tournamentId}`)
    return
  }

  // Knock-out: seeded players first (by seed), then unseeded shuffled → byes to
  // the strongest. Store the round-1 slot order; create round-1 matches.
  const seeded = accepted.filter(p => p.seed != null).sort((a, b) => (a.seed as number) - (b.seed as number))
  const unseeded = shuffle(accepted.filter(p => p.seed == null).map(p => p.player_id))
  const ordered = [...seeded.map(p => p.player_id), ...unseeded]
  const slots = buildRound1Slots(ordered)

  const round1 = []
  for (let p = 0; p < slots.length / 2; p++) {
    const a = slots[2 * p], b = slots[2 * p + 1]
    if (a && b) round1.push({ player_a_id: a, player_b_id: b, tournament_id: tournamentId, round: 1, bracket_pos: p, status: 'pending' })
  }
  await admin.from('matches').insert(round1)
  await admin.from('tournaments').update({ status: 'active', bracket: slots }).eq('id', tournamentId)

  // Create any matches that are already decided by byes (e.g. bye vs bye).
  await reconcileTournamentBracket(tournamentId)

  redirect(`/tournaments/${tournamentId}`)
}

// Create the next bracket matches whose feeders are both decided. Idempotent;
// run on tournament view (winners advance as matches complete). No auth needed
// — purely derived from existing results.
export async function reconcileTournamentBracket(tournamentId: string) {
  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('bracket, format, status')
    .eq('id', tournamentId)
    .single()
  if (!t || t.format !== 'bracket' || t.status !== 'active' || !t.bracket) return

  const slots = t.bracket as (string | null)[]
  const { data: ms } = await admin
    .from('matches')
    .select('round, bracket_pos, winner_id, status')
    .eq('tournament_id', tournamentId)
  const rows: BracketMatchRow[] = (ms ?? []).map(m => ({
    round: m.round ?? 1, bracket_pos: m.bracket_pos ?? 0, winner_id: m.winner_id, status: m.status,
  }))

  const toCreate = pendingNextMatches(slots, rows)
  if (toCreate.length === 0) return
  await admin.from('matches').insert(
    toCreate.map(c => ({ player_a_id: c.a, player_b_id: c.b, tournament_id: tournamentId, round: c.round, bracket_pos: c.pos, status: 'pending' }))
  )
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
    .select('id, name, visibility, status, created_by, registration_deadline')
    .eq('id', tournamentId)
    .single()
  if (!t) return { ok: false, error: 'Toernooi niet gevonden' }
  if (t.status !== 'draft') return { ok: false, error: 'Dit toernooi is al gestart' }
  if (t.created_by === user.id) return { ok: false, error: 'Je bent de organisator' }
  if (t.registration_deadline && new Date().toISOString().slice(0, 10) > t.registration_deadline) {
    return { ok: false, error: 'De inschrijftermijn is verstreken' }
  }

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

// Organiser invites registered players (status 'invited'); they must accept.
export async function inviteToTournament(tournamentId: string, playerIds: string[]) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }
  if (playerIds.length === 0) return { ok: true }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('id, name, status, created_by')
    .eq('id', tournamentId)
    .single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.status !== 'draft') return { ok: false, error: 'Toernooi is al gestart' }

  const { data: existing } = await admin
    .from('tournament_players')
    .select('player_id')
    .eq('tournament_id', tournamentId)
  const existingIds = new Set((existing ?? []).map(r => r.player_id))
  const toInvite = playerIds.filter(pid => pid !== t.created_by && !existingIds.has(pid))
  if (toInvite.length === 0) return { ok: true }

  const { error } = await admin
    .from('tournament_players')
    .insert(toInvite.map(pid => ({ tournament_id: tournamentId, player_id: pid, status: 'invited' })))
  if (error) return { ok: false, error: error.message }

  for (const pid of toInvite) {
    await sendPushToUser(pid, {
      title: 'Uitnodiging toernooi',
      body: `Je bent uitgenodigd voor ${t.name}`,
      url: `/tournaments/${tournamentId}`,
      tag: `tinvite-${tournamentId}`,
    }).catch(() => {})
  }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Invited player accepts or declines.
export async function respondToInvite(tournamentId: string, accept: boolean) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  if (!accept) {
    await admin.from('tournament_players').delete()
      .eq('tournament_id', tournamentId).eq('player_id', user.id).eq('status', 'invited')
    revalidatePath(`/tournaments/${tournamentId}`)
    return { ok: true }
  }

  const { error } = await admin
    .from('tournament_players')
    .update({ status: 'accepted' })
    .eq('tournament_id', tournamentId).eq('player_id', user.id).eq('status', 'invited')
  if (error) return { ok: false, error: error.message }

  const { data: t } = await admin.from('tournaments').select('name, created_by').eq('id', tournamentId).single()
  if (t) {
    const { data: me } = await admin.from('profiles').select('full_name, username').eq('id', user.id).single()
    const name = me?.full_name?.trim() || me?.username || 'Iemand'
    await sendPushToUser(t.created_by, {
      title: 'Uitnodiging geaccepteerd',
      body: `${name} doet mee aan ${t.name}`,
      url: `/tournaments/${tournamentId}`,
      tag: `tinvacc-${tournamentId}`,
    }).catch(() => {})
  }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser cancels a pending invite.
export async function cancelTournamentInvite(tournamentId: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin.from('tournaments').select('created_by').eq('id', tournamentId).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }

  await admin.from('tournament_players').delete()
    .eq('tournament_id', tournamentId).eq('player_id', playerId).eq('status', 'invited')
  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Player withdraws their enrollment or pending request (draft only).
export async function leaveTournament(tournamentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('status, created_by')
    .eq('id', tournamentId)
    .single()
  if (!t) return { ok: false, error: 'Toernooi niet gevonden' }
  if (t.status !== 'draft') return { ok: false, error: 'Het toernooi is al gestart' }
  if (t.created_by === user.id) return { ok: false, error: 'De organisator kan zich niet uitschrijven' }

  await admin.from('tournament_players').delete()
    .eq('tournament_id', tournamentId).eq('player_id', user.id)
  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser ends an active tournament → status 'complete' (Gespeeld).
export async function endTournament(tournamentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('created_by, status')
    .eq('id', tournamentId)
    .single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.status !== 'active') return { ok: false, error: 'Toernooi is niet bezig' }

  const { error } = await admin.from('tournaments').update({ status: 'complete' }).eq('id', tournamentId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser deletes their tournament. Players cascade away; played matches
// are kept but unlinked (matches.tournament_id → NULL via the FK).
export async function deleteTournament(tournamentId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('created_by')
    .eq('id', tournamentId)
    .single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }

  // Remove unplayed matches (no result yet) so they don't linger in players'
  // lists. Played matches (complete/conceded) are kept but unlinked.
  await admin.from('matches').delete()
    .eq('tournament_id', tournamentId)
    .in('status', ['pending', 'active'])

  const { error } = await admin.from('tournaments').delete().eq('id', tournamentId)
  if (error) return { ok: false, error: error.message }

  redirect('/tournaments')
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
