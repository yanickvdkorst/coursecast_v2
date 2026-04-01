import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NewMatchForm } from './NewMatchForm'
import type { Profile, Course } from '@/types/match'

export default async function NewMatchPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [{ data: playersData }, { data: coursesData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .neq('id', user.id)
      .order('username'),
    supabase
      .from('courses')
      .select('id, name, holes')
      .order('name'),
  ])

  const players = (playersData ?? []) as Profile[]
  const courses = (coursesData ?? []) as Course[]

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <a
          href="/matches"
          className="text-2xl leading-none"
          style={{ color: 'var(--text-muted)' }}
        >
          ←
        </a>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          New match
        </h1>
      </div>

      <NewMatchForm players={players} courses={courses} currentUserId={user.id} />
    </div>
  )
}
