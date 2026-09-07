import { cn } from '@/lib/utils'

export function EyeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-7.5 9.75-7.5S21.75 12 21.75 12s-3.75 7.5-9.75 7.5S2.25 12 2.25 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

/**
 * Live spectator badge — identical on the watch page and the player's
 * scorecard. Wrap it in a button when it needs to be tappable.
 */
export function ViewerCount({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums px-2 py-1 rounded-full', className)}
      style={{ color: 'var(--accent)', background: 'var(--bg-elevated)' }}
      title="Aantal mensen dat nu live meekijkt"
      aria-label={`${count} ${count === 1 ? 'kijker' : 'kijkers'} live`}
    >
      <EyeIcon className="w-3.5 h-3.5" />
      {count}
    </span>
  )
}
