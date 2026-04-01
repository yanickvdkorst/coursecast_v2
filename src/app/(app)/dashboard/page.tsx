import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: profile }, { data: activeMatches }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('matches')
      .select('*, player_a:profiles!matches_player_a_id_fkey(username, full_name), player_b:profiles!matches_player_b_id_fkey(username, full_name)')
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Welcome back,</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {profile?.full_name || profile?.username || 'Golfer'}
        </h1>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/matches/new"
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border font-medium text-sm transition-colors"
          style={{
            background: 'var(--color-gold-500)',
            color: '#040d1a',
            borderColor: 'transparent',
          }}
        >
          <span className="text-2xl">⛳</span>
          New match
        </Link>
        <Link
          href="/tournaments"
          className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border font-medium text-sm"
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="text-2xl">🏆</span>
          Tournaments
        </Link>
      </div>

      {/* Active matches */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          Active matches
        </h2>

        {!activeMatches?.length ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            No active matches. Start one!
          </p>
        ) : (
          <div className="space-y-3">
            {activeMatches.map(match => {
              type PlayerSnippet = { username: string; full_name: string } | null
              const playerA = (match as Record<string, unknown>).player_a as PlayerSnippet
              const playerB = (match as Record<string, unknown>).player_b as PlayerSnippet
              const isPlayerA = match.player_a_id === user.id
              const opponent = isPlayerA ? playerB : playerA

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex items-center justify-between p-4 rounded-2xl border transition-colors"
                  style={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                >
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      vs {opponent?.full_name || opponent?.username}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {match.status === 'pending' ? 'Not started' : 'In progress'}
                    </p>
                  </div>
                  <span style={{ color: 'var(--color-gold-500)' }}>→</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
