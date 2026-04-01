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
    .order('points', { ascending: false })
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

  // Fetch matches in this competition (requires migration 008 for full visibility)
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*')
    .eq('competition_id', id)
    .order('created_at', { ascending: false })
    .limit(20)
  const matches = (matchesData ?? []) as Array<Record<string, unknown>>

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const isCreator = c.created_by === user.id

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  // Active match IDs between current user and each opponent (to show "bezig" state)
  const activeOpponents = new Set(
    matches
      .filter(m => m.status === 'active' && (m.player_a_id === user.id || m.player_b_id === user.id))
      .map(m => (m.player_a_id === user.id ? m.player_b_id : m.player_a_id) as string)
  )

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/competitions" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
          {c.name}
        </h1>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: 'var(--bg-card)', color: 'var(--color-gold-500)', border: '1px solid var(--color-gold-500)' }}
        >
          {c.status}
        </span>
      </div>

      <p className="text-sm mb-8 ml-9" style={{ color: 'var(--text-muted)' }}>
        {c.format === 'matchplay_points' ? '2-1-0 punten' : 'Alleen winst'}
        {fmt(c.ends_at) && ` · t/m ${fmt(c.ends_at)}`}
      </p>

      {/* Leaderboard */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Klassement
          </h2>
          {isCreator && (
            <Link
              href={`/competitions/${id}/add-player`}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
            >
              + Speler
            </Link>
          )}
        </div>

        {standings.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen spelers.</p>
        ) : (
          <div className="space-y-2">
            {standings.map((s, i) => {
              const p = profileMap[s.player_id]
              const isMe = s.player_id === user.id
              const hasActiveMatch = activeOpponents.has(s.player_id)

              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                  style={{
                    borderColor: isMe ? 'var(--color-gold-500)' : 'var(--border-color)',
                    background: isMe ? 'var(--color-navy-800)' : 'var(--bg-card)',
                  }}
                >
                  {/* Rank */}
                  <span className="text-sm font-bold w-5 shrink-0" style={{ color: i === 0 ? 'var(--color-gold-500)' : 'var(--text-muted)' }}>
                    {i + 1}
                  </span>

                  {/* Name + stats */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p?.full_name || p?.username || '—'}
                      {isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>(jij)</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-bold" style={{ color: 'var(--color-gold-500)' }}>{s.points} pts</span>
                      <span className="ml-2">{s.wins}W · {s.draws}G · {s.losses}V</span>
                    </p>
                  </div>

                  {/* Play button (not shown for yourself) */}
                  {!isMe && (
                    hasActiveMatch ? (
                      <Link
                        href={`/matches/${matches.find(m => m.status === 'active' && ((m.player_a_id === user.id && m.player_b_id === s.player_id) || (m.player_b_id === user.id && m.player_a_id === s.player_id)))?.id}`}
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
        )}
      </section>

      {/* Recent matches */}
      {matches.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Wedstrijden
          </h2>
          <div className="space-y-2">
            {matches.map(m => {
              const pA = profileMap[m.player_a_id as string]
              const pB = profileMap[m.player_b_id as string]
              const nameA = pA ? (pA.full_name || pA.username).split(' ')[0] : '?'
              const nameB = pB ? (pB.full_name || pB.username).split(' ')[0] : '?'
              const isMyMatch = m.player_a_id === user.id || m.player_b_id === user.id
              const statusColor = m.status === 'complete' ? 'var(--color-gold-500)' : m.status === 'active' ? '#4ade80' : 'var(--text-muted)'

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
        </section>
      )}
    </div>
  )
}
