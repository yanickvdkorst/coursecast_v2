'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  initialFullName: string
  initialHandicap: number | null
  initialGolfClub: string
  userId: string
  redirectTo?: string
}

export function ProfileEditForm({ initialFullName, initialHandicap, initialGolfClub, userId, redirectTo = '/profile' }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(initialFullName)
  const [handicap, setHandicap] = useState(initialHandicap !== null ? String(initialHandicap) : '')
  const [golfClub, setGolfClub] = useState(initialGolfClub)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!fullName.trim()) return
    setLoading(true)
    setError(null)

    const hcp = handicap !== '' ? parseFloat(handicap) : null
    if (hcp !== null && (isNaN(hcp) || hcp < -10 || hcp > 54)) {
      setError('Handicap moet tussen -10 en 54 liggen')
      setLoading(false)
      return
    }

    const supabase = getSupabaseBrowserClient()
    const { error: err } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        handicap: hcp,
        golf_club: golfClub.trim() || null,
      })
      .eq('id', userId)

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--color-gold-500)]'
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Volledige naam *
        </label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="Jan de Vries"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Handicap index <span className="font-normal">(optioneel)</span>
        </label>
        <input
          type="number"
          value={handicap}
          onChange={e => setHandicap(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="bijv. 12.4"
          step="0.1"
          min="-10"
          max="54"
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Exacte handicap index, -10 t/m 54</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Golfclub <span className="font-normal">(optioneel)</span>
        </label>
        <input
          type="text"
          value={golfClub}
          onChange={e => setGolfClub(e.target.value)}
          className={inputClass}
          style={inputStyle}
          placeholder="bijv. GC Amstelborgh"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!fullName.trim() || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--color-gold-500)', color: '#040d1a' }}
      >
        {loading ? 'Opslaan…' : 'Opslaan'}
      </button>
    </div>
  )
}
