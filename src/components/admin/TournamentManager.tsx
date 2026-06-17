'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { playerLabel, type PickerPlayer } from './PlayerPicker'
import {
  updateTournament,
  addTournamentPlayer,
  removeTournamentPlayer,
  deleteTournament,
} from '@/app/admin/tournaments/actions'

const FORMATS = [
  { value: 'round_robin', label: 'Iedereen vs iedereen' },
  { value: 'bracket', label: 'Knock-out' },
] as const

const STATUSES = [
  { value: 'draft', label: 'Open' },
  { value: 'active', label: 'Bezig' },
  { value: 'complete', label: 'Gespeeld' },
] as const

interface MemberRow extends PickerPlayer {
  seed: number | null
}

interface Props {
  tournament: { id: string; name: string; format: string; status: string; visibility: string; registration_deadline: string | null; starts_at: string | null; ends_at: string | null }
  members: MemberRow[]
  allPlayers: PickerPlayer[]
}

// ISO timestamp → yyyy-mm-dd for <input type="date">
function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : ''
}

export function TournamentManager({ tournament, members, allPlayers }: Props) {
  const router = useRouter()
  const [name, setName] = useState(tournament.name)
  const [format, setFormat] = useState(tournament.format)
  const [status, setStatus] = useState(tournament.status)
  const [visibility, setVisibility] = useState(tournament.visibility)
  const [regDeadline, setRegDeadline] = useState(toDateInput(tournament.registration_deadline))
  const [startDate, setStartDate] = useState(toDateInput(tournament.starts_at))
  const [endDate, setEndDate] = useState(toDateInput(tournament.ends_at))
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
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Formaat</label>
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
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Zichtbaarheid</label>
          <select value={visibility} onChange={e => setVisibility(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
            <option value="public">Openbaar — iedereen kan zich inschrijven</option>
            <option value="private">Privé — alleen op uitnodiging / acceptatie</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Inschrijven tot</label>
          <input type="date" value={regDeadline} onChange={e => setRegDeadline(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Startdatum</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Einddatum</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border text-base outline-none focus:border-[var(--color-gold-500)]" style={inputStyle} />
          </div>
        </div>
        <button
          type="button" disabled={pending}
          onClick={() => run(
            () => updateTournament(tournament.id, {
              name,
              format: format as 'round_robin' | 'bracket',
              status: status as 'draft' | 'active' | 'complete',
              visibility: visibility as 'public' | 'private',
              registrationDeadline: regDeadline || null,
              startsAt: startDate || null,
              endsAt: endDate || null,
            }),
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
                <span className="text-xs font-bold w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>#{m.seed ?? '–'}</span>
                <p className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{playerLabel(m)}</p>
                <button
                  type="button" disabled={pending}
                  onClick={() => run(() => removeTournamentPlayer(tournament.id, m.id))}
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
          <select value={addId} onChange={e => setAddId(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:border-[var(--color-gold-500)]" style={inputStyle}>
            <option value="">Speler toevoegen…</option>
            {available.map(p => <option key={p.id} value={p.id}>{playerLabel(p)} (@{p.username})</option>)}
          </select>
          <button
            type="button" disabled={pending || !addId}
            onClick={() => run(() => addTournamentPlayer(tournament.id, addId), () => setAddId(''))}
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
          Verwijdert het toernooi en alle deelnames. Gespeelde wedstrijden blijven bestaan maar worden losgekoppeld. Dit kan niet ongedaan gemaakt worden.
        </p>
        <button
          type="button" disabled={pending}
          onClick={() => {
            if (!confirm(`Toernooi "${tournament.name}" definitief verwijderen?`)) return
            run(() => deleteTournament(tournament.id))
          }}
          className="px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          style={{ background: 'var(--btn-danger)', color: 'var(--on-btn)' }}
        >
          Toernooi verwijderen
        </button>
      </section>
    </div>
  )
}
