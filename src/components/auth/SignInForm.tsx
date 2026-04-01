'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicLink, setMagicLink] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()

    if (magicLink) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">⛳</div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Check your email
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          We sent a magic link to <strong>{email}</strong>
        </p>
      </div>
    )
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
          placeholder="you@example.com"
        />
      </div>

      {!magicLink && (
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
            placeholder="••••••••"
          />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading ? 'Signing in…' : magicLink ? 'Send magic link' : 'Sign in'}
      </button>

      <button
        type="button"
        onClick={() => setMagicLink(!magicLink)}
        className="w-full text-sm text-center transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        {magicLink ? 'Sign in with password instead' : 'Sign in with magic link'}
      </button>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        No account?{' '}
        <Link href="/sign-up" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Create one
        </Link>
      </p>
    </form>
  )
}
