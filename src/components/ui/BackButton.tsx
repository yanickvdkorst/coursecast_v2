'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

interface BackButtonProps {
  fallback: string
  className?: string
  style?: CSSProperties
  ariaLabel?: string
  children?: ReactNode
}

/**
 * Goes to the previous page when there's same-origin history,
 * otherwise navigates to `fallback` (used on direct deep-link or refresh).
 */
export function BackButton({ fallback, className, style, ariaLabel = 'Terug', children }: BackButtonProps) {
  const router = useRouter()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    const sameOriginReferrer =
      typeof document !== 'undefined' &&
      document.referrer.length > 0 &&
      document.referrer.startsWith(window.location.origin)
    setCanGoBack(sameOriginReferrer && window.history.length > 1)
  }, [])

  const onClick = () => {
    if (canGoBack) router.back()
    else router.push(fallback)
  }

  return (
    <button type="button" onClick={onClick} className={className} style={style} aria-label={ariaLabel}>
      {children ?? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
