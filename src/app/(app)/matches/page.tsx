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
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Matches
        </h1>
        <Link
          href="/matches/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
        >
          + New
        </Link>
      </div>

      {active.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Active
          </h2>
          <MatchList matches={active} userId={user.id} />
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Completed
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            No completed matches yet
          </p>
        ) : (
          <MatchList matches={completed} userId={user.id} />
        )}
      </section>
    </div>
  )
}

function MatchList({ matches, userId }: { matches: Array<Record<string, unknown>>, userId: string }) {
  return (
    <div className="space-y-3">
      {matches.map((match: Record<string, unknown>) => {
        const playerA = match.player_a as { username: string; full_name: string } | null
        const playerB = match.player_b as { username: string; full_name: string } | null
        const isPlayerA = match.player_a_id === userId
        const opponent = isPlayerA ? playerB : playerA

        return (
          <Link
            key={match.id as string}
            href={`/matches/${match.id}`}
            className="flex items-center justify-between p-4 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                vs {(opponent?.full_name || opponent?.username) ?? 'Unknown'}
              </p>
              {match.result_summary ? (
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--color-gold-500)' }}>
                  {match.winner_id === userId ? 'Won' : match.winner_id ? 'Lost' : 'Draw'} · {String(match.result_summary)}
                </p>
              ) : null}
            </div>
            <span style={{ color: 'var(--color-gold-500)' }}>→</span>
          </Link>
        )
      })}
    </div>
  )
}
