import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { BackButton } from '@/components/ui/BackButton'
import { NewPlayWizard } from './NewPlayWizard'
import { getHeadToHeadMap } from '@/lib/headToHead'
import type { Profile, Course } from '@/types/match'

export default async function NewPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { type } = await searchParams
  const initialFormat = type === 'tournament' || type === 'series' ? type : 'match'

  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  let friends: Profile[] = []
  if (friendIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', friendIds)
      .eq('is_guest', false)
    friends = (data ?? []) as Profile[]
  }

  const { data: allPlayersData } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .neq('id', user.id)
    .eq('is_guest', false)
    .order('username')
  const allPlayers = (allPlayersData ?? []) as Profile[]

  const { data: coursesData } = await supabase
    .from('courses')
    .select('id, name, holes')
    .order('name')
  const courses = (coursesData ?? []) as Course[]

  const h2hMap = await getHeadToHeadMap(supabase, user.id)

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <BackButton fallback="/play" className="text-2xl leading-none" style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Nieuw spel
        </h1>
      </div>
      <NewPlayWizard
        friends={friends}
        allPlayers={allPlayers}
        courses={courses}
        currentUserId={user.id}
        h2hMap={h2hMap}
        initialFormat={initialFormat}
      />
    </div>
  )
}
