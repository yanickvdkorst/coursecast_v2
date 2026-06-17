'use client'

import { useState, useTransition } from 'react'
import { PlayerPicker, type PickerPlayer } from './PlayerPicker'
import { createTournament } from '@/app/admin/tournaments/actions'

const FORMATS = [
  { value: 'round_robin', label: 'Iedereen vs iedereen' },
  { value: 'bracket', label: 'Knock-out' },
] as const

export function TournamentCreateForm({ players }: { players: PickerPlayer[] }) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState<'round_robin' | 'bracket'>('round_robin')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    setError(null)
    if (!name.trim()) { setError('Geef het toernooi een naam'); return }
    startTransition(async () => {
      try {
        await createTournament({
          name,
          format,
          visibility,
          startsAt: startDate || null,
          endsAt: endDate || null,
          playerIds: selected,
        })
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
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="bijv. Najaarstoernooi 2026"
          className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]"
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Formaat</label>
        <select value={format} onChange={e => setFormat(e.target.value as typeof format)}
          className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
          {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" style={labelStyle}>Zichtbaarheid</label>
        <select value={visibility} onChange={e => setVisibility(e.target.value as typeof visibility)}
          className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
          <option value="public">Openbaar — iedereen kan zich inschrijven</option>
          <option value="private">Privé — alleen op uitnodiging / acceptatie</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Startdatum</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={labelStyle}>Einddatum</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={labelStyle}>
          Spelers <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optioneel)</span>
        </label>
        <PlayerPicker players={players} selected={selected} onChange={setSelected} />
      </div>

      {error && <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</p>}

      <button
        type="button" onClick={submit} disabled={pending}
        className="px-6 py-3 rounded-xl font-semibold disabled:opacity-60"
        style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
      >
        {pending ? 'Aanmaken…' : 'Toernooi aanmaken'}
      </button>
    </div>
  )
}
