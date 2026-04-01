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
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Duels</h1>
        <Link
          href="/competitions/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw
        </Link>
      </div>

      {competitions.length === 0 ? (
        <div
          className="py-12 rounded-2xl text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Geen duels</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Start een nieuw duel met een vriend</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {competitions.map((c, i) => (
            <Link
              key={c.id}
              href={`/competitions/${c.id}`}
              className="flex items-center gap-3 px-4 py-4"
              style={{
                background: 'var(--bg-card)',
                borderTop: i > 0 ? '1px solid var(--border-color)' : undefined,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" style={{ color: 'var(--color-gold-500)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs mt-0.5" style={{ color: c.status === 'active' ? '#4ade80' : 'var(--text-muted)' }}>
                  {c.status === 'active' ? 'Actief' : 'Gestopt'}
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
