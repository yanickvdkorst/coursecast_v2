'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'cc-install-dismissed'

// Dismissible install banner. Android uses the native beforeinstallprompt;
// iOS Safari has no such API, so we show Add-to-Home-Screen instructions.
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    const ios = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    // iOS never fires the event — show the instructions instead.
    if (ios) setShow(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 px-4 pointer-events-none">
      <div
        className="pointer-events-auto max-w-lg mx-auto rounded-2xl p-4 flex items-center gap-3 shadow-lg"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 shrink-0">
          <path d="M8 20V4.5" />
          <path d="M8 4.5l7 2.25L8 9" />
          <path d="M5.5 20h5" />
          <path d="M16.4 4a4.5 4.5 0 0 1 1.9 3.5" />
          <path d="M18 2.1a7.5 7.5 0 0 1 3 5.4" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Coursecast installeren
          </p>
          {isIOS ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Tik op Deel
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="inline-block w-3.5 h-3.5 mx-1 align-text-bottom" aria-hidden>
                <path d="M12 15V4" />
                <path d="M8.5 7.5 12 4l3.5 3.5" />
                <path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 11H17" />
              </svg>
              en kies &ldquo;Zet op beginscherm&rdquo;.
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Voeg toe aan je beginscherm voor een app-ervaring.
            </p>
          )}
        </div>

        {!isIOS && deferred && (
          <button
            onClick={install}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Installeer
          </button>
        )}
        <button onClick={dismiss} className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }} aria-label="Sluiten">
          ✕
        </button>
      </div>
    </div>
  )
}
