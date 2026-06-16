'use client'

import { useEffect, useState } from 'react'
import { usePush } from './usePush'

const DISMISS_KEY = 'cc-notif-dismissed'
const INSTALL_DISMISS_KEY = 'cc-install-dismissed'

// One-time, dismissible banner nudging the user to enable notifications.
// Shown only once the install step is out of the way (installed PWA, or the
// install banner was dismissed) so the two banners never stack.
export function NotificationNudge() {
  const { supported, permission, subscribed, standalone, needsInstall, busy, error, enable } = usePush()
  const [dismissed, setDismissed] = useState(true) // assume dismissed until we read storage

  useEffect(() => {
    setDismissed(
      localStorage.getItem(DISMISS_KEY) === '1' ||
      // Don't compete with the install banner.
      (!standalone && localStorage.getItem(INSTALL_DISMISS_KEY) !== '1')
    )
  }, [standalone])

  const show =
    supported === true &&
    permission === 'default' &&
    !subscribed &&
    !needsInstall &&
    !dismissed

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const onEnable = async () => {
    const ok = await enable()
    if (ok) localStorage.setItem(DISMISS_KEY, '1')
  }

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 pointer-events-none">
      <div
        className="pointer-events-auto max-w-lg mx-auto rounded-2xl p-4 flex items-center gap-3 shadow-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 shrink-0">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Meldingen aanzetten?
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Voor vriendverzoeken en nieuwe wedstrijden.
          </p>
          {error && <p className="text-xs mt-1" style={{ color: 'var(--status-danger)' }}>{error}</p>}
        </div>

        <button
          onClick={onEnable}
          disabled={busy}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          {busy ? '…' : 'Aanzetten'}
        </button>
        <button onClick={dismiss} className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
          Niet nu
        </button>
      </div>
    </div>
  )
}
