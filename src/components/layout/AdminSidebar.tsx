'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/tournaments', label: 'Tournaments' },
  { href: '/admin/competitions', label: 'Competitions' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 shrink-0 min-h-screen border-r flex flex-col py-8 px-4 gap-1"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="mb-8 px-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" style={{ color: 'var(--color-gold-500)' }}>
            <path d="M8 20V4.5" />
            <path d="M8 4.5l7 2.25L8 9" />
            <path d="M5.5 20h5" />
            <path d="M16.4 4a4.5 4.5 0 0 1 1.9 3.5" />
            <path d="M18 2.1a7.5 7.5 0 0 1 3 5.4" />
          </svg>
          <span className="font-bold text-lg" style={{ color: 'var(--color-gold-500)' }}>
            Coursecast
          </span>
        </Link>
        <p className="text-xs mt-1 ml-8" style={{ color: 'var(--text-muted)' }}>
          Admin
        </p>
      </div>

      {NAV_ITEMS.map(item => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'text-[var(--color-gold-500)] bg-[var(--bg-card)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            )}
          >
            {item.label}
          </Link>
        )
      })}

      <div className="mt-auto">
        <Link
          href="/dashboard"
          className="px-3 py-2 rounded-lg text-sm transition-colors block"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to app
        </Link>
      </div>
    </aside>
  )
}
