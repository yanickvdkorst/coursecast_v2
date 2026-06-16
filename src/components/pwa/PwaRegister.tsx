'use client'

import { useEffect } from 'react'

// Registers the service worker once on the client.
export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch(() => { /* registration failed — app still works */ })
  }, [])
  return null
}
