'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full py-3 rounded-2xl border text-sm font-medium transition-colors"
      style={{
        borderColor: 'var(--border-color)',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
      }}
    >
      Sign out
    </button>
  )
}
