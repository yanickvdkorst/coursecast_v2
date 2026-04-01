import Link from 'next/link'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Tournament } from '@/types/match'

const STATUS_COLOR: Record<string, string> = {
  draft:    'var(--text-muted)',
  active:   '#4ade80',
  complete: 'var(--color-gold-500)',
}

const STATUS_LABEL: Record<string, string> = {
  draft:    'Concept',
  active:   'Actief',
  complete: 'Afgerond',
}

const FORMAT_LABEL: Record<string, string> = {
  round_robin: 'Iedereen vs iedereen',
  bracket:     'Knock-out',
}

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
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Toernooien</h1>
        <Link
          href="/tournaments/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div
          className="py-12 rounded-2xl text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Geen toernooien</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Maak een nieuw toernooi aan om te beginnen</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {tournaments.map((t, i) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {FORMAT_LABEL[t.format] ?? t.format}
                  <span className="mx-1.5">·</span>
                  <span style={{ color: STATUS_COLOR[t.status] ?? 'var(--text-muted)' }}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
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
