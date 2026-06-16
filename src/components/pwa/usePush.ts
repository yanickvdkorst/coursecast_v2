'use client'

import { useCallback, useEffect, useState } from 'react'
import { savePushSubscription, deletePushSubscription } from '@/app/(app)/profile/push-actions'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

// Shared push-subscription state + actions, used by both the profile toggle
// and the post-login nudge.
export function usePush() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!ok) { setSupported(false); return }
    setSupported(true)
    setPermission(Notification.permission)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  const enable = useCallback(async (): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Meldingen zijn geblokkeerd. Sta ze toe in je browserinstellingen.')
        setBusy(false)
        return false
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
      setBusy(false)
      return true
    } catch {
      setError('Kon meldingen niet inschakelen.')
      setBusy(false)
      return false
    }
  }, [])

  const disable = useCallback(async () => {
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
  }, [])

  // iOS only delivers web push to an installed (home-screen) PWA.
  const needsInstall = isIOS && !standalone

  return { supported, permission, subscribed, standalone, needsInstall, busy, error, enable, disable }
}
