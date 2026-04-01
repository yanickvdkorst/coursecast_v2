import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProfileEditForm } from '../profile/edit/ProfileEditForm'

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // If already set up, skip onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, handicap, golf_club')
    .eq('id', user.id)
    .single()

  if (profile?.full_name) redirect('/dashboard')

  return (
    <div className="px-4 pt-12 pb-24 max-w-lg mx-auto">
      <div className="mb-8">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-6"
          style={{ background: 'var(--color-gold-500)' }}
        >
          ⛳
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Welkom bij Matchplay
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Stel je profiel in zodat vrienden je kunnen vinden.
        </p>
      </div>

      <ProfileEditForm
        initialFullName=""
        initialHandicap={null}
        initialGolfClub=""
        userId={user.id}
        redirectTo="/dashboard"
      />
    </div>
  )
}
