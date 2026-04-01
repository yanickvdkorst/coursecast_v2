import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tournament } from '@/types/match'

export default async function TournamentsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })
  const tournaments = (data ?? []) as Tournament[]

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>
        Tournaments
      </h1>

      {tournaments.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          No tournaments yet. Ask your admin to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="flex items-center justify-between p-4 rounded-2xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-muted)' }}>
                  {t.format.replace('_', ' ')} · {t.status}
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
