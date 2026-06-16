'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function JoinGuestForm({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'code' | 'name'>('code')
  const [code, setCode] = useState(initialCode)
  const [hostName, setHostName] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputClass = cn(
    'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors',
    'focus:border-[var(--color-gold-500)]'
  )
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  const checkCode = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()
    const { data, error: e2 } = await supabase.rpc('lookup_guest_invite', { p_code: code.trim() })
    const invite = data as { invite_id: string; host_name: string; course_name: string | null } | null
    if (e2) setError(e2.message)
    else if (!invite) setError('Deze code is ongeldig of al gebruikt.')
    else { setHostName(invite.host_name); setStep('name') }
    setLoading(false)
  }

  const join = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!name.trim()) { setError('Vul je naam in.'); return }
    setLoading(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()

    // Anonymous session → lets the guest score live and claim later.
    const { error: signInErr } = await supabase.auth.signInAnonymously()
    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }

    const { data, error: joinErr } = await supabase.rpc('join_guest_match', {
      p_code: code.trim(),
      p_guest_name: name.trim(),
    })
    if (joinErr || !data) {
      setError(joinErr?.message ?? 'Meedoen mislukte. Vraag een nieuwe code.')
      setLoading(false)
      return
    }
    router.push(`/matches/${data as string}`)
  }

  if (step === 'name') {
    return (
      <form onSubmit={join} className="space-y-4">
        <div className="text-center mb-2">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Je speelt tegen</p>
          <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{hostName}</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Jouw naam
          </label>
          <input
            type="text" required value={name} onChange={e => setName(e.target.value)}
            className={inputClass} style={inputStyle} placeholder="bijv. Tom" autoComplete="name" autoFocus
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-60"
          style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
        >
          {loading ? 'Meedoen…' : 'Meedoen'}
        </button>
        <button
          type="button" onClick={() => { setStep('code'); setError(null) }}
          className="w-full text-sm text-center" style={{ color: 'var(--text-muted)' }}
        >
          Andere code invullen
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={checkCode} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Meespelen als gast</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Vul de 4-cijferige code in die je van de organisator hebt gekregen.
        </p>
      </div>
      <div>
        <input
          type="text"
          inputMode="numeric"
          required
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={`${inputClass} text-center text-3xl font-black tracking-[0.4em] tabular-nums`}
          style={inputStyle}
          placeholder="0000"
          autoFocus
        />
      </div>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <button
        type="submit" disabled={loading || code.length !== 4}
        className="w-full py-3 rounded-xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {loading ? 'Controleren…' : 'Volgende'}
      </button>
      <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Heb je een account?{' '}
        <Link href="/sign-in" className="font-medium" style={{ color: 'var(--color-gold-500)' }}>
          Inloggen
        </Link>
      </p>
    </form>
  )
}
