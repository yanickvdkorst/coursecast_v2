import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { GuestUpgradeForm } from '@/components/auth/GuestUpgradeForm'

export default async function GuestUpgradePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Already a full account → nothing to upgrade.
  if (!user.is_anonymous) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <>
      <GuestUpgradeForm initialName={profile?.full_name ?? ''} />
      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        Liever later?{' '}
        <Link href="/matches" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Terug naar je wedstrijd
        </Link>
      </p>
    </>
  )
}
