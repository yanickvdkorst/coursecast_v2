import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MatchesPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: matches } = await supabase
    .from('matches')
    .select('*, player_a:profiles!matches_player_a_id_fkey(username, full_name), player_b:profiles!matches_player_b_id_fkey(username, full_name)')
    .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const active = matches?.filter(m => m.status === 'active' || m.status === 'pending') ?? []
  const completed = matches?.filter(m => m.status === 'complete' || m.status === 'conceded') ?? []

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Wedstrijden</h1>
        <Link
          href="/matches/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw
        </Link>
      </div>

      {active.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Lopend
          </p>
          <MatchList matches={active} userId={user.id} />
        </section>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Gespeeld
        </p>
        {completed.length === 0 ? (
          <div
            className="py-8 rounded-2xl text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen gespeelde wedstrijden</p>
          </div>
        ) : (
          <MatchList matches={completed} userId={user.id} />
        )}
      </section>
    </div>
  )
}

function MatchList({ matches, userId }: { matches: Array<Record<string, unknown>>, userId: string }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      {matches.map((match, i) => {
        const playerA = match.player_a as { username: string; full_name: string } | null
        const playerB = match.player_b as { username: string; full_name: string } | null
        const opponent = match.player_a_id === userId ? playerB : playerA
        const won = match.winner_id === userId
        const lost = match.winner_id && match.winner_id !== userId

        return (
          <Link
            key={match.id as string}
            href={`/matches/${match.id}`}
            className="flex items-center gap-3 px-4 py-4"
            style={{
              background: 'var(--bg-card)',
              borderTop: i > 0 ? '1px solid var(--border-color)' : undefined,
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {(opponent?.full_name || opponent?.username || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                vs {opponent?.full_name || opponent?.username || 'Onbekend'}
              </p>
              {(match.status === 'active' || match.status === 'pending') ? (
                <p className="text-xs mt-0.5" style={{ color: match.status === 'active' ? '#4ade80' : 'var(--text-muted)' }}>
                  {match.status === 'pending' ? 'Nog niet begonnen' : 'Bezig'}
                </p>
              ) : match.result_summary ? (
                <p className="text-xs mt-0.5 font-medium" style={{ color: won ? 'var(--color-gold-500)' : lost ? '#ef4444' : 'var(--text-muted)' }}>
                  {won ? 'Gewonnen' : lost ? 'Verloren' : 'Gelijk'} · {String(match.result_summary)}
                </p>
              ) : null}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )
      })}
    </div>
  )
}
