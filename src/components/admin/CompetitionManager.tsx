'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { playerLabel, type PickerPlayer } from './PlayerPicker'
import {
  updateCompetition,
  addCompetitionPlayer,
  removeCompetitionPlayer,
  deleteCompetition,
} from '@/app/admin/competitions/actions'

const FORMATS = [
  { value: 'winsonly', label: 'Alleen winst (1 punt per zege)' },
  { value: 'matchplay_points', label: 'Matchplay punten (2 / 1 / 0)' },
] as const

const STATUSES = [
  { value: 'draft', label: 'Concept' },
  { value: 'active', label: 'Actief' },
  { value: 'complete', label: 'Afgerond' },
] as const

interface MemberRow extends PickerPlayer {
  wins: number
  draws: number
  losses: number
}

interface Props {
  competition: { id: string; name: string; format: string; status: string }
  members: MemberRow[]
  allPlayers: PickerPlayer[]
}

export function CompetitionManager({ competition, members, allPlayers }: Props) {
  const router = useRouter()
  const [name, setName] = useState(competition.name)
  const [format, setFormat] = useState(competition.format)
  const [status, setStatus] = useState(competition.status)
  const [addId, setAddId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const memberIds = useMemo(() => new Set(members.map(m => m.id)), [members])
  const available = useMemo(
    () => allPlayers.filter(p => !memberIds.has(p.id)).sort((a, b) => playerLabel(a).localeCompare(playerLabel(b))),
    [allPlayers, memberIds]
  )

  const run = (fn: () => Promise<void>, onOk?: () => void) => {
    setError(null)
    startTransition(async () => {
      try { await fn(); onOk?.(); router.refresh() }
      catch (e) { setError(e instanceof Error ? e.message : 'Er ging iets mis') }
    })
  }

  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }
  const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-8 max-w-xl">
      {error && <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</p>}

      {/* Details */}
      <section className="rounded-2xl border p-5 space-y-4" style={cardStyle}>
        <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Details</h2>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Naam</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]"
            style={inputStyle}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Puntentelling</label>
            <select value={format} onChange={e => setFormat(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(
            () => updateCompetition(competition.id, { name, format: format as 'winsonly' | 'matchplay_points', status: status as 'draft' | 'active' | 'complete' }),
            () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }
          )}
          className="px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
        >
          {pending ? 'Opslaan…' : saved ? 'Opgeslagen ✓' : 'Opslaan'}
        </button>
      </section>

      {/* Players */}
      <section className="rounded-2xl border p-5" style={cardStyle}>
        <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Spelers <span style={{ color: 'var(--text-muted)' }}>({members.length})</span>
        </h2>

        {members.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Nog geen spelers.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{playerLabel(m)}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.wins}W · {m.draws}G · {m.losses}V</p>
                </div>
                <button
                  type="button" disabled={pending}
                  onClick={() => run(() => removeCompetitionPlayer(competition.id, m.id))}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg disabled:opacity-60"
                  style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger)' }}
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <select
            value={addId} onChange={e => setAddId(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}
          >
            <option value="">Speler toevoegen…</option>
            {available.map(p => <option key={p.id} value={p.id}>{playerLabel(p)} (@{p.username})</option>)}
          </select>
          <button
            type="button"
            disabled={pending || !addId}
            onClick={() => run(() => addCompetitionPlayer(competition.id, addId), () => setAddId(''))}
            className="px-5 py-2.5 rounded-xl font-semibold disabled:opacity-40"
            style={{ background: 'var(--color-gold-500)', color: 'var(--on-accent)' }}
          >
            Toevoegen
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border p-5" style={{ borderColor: 'var(--status-danger)', background: 'var(--status-danger-bg)' }}>
        <h2 className="font-semibold mb-1" style={{ color: 'var(--status-danger)' }}>Verwijderen</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Verwijdert de competitie en alle standen. Gespeelde wedstrijden blijven bestaan maar worden losgekoppeld. Dit kan niet ongedaan gemaakt worden.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Competitie "${competition.name}" definitief verwijderen?`)) return
            run(() => deleteCompetition(competition.id))
          }}
          className="px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          style={{ background: 'var(--btn-danger)', color: 'var(--on-btn)' }}
        >
          Competitie verwijderen
        </button>
      </section>
    </div>
  )
}
