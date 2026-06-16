import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { CompetitionCreateForm } from '@/components/admin/CompetitionCreateForm'

export default async function NewAdminCompetitionPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: players } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('is_guest', false)
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-3xl">
      <Link href="/admin/competitions" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Competitions
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-8" style={{ color: 'var(--text-primary)' }}>
        Nieuwe competitie
      </h1>
      <CompetitionCreateForm players={players ?? []} />
    </div>
  )
}
