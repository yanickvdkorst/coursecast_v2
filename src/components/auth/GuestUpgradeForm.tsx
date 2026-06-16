'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function GuestUpgradeForm({ initialName }: { initialName: string }) {
  const [fullName, setFullName] = useState(initialName)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Geen actieve gastsessie gevonden.'); setLoading(false); return }

    // 1. Claim a real username + name on the profile (validates uniqueness).
    const { error: pErr } = await supabase
      .from('profiles')
      .update({ username, full_name: fullName })
      .eq('id', user.id)
    if (pErr) {
      setError(pErr.message.includes('duplicate') || pErr.code === '23505'
        ? 'Die gebruikersnaam is al bezet.'
        : pErr.message)
      setLoading(false)
      return
    }

    // 2. Attach email + password to the anonymous account (same user id →
    //    all guest matches are kept). Supabase mails a confirmation link.
    const { error: aErr } = await supabase.auth.updateUser({
      email,
      password,
      data: { username, full_name: fullName },
    })
    if (aErr) {
      setError(aErr.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--accent-soft)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-7 h-7" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Verifieer je e-mail</h3>
        <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>We hebben een verificatielink gestuurd naar</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-gold-500)' }}>{email}</p>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          Na bevestiging is je account actief en blijven je gespeelde wedstrijden bewaard.
        </p>
      </div>
    )
  }

  const inputClass = cn('w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors', 'focus:border-[var(--color-gold-500)]')
  const inputStyle = { background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Maak je account aan</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Bewaar je gespeelde wedstrijden door een account te maken.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Volledige naam</label>
        <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className={inputClass} style={inputStyle} placeholder="Jan de Vries" autoComplete="name" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gebruikersnaam</label>
        <input type="text" required value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} className={inputClass} style={inputStyle} placeholder="jan_devries" minLength={3} autoComplete="username" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>E-mailadres</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} style={inputStyle} placeholder="jij@voorbeeld.nl" autoComplete="email" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Wachtwoord</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} style={inputStyle} placeholder="••••••••" minLength={6} autoComplete="new-password" />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60" style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}>
        {loading ? 'Account aanmaken…' : 'Account aanmaken'}
      </button>
    </form>
  )
}
