import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { MatchScorecard } from './MatchScorecard'
import type { Profile, Course, HoleResult } from '@/types/match'

interface Props {
  params: Promise<{ matchId: string }>
}

export default async function MatchPage({ params }: Props) {
  const { matchId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: match }, { data: holeResultsData }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single(),
    supabase
      .from('hole_results')
      .select('*')
      .eq('match_id', matchId)
      .order('hole_number'),
  ])

  if (!match) notFound()

  // Only participants — or an admin — can view
  if (match.player_a_id !== user.id && match.player_b_id !== user.id) {
    const { data: viewer } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (viewer?.role !== 'admin') {
      redirect('/matches')
    }
  }

  // Fetch player profiles
  const { data: playersData } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', [match.player_a_id, match.player_b_id])

  const players = (playersData ?? []) as Profile[]
  const playerA = players.find(p => p.id === match.player_a_id)!
  const playerB = players.find(p => p.id === match.player_b_id)!

  // Fetch course if set
  let course: Course | null = null
  if (match.course_id) {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('id', match.course_id)
      .single()
    course = data as Course | null
  }

  const totalHoles = course?.holes ?? 18
  const holeResults = (holeResultsData ?? []) as HoleResult[]

  // Head-to-head record between these two players (all decided matches).
  const { data: h2hData } = await supabase
    .from('matches')
    .select('winner_id')
    .or(`and(player_a_id.eq.${match.player_a_id},player_b_id.eq.${match.player_b_id}),and(player_a_id.eq.${match.player_b_id},player_b_id.eq.${match.player_a_id})`)
    .in('status', ['complete', 'conceded'])
  let aWins = 0, bWins = 0, draws = 0
  for (const m of h2hData ?? []) {
    if (m.winner_id === match.player_a_id) aWins++
    else if (m.winner_id === match.player_b_id) bWins++
    else draws++
  }
  const h2h = { aWins, bWins, draws }

  return (
    <MatchScorecard
      match={match}
      playerA={playerA}
      playerB={playerB}
      course={course}
      initialHoleResults={holeResults}
      currentUserId={user.id}
      totalHoles={totalHoles}
      isAnonymous={!!user.is_anonymous}
      h2h={h2h}
    />
  )
}
