'use client'

import { useEffect, useState } from 'react'
import { savePushSubscription, deletePushSubscription } from '@/app/(app)/profile/push-actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function NotificationToggle() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [needsInstall, setNeedsInstall] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!ok) { setSupported(false); return }
    setSupported(true)

    // iOS only delivers web push to an installed (home-screen) PWA.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isIOS && !standalone) setNeedsInstall(true)

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  const enable = async () => {
    setBusy(true)
    setError(null)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setError('Meldingen zijn geblokkeerd. Sta ze toe in je browserinstellingen.')
        setBusy(false)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const json = sub.toJSON()
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      })
      if (!res.ok) throw new Error('save failed')
      setSubscribed(true)
    } catch {
      setError('Kon meldingen niet inschakelen.')
    }
    setBusy(false)
  }

  const disable = async () => {
    setBusy(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await deletePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {
      setError('Kon meldingen niet uitschakelen.')
    }
    setBusy(false)
  }

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
