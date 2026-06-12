'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    // Always show the success state — never reveal whether an email exists.
    if (error) setError(error.message)
    else setSent(true)

    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'var(--accent-soft)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Controleer je e-mail</h3>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          Als er een account bestaat voor
        </p>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-gold-500)' }}>{email}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          dan hebben we een link gestuurd om je wachtwoord opnieuw in te stellen.
        </p>
        <Link href="/sign-in" className="inline-block mt-6 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Terug naar inloggen
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Wachtwoord vergeten?</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
          Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord in te stellen.
        </p>
      </div>

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
        />
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
        {loading ? 'Versturen…' : 'Stuur resetlink'}
      </button>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Weet je het weer?{' '}
        <Link href="/sign-in" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Inloggen
        </Link>
      </p>
    </form>
  )
}
