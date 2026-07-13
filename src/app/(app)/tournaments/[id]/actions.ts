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
    .select('id, name, format, status, created_by')
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

  // Notify participants (except the organiser) that the schedule is ready.
  const notifyScheduleReady = async () => {
    await Promise.all(accepted
      .filter(p => p.player_id !== user.id)
      .map(p => sendPushToUser(p.player_id, {
        title: 'Toernooischema bekend',
        body: `Het schema van ${tournament.name} is bekend`,
        url: `/tournaments/${tournamentId}`,
        tag: `tstart-${tournamentId}`,
      }).catch(() => {})))
  }

  if (tournament.format === 'round_robin') {
    const ids = accepted.map(p => p.player_id)
    const matches = []
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        matches.push({ player_a_id: ids[i], player_b_id: ids[j], tournament_id: tournamentId, round: 1, status: 'pending' })
    await admin.from('matches').insert(matches)
    await admin.from('tournaments').update({ status: 'active' }).eq('id', tournamentId)
    await notifyScheduleReady()
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
  await notifyScheduleReady()

  redirect(`/tournaments/${tournamentId}`)
}

// Create the next bracket matches whose feeders are both decided. Idempotent;
// run on tournament view (winners advance as matches complete). No auth needed
// — purely derived from existing results.
export async function reconcileTournamentBracket(tournamentId: string) {
  const admin = adminClient()
  const { data: t } = await admin
    .from('tournaments')
    .select('bracket, format, status, slot_schedule')
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

  // Apply any pre-scheduled date/time for these slots, then drop the used keys.
  const sched = (t as { slot_schedule?: Record<string, string> | null }).slot_schedule ?? {}
  const usedKeys: string[] = []
  await admin.from('matches').insert(
    toCreate.map(c => {
      const key = `${c.round}:${c.pos}`
      const at = sched[key]
      if (at) usedKeys.push(key)
      return { player_a_id: c.a, player_b_id: c.b, tournament_id: tournamentId, round: c.round, bracket_pos: c.pos, status: 'pending', scheduled_at: at ?? null }
    })
  )
  if (usedKeys.length) {
    const rest = { ...sched }
    for (const k of usedKeys) delete rest[k]
    await admin.from('tournaments').update({ slot_schedule: rest }).eq('id', tournamentId)
  }
}

// Organiser adds a name-only participant (no account) — creates a guest
// profile via the service role and enrols it directly.
export async function addTournamentGuest(tournamentId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Naam is verplicht' }

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin.from('tournaments').select('created_by, status').eq('id', tournamentId).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.status !== 'draft') return { ok: false, error: 'Toernooi is al gestart' }

  const email = `guest_${crypto.randomUUID()}@guest.local`
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email, email_confirm: true, user_metadata: { full_name: trimmed },
  })
  if (cErr || !created.user) return { ok: false, error: cErr?.message ?? 'Kon speler niet toevoegen' }
  const guestId = created.user.id
  await admin.from('profiles').update({ is_guest: true, full_name: trimmed }).eq('id', guestId)

  const { error } = await admin
    .from('tournament_players')
    .insert({ tournament_id: tournamentId, player_id: guestId, status: 'accepted' })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser sets seeds (placement) for a knock-out draw. Players with a number
// are seeded (sorted ascending); the rest are drawn randomly. Draft only.
export async function setTournamentSeeds(tournamentId: string, seeds: { playerId: string; seed: number | null }[]) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin.from('tournaments').select('created_by, status').eq('id', tournamentId).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.status !== 'draft') return { ok: false, error: 'Toernooi is al gestart' }

  for (const s of seeds) {
    await admin.from('tournament_players')
      .update({ seed: s.seed })
      .eq('tournament_id', tournamentId)
      .eq('player_id', s.playerId)
  }
  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser sets an optional date/time for a match.
export async function setMatchSchedule(matchId: string, scheduledAt: string | null) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: m } = await admin.from('matches').select('tournament_id').eq('id', matchId).single()
  if (!m || !m.tournament_id) return { ok: false, error: 'Geen toernooiwedstrijd' }
  const { data: t } = await admin.from('tournaments').select('created_by').eq('id', m.tournament_id).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }

  await admin.from('matches')
    .update({ scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null })
    .eq('id', matchId)
  revalidatePath(`/tournaments/${m.tournament_id}`)
  return { ok: true }
}

// Organiser schedules a bracket slot by (round, pos). If the match already
// exists, sets its scheduled_at; otherwise stores it on the tournament so it's
// applied when that match is later created (planning ahead of future rounds).
export async function setSlotSchedule(tournamentId: string, round: number, pos: number, scheduledAt: string | null) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin.from('tournaments').select('created_by, slot_schedule').eq('id', tournamentId).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }

  const iso = scheduledAt ? new Date(scheduledAt).toISOString() : null

  const { data: existing } = await admin
    .from('matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round', round)
    .eq('bracket_pos', pos)
    .maybeSingle()

  if (existing) {
    await admin.from('matches').update({ scheduled_at: iso }).eq('id', existing.id)
  } else {
    const sched = { ...((t.slot_schedule as Record<string, string> | null) ?? {}) }
    const key = `${round}:${pos}`
    if (iso) sched[key] = iso
    else delete sched[key]
    await admin.from('tournaments').update({ slot_schedule: sched }).eq('id', tournamentId)
  }

  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser removes a participant (draft only).
export async function removeTournamentPlayer(tournamentId: string, playerId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: t } = await admin.from('tournaments').select('created_by, status').eq('id', tournamentId).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.status !== 'draft') return { ok: false, error: 'Toernooi is al gestart' }

  await admin.from('tournament_players').delete().eq('tournament_id', tournamentId).eq('player_id', playerId)
  revalidatePath(`/tournaments/${tournamentId}`)
  return { ok: true }
}

// Organiser enters a match result directly (handy when players have no account).
// An optional score (e.g. "3&2") can be attached if it was kept manually.
export async function setTournamentMatchResult(matchId: string, outcome: 'a' | 'b' | 'draw', score?: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd' }

  const admin = adminClient()
  const { data: m } = await admin
    .from('matches')
    .select('id, tournament_id, player_a_id, player_b_id')
    .eq('id', matchId)
    .single()
  if (!m || !m.tournament_id) return { ok: false, error: 'Geen toernooiwedstrijd' }

  const { data: t } = await admin.from('tournaments').select('created_by, format').eq('id', m.tournament_id).single()
  if (!t || t.created_by !== user.id) return { ok: false, error: 'Geen organisator' }
  if (t.format === 'bracket' && outcome === 'draw') return { ok: false, error: 'Knock-out kan niet gelijk eindigen' }

  const winner_id = outcome === 'a' ? m.player_a_id : outcome === 'b' ? m.player_b_id : null
  const trimmed = score?.trim()
  const result_summary = trimmed || (outcome === 'draw' ? 'Gelijk' : null)
  await admin.from('matches').update({
    status: 'complete',
    winner_id,
    result_summary,
    completed_at: new Date().toISOString(),
  }).eq('id', matchId)

  await reconcileTournamentBracket(m.tournament_id)
  revalidatePath(`/tournaments/${m.tournament_id}`)
  return { ok: true }
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
