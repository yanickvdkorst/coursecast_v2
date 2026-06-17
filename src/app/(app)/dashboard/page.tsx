import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getNotifications } from '@/lib/notifications'
import { getHeadToHeadMap, h2hLabel } from '@/lib/headToHead'
import { NotificationBell } from '@/components/layout/NotificationBell'

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: profile }, { data: activeMatches }, { data: friendships }] = await Promise.all([
    supabase.from('profiles').select('full_name, username, handicap, golf_club').eq('id', user.id).single(),
    supabase
      .from('matches')
      .select('*, player_a:profiles!matches_player_a_id_fkey(username, full_name), player_b:profiles!matches_player_b_id_fkey(username, full_name)')
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .in('status', ['pending', 'active'])
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('friendships')
      .select('status')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ])

  // First-time users without a name → onboarding (no extra DB call, uses already-fetched profile)
  if (!profile?.full_name) redirect('/onboarding')

  const notifications = await getNotifications(supabase, user.id)
  const h2hMap = await getHeadToHeadMap(supabase, user.id)

  const friendCount = (friendships ?? []).filter(f => f.status === 'accepted').length
  const pendingCount = (friendships ?? []).filter(f => f.status === 'pending').length

  const initials = (profile?.full_name || profile?.username || 'G')
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()

  return (
    <div className="px-4 pt-8 pb-6 max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
            Welkom terug
          </p>
          <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name?.split(' ')[0] || profile?.username || 'Golfer'}
          </h1>
          {(profile?.handicap != null || profile?.golf_club) && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {profile.golf_club ?? ''}
              {profile.handicap != null && profile.golf_club ? ' · ' : ''}
              {profile.handicap != null ? `HCP ${profile.handicap > 0 ? '+' : ''}${profile.handicap}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <NotificationBell count={notifications.length} />
          <Link
            href="/profile"
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
          >
            {initials}
          </Link>
        </div>
      </div>

      {/* ── Primary CTA ── */}
      <Link
        href="/play/new"
        className="flex items-center justify-between w-full px-5 py-4 rounded-2xl mb-3 font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Nieuw spel</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 opacity-70">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>

      {/* ── Friends card ── */}
      <Link
        href="/profile/friends"
        className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl mb-8 font-medium text-sm"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 shrink-0" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <div>
            <span>Vrienden</span>
            {friendCount > 0 && (
              <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{friendCount} {friendCount === 1 ? 'vriend' : 'vrienden'}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
            >
              {pendingCount}
            </span>
          )}
          {friendCount === 0 && pendingCount === 0 && (
            <span className="text-xs font-medium" style={{ color: 'var(--color-gold-500)' }}>Voeg vrienden toe</span>
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>

      {/* ── Active matches ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Lopende wedstrijden
        </p>
        <Link href="/play" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          Alle →
        </Link>
      </div>

      {!activeMatches?.length ? (
        <div
          className="py-8 rounded-2xl text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Geen lopende wedstrijden
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {activeMatches.map((match, i) => {
            type PlayerSnippet = { username: string; full_name: string } | null
            const playerA = (match as Record<string, unknown>).player_a as PlayerSnippet
            const playerB = (match as Record<string, unknown>).player_b as PlayerSnippet
            const isPlayerA = match.player_a_id === user.id
            const opponent = isPlayerA ? playerB : playerA
            const opponentId = (isPlayerA ? match.player_b_id : match.player_a_id) as string
            const h2h = h2hMap[opponentId] ? h2hLabel(h2hMap[opponentId]) : null

            return (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between px-4 py-4"
                style={{
                  background: 'var(--bg-card)',
                  borderTop: i > 0 ? '1px solid var(--border-color)' : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {(opponent?.full_name || opponent?.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        vs {opponent?.full_name || opponent?.username}
                      </p>
                      {match.tournament_id && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 leading-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          Toernooi
                        </span>
                      )}
                      {match.competition_id && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 leading-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                          Reeks
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: match.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)' }}>
                      {match.status === 'pending' ? 'Nog niet begonnen' : 'Bezig'}
                    </p>
                    {h2h && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{h2h}</p>
                    )}
                  </div>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
