'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    // Keep disabled state until navigation completes.
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="w-full py-3 rounded-2xl border text-sm font-medium transition-colors disabled:opacity-60"
      style={{
        borderColor: 'var(--border-color)',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
      }}
    >
      {loading ? 'Uitloggen…' : 'Uitloggen'}
    </button>
  )
}
