import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
        <Link
          href="/profile"
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
        >
          {initials}
        </Link>
      </div>

      {/* ── Primary CTA ── */}
      <Link
        href="/matches/new"
        className="flex items-center justify-between w-full px-5 py-4 rounded-2xl mb-3 font-semibold"
        style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
      >
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Nieuwe wedstrijd</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 opacity-70">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </Link>

      {/* ── Secondary actions ── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link
          href="/tournaments"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 shrink-0" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
          Toernooien
        </Link>
        <Link
          href="/competitions"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl font-medium text-sm"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 shrink-0" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          Duels
        </Link>
      </div>

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
              style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
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
        <Link href="/matches" className="text-xs font-medium" style={{ color: 'var(--color-gold-500)' }}>
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
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      vs {opponent?.full_name || opponent?.username}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: match.status === 'active' ? '#4ade80' : 'var(--text-muted)' }}>
                      {match.status === 'pending' ? 'Nog niet begonnen' : 'Bezig'}
                    </p>
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
