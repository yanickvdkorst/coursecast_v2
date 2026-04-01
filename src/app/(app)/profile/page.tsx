import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SignOutButton } from '@/components/auth/SignOutButton'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const hcpDisplay = profile?.handicap !== null && profile?.handicap !== undefined
    ? (profile.handicap > 0 ? `+${profile.handicap}` : String(profile.handicap))
    : null

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
        Profiel
      </h1>

      {/* Avatar + info */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border mb-2"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
        >
          {(profile?.full_name || profile?.username || 'G')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name || '—'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            @{profile?.username}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {hcpDisplay && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)', color: 'var(--color-gold-500)' }}>
                HCP {hcpDisplay}
              </span>
            )}
            {profile?.golf_club && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {profile.golf_club}
              </span>
            )}
          </div>
        </div>
        <Link
          href="/profile/edit"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          Bewerk
        </Link>
      </div>

      {/* Settings */}
      <div
        className="rounded-2xl border divide-y overflow-hidden mb-6 mt-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Link
          href="/profile/friends"
          className="flex items-center justify-between px-4 py-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Vrienden
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Bekijk en beheer je vrienden
            </p>
          </div>
          <span style={{ color: 'var(--color-gold-500)' }}>→</span>
        </Link>
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ background: 'var(--bg-card)' }}
        >
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Weergave
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Donker of licht thema
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <SignOutButton />
    </div>
  )
}
