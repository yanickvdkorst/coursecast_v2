import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Competition } from '@/types/match'

export default async function CompetitionsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase
    .from('competitions')
    .select('*')
    .order('created_at', { ascending: false })
  const competitions = (data ?? []) as Competition[]

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Competities</h1>
        <Link href="/competitions/new" className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}>
          + Nieuw
        </Link>
      </div>

      {competitions.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          No competitions yet.
        </p>
      ) : (
        <div className="space-y-3">
          {competitions.map(c => (
            <Link
              key={c.id}
              href={`/competitions/${c.id}`}
              className="flex items-center justify-between p-4 rounded-2xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                  {c.format.replace('_', ' ')} · {c.status}
                </p>
              </div>
              <span style={{ color: 'var(--color-gold-500)' }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
