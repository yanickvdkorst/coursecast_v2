import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NewCompetitionForm } from './NewCompetitionForm'
import type { Profile } from '@/types/match'
import Link from 'next/link'

export default async function NewCompetitionPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

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
    friends = (data ?? []) as Profile[]
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/competitions" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }}>
          ←
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Nieuw duel
        </h1>
      </div>
      <NewCompetitionForm friends={friends} currentUserId={user.id} />
    </div>
  )
}
