import Link from 'next/link'
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Toernooien</h1>
        <Link
          href="/play/new?type=tournament"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw
        </Link>
      </div>
      <TournamentsBrowser tournaments={tournaments} membership={membership} />
    </div>
  )
}
