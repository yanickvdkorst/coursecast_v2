import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { CompetitionManager } from '@/components/admin/CompetitionManager'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminCompetitionDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: competition } = await supabase
    .from('competitions')
    .select('id, name, format, status')
    .eq('id', id)
    .single()

  if (!competition) notFound()

  const [{ data: cpData }, { data: allPlayers }] = await Promise.all([
    supabase.from('competition_players').select('player_id, wins, draws, losses').eq('competition_id', id),
    supabase.from('profiles').select('id, username, full_name').order('full_name', { ascending: true }),
  ])

  const cp = cpData ?? []
  const profileMap = Object.fromEntries((allPlayers ?? []).map(p => [p.id, p]))
  const members = cp.map(row => {
    const p = profileMap[row.player_id]
    return {
      id: row.player_id,
      username: p?.username ?? '—',
      full_name: p?.full_name ?? null,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
    }
  })

  return (
    <div className="max-w-3xl">
      <Link href="/admin/competitions" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        ← Competitions
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-8" style={{ color: 'var(--text-primary)' }}>
        {competition.name}
      </h1>
      <CompetitionManager competition={competition} members={members} allPlayers={allPlayers ?? []} />
    </div>
  )
}
