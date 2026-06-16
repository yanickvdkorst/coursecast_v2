import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { TournamentCreateForm } from '@/components/admin/TournamentCreateForm'

export default async function NewAdminTournamentPage() {
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
      <Link href="/admin/tournaments" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Tournaments
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-8" style={{ color: 'var(--text-primary)' }}>
        Nieuw toernooi
      </h1>
      <TournamentCreateForm players={players ?? []} />
    </div>
  )
}
