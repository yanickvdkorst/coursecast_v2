'use client'

import { usePush } from './usePush'

export function NotificationToggle() {
  const { supported, subscribed, needsInstall, busy, error, enable, disable } = usePush()

  if (supported === null) return null
  if (!supported) {
    return (
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Meldingen worden niet ondersteund in deze browser.
      </p>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Meldingen</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {needsInstall
            ? 'Zet de app eerst op je beginscherm om meldingen te ontvangen.'
            : 'Bij vriendverzoeken en nieuwe wedstrijden.'}
        </p>
        {error && <p className="text-xs mt-1" style={{ color: 'var(--status-danger)' }}>{error}</p>}
      </div>
      <button
        type="button"
        onClick={subscribed ? disable : enable}
        disabled={busy || needsInstall}
        className="text-sm font-semibold px-4 py-2 rounded-xl shrink-0 disabled:opacity-50"
        style={
          subscribed
            ? { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }
            : { background: 'var(--accent)', color: 'var(--on-accent)' }
        }
      >
        {busy ? '…' : subscribed ? 'Uitzetten' : 'Aanzetten'}
      </button>
    </div>
  )
}
