import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Tournament } from '@/types/match'
import { TournamentsBrowser } from './TournamentsBrowser'

export default async function TournamentsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data }, { data: myPlayers }] = await Promise.all([
    supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
    supabase.from('tournament_players').select('tournament_id, status').eq('player_id', user.id),
  ])

  const tournaments = (data ?? []) as Tournament[]
  // tournament_id → 'accepted' | 'requested'
  const membership = Object.fromEntries((myPlayers ?? []).map(p => [p.tournament_id, p.status]))

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Toernooien</h1>
      <TournamentsBrowser tournaments={tournaments} membership={membership} />
    </div>
  )
}
