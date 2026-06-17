import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { TournamentManager } from '@/components/admin/TournamentManager'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminTournamentDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, format, status, visibility, starts_at, ends_at')
    .eq('id', id)
    .single()

  if (!tournament) notFound()

  const [{ data: tpData }, { data: allPlayers }] = await Promise.all([
    supabase.from('tournament_players').select('player_id, seed').eq('tournament_id', id).order('seed', { ascending: true }),
    supabase.from('profiles').select('id, username, full_name').eq('is_guest', false).order('full_name', { ascending: true }),
  ])

  const tp = tpData ?? []
  const profileMap = Object.fromEntries((allPlayers ?? []).map(p => [p.id, p]))
  const members = tp.map(row => {
    const p = profileMap[row.player_id]
    return {
      id: row.player_id,
      username: p?.username ?? '—',
      full_name: p?.full_name ?? null,
      seed: row.seed,
    }
  })

  return (
    <div className="max-w-3xl">
      <Link href="/admin/tournaments" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Tournaments
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-8" style={{ color: 'var(--text-primary)' }}>
        {tournament.name}
      </h1>
      <TournamentManager tournament={tournament} members={members} allPlayers={allPlayers ?? []} />
    </div>
  )
}
