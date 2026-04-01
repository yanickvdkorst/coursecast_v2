import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Profile, Competition, CompetitionPlayer } from '@/types/match'
import { startCompetitionMatch } from './actions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: comp } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single()

  if (!comp) notFound()
  const c = comp as Competition

  const { data: cpData } = await supabase
    .from('competition_players')
    .select('*')
    .eq('competition_id', id)
  const standings = (cpData ?? []) as CompetitionPlayer[]

  const playerIds = standings.map(s => s.player_id)
  let profiles: Profile[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', playerIds)
    profiles = (data ?? []) as Profile[]
  }

  // Fetch recent matches in this competition
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .eq('competition_id', id)
    .order('created_at', { ascending: false })
    .limit(30)
  const matches = (matchesData ?? []) as Array<Record<string, unknown>>

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))

  // Sort standings by wins desc
  const sorted = [...standings].sort((a, b) => b.wins - a.wins || a.losses - b.losses)

  // Active match IDs between current user and each opponent
  const activeMatchByOpponent: Record<string, string> = {}
  for (const m of matches) {
    if (m.status === 'active') {
      if (m.player_a_id === user.id) activeMatchByOpponent[m.player_b_id as string] = m.id as string
      else if (m.player_b_id === user.id) activeMatchByOpponent[m.player_a_id as string] = m.id as string
    }
  }

  const isTwoPlayer = playerIds.length === 2
  const myStats = standings.find(s => s.player_id === user.id)
  const opponentStats = isTwoPlayer ? standings.find(s => s.player_id !== user.id) : null
  const opponentProfile = opponentStats ? profileMap[opponentStats.player_id] : null

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/competitions" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
          {c.name}
        </h1>
      </div>

      {/* Head-to-head score (2 players) */}
      {isTwoPlayer && myStats && opponentStats && opponentProfile && (
        <div
          className="rounded-2xl border p-6 mb-8 text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-center gap-6">
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Jij</p>
              <p className="text-5xl font-black" style={{ color: 'var(--color-gold-500)' }}>{myStats.wins}</p>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              <p className="text-2xl font-light">–</p>
              {myStats.draws > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{myStats.draws}G</p>
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                {opponentProfile.full_name?.split(' ')[0] || opponentProfile.username}
              </p>
              <p className="text-5xl font-black" style={{ color: 'var(--text-primary)' }}>{opponentStats.wins}</p>
            </div>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            {myStats.wins + opponentStats.wins + myStats.draws} {myStats.wins + opponentStats.wins + myStats.draws === 1 ? 'wedstrijd' : 'wedstrijden'} gespeeld
          </p>

          {/* Play button */}
          {activeMatchByOpponent[opponentStats.player_id] ? (
            <Link
              href={`/matches/${activeMatchByOpponent[opponentStats.player_id]}`}
              className="mt-5 inline-block px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8060' }}
            >
              Wedstrijd bezig → ga verder
            </Link>
          ) : (
            <form action={startCompetitionMatch.bind(null, id, opponentStats.player_id)} className="mt-5">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-semibold text-sm"
                style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
              >
                Nieuw duel spelen
              </button>
            </form>
          )}
        </div>
      )}

      {/* Multi-player: simple wins leaderboard */}
      {!isTwoPlayer && sorted.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Stand
          </h2>
          <div className="space-y-2">
            {sorted.map((s, i) => {
              const p = profileMap[s.player_id]
              const isMe = s.player_id === user.id
              const activeMatchId = activeMatchByOpponent[s.player_id]

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                  style={{
                    borderColor: isMe ? 'var(--color-gold-500)' : 'var(--border-color)',
                    background: isMe ? 'var(--color-navy-800)' : 'var(--bg-card)',
                  }}
                >
                  <span className="text-sm font-bold w-5 shrink-0" style={{ color: i === 0 ? 'var(--color-gold-500)' : 'var(--text-muted)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p?.full_name || p?.username || '—'}
                      {isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>(jij)</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-bold" style={{ color: 'var(--color-gold-500)' }}>{s.wins}W</span>
                      {s.draws > 0 && <span className="ml-1">{s.draws}G</span>}
                      <span className="ml-1">{s.losses}V</span>
                      <span className="ml-1.5" style={{ color: 'var(--text-muted)' }}>· {s.wins + s.losses + s.draws} gespeeld</span>
                    </p>
                  </div>
                  {!isMe && (
                    activeMatchId ? (
                      <Link
                        href={`/matches/${activeMatchId}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                        style={{ background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8060' }}
                      >
                        Bezig →
                      </Link>
                    ) : (
                      <form action={startCompetitionMatch.bind(null, id, s.player_id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                          style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                        >
                          Speel
                        </button>
                      </form>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Match history */}
      {matches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Geschiedenis
          </h2>
          <div className="space-y-2">
            {matches.map(m => {
              const pA = profileMap[m.player_a_id as string]
              const pB = profileMap[m.player_b_id as string]
              const nameA = pA ? (pA.full_name || pA.username).split(' ')[0] : '?'
              const nameB = pB ? (pB.full_name || pB.username).split(' ')[0] : '?'
              const isMyMatch = m.player_a_id === user.id || m.player_b_id === user.id

              const statusLabel =
                m.status === 'complete'
                  ? m.result_summary ? String(m.result_summary) : 'Gespeeld'
                  : m.status === 'active'
                  ? 'Bezig'
                  : 'Gepland'
              const statusColor =
                m.status === 'complete' ? 'var(--color-gold-500)'
                  : m.status === 'active' ? '#4ade80'
                  : 'var(--text-muted)'

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
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: statusColor }}>{statusLabel}</p>
                  </div>
                  <span style={{ color: 'var(--color-gold-500)' }}>→</span>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
