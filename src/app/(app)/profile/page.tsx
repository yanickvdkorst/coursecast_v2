import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SignOutButton } from '@/components/auth/SignOutButton'

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
        Profile
      </h1>

      {/* Avatar + info */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl border mb-6"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
          style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
        >
          {(profile?.full_name || profile?.username || 'G')[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {profile?.full_name}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            @{profile?.username}
          </p>
          <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--color-gold-500)' }}>
            {profile?.role}
          </p>
        </div>
      </div>

      {/* Settings */}
      <div
        className="rounded-2xl border divide-y overflow-hidden mb-6"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-4"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              Appearance
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Dark or light theme
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <SignOutButton />
    </div>
  )
}
