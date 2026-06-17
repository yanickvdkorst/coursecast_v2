import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getNotifications } from '@/lib/notifications'
import { BackButton } from '@/components/ui/BackButton'

const ICON = { friend: '👤', invite: '🏆', request: '🏆' } as const

export default async function NotificationsPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const items = await getNotifications(supabase, user.id)

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BackButton fallback="/dashboard" className="text-xl leading-none" style={{ color: 'var(--text-muted)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Meldingen</h1>
      </div>

      {items.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Geen meldingen</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {items.map((it, i) => (
            <Link
              key={it.id}
              href={it.href}
              className="flex items-start gap-3 px-4 py-4"
              style={{ background: 'var(--bg-card)', borderTop: i === 0 ? undefined : '1px solid var(--border-color)' }}
            >
              <span className="text-lg leading-none mt-0.5">{ICON[it.kind]}</span>
              <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{it.text}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
