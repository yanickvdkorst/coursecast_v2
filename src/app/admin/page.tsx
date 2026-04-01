import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [
    { count: tournamentCount },
    { count: competitionCount },
    { count: matchCount },
  ] = await Promise.all([
    supabase.from('tournaments').select('id', { count: 'exact', head: true }),
    supabase.from('competitions').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Admin Dashboard
      </h1>
      <p className="mb-8" style={{ color: 'var(--text-muted)' }}>
        Manage tournaments, competitions, and players
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Tournaments', value: tournamentCount ?? 0 },
          { label: 'Competitions', value: competitionCount ?? 0 },
          { label: 'Active matches', value: matchCount ?? 0 },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl border"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <p className="text-3xl font-bold" style={{ color: 'var(--color-gold-500)' }}>
              {stat.value}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/admin/tournaments/new"
          className="p-5 rounded-2xl border font-medium transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        >
          <p className="text-2xl mb-2">🏆</p>
          <p className="font-semibold">New tournament</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Create a bracket or round-robin
          </p>
        </Link>
        <Link
          href="/admin/competitions/new"
          className="p-5 rounded-2xl border font-medium transition-colors"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        >
          <p className="text-2xl mb-2">📊</p>
          <p className="font-semibold">New competition</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Season-long standings
          </p>
        </Link>
      </div>
    </div>
  )
}
