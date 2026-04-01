import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Profile, Tournament, TournamentPlayer } from '@/types/match'

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

  const playerIds = tPlayers.map(tp => tp.player_id)
  let profiles: Profile[] = []
  if (playerIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', playerIds)
    profiles = (data ?? []) as Profile[]
  }

  const isCreator = t.created_by === user.id

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tournaments" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold flex-1" style={{ color: 'var(--text-primary)' }}>
          {t.name}
        </h1>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium capitalize"
          style={{ background: 'var(--bg-card)', color: 'var(--color-gold-500)', border: '1px solid var(--color-gold-500)' }}
        >
          {t.status}
        </span>
      </div>

      <p className="text-sm mb-8 ml-9" style={{ color: 'var(--text-muted)' }}>
        {t.format === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'} · {fmt(t.starts_at)} – {fmt(t.ends_at)}
      </p>

      {/* Players */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Spelers ({profiles.length})
          </h2>
          {isCreator && (
            <Link
              href={`/tournaments/${id}/add-player`}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
            >
              + Speler
            </Link>
          )}
        </div>

        {profiles.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen spelers.</p>
        ) : (
          <div className="space-y-2">
            {profiles.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              >
                <span className="w-6 text-center text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
                >
                  {(p.full_name || p.username)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {p.full_name || p.username}
                    {p.id === t.created_by && (
                      <span className="ml-2 text-xs" style={{ color: 'var(--color-gold-500)' }}>organisator</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Matches section — shown when tournament is active */}
      {t.status === 'active' && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Wedstrijden
          </h2>
          <TournamentMatches tournamentId={id} currentUserId={user.id} />
        </section>
      )}

      {/* Creator: start tournament */}
      {isCreator && t.status === 'draft' && profiles.length >= 2 && (
        <StartTournamentButton tournamentId={id} />
      )}
    </div>
  )
}

async function TournamentMatches({ tournamentId, currentUserId }: { tournamentId: string, currentUserId: string }) {
  const supabase = await import('@/lib/supabase/server').then(m => m.getSupabaseServerClient())
  const client = await supabase

  const { data: matchesData } = await client
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round')

  const matches = (matchesData ?? []) as Array<Record<string, unknown>>

  if (matches.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen wedstrijden ingepland.</p>
  }

  return (
    <div className="space-y-2">
      {matches.map(m => (
        <Link
          key={m.id as string}
          href={`/matches/${m.id}`}
          className="flex items-center justify-between p-4 rounded-2xl border"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Ronde {m.round as number}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {m.player_a_id === currentUserId ? 'Jouw wedstrijd' : 'Wedstrijd'}
            </p>
            {m.result_summary ? (
              <p className="text-xs" style={{ color: 'var(--color-gold-500)' }}>{String(m.result_summary)}</p>
            ) : null}
          </div>
          <span style={{ color: 'var(--color-gold-500)' }}>→</span>
        </Link>
      ))}
    </div>
  )
}

function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
  return (
    <form action={`/api/tournaments/${tournamentId}/start`} method="POST">
      <Link
        href={`/tournaments/${tournamentId}/start`}
        className="block w-full py-4 rounded-2xl font-semibold text-center text-base mt-4"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        Toernooi starten
      </Link>
    </form>
  )
}
