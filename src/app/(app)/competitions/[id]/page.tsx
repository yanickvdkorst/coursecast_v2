import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Profile, Competition, CompetitionPlayer } from '@/types/match'

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

  const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
  const isCreator = c.created_by === user.id

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : null

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
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
      <section className="mb-6">
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
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {/* Table header */}
            <div
              className="grid grid-cols-[1.5rem_1fr_3rem_3rem_3rem_3rem] gap-2 px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
            >
              <span>#</span>
              <span>Speler</span>
              <span className="text-center">Pts</span>
              <span className="text-center">W</span>
              <span className="text-center">G</span>
              <span className="text-center">V</span>
            </div>

            {standings.map((s, i) => {
              const p = profileMap[s.player_id]
              const isMe = s.player_id === user.id
              return (
                <div
                  key={s.id}
                  className="grid grid-cols-[1.5rem_1fr_3rem_3rem_3rem_3rem] gap-2 px-4 py-3 border-t items-center"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: isMe ? 'var(--color-navy-800)' : 'var(--bg-card)',
                  }}
                >
                  <span className="text-sm font-bold" style={{ color: i === 0 ? 'var(--color-gold-500)' : 'var(--text-muted)' }}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {p?.full_name || p?.username || '—'}
                    {isMe && <span className="ml-1 text-xs" style={{ color: 'var(--color-gold-500)' }}>(jij)</span>}
                  </span>
                  <span className="text-center text-sm font-bold" style={{ color: 'var(--color-gold-500)' }}>
                    {s.points}
                  </span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.wins}</span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.draws}</span>
                  <span className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>{s.losses}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
