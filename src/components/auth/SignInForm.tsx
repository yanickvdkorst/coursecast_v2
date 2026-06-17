'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawNext = searchParams.get('next')
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Keep the button in its loading state until navigation completes —
    // avoids a dead, re-clickable gap after a successful login.
    router.push(next)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors',
            'focus:border-[var(--color-gold-500)]'
          )}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
          placeholder="jij@voorbeeld.nl"
          autoComplete="email"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors',
            'focus:border-[var(--color-gold-500)]'
          )}
          style={{
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-color)',
          }}
          autoComplete="current-password"
        />
        <div className="text-right mt-1.5">
          <Link href="/forgot-password" className="text-sm font-medium" style={{ color: 'var(--color-gold-500)' }}>
            Wachtwoord vergeten?
          </Link>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {loading ? 'Inloggen…' : 'Inloggen'}
      </button>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Nog geen account?{' '}
        <Link href="/sign-up" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Registreer
        </Link>
      </p>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Uitgenodigd als gast?{' '}
        <Link href="/join" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Doe mee met een code
        </Link>
      </p>
    </form>
  )
}
