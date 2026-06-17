'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Tournament } from '@/types/match'

const FORMAT_LABEL: Record<string, string> = {
  round_robin: 'Iedereen vs iedereen',
  bracket: 'Knock-out',
}
const STATUS_LABEL: Record<string, string> = { draft: 'Open', active: 'Bezig', complete: 'Gespeeld' }
const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--text-muted)',
  active: 'var(--status-success)',
  complete: 'var(--accent)',
}

export function TournamentsBrowser({
  tournaments,
  membership = {},
}: {
  tournaments: Tournament[]
  membership?: Record<string, string>
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tournaments
    return tournaments.filter(t => t.name.toLowerCase().includes(q))
  }, [tournaments, query])

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Zoek toernooi op naam…"
        className="w-full px-4 py-3 rounded-xl border text-base outline-none mb-4 transition-colors focus:border-[var(--color-gold-500)]"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
      />

      {filtered.length === 0 ? (
        <div
          className="py-12 px-6 rounded-2xl text-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {tournaments.length === 0 ? 'Nog geen toernooien.' : 'Geen toernooi gevonden.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {filtered.map((t, i) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="flex items-center gap-3 px-4 py-4"
              style={{ background: 'var(--bg-card)', borderTop: i === 0 ? undefined : '1px solid var(--border-color)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" style={{ color: 'var(--accent)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                  {membership[t.id] === 'accepted' && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 leading-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      Ingeschreven
                    </span>
                  )}
                  {membership[t.id] === 'requested' && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 leading-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      Aangevraagd
                    </span>
                  )}
                  {t.visibility === 'private' && (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full shrink-0 leading-none" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      Privé
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {FORMAT_LABEL[t.format] ?? t.format}
                  <span className="mx-1.5">·</span>
                  <span style={{ color: STATUS_COLOR[t.status] ?? 'var(--text-muted)' }}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
