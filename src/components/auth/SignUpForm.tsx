'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(201,162,39,0.12)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Verifieer je e-mail
        </h3>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
          We hebben een verificatielink gestuurd naar
        </p>
        <p className="text-sm font-semibold mb-5" style={{ color: 'var(--color-gold-500)' }}>
          {email}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Klik op de link in de mail om je account te activeren. Controleer ook je spammap.
        </p>
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Verkeerd e-mailadres?{' '}
            <button
              onClick={() => setSent(false)}
              className="font-medium"
              style={{ color: 'var(--color-gold-500)' }}
            >
              Pas aan
            </button>
          </p>
        </div>
      </div>
    )
  }

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors',
    'focus:border-[var(--color-gold-500)]'
  )
  const inputStyle = {
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    borderColor: 'var(--border-color)',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Volledige naam
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="Jan de Vries"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Gebruikersnaam
        </label>
        <input
          type="text"
          required
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          className={inputClass}
          style={inputStyle}
          placeholder="jan_devries"
          minLength={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          E-mailadres
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="jij@voorbeeld.nl"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Wachtwoord
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="••••••••"
          minLength={6}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: '#07101e' }}
      >
        {loading ? 'Account aanmaken…' : 'Account aanmaken'}
      </button>

      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Al een account?{' '}
        <Link href="/sign-in" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Inloggen
        </Link>
      </p>
    </form>
  )
}
