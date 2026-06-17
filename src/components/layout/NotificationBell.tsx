import Link from 'next/link'

export function NotificationBell({ count }: { count: number }) {
  return (
    <Link
      href="/notifications"
      aria-label="Meldingen"
      className="relative w-11 h-11 rounded-full flex items-center justify-center shrink-0"
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
    </Link>
  )
}
