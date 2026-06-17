'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlayerPicker, type PickerPlayer } from '@/components/admin/PlayerPicker'
import { inviteToTournament } from './actions'

export function TournamentInvite({ tournamentId, players }: { tournamentId: string; players: PickerPlayer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const invite = () => {
    if (selected.length === 0) return
    setError(null)
    start(async () => {
      const res = await inviteToTournament(tournamentId, selected)
      if (!res.ok) setError(res.error ?? 'Uitnodigen mislukte')
      else { setSelected([]); setOpen(false); router.refresh() }
    })
  }

  return (
    <section className="mb-8">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
        >
          + Speler uitnodigen
        </button>
      ) : (
        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Spelers uitnodigen</p>
          {players.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Geen spelers beschikbaar om uit te nodigen.</p>
          ) : (
            <PlayerPicker players={players} selected={selected} onChange={setSelected} />
          )}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={invite}
              disabled={pending || selected.length === 0}
              className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {pending ? '…' : `Uitnodigen${selected.length ? ` (${selected.length})` : ''}`}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setSelected([]) }}
              className="px-4 py-2.5 rounded-xl font-medium text-sm"
              style={{ background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}
            >
              Annuleer
            </button>
          </div>
          {error && <p className="text-sm mt-2" style={{ color: 'var(--status-danger)' }}>{error}</p>}
        </div>
      )}
    </section>
  )
}
