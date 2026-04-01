import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminTournamentsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Tournaments
        </h1>
        <Link
          href="/admin/tournaments/new"
          className="px-5 py-2.5 rounded-xl font-semibold"
          style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
        >
          + New
        </Link>
      </div>

      {!tournaments?.length ? (
        <p style={{ color: 'var(--text-muted)' }}>No tournaments yet.</p>
      ) : (
        <div className="space-y-3">
          {tournaments.map(t => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 rounded-2xl border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <p className="text-sm capitalize" style={{ color: 'var(--text-muted)' }}>
                  {t.format.replace('_', ' ')} · {t.status}
                </p>
              </div>
              <Link
                href={`/admin/tournaments/${t.id}`}
                className="text-sm font-medium"
                style={{ color: 'var(--color-gold-500)' }}
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
