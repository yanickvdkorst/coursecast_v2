import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProfileEditForm } from './ProfileEditForm'
import Link from 'next/link'

export default async function ProfileEditPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, handicap, golf_club')
    .eq('id', user.id)
    .single()

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Profiel bewerken
        </h1>
      </div>
      <ProfileEditForm
        initialFullName={profile?.full_name ?? ''}
        initialHandicap={profile?.handicap ?? null}
        initialGolfClub={profile?.golf_club ?? ''}
        userId={user.id}
      />
    </div>
  )
}
