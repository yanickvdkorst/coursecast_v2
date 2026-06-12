'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  // null = checking, true = valid recovery session, false = no session
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  // The recovery link establishes a session via /auth/callback before we land
  // here. Verify one exists so we don't show the form to someone with no link.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => setHasSession(!!data.user))
  }, [])

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens zijn.')
      return
    }
    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen.')
      return
    }

    setLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (hasSession === false) {
    return (
      <div className="text-center py-4">
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Link verlopen</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Deze resetlink is ongeldig of verlopen. Vraag een nieuwe aan.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block w-full py-3 rounded-xl font-semibold text-base"
          style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
        >
          Nieuwe resetlink aanvragen
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--accent-soft)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Wachtwoord gewijzigd</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Je wordt doorgestuurd…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Nieuw wachtwoord</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          Kies een nieuw wachtwoord voor je account.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Nieuw wachtwoord
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
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Bevestig wachtwoord
        </label>
        <input
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={cn(
            'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors',
            'focus:border-[var(--color-gold-500)]'
          )}
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || hasSession === null}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {loading ? 'Opslaan…' : 'Wachtwoord opslaan'}
      </button>
    </form>
  )
}
