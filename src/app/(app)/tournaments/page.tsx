import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Tournament } from '@/types/match'
import { TournamentsBrowser } from './TournamentsBrowser'

export default async function TournamentsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  const tournaments = (data ?? []) as Tournament[]

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Toernooien</h1>
      <TournamentsBrowser tournaments={tournaments} />
    </div>
  )
}
