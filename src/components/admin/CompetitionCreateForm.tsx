'use client'

import { useState, useTransition } from 'react'
import { PlayerPicker, type PickerPlayer } from './PlayerPicker'
import { createCompetition } from '@/app/admin/competitions/actions'

const FORMATS = [
  { value: 'winsonly', label: 'Alleen winst (1 punt per zege)' },
  { value: 'matchplay_points', label: 'Matchplay punten (2 / 1 / 0)' },
] as const

export function CompetitionCreateForm({ players }: { players: PickerPlayer[] }) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'winsonly' | 'matchplay_points'>('winsonly')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    if (!name.trim()) { setError('Geef de competitie een naam'); return }
    startTransition(async () => {
      try {
        await createCompetition({ name, format, playerIds: selected })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Er ging iets mis')
      }
    })
  }

  const labelStyle = { color: 'var(--text-secondary)' }
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Naam</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="bijv. Zomercompetitie 2026"
          className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Puntentelling</label>
        <select
          value={format}
          onChange={e => setFormat(e.target.value as typeof format)}
          className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]"
          style={inputStyle}
        >
          {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>Spelers</label>
        <PlayerPicker players={players} selected={selected} onChange={setSelected} />
      </div>

      {error && <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="px-6 py-3 rounded-xl font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {pending ? 'Aanmaken…' : 'Competitie aanmaken'}
      </button>
    </div>
  )
}
