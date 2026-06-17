import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import type { Profile, Tournament, TournamentPlayer } from '@/types/match'
import { startTournament } from './actions'
import { TournamentJoin } from './TournamentJoin'
import { TournamentRequests } from './TournamentRequests'
import { TournamentShare } from './TournamentShare'
import { TournamentDelete } from './TournamentDelete'
import { TournamentEnd } from './TournamentEnd'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single()

  if (!tournament) notFound()
  const t = tournament as Tournament

  const { data: tPlayersData } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', id)
  const tPlayers = (tPlayersData ?? []) as TournamentPlayer[]

  const acceptedPlayers = tPlayers.filter(tp => tp.status === 'accepted')
  const requestedPlayers = tPlayers.filter(tp => tp.status === 'requested')
  const myStatus = (tPlayers.find(tp => tp.player_id === user.id)?.status ?? 'none') as 'none' | 'requested' | 'accepted'

  const allMemberIds = tPlayers.map(tp => tp.player_id)
  const playerIds = acceptedPlayers.map(tp => tp.player_id) // accepted only — used for standings/matches
  let profiles: Profile[] = []
  if (allMemberIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', allMemberIds)
    profiles = (data ?? []) as Profile[]
  }

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const isCreator = t.created_by === user.id

  // Accepted participants (for the players list) and pending requests (owner).
  const acceptedProfiles = playerIds.map(pid => profileMap[pid]).filter(Boolean) as Profile[]
  const requestProfiles = requestedPlayers.map(tp => ({
    playerId: tp.player_id,
    name: profileMap[tp.player_id]?.full_name || profileMap[tp.player_id]?.username || '—',
  }))

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  // Fetch matches when active or complete
  let matches: Array<Record<string, unknown>> = []
  if (t.status !== 'draft') {
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round')
    matches = (matchesData ?? []) as Array<Record<string, unknown>>

    // Fetch any profiles not yet in profileMap (match participants not in tPlayers)
    const matchPlayerIds = [...new Set(matches.flatMap(m => [m.player_a_id as string, m.player_b_id as string]))]
    const missing = matchPlayerIds.filter(pid => !profileMap[pid])
    if (missing.length > 0) {
      const { data: extraProfiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', missing)
      for (const p of (extraProfiles ?? []) as Profile[]) profileMap[p.id] = p
    }
  }

  // Group matches by round
  const rounds = matches.reduce<Record<number, Array<Record<string, unknown>>>>((acc, m) => {
    const r = m.round as number
    if (!acc[r]) acc[r] = []
    acc[r].push(m)
    return acc
  }, {})

  // Round-robin standings from completed matches
  type Standing = { wins: number; draws: number; losses: number; played: number }
  const standings: Record<string, Standing> = {}
  if (t.format === 'round_robin') {
    for (const m of matches) {
      const aId = m.player_a_id as string
      const bId = m.player_b_id as string
      if (!standings[aId]) standings[aId] = { wins: 0, draws: 0, losses: 0, played: 0 }
      if (!standings[bId]) standings[bId] = { wins: 0, draws: 0, losses: 0, played: 0 }
      if (m.status === 'complete') {
        standings[aId].played++
        standings[bId].played++
        if (!m.winner_id) {
          standings[aId].draws++
          standings[bId].draws++
        } else if (m.winner_id === aId) {
          standings[aId].wins++
          standings[bId].losses++
        } else {
          standings[bId].wins++
          standings[aId].losses++
        }
      }
    }
  }
  const sortedStandings = playerIds
    .map(pid => ({ pid, s: standings[pid] ?? { wins: 0, draws: 0, losses: 0, played: 0 } }))
    .sort((a, b) => b.s.wins - a.s.wins || a.s.losses - b.s.losses)

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BackButton fallback="/tournaments" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
          {t.name}
        </h1>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: 'var(--bg-card)', color: 'var(--color-gold-500)', border: '1px solid var(--color-gold-500)' }}
        >
          {{ draft: 'Open', active: 'Bezig', complete: 'Gespeeld' }[t.status] ?? t.status}
        </span>
      </div>

      <p className="text-sm mb-8 ml-9" style={{ color: 'var(--text-muted)' }}>
        {t.format === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'}
        <span className="mx-1.5">·</span>{t.visibility === 'private' ? 'Privé' : 'Openbaar'}
        <span className="mx-1.5">·</span>{fmt(t.starts_at)} – {fmt(t.ends_at)}
      </p>

      <div className="space-y-3 mb-8">
        <TournamentShare
          path={`/tournaments/${id}`}
          label="Deel inschrijflink"
          info="Iedereen met deze link kan het toernooi bekijken en zich inschrijven."
        />
        {t.status !== 'draft' && (
          <TournamentShare
            path={`/t/${id}`}
            label="Deel live-overzicht"
            info="Publiek live-overzicht van alle wedstrijden — geen account nodig."
          />
        )}
      </div>

      {/* Join / request (non-organisers, while still in draft) */}
      {!isCreator && t.status === 'draft' && (
        <TournamentJoin
          tournamentId={id}
          visibility={t.visibility}
          status={myStatus}
          closed={!!t.registration_deadline && new Date().toISOString().slice(0, 10) > t.registration_deadline}
          deadlineLabel={t.registration_deadline ? fmt(t.registration_deadline) : null}
        />
      )}

      {/* Organiser: pending join requests */}
      {isCreator && <TournamentRequests tournamentId={id} requests={requestProfiles} />}

      {/* Round-robin standings */}
      {t.format === 'round_robin' && t.status !== 'draft' && playerIds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Stand
          </h2>
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <div
              className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              <span>#</span>
              <span>Speler</span>
              <span className="text-center">Gesp</span>
              <span className="text-center">W</span>
              <span className="text-center">G</span>
              <span className="text-center">V</span>
            </div>
            {sortedStandings.map(({ pid, s }, i) => {
              const p = profileMap[pid]
              const isMe = pid === user.id
              return (
                <div
                  key={pid}
                  className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-2 px-4 py-3 border-t items-center"
                  style={{ borderColor: 'var(--border-color)', background: isMe ? 'var(--color-navy-800)' : 'var(--bg-card)' }}
                >
                  <span className="text-sm font-bold" style={{ color: i === 0 ? 'var(--color-gold-500)' : 'var(--text-muted)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {p?.full_name || p?.username || '—'}
                    {isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>(jij)</span>}
                  </span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.played}</span>
                  <span className="text-center text-sm font-bold" style={{ color: 'var(--color-gold-500)' }}>{s.wins}</span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.draws}</span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.losses}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Matches per round */}
      {t.status !== 'draft' && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Wedstrijden
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen wedstrijden ingepland.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(rounds)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([round, roundMatches]) => (
                  <div key={round}>
                    {t.format !== 'round_robin' && (
                      <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-muted)' }}>
                        Ronde {round}
                      </p>
                    )}
                    <div className="space-y-2">
                      {roundMatches.map(m => {
                        const pA = profileMap[m.player_a_id as string]
                        const pB = profileMap[m.player_b_id as string]
                        const nameA = pA ? (pA.full_name || pA.username).split(' ')[0] : '?'
                        const nameB = pB ? (pB.full_name || pB.username).split(' ')[0] : '?'
                        const isMyMatch = m.player_a_id === user.id || m.player_b_id === user.id
                        const statusColor = m.status === 'complete' ? 'var(--color-gold-500)' : m.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)'
                        return (
                          <Link
                            key={m.id as string}
                            href={`/matches/${m.id}`}
                            className="flex items-center justify-between p-4 rounded-2xl border"
                            style={{
                              background: isMyMatch ? 'var(--color-navy-800)' : 'var(--bg-card)',
                              borderColor: isMyMatch ? 'var(--color-gold-500)' : 'var(--border-color)',
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {nameA} vs {nameB}
                                {isMyMatch && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>★</span>}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: statusColor }}>
                                {m.status === 'complete'
                                  ? m.result_summary ? String(m.result_summary) : 'Gespeeld'
                                  : m.status === 'active'
                                  ? 'Bezig'
                                  : 'Gepland'}
                              </p>
                            </div>
                            <span style={{ color: 'var(--color-gold-500)' }}>→</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Players list */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Spelers ({acceptedProfiles.length})
          </h2>
        </div>

        {acceptedProfiles.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen spelers.</p>
        ) : (
          <div className="space-y-2">
            {acceptedProfiles.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
                >
                  {(p.full_name || p.username)[0].toUpperCase()}
                </div>
                <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
                  {p.full_name || p.username}
                  {p.id === t.created_by && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--color-gold-500)' }}>organisator</span>
                  )}
                  {p.id === user.id && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--text-muted)' }}>(jij)</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Creator: start tournament */}
      {isCreator && t.status === 'draft' && acceptedPlayers.length >= 2 && (
        <form
          action={async () => {
            'use server'
            await startTournament(id)
          }}
        >
          <button
            type="submit"
            className="w-full py-4 rounded-2xl font-semibold text-base"
            style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
          >
            Toernooi starten
          </button>
        </form>
      )}

      {/* Organiser: end an active tournament */}
      {isCreator && t.status === 'active' && <TournamentEnd tournamentId={id} name={t.name} />}

      {/* Organiser: delete tournament — only when not actively running
          (a running tournament must be ended first). */}
      {isCreator && t.status !== 'active' && <TournamentDelete tournamentId={id} name={t.name} />}
    </div>
  )
}
