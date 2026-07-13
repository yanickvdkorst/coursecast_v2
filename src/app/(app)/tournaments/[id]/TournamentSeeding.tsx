'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setTournamentSeeds } from './actions'

interface SeedPlayer { id: string; name: string; seed: number | null }

export function TournamentSeeding({ tournamentId, players }: { tournamentId: string; players: SeedPlayer[] }) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(players.map(p => [p.id, p.seed != null ? String(p.seed) : '']))
  )
  const [enabled, setEnabled] = useState(players.some(p => p.seed != null))
  const [pending, start] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    setError(null)
    const seeds = players.map(p => {
      const raw = (values[p.id] ?? '').trim()
      const n = raw ? parseInt(raw, 10) : NaN
      return { playerId: p.id, seed: Number.isFinite(n) && n > 0 ? n : null }
    })
    start(async () => {
      const res = await setTournamentSeeds(tournamentId, seeds)
      if (!res.ok) setError(res.error ?? 'Opslaan mislukte')
      else { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh() }
    })
  }

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    if (!next) {
      // Turning off → clear seeds so the draw is fully random.
      setValues(Object.fromEntries(players.map(p => [p.id, ''])))
      start(async () => { await setTournamentSeeds(tournamentId, players.map(p => ({ playerId: p.id, seed: null }))); router.refresh() })
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between">
        <div className="pr-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Plaatsing
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Zet aan om spelers handmatig te plaatsen; anders willekeurig geloot.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Plaatsing gebruiken"
          onClick={toggle}
          disabled={pending}
          className="relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-60"
          style={{ background: enabled ? 'var(--accent)' : 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform"
            style={{ background: '#fff', transform: enabled ? 'translateX(20px)' : 'none' }}
          />
        </button>
      </div>

      {!enabled ? null : (
      <>
      <p className="text-xs mt-3 mb-3" style={{ color: 'var(--text-muted)' }}>
        Geef geplaatste spelers een nummer (1 = hoogst geplaatst). Zonder nummer worden ze willekeurig geloot.
      </p>
      <div className="space-y-2">
        {players.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <span className="flex-1 min-w-0 truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={values[p.id] ?? ''}
              onChange={e => setValues(v => ({ ...v, [p.id]: e.target.value }))}
              placeholder="–"
              className="w-16 px-2 py-1.5 rounded-lg border text-sm text-center outline-none focus:border-[var(--color-gold-500)]"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-3 px-5 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
      >
        {pending ? 'Opslaan…' : saved ? 'Opgeslagen ✓' : 'Plaatsing opslaan'}
      </button>
      {error && <p className="text-sm mt-2" style={{ color: 'var(--status-danger)' }}>{error}</p>}
      </>
      )}
    </section>
  )
}
