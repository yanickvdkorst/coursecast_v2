'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { NotificationItem } from '@/lib/notifications'

const ICON: Record<NotificationItem['kind'], string> = {
  friend: '👤',
  invite: '🏆',
  request: '🏆',
}

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false)
  const count = items.length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Meldingen"
        className="relative w-11 h-11 rounded-full flex items-center justify-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-2 w-72 max-w-[80vw] z-50 rounded-2xl overflow-hidden shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Meldingen</p>
            </div>
            {count === 0 ? (
              <p className="px-4 py-6 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Geen meldingen
              </p>
            ) : (
              <div className="max-h-80 overflow-auto">
                {items.map((it, i) => (
                  <Link
                    key={it.id}
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3"
                    style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-color)' }}
                  >
                    <span className="text-base leading-none mt-0.5">{ICON[it.kind]}</span>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{it.text}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
